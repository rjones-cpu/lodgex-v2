<?php

namespace App\Services\RoomInventory;

use App\Enums\RoomStatus;
use App\Models\Room;
use App\Models\RoomInventoryLocation;
use App\Models\RoomInventoryOutOfService;

/**
 * Materializes Room Inventory locations into concrete `rooms` rows so the rest
 * of the system (Housekeeping, Room Utilization, Dashboard, Reports) sees the
 * inventory-built rooms automatically — those modules all read the `rooms`
 * table and filter on `status` / `is_active`.
 *
 * Safety guarantees:
 *   - Never deletes rooms.
 *   - Never changes status of an occupied room (worker assigned).
 *   - Only touches rooms it created (linked via room_inventory_location_id).
 */
class RoomInventorySyncService
{
    public function __construct(
        private readonly RoomInventoryAvailabilityService $availability,
    ) {}

    /**
     * Ensure concrete rooms exist (1..total_rooms) for a location, with the
     * correct room type per the category split. Surplus rooms (when a location
     * shrinks) are retired, not deleted.
     */
    public function syncLocation(RoomInventoryLocation $location): void
    {
        $total = (int) $location->total_rooms;

        $oosNumbers = RoomInventoryOutOfService::query()
            ->where('room_inventory_location_id', $location->id)
            ->where('is_active', true)
            ->pluck('room_identifier')
            ->map(fn ($v) => (string) (int) $v)
            ->all();

        // Every room previously generated for this location, keyed by number.
        $existing = Room::query()
            ->where('room_inventory_location_id', $location->id)
            ->get()
            ->keyBy(fn (Room $room) => (string) (int) $room->number);

        for ($n = 1; $n <= $total; $n++) {
            $key = (string) $n;
            $type = $this->roomTypeLabel($this->availability->inferCategoryForLocationRoom($location, $n));
            $isOos = in_array($key, $oosNumbers, true);

            $room = $existing->get($key);
            if ($room) {
                $this->updateManagedRoom($room, $location, $type, $isOos);
                $existing->forget($key);
            } else {
                Room::create([
                    'number' => $key,
                    'dorm' => $location->name,
                    'room_inventory_location_id' => $location->id,
                    'room_type' => $type,
                    'status' => $isOos ? RoomStatus::OutOfService->value : RoomStatus::VacantClean->value,
                    'is_active' => ! $isOos,
                    'status_updated_at' => now(),
                ]);
            }
        }

        // Anything left over is beyond the new total — retire it.
        foreach ($existing as $room) {
            $this->retireRoom($room);
        }
    }

    /**
     * Retire all rooms for a location (used before the location is deleted).
     * Occupied rooms are left active; the FK nulls their link on delete.
     */
    public function retireLocationRooms(RoomInventoryLocation $location): void
    {
        Room::query()
            ->where('room_inventory_location_id', $location->id)
            ->get()
            ->each(fn (Room $room) => $this->retireRoom($room));
    }

    /**
     * Reflect an inventory out-of-service mark on the concrete room.
     */
    public function applyOutOfService(RoomInventoryOutOfService $oos): void
    {
        $room = $this->matchRoom($oos);
        if (! $room) {
            return;
        }

        // Don't pull an occupied room out from under a worker.
        if ($room->roomStatus() === RoomStatus::Occupied || $room->current_worker_id) {
            return;
        }

        $room->status = RoomStatus::OutOfService->value;
        $room->is_active = false;
        $room->status_updated_at = now();
        $room->save();
    }

    /**
     * Restore a concrete room when its inventory hold is returned to service.
     */
    public function returnOutOfService(RoomInventoryOutOfService $oos): void
    {
        $room = $this->matchRoom($oos);
        if (! $room) {
            return;
        }

        if ($room->roomStatus() === RoomStatus::OutOfService) {
            $room->status = RoomStatus::VacantClean->value;
        }
        $room->is_active = true;
        $room->status_updated_at = now();
        $room->save();
    }

    private function updateManagedRoom(Room $room, RoomInventoryLocation $location, string $type, bool $isOos): void
    {
        $room->dorm = $location->name;
        $room->room_type = $type;

        if ($isOos) {
            // Mirror inventory OOS, but never override an occupied room.
            if ($room->roomStatus() !== RoomStatus::Occupied && ! $room->current_worker_id) {
                $room->status = RoomStatus::OutOfService->value;
                $room->is_active = false;
            }
        } elseif (! $room->is_active && ! $room->current_worker_id) {
            // Re-activate a previously retired room (e.g. location grew again).
            $room->is_active = true;
            if ($room->roomStatus() === RoomStatus::OutOfService) {
                $room->status = RoomStatus::VacantClean->value;
            }
        }

        $room->save();
    }

    private function retireRoom(Room $room): void
    {
        // Keep occupied rooms — they must not vanish from the system.
        if ($room->roomStatus() === RoomStatus::Occupied || $room->current_worker_id) {
            return;
        }

        if ($room->is_active) {
            $room->is_active = false;
            $room->status_updated_at = now();
            $room->save();
        }
    }

    private function matchRoom(RoomInventoryOutOfService $oos): ?Room
    {
        if (! $oos->room_inventory_location_id) {
            return null;
        }

        return Room::query()
            ->where('room_inventory_location_id', $oos->room_inventory_location_id)
            ->where('number', (string) (int) $oos->room_identifier)
            ->first();
    }

    private function roomTypeLabel(string $category): string
    {
        return match ($category) {
            'executive' => 'Executive',
            'senior_executive' => 'Senior Executive',
            'wellsite' => 'Wellsite',
            default => 'Executive',
        };
    }
}
