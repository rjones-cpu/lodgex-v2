<?php

namespace App\Services\Ai;

use App\Enums\RoomStatus;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\RoomInventoryOutOfService;
use App\Services\RoomUtilization\RoomAvailabilityService;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

/**
 * Room-night ledger + check-in fitness for Room Inventory Intelligence (SL-02 + SL-03).
 *
 * Availability is not Vacant Clean. Vacant Clean is the lodgex-v2 fitness gate
 * after inventory math (standard 6.2 / 6.6). Uses live rooms_old / reservation /
 * hold / OOS fields — no second status model.
 */
class RoomInventoryAvailabilityInspector
{
    /**
     * Stay statuses that have released inventory. No-Sleep is intentionally
     * absent — it must not release a room.
     *
     * @var list<string>
     */
    public const RELEASED_STATUSES = ['Check-Out'];

    /**
     * @deprecated Use RELEASED_STATUSES. No-Sleep is not terminal for inventory.
     *
     * @var list<string>
     */
    public const TERMINAL_STATUSES = ['Check-Out'];

    public const HOLD_TIME_OUT_RETAINED = 'time_out_room_retained';

    public const HOLD_OPTION = 'reservation_option_hold';

    public const HOLD_ASSIGNMENT = 'room_assignment_hold';

    public const HOLD_ADMIN = 'administrative_inventory_hold';

    /** @var array<string, bool>|null */
    private ?array $restrictedKeys = null;

    private ?Collection $assignableMemo = null;

    private ?Collection $reservationsMemo = null;

    public function __construct(
        private readonly RoomAvailabilityService $availability,
    ) {}

    /**
     * Propose-for-assignment check: ledger for the stay (when given) then fitness.
     * Without a stay window this is not the transactional check.
     */
    public function isAvailable(Room $room, ?Reservation $for = null): bool
    {
        return $this->unavailableReasons($room, $for) === [];
    }

    /**
     * @return list<string>
     */
    public function unavailableReasons(Room $room, ?Reservation $for = null): array
    {
        $reasons = $this->ledgerReasons($room, $for);
        foreach ($this->fitnessReasons($room) as $reason) {
            $reasons[] = $reason;
        }

        return array_values(array_unique($reasons));
    }

    /**
     * Inventory math only (6.2). Does not require Vacant Clean.
     *
     * @return list<string>
     */
    public function ledgerReasons(Room $room, ?Reservation $for = null): array
    {
        $reasons = [];

        if (! $room->is_active) {
            $reasons[] = 'inactive';
        }

        $admin = $this->administrativeBlockReason($room);
        if ($admin !== null) {
            $reasons[] = $admin;
            if ($admin === 'ooo') {
                $reasons[] = 'maintenance';
            }
            if ($admin === 'administrative_inventory_hold') {
                $reasons[] = 'restricted';
            }
        }

        $holdKind = $this->holdKind($room, $for);
        if (in_array($holdKind, [self::HOLD_TIME_OUT_RETAINED, self::HOLD_OPTION, self::HOLD_ASSIGNMENT], true)) {
            $reasons[] = 'held';
        }
        if ($holdKind === self::HOLD_TIME_OUT_RETAINED) {
            $reasons[] = 'time_out_retained';
            if ($this->timeOutExceedsRetention($room, $for)) {
                $reasons[] = 'time_out_over_seven_nights';
            }
        } elseif ($holdKind === self::HOLD_OPTION) {
            $reasons[] = 'reservation_option_hold';
        } elseif ($holdKind === self::HOLD_ASSIGNMENT) {
            $reasons[] = 'room_assignment_hold';
        }

        if ($room->current_worker_id && ($for === null || (int) $room->current_worker_id !== (int) $for->worker_id)) {
            $reasons[] = 'assigned';
        }

        if ($for === null) {
            if ($this->roomHasRetainedStay($room)) {
                $reasons[] = 'time_out_retained';
            }
            if ($this->roomHasNoSleepStay($room)) {
                $reasons[] = 'no_sleep_must_not_release';
            }

            return array_values(array_unique($reasons));
        }

        if (! $for->arrival_date || ! $for->departure_date) {
            $reasons[] = 'ambiguous_dates';

            return array_values(array_unique($reasons));
        }

        if ($for->departure_date->lte($for->arrival_date)) {
            $reasons[] = 'ambiguous_dates';

            return array_values(array_unique($reasons));
        }

        $nights = $this->stayNights($for);
        if ($nights === []) {
            $reasons[] = 'ambiguous_dates';

            return array_values(array_unique($reasons));
        }

        foreach ($nights as $night) {
            if ($this->roomNightCommitted($room, $night, $for)) {
                $reasons[] = 'reservation_overlap';
                break;
            }
        }

        foreach ($nights as $night) {
            if ($this->categoryAvailableToAssign($this->categoryKey($for, $room), $night, $for) < 1) {
                $reasons[] = 'category_committed';
                break;
            }
        }

        if (ReservationTrainingStandard::positiveOverbookingEnabled() === false) {
            // Config is OFF: a category deficit is never solved by inventing a sell limit.
        }

        return array_values(array_unique($reasons));
    }

