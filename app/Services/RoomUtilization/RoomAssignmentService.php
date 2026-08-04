<?php

namespace App\Services\RoomUtilization;

use App\Enums\RoomStatus;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\User;
use Illuminate\Support\Collection;
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

    /**
     * Assign Room Inventory (Vacant Clean) rooms to unassigned reservations,
     * depleting the shared pool so two bookings never receive the same room.
     *
     * @param  Collection<int, Reservation>  $reservations
     * @return array{assigned: int, skipped: int, exhausted: bool}
     */
    public function bulkAssignFromInventory(Collection $reservations, ?User $user = null): array
    {
        $targets = $reservations
            ->filter(fn (Reservation $r) => $r->room_id === null && $r->worker_id !== null)
            ->filter(fn (Reservation $r) => ! in_array($r->status, ['No-Show', 'Check-Out', 'No-Sleep'], true))
            ->sortBy(fn (Reservation $r) => $r->arrival_date?->timestamp ?? PHP_INT_MAX)
            ->values();

        if ($targets->isEmpty()) {
            return ['assigned' => 0, 'skipped' => 0, 'exhausted' => false];
        }

        $pool = $this->aiMatching->inventoryAssignableRooms();
        $assigned = 0;
        $skipped = 0;
        $remaining = $targets->count();

        foreach ($targets as $reservation) {
            if ($pool->isEmpty()) {
                $skipped += $remaining;

                return ['assigned' => $assigned, 'skipped' => $skipped, 'exhausted' => true];
            }

            $remaining--;

            $room = $this->aiMatching->bestRoomFromPool($reservation, $pool);
            if (! $room) {
                $skipped++;

                continue;
            }

            try {
                $this->assign(
                    $reservation,
                    $room,
                    $user,
                    method: 'ai',
                    matchScore: $this->aiMatching->score($reservation, $room),
                );
                $assigned++;
                $pool = $pool->reject(fn (Room $r) => $r->id === $room->id)->values();
            } catch (\Throwable) {
                $skipped++;
                $pool = $pool->reject(fn (Room $r) => $r->id === $room->id)->values();
            }
        }

        return [
            'assigned' => $assigned,
            'skipped' => $skipped,
            'exhausted' => $pool->isEmpty() && $skipped > 0,
        ];
    }

    public function assign(
        Reservation $reservation,
        Room $room,
        ?User $user = null,
        string $method = 'manual',
        ?int $matchScore = null,
    ): Reservation {
        $room->loadMissing('activeHold', 'activeMaintenanceHold');
        $reservation->loadMissing('worker', 'room');

        if ($reservation->room_id === $room->id) {
            return $reservation;
        }

        if ($room->room_inventory_location_id === null) {
            throw ValidationException::withMessages([
                'room' => 'Only rooms from Room Inventory can be assigned.',
            ]);
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

            $reservation->update([
                'room_id' => $room->id,
                'allotment_status' => 'Allotted',
            ]);

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

        if ($reservation->status === 'On-Hold') {
            return RoomStatus::OnHoldClean;
        }

        return RoomStatus::AssignedArrival;
    }
}
