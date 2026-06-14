<?php

namespace App\Services\RoomUtilization;

use App\Enums\RoomStatus;
use App\Models\Reservation;
use App\Models\Room;
use Illuminate\Support\Collection;

class RoomAiMatchingService
{
    public function __construct(
        private readonly RoomAvailabilityService $availability,
    ) {}

    public function bestRoomFor(Reservation $reservation): ?Room
    {
        return $this->bestRoomFromPool($reservation, $this->assignableRooms());
    }

    /**
     * Pick the highest-scoring room from a pre-fetched pool. Lets callers (e.g.
     * the dashboard) score many reservations against one query instead of
     * re-fetching the assignable rooms for each row.
     *
     * @param  Collection<int, Room>  $rooms
     */
    public function bestRoomFromPool(Reservation $reservation, Collection $rooms): ?Room
    {
        if ($rooms->isEmpty()) {
            return null;
        }

        $reservation->loadMissing('worker');

        return $rooms
            ->sort(function (Room $a, Room $b) use ($reservation) {
                $scoreCompare = $this->score($reservation, $b) <=> $this->score($reservation, $a);
                if ($scoreCompare !== 0) {
                    return $scoreCompare;
                }

                return strcmp($a->number, $b->number);
            })
            ->first();
    }

    public function score(Reservation $reservation, Room $room): int
    {
        $score = 50;

        $requestedType = strtolower($reservation->room_type ?? '');
        $roomType = strtolower($room->room_type ?? '');

        if ($requestedType !== '' && $roomType !== '') {
            if ($requestedType === $roomType) {
                $score += 25;
            } elseif (
                (str_contains($requestedType, 'single') && str_contains($roomType, 'single'))
                || (str_contains($requestedType, 'double') && str_contains($roomType, 'double'))
            ) {
                $score += 20;
            }
        }

        $company = $reservation->company ?? $reservation->worker?->company;
        if ($company && $room->company && strcasecmp($company, $room->company) === 0) {
            $score += 15;
        } elseif (! $room->company) {
            $score += 5;
        }

        $gender = $reservation->worker?->gender;
        if ($gender === 'Female' && str_contains($room->dorm, "Women")) {
            $score += 20;
        } elseif ($gender === 'Male' && str_contains($room->dorm, "Women")) {
            $score -= 50;
        }

        if ($reservation->ai_match_score) {
            $score += (int) round($reservation->ai_match_score / 10);
        }

        return $score;
    }

    /**
     * @return Collection<int, Room>
     */
    public function assignableRooms(): Collection
    {
        return Room::query()
            ->active()
            ->where('status', RoomStatus::VacantClean->value)
            ->whereNull('current_worker_id')
            ->with(['activeHold', 'activeMaintenanceHold'])
            ->get()
            ->filter(fn (Room $room) => $this->availability->isAvailableForAssignment($room))
            ->values();
    }
}
