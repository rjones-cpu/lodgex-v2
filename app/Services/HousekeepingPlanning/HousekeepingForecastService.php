<?php

namespace App\Services\HousekeepingPlanning;

use App\Models\ForecastSnapshot;
use App\Models\HkForecast;
use App\Models\HkWorkTask;
use App\Models\Housekeeper;
use App\Models\Reservation;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class HousekeepingForecastService
{
    public function __construct(
        private readonly HousekeepingStandardsService $standards,
        private readonly HousekeepingScheduleIntegrationService $scheduleIntegration,
    ) {}

    /**
     * @return Collection<int, HkForecast>
     */
    public function build(Carbon $from, int $days = 7): Collection
    {
        $rules = $this->standards->rules();
        $localHousekeepers = Housekeeper::active()->count();
        // When enabled, the live Accommodation Workforce position-based count is the source of
        // truth for how many housekeepers are available; fall back to the local count per day.
        $liveCounts = config('accommodation_workforce.use_live_housekeeper_count', true)
            ? $this->scheduleIntegration->liveHousekeeperCounts()
            : [];
        $forecasts = collect();

        for ($i = 0; $i < $days; $i++) {
            $date = $from->copy()->addDays($i);
            $dateStr = $date->toDateString();
            $activeHousekeepers = $liveCounts[$dateStr] ?? $localHousekeepers;

            $arrivals = Reservation::query()->whereDate('arrival_date', $dateStr)->count();
            $departures = Reservation::query()->whereDate('departure_date', $dateStr)->count();
            $stayovers = Reservation::query()
                ->where('arrival_date', '<', $dateStr)
                ->where('departure_date', '>', $dateStr)
                ->count();

            $tasks = HkWorkTask::query()->forDate($dateStr)->get();
            if ($tasks->isEmpty() && $i === 0) {
                $points = ($departures * 2) + ($arrivals * 2) + ($stayovers * 1);
                $minutes = $points * 13;
            } else {
                $points = (float) $tasks->sum('points');
                $minutes = (int) $tasks->sum('estimated_minutes');
            }

            $required = max(1, (int) ceil($minutes / max(1, $rules->productive_minutes)));
            $shortage = max(0, $required - $activeHousekeepers);

            $snapshot = ForecastSnapshot::query()->whereDate('forecast_date', $dateStr)->first();
            $confidence = $snapshot ? 'high' : 'medium';

            $forecast = HkForecast::query()->whereDate('forecast_date', $date)->first()
                ?? new HkForecast(['forecast_date' => $date->toDateString()]);

            $forecast->fill([
                'arrivals' => $arrivals,
                'departures' => $departures,
                'stayovers' => $stayovers,
                'vacant_dirty' => $tasks->where('task_type', 'checkout_clean')->count(),
                'on_hold_dirty' => $tasks->where('task_type', 'on_hold_dirty_clean')->count(),
                'estimated_points' => $points,
                'estimated_minutes' => $minutes,
                'required_housekeepers' => $required,
                'available_housekeepers' => $activeHousekeepers,
                'shortage_surplus' => -$shortage,
                'confidence' => $confidence,
            ]);
            $forecast->save();

            $forecasts->push($forecast);
        }

        return $forecasts;
    }
}
