<?php

namespace App\Services\Ai;

use App\Enums\RoomStatus;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\RoomInventoryOutOfService;
use App\Services\RoomUtilization\RoomAvailabilityService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

/**
 * Vacant Clean availability for Room Inventory Intelligence (SL-02 + SL-03).
 *
 * A room is available only when status is Vacant Clean and it is not held,
 * blocked, assigned, restricted (inventory OOS), or on maintenance.
 * Uses live rooms_old / reservation / hold fields — no second status model.
 */
class RoomInventoryAvailabilityInspector
{
    /**
     * Reservation statuses that no longer occupy a room.
     *
     * @var list<string>
     */
    public const TERMINAL_STATUSES = ['No-Show', 'Check-Out', 'No-Sleep'];

    /** @var array<string, bool>|null */
    private ?array $restrictedKeys = null;

    public function __construct(
        private readonly RoomAvailabilityService $availability,
    ) {}

    public function isAvailable(Room $room, ?Reservation $for = null): bool
    {
        return $this->unavailableReasons($room, $for) === [];
    }

    /**
     * @return list<string>
     */
    public function unavailableReasons(Room $room, ?Reservation $for = null): array
    {
        $reasons = [];

        if (! $room->is_active) {
            $reasons[] = 'inactive';
        }

        $status = $room->roomStatus();
        if ($status !== RoomStatus::VacantClean) {
            $reasons[] = 'not_vacant_clean';
        }

        if ($room->current_worker_id) {
            $reasons[] = 'assigned';
        }

        $room->loadMissing(['activeHold', 'activeMaintenanceHold']);

        if ($room->activeHold) {
            $reasons[] = 'held';
        }

        if ($room->activeMaintenanceHold || $status === RoomStatus::MaintenanceHold) {
            $reasons[] = 'maintenance';
        }

        if ($this->availability->isBlocked($room)) {
            $reasons[] = 'blocked';
        }

        if ($this->isRestricted($room)) {
            $reasons[] = 'restricted';
        }

        if ($for !== null && $this->hasOverlappingReservation($room, $for)) {
            $reasons[] = 'reservation_overlap';
        }

        return array_values(array_unique($reasons));
    }

    /**
     * @return Collection<int, Room>
     */
    public function availableRooms(?Reservation $for = null): Collection
    {
        return Room::query()
            ->fromInventory()
            ->active()
            ->where('status', RoomStatus::VacantClean->value)
            ->whereNull('current_worker_id')
            ->with(['activeHold', 'activeMaintenanceHold'])
            ->orderBy('dorm')
            ->orderByRaw('CAST(number AS UNSIGNED)')
            ->get()
            ->filter(fn (Room $room) => $this->isAvailable($room, $for))
            ->values();
    }

    public function occupiesInventory(Reservation $reservation): bool
    {
        return $reservation->room_id !== null
            && ! in_array($reservation->status, self::TERMINAL_STATUSES, true);
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

    public function isRestricted(Room $room): bool
    {
        $keys = $this->restrictedKeys();
        $number = trim((string) $room->number);
        $dorm = strtolower(trim((string) $room->dorm));

        return isset($keys[$dorm.'|'.$number])
            || isset($keys[$dorm.'|Room '.$number]);
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
