<?php

namespace App\Services\RoomUtilization;

use App\Enums\RoomStatus;
use App\Models\Room;
use Illuminate\Support\Collection;

class RoomConflictDetector
{
    /**
     * @param  Collection<int, Room>  $rooms
     * @return Collection<int, array<string, mixed>>
     */
    public function detect(Collection $rooms): Collection
    {
        $conflicts = collect();

        $workerAssignments = $rooms
            ->filter(fn (Room $room) => $room->current_worker_id !== null)
            ->groupBy('current_worker_id')
            ->filter(fn (Collection $group) => $group->count() > 1);

        foreach ($workerAssignments as $workerId => $assignedRooms) {
            $roomList = $assignedRooms->pluck('number')->values()->all();
            $roomNumbers = implode(', ', $roomList);
            $first = $assignedRooms->first();
            $workerName = $first->currentWorker?->name ?? "Worker {$workerId}";

            $conflicts->push([
                'code' => 'duplicate_worker_assignment',
                'room' => $first->number,
                // Additive fields used by the new overview's ConflictBar to
                // render worker + all conflicting rooms in a single chip.
                // The existing manager page reads room/dorm/message and is
                // unaffected by these new keys.
                'rooms' => $roomList,
                'worker' => $workerName,
                'dorm' => $first->dorm,
                'status' => $first->status,
                'message' => "Worker is assigned to multiple rooms: {$roomNumbers}.",
                'severity' => 'critical',
            ]);
        }

        $duplicateHolds = $rooms
            ->filter(fn (Room $room) => $room->relationLoaded('holds') && $room->holds->where('is_active', true)->count() > 1);

        foreach ($duplicateHolds as $room) {
            $conflicts->push([
                'code' => 'duplicate_active_holds',
                'room' => $room->number,
                'rooms' => [$room->number],
                'worker' => $room->currentWorker?->name,
                'dorm' => $room->dorm,
                'status' => $room->status,
                'message' => 'Room has more than one active on-hold record.',
                'severity' => 'high',
            ]);
        }

        return $conflicts->unique(fn (array $item) => $item['code'].'|'.$item['room'].'|'.$item['dorm']);
    }
}