    /**
     * Check-in fitness (6.6). After ledger. Vacant Clean in lodgex-v2.
     *
     * @return list<string>
     */
    public function fitnessReasons(Room $room): array
    {
        $reasons = [];

        if ($room->roomStatus() !== RoomStatus::VacantClean) {
            $reasons[] = 'not_vacant_clean';
            $reasons[] = 'not_fit_for_check_in';
        }

        $admin = $this->administrativeBlockReason($room);
        if ($admin !== null) {
            $reasons[] = $admin;
            $reasons[] = 'not_fit_for_check_in';
        }

        return array_values(array_unique($reasons));
    }

    public function isFitForCheckIn(Room $room): bool
    {
        return $this->fitnessReasons($room) === [];
    }

    public function isAssignableOnLedger(Room $room, ?Reservation $for = null): bool
    {
        return $this->ledgerReasons($room, $for) === [];
    }

    /**
     * @return Collection<int, Room>
     */
    public function availableRooms(?Reservation $for = null): Collection
    {
        $rooms = Room::query()
            ->fromInventory()
            ->active()
            ->with(['activeHold', 'activeMaintenanceHold', 'reservations'])
            ->orderBy('dorm')
            ->orderByRaw('CAST(number AS UNSIGNED)')
            ->get();

        return $rooms
            ->filter(function (Room $room) use ($for) {
                if ($this->administrativeBlockReason($room) !== null) {
                    return false;
                }

                if ($for !== null && $this->ledgerReasons($room, $for) !== []) {
                    return false;
                }

                if ($for === null && $this->ledgerReasons($room) !== []) {
                    return false;
                }

                return $this->isFitForCheckIn($room);
            })
            ->values();
    }

    /**
     * True when this stay deducts a room night from Available to Assign.
     */
    public function deductsInventory(Reservation $reservation): bool
    {
        if (in_array($reservation->status, self::RELEASED_STATUSES, true)) {
            return false;
        }

        if ($reservation->status === 'Waitlisted') {
            return false;
        }

        if ($reservation->status === 'No-Show') {
            return $reservation->room_id !== null;
        }

        if (in_array($reservation->status, ['Check-In', 'On-Hold', 'No-Sleep'], true)) {
            return true;
        }

        if ($this->isPendingApproval($reservation)) {
            return ReservationTrainingStandard::pendingOptionHoldsDeduct();
        }

        return $this->isConfirmed($reservation);
    }

    /**
     * Assigned stay still occupying a physical room for inventory (not housekeeping).
     */
    public function occupiesInventory(Reservation $reservation): bool
    {
        return $reservation->room_id !== null && $this->deductsInventory($reservation);
    }

    public function occupiesPhysically(Reservation $reservation): bool
    {
        return $reservation->status === 'Check-In' && $reservation->room_id !== null;
    }

    public function isRetained(Reservation $reservation): bool
    {
        return $reservation->status === 'On-Hold';
    }

    public function isConfirmed(Reservation $reservation): bool
    {
        return strcasecmp((string) $reservation->approval_status, 'Approved') === 0;
    }

    public function isPendingApproval(Reservation $reservation): bool
    {
        $approval = trim((string) $reservation->approval_status);

        if ($approval === '' || $approval === '—' || strcasecmp($approval, 'Approved') === 0) {
            return false;
        }

        return true;
    }

    public function datesOverlap(Reservation $a, Reservation $b): bool
    {
        if (! $a->arrival_date || ! $a->departure_date || ! $b->arrival_date || ! $b->departure_date) {
            return false;
        }

        return $a->arrival_date->lt($b->departure_date)
            && $b->arrival_date->lt($a->departure_date);
    }

    public function hasOverlappingReservation(Room $room, Reservation $candidate): bool
    {
        $others = $room->relationLoaded('reservations')
            ? $room->reservations
            : $room->reservations()->get();

        foreach ($others as $existing) {
            if ($existing->id === $candidate->id) {
                continue;
            }

            if (! $this->occupiesInventory($existing)) {
                continue;
            }

            if ($this->datesOverlap($existing, $candidate)) {
                return true;
            }
        }

        return false;
    }

    public function roomNightCommitted(Room $room, CarbonInterface $night, ?Reservation $except = null): bool
    {
        $others = $room->relationLoaded('reservations')
            ? $room->reservations
            : $room->reservations()->get();

        foreach ($others as $existing) {
            if ($except && $existing->id === $except->id) {
                continue;
            }

            if (! $this->occupiesInventory($existing)) {
                continue;
            }

            if ($this->coversNight($existing, $night)) {
                return true;
            }
        }

        return false;
    }

