<?php

namespace App\Services\RoomUtilization;

use App\Enums\RoomStatus;
use App\Models\Room;
use Illuminate\Support\Collection;

class RoomStatusValidator
{
    public function __construct(
        private readonly RoomAvailabilityService $availability,
    ) {}

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function validate(Room $room): Collection
    {
        $issues = collect();
        $status = $room->roomStatus();

        if ($status === null) {
            return collect([$this->issue($room, 'invalid_status', 'Room has an unrecognized status value.', 'critical')]);
        }

        if ($status->isAssignable() && $room->current_worker_id) {
            $issues->push($this->issue($room, 'assignable_with_worker', 'Room is Vacant Clean but still has a worker assigned.', 'high'));
        }

        if (in_array($status, [RoomStatus::Occupied, RoomStatus::AssignedArrival], true) && ! $room->current_worker_id) {
            $issues->push($this->issue($room, 'occupied_without_worker', 'Room is occupied or assigned but has no worker on record.', 'high'));
        }

        if ($this->availability->isOnHold($room) && (! $room->relationLoaded('activeHold') || ! $room->activeHold)) {
            $issues->push($this->issue($room, 'hold_missing_record', 'Room status is on-hold but no active hold record exists.', 'high'));
        }

        if ($room->relationLoaded('activeHold') && $room->activeHold && ! $this->availability->isOnHold($room)) {
            $issues->push($this->issue($room, 'hold_status_mismatch', 'Active hold exists but room status is not an on-hold status.', 'medium'));
        }

        if ($status === RoomStatus::MaintenanceHold && (! $room->relationLoaded('activeMaintenanceHold') || ! $room->activeMaintenanceHold)) {
            $issues->push($this->issue($room, 'maintenance_missing_record', 'Room is on maintenance hold without an active maintenance record.', 'high'));
        }

        if ($room->relationLoaded('activeMaintenanceHold') && $room->activeMaintenanceHold && $status !== RoomStatus::MaintenanceHold) {
            $issues->push($this->issue($room, 'maintenance_status_mismatch', 'Active maintenance hold exists but room status does not reflect maintenance.', 'medium'));
        }

        if ($this->availability->isAvailableForAssignment($room) && $room->activeMaintenanceHold) {
            $issues->push($this->issue($room, 'available_with_maintenance', 'Room appears assignable but has an active maintenance hold.', 'critical'));
        }

        if ($room->relationLoaded('activeHold') && $room->activeHold && ! $room->activeHold->return_date) {
            $issues->push($this->issue($room, 'hold_missing_return_date', 'On-hold room has no return date on file.', 'medium'));
        }

        if ($room->relationLoaded('activeMaintenanceHold') && $room->activeMaintenanceHold?->overdue) {
            $issues->push($this->issue($room, 'maintenance_overdue', 'Maintenance hold is past estimated return-to-service.', 'medium'));
        }

        return $issues;
    }

    /**
     * @param  Collection<int, Room>  $rooms
     * @return Collection<int, array<string, mixed>>
     */
    public function validateAll(Collection $rooms): Collection
    {
        return $rooms->flatMap(fn (Room $room) => $this->validate($room));
    }

    /**
     * @return array<string, mixed>
     */
    private function issue(Room $room, string $code, string $message, string $severity): array
    {
        return [
            'code' => $code,
            'room' => $room->number,
            'dorm' => $room->dorm,
            'status' => $room->status,
            'message' => $message,
            'severity' => $severity,
        ];
    }
}
