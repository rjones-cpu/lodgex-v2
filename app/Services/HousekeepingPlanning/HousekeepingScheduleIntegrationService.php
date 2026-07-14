<?php

namespace App\Services\HousekeepingPlanning;

use App\Models\HkForecast;
use App\Models\HkScheduleFeed;
use App\Models\Housekeeper;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class HousekeepingScheduleIntegrationService
{
    /** Marks housekeepers mirrored from the Accommodation Workforce schedule. */
    private const WORKFORCE_SOURCE = 'accommodation_workforce';

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

    /**
     * Roster of housekeepers from the Accommodation Workforce schedule, each with their current
     * rotation dates. Read-only pull from the scheduling app's
     * /api/integrations/lodgex/housekeepers endpoint. Cached for 5 minutes and fails soft to an
     * empty list when the scheduling app is unreachable or the integration key is not configured.
     *
     * @return list<array<string, mixed>>
     */
    public function fetchHousekeepersRoster(): array
    {
        $key = config('accommodation_workforce.integration_key');
        if (empty($key)) {
            return [];
        }

        $cacheKey = 'hk_workforce_roster';
        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return $cached;
        }

        $apiBase = rtrim((string) config(
            'accommodation_workforce.scheduling_api_base',
            config('accommodation_workforce.scheduling_base'),
        ), '/');
        $path = config('accommodation_workforce.housekeepers_path', '/api/integrations/lodgex/housekeepers');

        $headers = ['X-Lodgex-Key' => (string) $key];
        $hostHeader = config('accommodation_workforce.scheduling_host_header');
        if (! empty($hostHeader)) {
            $headers['Host'] = (string) $hostHeader;
        }

        try {
            $response = Http::timeout(5)
                ->withHeaders($headers)
                ->acceptJson()
                ->get($apiBase.$path);

            if ($response->failed()) {
                return [];
            }

            $data = $response->json();
        } catch (\Throwable $e) {
            Log::warning('HousekeepingScheduleIntegration: housekeepers roster fetch failed', [
                'error' => $e->getMessage(),
            ]);

            return [];
        }

        $rows = is_array($data) ? ($data['housekeepers'] ?? []) : [];

        $roster = collect($rows)->map(fn ($r) => [
            'name' => $r['name'] ?? '—',
            'company' => $r['company'] ?? null,
            'shift' => $r['shift'] ?? null,
            'campId' => $r['camp_id'] ?? null,
            'room' => $r['room'] ?? null,
            'rotationStart' => $r['rotation_start'] ?? null,
            'rotationEnd' => $r['rotation_end'] ?? null,
            'status' => $r['status'] ?? 'not_scheduled',
            // Stable per-worker id from the scheduling app, used to match the local
            // housekeeper record so a name change never creates a duplicate.
            'externalRef' => $r['worker_id'] ?? $r['booking_id'] ?? $r['id'] ?? null,
        ])->values()->all();

        Cache::put($cacheKey, $roster, now()->addMinutes(5));

        return $roster;
    }

    /**
     * Mirror the Accommodation Workforce housekeeper roster into the local `housekeepers`
     * table so the assignment engine and the Edit Assignment editor (which both rely on
     * housekeepers.id foreign keys) operate on the people the workforce module schedules.
     *
     * Upserts each rostered housekeeper (matched by name) and deactivates anyone no longer
     * on the roster — deactivation, not deletion, keeps existing task/assignment history and
     * foreign keys intact while dropping them from assignment pickers.
     *
     * Fail-soft: when the roster is empty (integration key not configured or the scheduling
     * app is unreachable) this is a no-op, preserving any locally-seeded housekeepers so the
     * module stays demoable offline.
     *
     * @return int number of housekeepers active after the sync
     */
    public function syncWorkforceHousekeepersRoster(): int
    {
        $roster = $this->fetchHousekeepersRoster();

        if (empty($roster)) {
            return Housekeeper::active()->count();
        }

        $syncedIds = [];

        foreach ($roster as $row) {
            $name = trim((string) ($row['name'] ?? ''));
            if ($name === '' || $name === '—') {
                continue;
            }

            [$first, $last] = $this->splitRosterName($name);
            $externalRef = $this->normalizeRosterRef($row['externalRef'] ?? null);

            $values = [
                'first_name' => $first,
                'last_name' => $last,
                'shift' => $this->normalizeRosterShift($row['shift'] ?? null),
                'is_active' => $this->rosterStatusIsActive($row['status'] ?? null),
            ];

            // Prefer matching on the scheduling app's stable id so a renamed worker
            // updates in place; fall back to name when the roster carries no id.
            if ($externalRef !== null) {
                $match = ['external_source' => self::WORKFORCE_SOURCE, 'external_ref' => $externalRef];
            } else {
                $match = ['first_name' => $first, 'last_name' => $last];
                $values['external_source'] = self::WORKFORCE_SOURCE;
            }

            $housekeeper = Housekeeper::updateOrCreate($match, $values);

            $syncedIds[] = $housekeeper->id;
        }

        // Anyone not present on the current workforce roster falls out of the active set.
        Housekeeper::query()
            ->when($syncedIds !== [], fn ($q) => $q->whereNotIn('id', $syncedIds))
            ->where('is_active', true)
            ->update(['is_active' => false]);

        return count(array_unique($syncedIds));
    }

    /**
     * Split a roster "name" into first + last: first token is the first name, the remainder
     * (if any) is the last name. Falls back to an empty last name for single-token names.
     *
     * @return array{0: string, 1: string}
     */
    private function splitRosterName(string $name): array
    {
        $parts = preg_split('/\s+/', trim($name), 2) ?: [$name];

        return [$parts[0] ?? $name, $parts[1] ?? ''];
    }

    private function normalizeRosterShift(?string $shift): string
    {
        $shift = trim((string) $shift);

        return $shift !== '' ? substr($shift, 0, 20) : 'Day';
    }

    /**
     * Normalize the scheduling app's worker id to a non-empty string, or null when it is
     * missing/zero so the caller falls back to name matching.
     */
    private function normalizeRosterRef(mixed $ref): ?string
    {
        if ($ref === null) {
            return null;
        }

        $ref = trim((string) $ref);

        return ($ref === '' || $ref === '0') ? null : $ref;
    }

    /**
     * Only housekeepers actively on rotation are assignable today. Off-day, upcoming,
     * completed and not-scheduled workers are excluded from the assignment pickers.
     */
    private function rosterStatusIsActive(?string $status): bool
    {
        return (string) $status === 'on_rotation';
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
