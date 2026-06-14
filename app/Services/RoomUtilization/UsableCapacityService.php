<?php

namespace App\Services\RoomUtilization;

use App\Enums\RoomStatus;
use App\Models\HousekeepingTask;
use Carbon\Carbon;
use App\Models\Room;
use App\Models\RoomHold;
use Illuminate\Support\Collection;

class UsableCapacityService
{
    public function __construct(
        private readonly CapacityForecastService $forecastService,
    ) {}

    /**
     * @param  Collection<int, Room>  $activeRooms
     */
    public function calculate(Collection $activeRooms, int $arrivalsTonight): array
    {
        $assignableNow = $activeRooms
            ->filter(fn (Room $room) => $room->roomStatus() === RoomStatus::VacantClean)
            ->count();

        $cleanableForTonight = HousekeepingTask::query()
            ->where('is_complete', false)
            ->where(function ($query) {
                $query->where('arrival_today', true)
                    ->orWhereIn('priority', ['Critical', 'High']);
            })
            ->whereHas('room', fn ($q) => $q->active()->where('status', RoomStatus::VacantDirty->value))
            ->count();

        $usableTonight = $assignableNow + $cleanableForTonight;
        $shortage = max(0, $arrivalsTonight - $usableTonight);

        $inventoryCapacity = $activeRooms->filter(function (Room $room) {
            $status = $room->roomStatus();

            if ($status === null) {
                return false;
            }

            if (in_array($status, [RoomStatus::MaintenanceHold, RoomStatus::OutOfService, RoomStatus::BlockedReserved], true)) {
                return false;
            }

            if ($room->relationLoaded('activeHold') && $room->activeHold && ! $room->activeHold->release_eligible) {
                return false;
            }

            return true;
        })->count();

        return [
            'assignableNow' => $assignableNow,
            'cleanableForTonight' => $cleanableForTonight,
            'usableCapacityTonight' => $usableTonight,
            'projectedShortageTonight' => $shortage,
            'inventoryCapacity' => $inventoryCapacity,
        ];
    }

    public function arrivalsTonight(): int
    {
        return $this->forecastService->arrivalsOn(Carbon::today());
    }
}
