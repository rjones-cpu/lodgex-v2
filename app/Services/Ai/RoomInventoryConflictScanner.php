<?php

namespace App\Services\Ai;

use App\Enums\RoomStatus;
use App\Models\Reservation;
use App\Models\Room;
use Illuminate\Support\Collection;

/**
 * Read-only conflict flags for Room Inventory Intelligence.
 * Never writes occupancy. People still approve any follow-up.
 */
class RoomInventoryConflictScanner
{
    public function __construct(
        private readonly RoomInventoryAvailabilityInspector $inspector,
    ) {}

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function detect(?Collection $rooms = null, ?Collection $reservations = null): Collection
    {
        $rooms ??= Room::query()
            ->fromInventory()
            ->active()
            ->with(['activeHold', 'activeMaintenanceHold', 'currentWorker', 'reservations'])
            ->get();

        $reservations ??= Reservation::query()->with(['room', 'worker'])->get();

        $flags = collect();

        $flags = $flags->concat($this->doubleBooks($reservations));
        $flags = $flags->concat($this->heldVsVacant($rooms));
        $flags = $flags->concat($this->assignedVsDirty($rooms, $reservations));
        $flags = $flags->concat($this->reservationVsInventory($reservations));
        $flags = $flags->concat($this->notActuallyAvailable($rooms));
        $flags = $flags->concat($this->noSleepMustNotRelease($reservations));
        $flags = $flags->concat($this->timeOutOverSevenNights($rooms, $reservations));
        $flags = $flags->concat($this->oooConflicts($rooms, $reservations));
        $flags = $flags->concat($this->unassignedConfirmed($reservations));
        $flags = $flags->concat($this->dirtyConfirmedStillCommitted($rooms, $reservations));

        return $flags
            ->unique(fn (array $row) => $row['code'].'|'.($row['room_id'] ?? '').'|'.($row['reservation_id'] ?? ''))
            ->values();
    }

    /**
     * @param  Collection<int, Reservation>  $reservations
     * @return Collection<int, array<string, mixed>>
     */
    private function doubleBooks(Collection $reservations): Collection
    {
        $flags = collect();
        $occupying = $reservations->filter(
            fn (Reservation $reservation) => $this->inspector->occupiesInventory($reservation),
        );

        foreach ($occupying->groupBy('room_id') as $group) {
            $list = $group->values();
            for ($i = 0; $i < $list->count(); $i++) {
                for ($j = $i + 1; $j < $list->count(); $j++) {
                    $a = $list[$i];
                    $b = $list[$j];
                    if (! $this->inspector->datesOverlap($a, $b)) {
                        continue;
                    }

                    $room = $a->room;
                    $flags->push($this->flag(
                        code: 'double_book',
                        issue: "Double book on room {$room?->number} ({$room?->dorm}).",
                        recommendation: 'Two occupying reservations overlap on the same room. A person must reassign or release one of them. AI will not displace a confirmed resident.',
                        risk: 'critical',
                        room: $room,
                        reservation: $a,
                        extra: [
                            'other_reservation_id' => $b->id,
                            'reservation_ids' => [$a->id, $b->id],
                            'decision' => 'prohibited',
                        ],
                    ));
                }
            }
        }

        return $flags;
    }

    /**
     * Retained rooms can look Vacant Clean and stay committed.
     *
     * @param  Collection<int, Room>  $rooms
     * @return Collection<int, array<string, mixed>>
     */
    private function heldVsVacant(Collection $rooms): Collection
    {
        return $rooms
            ->filter(function (Room $room) {
                if ($room->roomStatus() !== RoomStatus::VacantClean) {
                    return false;
                }

                $kind = $this->inspector->holdKind($room);

                return in_array($kind, [
                    RoomInventoryAvailabilityInspector::HOLD_TIME_OUT_RETAINED,
                    RoomInventoryAvailabilityInspector::HOLD_ASSIGNMENT,
                    RoomInventoryAvailabilityInspector::HOLD_OPTION,
                ], true);
            })
            ->map(function (Room $room) {
                $kind = $this->inspector->holdKind($room);
                $label = match ($kind) {
                    RoomInventoryAvailabilityInspector::HOLD_TIME_OUT_RETAINED => 'Time-Out / Room Retained',
                    RoomInventoryAvailabilityInspector::HOLD_OPTION => 'Reservation Option Hold',
                    default => 'Room Assignment Hold',
                };

                return $this->flag(
                    code: 'held_vs_vacant',
                    issue: "Room {$room->number} ({$room->dorm}) looks Vacant Clean but has a {$label} commitment.",
                    recommendation: 'Do not treat Vacant Clean as availability. A retained or held room stays committed until a person releases the correct hold kind.',
                    risk: 'high',
                    room: $room,
                    extra: ['hold_kind' => $kind],
                );
            });
    }

