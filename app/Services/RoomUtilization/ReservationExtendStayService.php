<?php

namespace App\Services\RoomUtilization;

use App\Models\Reservation;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReservationExtendStayService
{
    public function __construct(
        private readonly UtilizationAuditLogger $auditLogger,
    ) {}

    public function extend(Reservation $reservation, Carbon $newDepartureDate, ?User $user = null): Reservation
    {
        $reservation->loadMissing('worker', 'room');

        if ($reservation->status === 'Check-Out') {
            throw ValidationException::withMessages([
                'reservation' => 'Cannot extend a reservation that has already checked out.',
            ]);
        }

        if (! $reservation->departure_date) {
            throw ValidationException::withMessages([
                'reservation' => 'This reservation has no departure date to extend.',
            ]);
        }

        $currentDeparture = $reservation->departure_date->copy()->startOfDay();
        $newDeparture = $newDepartureDate->copy()->startOfDay();

        if ($newDeparture->lte($currentDeparture)) {
            throw ValidationException::withMessages([
                'new_departure_date' => 'Select a new departure date after the current departure.',
            ]);
        }

        $extraNights = $currentDeparture->diffInDays($newDeparture);

        return DB::transaction(function () use ($reservation, $newDeparture, $user, $currentDeparture, $extraNights) {
            $reservation->update([
                'departure_date' => $newDeparture,
                'status' => 'Extension',
            ]);

            $this->auditLogger->log(
                'reservation',
                $reservation->id,
                'stay_extended',
                'extension',
                $user,
                "Extended {$reservation->worker?->name}'s stay by {$extraNights} night(s) to {$newDeparture->format('M j, Y')}.",
                [
                    'worker_id' => $reservation->worker_id,
                    'previous_departure' => $currentDeparture->toDateString(),
                    'new_departure' => $newDeparture->toDateString(),
                    'extra_nights' => $extraNights,
                ],
            );

            return $reservation->fresh(['worker', 'room']);
        });
    }
}
