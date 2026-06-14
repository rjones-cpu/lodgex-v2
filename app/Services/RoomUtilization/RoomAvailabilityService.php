<?php

namespace App\Services\RoomUtilization;

use App\Enums\RoomStatus;
use App\Models\Room;

class RoomAvailabilityService
{
    public function isAvailableForAssignment(Room $room): bool
    {
        if (! $room->is_active) {
            return false;
        }

        $status = $room->roomStatus();

        if ($status !== RoomStatus::VacantClean) {
            return false;
        }

        if ($room->relationLoaded('activeMaintenanceHold') && $room->activeMaintenanceHold) {
            return false;
        }

        if ($room->relationLoaded('activeHold') && $room->activeHold) {
            return false;
        }

        return true;
    }

    public function isBlocked(Room $room): bool
    {
        $status = $room->roomStatus();

        return in_array($status, [
            RoomStatus::MaintenanceHold,
            RoomStatus::OutOfService,
            RoomStatus::BlockedReserved,
        ], true);
    }

    public function isOnHold(Room $room): bool
    {
        return in_array($room->roomStatus(), [
            RoomStatus::OnHoldClean,
            RoomStatus::OnHoldDirty,
        ], true);
    }

    /**
     * @return array<string, mixed>
     */
    public function roomListItem(Room $room): array
    {
        return [
            'id' => $room->id,
            'room' => $room->number,
            'dorm' => $room->dorm,
            'type' => $room->room_type,
            'status' => $room->status,
            'worker' => $room->currentWorker?->name,
            'company' => $room->company ?? $room->currentWorker?->company,
            'holdDays' => $room->hold_days,
            'updated' => $room->status_updated_at?->format('M j, g:i A') ?? '—',
            'isAvailable' => $this->isAvailableForAssignment($room),
        ];
    }
}