    /**
     * @param  Collection<int, Room>  $rooms
     * @param  Collection<int, Reservation>  $reservations
     * @return Collection<int, array<string, mixed>>
     */
    private function assignedVsDirty(Collection $rooms, Collection $reservations): Collection
    {
        $assignedRoomIds = $reservations
            ->filter(fn (Reservation $reservation) => $this->inspector->occupiesInventory($reservation))
            ->pluck('room_id')
            ->filter()
            ->unique()
            ->all();

        return $rooms
            ->filter(function (Room $room) use ($assignedRoomIds) {
                if ($room->roomStatus() !== RoomStatus::VacantDirty) {
                    return false;
                }

                return $room->current_worker_id !== null || in_array($room->id, $assignedRoomIds, true);
            })
            ->map(fn (Room $room) => $this->flag(
                code: 'assigned_vs_dirty',
                issue: "Room {$room->number} ({$room->dorm}) is assigned but housekeeping is Vacant Dirty.",
                recommendation: 'Dirty is not a release. Fitness for check-in fails until Vacant Clean. Inventory commitment still stands. A person must correct housekeeping; AI will not check in.',
                risk: 'high',
                room: $room,
            ));
    }

    /**
     * @param  Collection<int, Reservation>  $reservations
     * @return Collection<int, array<string, mixed>>
     */
    private function reservationVsInventory(Collection $reservations): Collection
    {
        return $reservations
            ->filter(fn (Reservation $reservation) => $this->inspector->occupiesInventory($reservation))
            ->filter(function (Reservation $reservation) {
                $room = $reservation->room;
                if (! $room) {
                    return true;
                }

                if ($room->room_inventory_location_id === null) {
                    return true;
                }

                return $this->inspector->isRestricted($room);
            })
            ->map(function (Reservation $reservation) {
                $room = $reservation->room;
                $why = ! $room
                    ? 'points at a missing room'
                    : ($room->room_inventory_location_id === null
                        ? 'is not a Room Inventory row'
                        : 'is out of service / restricted');

                return $this->flag(
                    code: 'reservation_vs_inventory',
                    issue: "Reservation #{$reservation->id} ({$reservation->worker?->name}) {$why}.",
                    recommendation: 'Inventory and the reservation disagree. A person must reassign or return the room to service. AI will not assign an OOO/OOS room.',
                    risk: 'high',
                    room: $room,
                    reservation: $reservation,
                );
            });
    }

    /**
     * Vacant Clean rooms that fail ledger or fitness.
     *
     * @param  Collection<int, Room>  $rooms
     * @return Collection<int, array<string, mixed>>
     */
    private function notActuallyAvailable(Collection $rooms): Collection
    {
        return $rooms
            ->filter(fn (Room $room) => $room->roomStatus() === RoomStatus::VacantClean)
            ->filter(fn (Room $room) => ! $this->inspector->isAvailable($room))
            ->map(function (Room $room) {
                $reasons = implode(', ', $this->inspector->unavailableReasons($room));

                return $this->flag(
                    code: 'not_actually_available',
                    issue: "Room {$room->number} ({$room->dorm}) is labeled Vacant Clean but the ledger/fitness check fails ({$reasons}).",
                    recommendation: 'Vacant Clean is not availability. Do not propose this room until a person clears the commitment or block.',
                    risk: 'medium',
                    room: $room,
                    extra: ['reasons' => $this->inspector->unavailableReasons($room)],
                );
            });
    }

    /**
     * @param  Collection<int, Reservation>  $reservations
     * @return Collection<int, array<string, mixed>>
     */
    private function noSleepMustNotRelease(Collection $reservations): Collection
    {
        return $reservations
            ->filter(fn (Reservation $reservation) => $reservation->status === 'No-Sleep')
            ->map(fn (Reservation $reservation) => $this->flag(
                code: 'no_sleep_must_not_release',
                issue: "Reservation #{$reservation->id} ({$reservation->worker?->name}) is No Sleep. The room must not be released on that stay state alone.",
                recommendation: 'No Sleep is not a release. Inventory stays committed until a person runs the correct workflow. AI will not release or reassign this room.',
                risk: 'high',
                room: $reservation->room,
                reservation: $reservation,
                extra: ['decision' => 'prohibited'],
            ));
    }

    /**
     * @param  Collection<int, Room>  $rooms
     * @param  Collection<int, Reservation>  $reservations
     * @return Collection<int, array<string, mixed>>
     */
    private function timeOutOverSevenNights(Collection $rooms, Collection $reservations): Collection
    {
        $byRoom = $reservations
            ->filter(fn (Reservation $reservation) => $reservation->status === 'On-Hold')
            ->keyBy('room_id');

        return $rooms
            ->filter(function (Room $room) use ($byRoom) {
                $stay = $byRoom->get($room->id);

                return $this->inspector->holdKind($room, $stay) === RoomInventoryAvailabilityInspector::HOLD_TIME_OUT_RETAINED
                    && $this->inspector->timeOutExceedsRetention($room, $stay);
            })
            ->map(function (Room $room) use ($byRoom) {
                $stay = $byRoom->get($room->id);
                $nights = $this->inspector->timeOutNights($room, $stay);
                $limit = ReservationTrainingStandard::timeOutRetentionNights();

                return $this->flag(
                    code: 'time_out_over_seven_nights',
                    issue: "Room {$room->number} ({$room->dorm}) Time-Out / Room Retained is ".($nights ?? 'over policy')." nights (limit {$limit}).",
                    recommendation: 'Beyond 7 nights is human-only. AI will not release, extend, or reassign this retained room.',
                    risk: 'high',
                    room: $room,
                    reservation: $stay,
                    extra: [
                        'nights' => $nights,
                        'limit' => $limit,
                        'decision' => 'prohibited',
                    ],
                );
            });
    }