    public function coversNight(Reservation $reservation, CarbonInterface $night): bool
    {
        if (! $reservation->arrival_date || ! $reservation->departure_date) {
            return false;
        }

        $day = $night->copy()->startOfDay();

        return $reservation->arrival_date->lte($day) && $reservation->departure_date->gt($day);
    }

    /**
     * @return list<CarbonInterface>
     */
    public function stayNights(Reservation $reservation): array
    {
        if (! $reservation->arrival_date || ! $reservation->departure_date) {
            return [];
        }

        if ($reservation->departure_date->lte($reservation->arrival_date)) {
            return [];
        }

        $nights = [];
        $cursor = $reservation->arrival_date->copy()->startOfDay();
        $end = $reservation->departure_date->copy()->startOfDay();

        while ($cursor->lt($end)) {
            $nights[] = $cursor->copy();
            $cursor->addDay();
        }

        return $nights;
    }

    public function categoryAvailableToAssign(string $category, CarbonInterface $night, ?Reservation $except = null): int
    {
        $assignable = $this->assignableRooms()->filter(function (Room $room) use ($category) {
            if ($category === '') {
                return true;
            }

            return $this->normalizeRoomType((string) $room->room_type) === $category;
        })->count();

        $committed = $this->allReservations()
            ->filter(function (Reservation $reservation) use ($except, $night, $category) {
                if ($except && $reservation->id === $except->id) {
                    return false;
                }

                if (! $this->deductsInventory($reservation)) {
                    return false;
                }

                if (! $this->coversNight($reservation, $night)) {
                    return false;
                }

                if ($category === '') {
                    return true;
                }

                return $this->categoryKey($reservation, $reservation->room) === $category;
            })
            ->count();

        $remaining = $assignable - $committed;

        return $remaining > 0 ? $remaining : 0;
    }

    /**
     * Physical − OOO − OOS − administrative holds.
     *
     * @return Collection<int, Room>
     */
    public function assignableRooms(): Collection
    {
        return $this->assignableMemo ??= Room::query()
            ->fromInventory()
            ->active()
            ->with(['activeHold', 'activeMaintenanceHold'])
            ->get()
            ->filter(fn (Room $room) => $this->administrativeBlockReason($room) === null)
            ->values();
    }

    /**
     * @return Collection<int, Reservation>
     */
    private function allReservations(): Collection
    {
        return $this->reservationsMemo ??= Reservation::query()->with('room')->get();
    }

    public function physicalRooms(): Collection
    {
        return Room::query()->fromInventory()->active()->get();
    }

    public function holdKind(Room $room, ?Reservation $for = null): ?string
    {
        if ($this->administrativeBlockReason($room) !== null) {
            return self::HOLD_ADMIN;
        }

        $status = $room->roomStatus();
        if (in_array($status, [RoomStatus::OnHoldClean, RoomStatus::OnHoldDirty], true)) {
            return self::HOLD_TIME_OUT_RETAINED;
        }

        if ($for?->status === 'On-Hold' && (int) $for->room_id === (int) $room->id) {
            return self::HOLD_TIME_OUT_RETAINED;
        }

        if ($this->roomHasRetainedStay($room)) {
            return self::HOLD_TIME_OUT_RETAINED;
        }

        $room->loadMissing('activeHold');
        if (! $room->activeHold) {
            return null;
        }

        $reason = strtolower(trim((string) $room->activeHold->reason));
        if (str_contains($reason, 'option')) {
            return self::HOLD_OPTION;
        }

        return self::HOLD_ASSIGNMENT;
    }

    public function timeOutExceedsRetention(Room $room, ?Reservation $for = null): bool
    {
        $limit = ReservationTrainingStandard::timeOutRetentionNights();
        $nights = $this->timeOutNights($room, $for);

        if ($nights === null) {
            $room->loadMissing('activeHold');

            return (bool) $room->activeHold?->over_policy;
        }

        return $nights > $limit;
    }

    public function timeOutNights(Room $room, ?Reservation $for = null): ?int
    {
        $room->loadMissing('activeHold');
        $started = $room->activeHold?->hold_started_at;

        if ($started === null && $for?->status === 'On-Hold' && $for->arrival_date) {
            $started = $for->arrival_date;
        }

        if ($started === null) {
            $retained = $this->retainedStayOn($room);
            $started = $retained?->arrival_date;
        }

        if ($started === null) {
            return null;
        }

        return (int) $started->copy()->startOfDay()->diffInDays(now()->startOfDay());
    }

