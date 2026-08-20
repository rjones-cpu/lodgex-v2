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
                        recommendation: "Two occupying reservations overlap on the same room. A person must reassign or release one of them.",
                        risk: 'critical',
                        room: $room,
                        reservation: $a,
                        extra: [
                            'other_reservation_id' => $b->id,
                            'reservation_ids' => [$a->id, $b->id],
                        ],
                    ));
                }
            }
        }

        return $flags;
    }

    /**
     * @param  Collection<int, Room>  $rooms
     * @return Collection<int, array<string, mixed>>
     */
    private function heldVsVacant(Collection $rooms): Collection
    {
        return $rooms
            ->filter(fn (Room $room) => $room->roomStatus() === RoomStatus::VacantClean && $room->activeHold)
            ->map(fn (Room $room) => $this->flag(
                code: 'held_vs_vacant',
                issue: "Room {$room->number} ({$room->dorm}) is Vacant Clean but has an active hold.",
                recommendation: 'Do not assign this room. A person must clear the hold or correct the status.',
                risk: 'high',
                room: $room,
            ));
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
                issue: "Room {$room->number} ({$room->dorm}) is assigned but status is Vacant Dirty.",
                recommendation: 'Do not check a guest into a dirty room. Housekeeping or Front Desk must correct status first.',
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
                    recommendation: 'Inventory and the reservation disagree. A person must reassign or return the room to service.',
                    risk: 'high',
                    room: $room,
                    reservation: $reservation,
                );
            });
    }

    /**
     * Vacant Clean rooms that fail the full availability rule.
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
                    issue: "Room {$room->number} ({$room->dorm}) is labeled Vacant Clean but is not actually available ({$reasons}).",
                    recommendation: 'Do not propose this room for assignment until a person clears the block.',
                    risk: 'medium',
                    room: $room,
                    extra: ['reasons' => $this->inspector->unavailableReasons($room)],
                );
            });
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
        ], $extra);
    }
}
