<?php

namespace App\Services\HousekeepingPlanning;

use App\Models\HkForecast;
use App\Models\HkScheduleFeed;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

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

    /**
     * Per-day housekeeper headcount from the latest Accommodation Workforce feed, keyed by
     * Y-m-d. Empty when the feed has not been ingested or carries no day breakdown.
     *
     * @return array<string, int>
     */
    public function liveHousekeeperCounts(): array
    {
        $feed = HkScheduleFeed::query()
            ->where('source', 'housekeeping_schedule')
            ->latest('received_at')
            ->first();

        if (! $feed || ! is_array($feed->payload)) {
            return [];
        }

        $counts = [];
        foreach (($feed->payload['days'] ?? []) as $day) {
            if (is_array($day) && isset($day['date'])) {
                $counts[(string) $day['date']] = (int) ($day['housekeepers'] ?? 0);
            }
        }

        return $counts;
    }

    /**
     * Live housekeeper headcount for a single date, or null when the feed has no entry for it.
     */
    public function liveHousekeeperCountForDate(Carbon $date): ?int
    {
        return $this->liveHousekeeperCounts()[$date->toDateString()] ?? null;
    }

    /**
     * Pull the live housekeeper headcount from the Accommodation Workforce scheduling app and
     * upsert it as the "Housekeeping Schedule" feed. Cached for 10 minutes so a normal page load
     * does not hit the remote API every time, and fails soft (keeps the last feed) when the
     * scheduling app is unreachable or the integration key is not configured.
     */
    public function syncWorkforceHousekeepingFeed(int $days = 7): ?HkScheduleFeed
    {
        $existing = HkScheduleFeed::query()
            ->where('source', 'housekeeping_schedule')
            ->latest('received_at')
            ->first();

        if ($existing && $existing->received_at && $existing->received_at->gt(now()->subMinutes(10))) {
            return $existing;
        }

        $key = config('accommodation_workforce.integration_key');
        if (empty($key)) {
            return $existing;
        }

        $apiBase = rtrim((string) config(
            'accommodation_workforce.scheduling_api_base',
            config('accommodation_workforce.scheduling_base'),
        ), '/');
        $path = config('accommodation_workforce.housekeeping_schedule_path', '/api/integrations/lodgex/housekeeping-schedule');

        $headers = ['X-Lodgex-Key' => (string) $key];
        $hostHeader = config('accommodation_workforce.scheduling_host_header');
        if (! empty($hostHeader)) {
            $headers['Host'] = (string) $hostHeader;
        }

        try {
            $response = Http::timeout(5)
                ->withHeaders($headers)
                ->acceptJson()
                ->get($apiBase.$path, ['days' => $days]);

            if ($response->failed()) {
                return $existing;
            }

            $data = $response->json();
        } catch (\Throwable $e) {
            Log::warning('HousekeepingScheduleIntegration: workforce housekeeping feed fetch failed', [
                'error' => $e->getMessage(),
            ]);

            return $existing;
        }

        if (! is_array($data)) {
            return $existing;
        }

        $today = (int) ($data['today'] ?? 0);
        $peak = (int) collect($data['days'] ?? [])->max('housekeepers');

        $summary = sprintf(
            'Live from Accommodation Workforce: %d housekeeper%s scheduled today; peak %d over the next %d days.',
            $today,
            $today === 1 ? '' : 's',
            $peak,
            $days,
        );

        // Informational only: deltas stay 0 so this feed never skews the labour forecast.
        return HkScheduleFeed::updateOrCreate(
            ['source' => 'housekeeping_schedule'],
            [
                'title' => sprintf('Housekeeping Schedule — %d working today', $today),
                'effective_date' => Carbon::today()->toDateString(),
                'arrivals_delta' => 0,
                'departures_delta' => 0,
                'workforce_delta' => 0,
                'summary' => $summary,
                'payload' => $data,
                'received_at' => now(),
            ],
        );
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
