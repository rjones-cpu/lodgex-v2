<?php

namespace App\Services\RoomUtilization;

use App\Enums\RoomStatus;
use App\Models\Reservation;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReservationCheckInService
{
    public function __construct(
        private readonly UtilizationAuditLogger $auditLogger,
    ) {}

    public function checkIn(Reservation $reservation, ?User $user = null): Reservation
    {
        $reservation->loadMissing('worker', 'room');

        if ($reservation->status === 'Check-In') {
            return $reservation;
        }

        if ($reservation->status === 'Check-Out') {
            throw ValidationException::withMessages([
                'reservation' => 'This worker has already checked out.',
            ]);
        }

        if (! $reservation->room_id || ! $reservation->room) {
            throw ValidationException::withMessages([
                'reservation' => 'Assign a room before checking in this worker.',
            ]);
        }

        return DB::transaction(function () use ($reservation, $user) {
            $room = $reservation->room;

            $reservation->update(['status' => 'Check-In']);

            $room->update([
                'current_worker_id' => $reservation->worker_id,
                'status' => RoomStatus::Occupied->value,
                'company' => $reservation->company ?? $reservation->worker?->company,
                'hold_days' => 0,
                'status_updated_at' => now(),
            ]);

            $this->auditLogger->log(
                'reservation',
                $reservation->id,
                'checked_in',
                'check_in',
                $user,
                "Checked in {$reservation->worker?->name} to room {$room->number} ({$room->dorm}).",
                [
                    'room_id' => $room->id,
                    'room_number' => $room->number,
                    'worker_id' => $reservation->worker_id,
                ],
            );

            return $reservation->fresh(['worker', 'room']);
        });
    }
}