    /**
     * Seven dimensions. Unknown fields stay null — do not invent.
     *
     * @return array<string, mixed>
     */
    public function sevenState(?Reservation $reservation, ?Room $room = null): array
    {
        $room ??= $reservation?->room;

        $commitment = 'not_committed';
        if ($reservation) {
            if ($this->occupiesPhysically($reservation)) {
                $commitment = 'physically_occupied';
            } elseif ($this->isRetained($reservation)) {
                $commitment = 'retained_committed';
            } elseif ($reservation->status === 'No-Sleep') {
                $commitment = 'no_sleep_still_committed';
            } elseif ($reservation->status === 'No-Show' && $reservation->room_id) {
                $commitment = 'no_show_pending_release';
            } elseif ($this->deductsInventory($reservation)) {
                $commitment = $reservation->room_id
                    ? 'confirmed_committed'
                    : 'unassigned_confirmed_committed';
            }
        }

        $alerts = [];
        if ($room && $this->timeOutExceedsRetention($room, $reservation)) {
            $alerts[] = 'time_out_over_seven_nights';
        }
        if ($reservation?->status === 'No-Sleep') {
            $alerts[] = 'no_sleep_must_not_release';
        }

        return [
            'approval' => $reservation?->approval_status,
            'stay' => $reservation?->status,
            'assignment' => $reservation?->room_id ? 'assigned' : 'unassigned',
            'inventory_commitment' => $commitment,
            'housekeeping' => $room?->status,
            'modification_workflow' => null,
            'exception_alerts' => $alerts,
        ];
    }

    public function isRestricted(Room $room): bool
    {
        $keys = $this->restrictedKeys();
        $number = trim((string) $room->number);
        $dorm = strtolower(trim((string) $room->dorm));

        return isset($keys[$dorm.'|'.$number])
            || isset($keys[$dorm.'|Room '.$number]);
    }

    public function administrativeBlockReason(Room $room): ?string
    {
        $status = $room->roomStatus();

        if ($status === RoomStatus::OutOfService) {
            return 'oos';
        }

        $room->loadMissing('activeMaintenanceHold');

        if ($room->activeMaintenanceHold || $status === RoomStatus::MaintenanceHold) {
            return 'ooo';
        }

        if ($this->availability->isBlocked($room) && $status === RoomStatus::BlockedReserved) {
            return 'blocked';
        }

        if ($this->isRestricted($room)) {
            return 'administrative_inventory_hold';
        }

        return null;
    }

    public function categoryKey(?Reservation $reservation, ?Room $room): string
    {
        $type = $room?->room_type ?: $reservation?->room_type ?: '';

        return $this->normalizeRoomType((string) $type);
    }

    public function normalizeRoomType(string $type): string
    {
        $normalized = strtolower(trim($type));
        $normalized = str_replace(['sr.', 'sr '], 'senior ', $normalized);
        $normalized = (string) preg_replace('/\s+/', ' ', $normalized);

        return trim($normalized);
    }

    private function roomHasRetainedStay(Room $room, ?Reservation $except = null): bool
    {
        return $this->retainedStayOn($room, $except) !== null;
    }

    private function retainedStayOn(Room $room, ?Reservation $except = null): ?Reservation
    {
        $others = $room->relationLoaded('reservations')
            ? $room->reservations
            : $room->reservations()->get();

        return $others->first(function (Reservation $reservation) use ($except) {
            if ($except && $reservation->id === $except->id) {
                return false;
            }

            return $reservation->status === 'On-Hold';
        });
    }

    private function roomHasNoSleepStay(Room $room): bool
    {
        $others = $room->relationLoaded('reservations')
            ? $room->reservations
            : $room->reservations()->get();

        return $others->contains(fn (Reservation $reservation) => $reservation->status === 'No-Sleep');
    }

    /**
     * @return array<string, bool>
     */
    private function restrictedKeys(): array
    {
        if ($this->restrictedKeys !== null) {
            return $this->restrictedKeys;
        }

        $this->restrictedKeys = [];

        if (! Schema::hasTable('room_inventory_out_of_service')) {
            return $this->restrictedKeys;
        }

        RoomInventoryOutOfService::query()
            ->where('is_active', true)
            ->with('location')
            ->get()
            ->each(function (RoomInventoryOutOfService $row): void {
                $location = strtolower(trim((string) ($row->location?->name ?? '')));
                $identifier = trim((string) $row->room_identifier);
                if ($location === '' || $identifier === '') {
                    return;
                }
                $this->restrictedKeys[$location.'|'.$identifier] = true;
                $stripped = preg_replace('/^room\s+/i', '', $identifier) ?? $identifier;
                if ($stripped !== $identifier) {
                    $this->restrictedKeys[$location.'|'.$stripped] = true;
                }
            });

        return $this->restrictedKeys;
    }
}
