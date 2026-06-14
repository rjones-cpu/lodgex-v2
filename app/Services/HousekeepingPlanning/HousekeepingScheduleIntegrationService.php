<?php

namespace App\Services\HousekeepingPlanning;

use App\Models\HkForecast;
use App\Models\HkScheduleFeed;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class HousekeepingScheduleIntegrationService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function ingest(
        string $source,
        string $title,
        Carbon $effectiveDate,
        int $arrivalsDelta,
        int $departuresDelta,
        int $workforceDelta,
        ?string $summary = null,
        array $payload = [],
    ): HkScheduleFeed {
        return HkScheduleFeed::create([
            'source' => $source,
            'title' => $title,
            'effective_date' => $effectiveDate->toDateString(),
            'arrivals_delta' => $arrivalsDelta,
            'departures_delta' => $departuresDelta,
            'workforce_delta' => $workforceDelta,
            'summary' => $summary,
            'payload' => $payload,
            'received_at' => now(),
        ]);
    }

    /**
     * Apply recent schedule deltas to housekeeping labour forecasts.
     */
    public function applyToForecasts(Carbon $from, int $days = 7): void
    {
        $feeds = HkScheduleFeed::query()
            ->whereDate('effective_date', '>=', $from->toDateString())
            ->whereDate('effective_date', '<=', $from->copy()->addDays($days - 1)->toDateString())
            ->get()
            ->groupBy(fn (HkScheduleFeed $f) => $f->effective_date->toDateString());

        for ($i = 0; $i < $days; $i++) {
            $date = $from->copy()->addDays($i);
            $dateStr = $date->toDateString();
            $dayFeeds = $feeds->get($dateStr, collect());

            if ($dayFeeds->isEmpty()) {
                continue;
            }

            $forecast = HkForecast::query()->whereDate('forecast_date', $date)->first();
            if (! $forecast) {
                continue;
            }

            $arrivalDelta = $dayFeeds->sum('arrivals_delta');
            $departureDelta = $dayFeeds->sum('departures_delta');
            $extraPoints = ($arrivalDelta * 2) + ($departureDelta * 2);
            $extraMinutes = (int) ($extraPoints * 13);

            $forecast->update([
                'arrivals' => $forecast->arrivals + $arrivalDelta,
                'departures' => $forecast->departures + $departureDelta,
                'estimated_points' => (float) $forecast->estimated_points + $extraPoints,
                'estimated_minutes' => $forecast->estimated_minutes + $extraMinutes,
                'available_housekeepers' => max(0, $forecast->available_housekeepers + $dayFeeds->sum('workforce_delta')),
            ]);

            $required = max(1, (int) ceil($forecast->estimated_minutes / 480));
            $shortage = max(0, $required - $forecast->available_housekeepers);
            $forecast->update([
                'required_housekeepers' => $required,
                'shortage_surplus' => -$shortage,
                'confidence' => 'medium',
            ]);
        }
    }

    /**
     * @return Collection<int, HkScheduleFeed>
     */
    public function recent(int $limit = 6): Collection
    {
        return HkScheduleFeed::query()->latest('received_at')->limit($limit)->get();
    }

    public function seedDemoFeeds(): void
    {
        if (HkScheduleFeed::query()->exists()) {
            return;
        }

        $today = Carbon::today();

        $this->ingest(
            'company_schedule',
            'Turner Industrial — workforce +12 May 21',
            $today->copy()->addDay(),
            arrivalsDelta: 12,
            departuresDelta: 4,
            workforceDelta: 0,
            summary: 'Individual company schedule: confirmed arrivals uptick for Glen Grade project.',
            payload: ['contractor' => 'Turner Industrial', 'project' => 'Glen Grade Midstream Expansion'],
        );

        $this->ingest(
            'master_project_schedule',
            'Coastal LNG Phase 2 — consolidated movement',
            $today->copy()->addDays(2),
            arrivalsDelta: 28,
            departuresDelta: 15,
            workforceDelta: -2,
            summary: 'Master projects schedule: multi-contractor loading; 2 fewer housekeepers on rotation.',
            payload: ['projects' => ['Coastal LNG Phase 2', 'Solar Field Alpha']],
        );
    }
}