    /**
     * @param  Collection<int, Room>  $rooms
     * @param  Collection<int, Reservation>  $reservations
     * @return Collection<int, array<string, mixed>>
     */
    private function oooConflicts(Collection $rooms, Collection $reservations): Collection
    {
        $occupyingIds = $reservations
            ->filter(fn (Reservation $reservation) => $this->inspector->occupiesInventory($reservation))
            ->pluck('room_id')
            ->filter()
            ->unique()
            ->all();

        return $rooms
            ->filter(function (Room $room) use ($occupyingIds) {
                $admin = $this->inspector->administrativeBlockReason($room);
                if (! in_array($admin, ['ooo', 'oos', 'administrative_inventory_hold'], true)) {
                    return false;
                }

                return $room->current_worker_id !== null || in_array($room->id, $occupyingIds, true);
            })
            ->map(function (Room $room) {
                $admin = $this->inspector->administrativeBlockReason($room);

                return $this->flag(
                    code: 'ooo_committed',
                    issue: "Room {$room->number} ({$room->dorm}) is {$admin} but still has a committed stay.",
                    recommendation: 'OOO/OOS/administratively held rooms are not assignable. A person must relocate or return the room to service. AI will not assign or check in.',
                    risk: 'critical',
                    room: $room,
                    extra: ['decision' => 'prohibited', 'block' => $this->inspector->administrativeBlockReason($room)],
                );
            });
    }

    /**
     * @param  Collection<int, Reservation>  $reservations
     * @return Collection<int, array<string, mixed>>
     */
    private function unassignedConfirmed(Collection $reservations): Collection
    {
        return $reservations
            ->filter(fn (Reservation $reservation) => $reservation->room_id === null)
            ->filter(fn (Reservation $reservation) => $this->inspector->deductsInventory($reservation))
            ->map(fn (Reservation $reservation) => $this->flag(
                code: 'unassigned_confirmed',
                issue: "Confirmed reservation #{$reservation->id} ({$reservation->worker?->name}) has no room but still deducts category inventory for {$reservation->arrival_date?->toDateString()}–{$reservation->departure_date?->toDateString()}.",
                recommendation: 'Unassigned confirmed stays are committed. Recommend a fit room for human approval. Do not ignore this deduction in Vacant Clean counts.',
                risk: 'medium',
                reservation: $reservation,
            ));
    }

    /**
     * @param  Collection<int, Room>  $rooms
     * @param  Collection<int, Reservation>  $reservations
     * @return Collection<int, array<string, mixed>>
     */
    private function dirtyConfirmedStillCommitted(Collection $rooms, Collection $reservations): Collection
    {
        $dirtyIds = $rooms
            ->filter(fn (Room $room) => $room->roomStatus() === RoomStatus::VacantDirty)
            ->pluck('id')
            ->all();

        return $reservations
            ->filter(fn (Reservation $reservation) => $this->inspector->deductsInventory($reservation))
            ->filter(fn (Reservation $reservation) => $reservation->room_id && in_array($reservation->room_id, $dirtyIds, true))
            ->map(fn (Reservation $reservation) => $this->flag(
                code: 'dirty_confirmed_committed',
                issue: "Confirmed stay #{$reservation->id} is on Dirty room {$reservation->room?->number}. Housekeeping is not a release.",
                recommendation: 'Dirty confirmed stays still deduct inventory. Fitness for a new check-in fails until Vacant Clean. AI will not treat this room as available.',
                risk: 'high',
                room: $reservation->room,
                reservation: $reservation,
            ));
    }

    /**
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    private function flag(
        string $code,
        string $issue,
        string $recommendation,
        string $risk,
        ?Room $room = null,
        ?Reservation $reservation = null,
        array $extra = [],
    ): array {
        return array_merge([
            'code' => $code,
            'issue' => $issue,
            'recommendation' => $recommendation,
            'risk' => $risk,
            'room_id' => $room?->id,
            'room_number' => $room?->number,
            'dorm' => $room?->dorm,
            'status' => $room?->status,
            'reservation_id' => $reservation?->id,
            'current_state' => $this->inspector->sevenState($reservation, $room),
        ], $extra);
    }
}
