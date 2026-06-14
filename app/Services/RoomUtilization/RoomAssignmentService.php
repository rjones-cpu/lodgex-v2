<?php

namespace App\Services\RoomUtilization;

use App\Enums\RoomStatus;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RoomAssignmentService
{
    public function __construct(
        private readonly RoomAvailabilityService $availability,
        private readonly UtilizationAuditLogger $auditLogger,
        private readonly RoomAiMatchingService $aiMatching,
    ) {}

    public function aiAssign(Reservation $reservation, ?User $user = null): Reservation
    {
        $reservation->loadMissing('worker', 'room');

        $room = $this->aiMatching->bestRoomFor($reservation);

        if (! $room) {
            throw ValidationException::withMessages([
                'room' => 'No assignable room matched this reservation.',
            ]);
        }

        return $this->assign(
            $reservation,
            $room,
            $user,
            method: 'ai',
            matchScore: $this->aiMatching->score($reservation, $room),
        );
    }

    public function assign(
        Reservation $reservation,
        Room $room,
        ?User $user = null,
        string $method = 'manual',
        ?int $matchScore = null,
    ): Reservation
    {
        $room->loadMissing('activeHold', 'activeMaintenanceHold');
        $reservation->loadMissing('worker', 'room');

        if ($reservation->room_id === $room->id) {
            return $reservation;
        }

        if (! $this->availability->isAvailableForAssignment($room)) {
            throw ValidationException::withMessages([
                'room' => 'This room is not available for assignment.',
            ]);
        }

        if (! $reservation->worker_id) {
            throw ValidationException::withMessages([
                'reservation' => 'This reservation has no worker to assign.',
            ]);
        }

        return DB::transaction(function () use ($reservation, $room, $user, $method, $matchScore) {
            $previousRoom = $reservation->room;

            if ($previousRoom && $previousRoom->id !== $room->id) {
                $this->releaseRoom($previousRoom, $reservation);
            }

            $reservation->update(['room_id' => $room->id]);

            $room->update([
                'current_worker_id' => $reservation->worker_id,
                'status' => $this->targetRoomStatus($reservation)->value,
                'company' => $reservation->company ?? $reservation->worker?->company,
                'status_updated_at' => now(),
            ]);

            $methodLabel = $method === 'ai' ? 'AI assigned' : 'Assigned';

            $this->auditLogger->log(
                'reservation',
                $reservation->id,
                $method === 'ai' ? 'room_ai_assigned' : 'room_assigned',
                'assignment',
                $user,
                "{$methodLabel} room {$room->number} ({$room->dorm}) to {$reservation->worker?->name}.",
                [
                    'room_id' => $room->id,
                    'room_number' => $room->number,
                    'worker_id' => $reservation->worker_id,
                    'previous_room_id' => $previousRoom?->id,
                    'method' => $method,
                    'match_score' => $matchScore,
                ],
            );

            return $reservation->fresh(['worker', 'room']);
        });
    }

    private function releaseRoom(Room $room, Reservation $reservation): void
    {
        if ($room->current_worker_id !== null && $room->current_worker_id !== $reservation->worker_id) {
            return;
        }

        $wasOccupied = $room->status === RoomStatus::Occupied->value
            || $reservation->status === 'Check-In';

        $room->update([
            'current_worker_id' => null,
            'hold_days' => 0,
            'status' => $wasOccupied ? RoomStatus::VacantDirty->value : RoomStatus::VacantClean->value,
            'status_updated_at' => now(),
        ]);
    }

    private function targetRoomStatus(Reservation $reservation): RoomStatus
    {
        if ($reservation->status === 'Check-In') {
            return RoomStatus::Occupied;
        }

        return RoomStatus::AssignedArrival;
    }
}
