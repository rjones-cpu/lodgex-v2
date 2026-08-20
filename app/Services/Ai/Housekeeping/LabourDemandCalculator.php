<?php

namespace App\Services\Ai\Housekeeping;

use App\Models\ForecastSnapshot;
use App\Models\HkForecast;
use App\Models\HkWorkloadRule;
use App\Models\Housekeeper;
use App\Models\Reservation;
use App\Services\Ai\HousekeepingLabourTrainingStandard;
use App\Services\HousekeepingPlanning\HousekeepingScheduleIntegrationService;
use App\Services\HousekeepingPlanning\HousekeepingStandardsService;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * SL-11 Labour Forecast — required workers = max(minutes, points, rooms,
 * check-outs, coverage, skill). Horizons and Check-Out-to-Ready-Time windows.
 * Pools stay separate. A daily average is not enough.
 */
class LabourDemandCalculator
{
    /**
     * @var array<string, int>
     */
    public const HORIZON_DAYS = [
        'today' => 1,
        '24h' => 2,
        '3d' => 3,
        '7d' => 7,
        '14d' => 14,
        '30d' => 30,
    ];

    public function __construct(
        private readonly HousekeepingStandardsService $standards,
        private readonly HousekeepingWorkloadCalculator $workload,
        private readonly HousekeepingScheduleIntegrationService $scheduleIntegration,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function forecast(Carbon $from): array
    {
        $rules = $this->standards->rules();
        $horizons = [];

        foreach (HousekeepingLabourTrainingStandard::HORIZONS as $horizon) {
            $days = self::HORIZON_DAYS[$horizon];
            $series = $this->series($from, $days, $rules);
            $peak = $series->sortByDesc(fn (array $day) => $day['required_workers'])->first();

            $horizons[$horizon] = [
                'horizon' => $horizon,
                'days' => $days,
                'series' => $series->all(),
                'peak_required' => $peak['required_workers'] ?? 0,
                'peak_date' => $peak['date'] ?? $from->toDateString(),
                'average_required' => $series->avg(fn (array $day) => $day['required_workers']),
                'note' => $horizon === 'today' || $horizon === '24h'
                    ? 'Windowed Check-Out-to-Ready-Time demand is authoritative; daily average is not enough.'
                    : 'Peak day required workers, not the daily average, is the planning figure.',
                'class' => EvidenceClass::DETERMINISTIC_CALC,
            ];
        }

        $today = $horizons['today']['series'][0] ?? null;

        return [
            'as_of' => $from->toDateString(),
            'rule_profile' => $this->workload->presentRules($rules),
            'horizons' => $horizons,
            'today' => $today,
            'pools' => $today['pools'] ?? $this->emptyPools(),
            'auto_publish' => HousekeepingLabourTrainingStandard::autoPublishAuthorized(
                HousekeepingLabourTrainingStandard::LABOUR_AGENT,
            ),
            'overtime_authorized' => false,
            'roster_published' => false,
            'evidence_note' => 'AI is not a source of truth for worker status. Required workers is deterministic max() math.',
        ];
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function series(Carbon $from, int $days, ?HkWorkloadRule $rules = null): Collection
    {
        $rules ??= $this->standards->rules();
        $out = collect();

        for ($i = 0; $i < $days; $i++) {
            $date = $from->copy()->addDays($i);
            $out->push($this->forDate($date, $rules));
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    public function forDate(Carbon $date, ?HkWorkloadRule $rules = null): array
    {
        $rules ??= $this->standards->rules();
        $draft = $this->workload->draft($date);
        $totals = $draft['totals'];
        $forecastRows = collect($draft['forecast_tasks']);

        $occupancy = $this->occupancyCount($date);
        $history = $this->history($date);
        $available = $this->availableByPool($date);
        $windows = $this->windowDemand($forecastRows, $rules, $available);

        $binding = $this->requiredWorkers($totals, $forecastRows, $rules, $available);
        $required = $binding['required'];
        $availableTotal = array_sum($available);
        $shortage = max(0, $required - $availableTotal);
        $surplus = max(0, $availableTotal - $required);

        $readinessRisk = $this->readinessRisk($draft, $shortage, $windows);

        return [
            'date' => $date->toDateString(),
            'occupancy' => $occupancy,
            'occupancy_class' => EvidenceClass::SOURCE_FACT,
            'hk_demand' => $totals,
            'hk_demand_class' => EvidenceClass::DETERMINISTIC_CALC,
            'history' => $history,
            'constraints' => $binding['constraints'],
            'binding_constraint' => $binding['binding'],
            'required_workers' => $required,
            'required_workers_class' => EvidenceClass::DETERMINISTIC_CALC,
            'available_workers' => $availableTotal,
            'available_by_pool' => $available,
            'shortage' => $shortage,
            'surplus' => $surplus,
            'pools' => $this->poolDemand($forecastRows, $available, $rules),
            'windows' => $windows,
            'daily_average_insufficient' => true,
            'readiness_risk' => $readinessRisk,
            'versus_limits' => $draft['versus_limits'],
        ];
    }

    /**
     * Required workers = max(minutes, points, rooms, check-outs, coverage, skill).
     *
     * @param  array{rooms: int, check_outs: int, points: float, minutes: int}  $totals
     * @param  Collection<int, array<string, mixed>>  $forecastRows
     * @param  array<string, int>  $available
     * @return array{required: int, binding: string, constraints: array<string, int>}
     */
    public function requiredWorkers(array $totals, Collection $forecastRows, HkWorkloadRule $rules, array $available): array
    {
        $productive = max(1, (int) ($rules->productive_minutes ?: 480));
        $maxPoints = max(0.1, (float) $rules->max_points_per_day);
        $maxRooms = max(1, (int) $rules->max_rooms_per_day);
        $maxCheckouts = max(1, (int) $rules->max_checkouts_per_day);

        $fromMinutes = (int) ceil($totals['minutes'] / $productive);
        $fromPoints = (int) ceil($totals['points'] / $maxPoints);
        $fromRooms = (int) ceil($totals['rooms'] / $maxRooms);
        $fromCheckouts = (int) ceil($totals['check_outs'] / $maxCheckouts);
        $fromCoverage = $this->coverageRequired($forecastRows);
        $fromSkill = $this->skillRequired($forecastRows);

        $constraints = [
            'minutes' => $fromMinutes,
            'points' => $fromPoints,
            'rooms' => $fromRooms,
            'check_outs' => $fromCheckouts,
            'coverage' => $fromCoverage,
            'skill' => $fromSkill,
        ];

        $required = max($constraints);
        $binding = array_search($required, $constraints, true);
        if ($binding === false) {
            $binding = 'minutes';
        }

        return [
            'required' => max(0, $required),
            'binding' => (string) $binding,
            'constraints' => $constraints,
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $forecastRows
     * @param  array<string, int>  $available
     * @return list<array<string, mixed>>
     */
    public function windowDemand(Collection $forecastRows, HkWorkloadRule $rules, array $available): array
    {
        $windows = HousekeepingLabourTrainingStandard::checkoutToReadyWindows();
        $checkouts = $forecastRows->where('task_type', 'checkout_clean')->values();
        $count = $checkouts->count();
        $bucketSize = max(1, (int) ceil($count / max(1, count($windows))));

        $out = [];
        foreach ($windows as $index => $window) {
            $slice = $checkouts->slice($index * $bucketSize, $bucketSize)->values();
            $totals = [
                'rooms' => $slice->count(),
                'check_outs' => $slice->count(),
                'points' => (float) $slice->sum('points'),
                'minutes' => (int) $slice->sum('estimated_minutes'),
            ];
            $binding = $this->requiredWorkers($totals, $slice, $rules, $available);
            $out[] = [
                'label' => $window['label'],
                'from' => $window['from'],
                'to' => $window['to'],
                'check_outs' => $slice->count(),
                'minutes' => $totals['minutes'],
                'points' => $totals['points'],
                'required_workers' => $binding['required'],
                'binding_constraint' => $binding['binding'],
                'constraints' => $binding['constraints'],
                'class' => EvidenceClass::DETERMINISTIC_CALC,
            ];
        }

        return $out;
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $forecastRows
     */
    public function coverageRequired(Collection $forecastRows): int
    {
        if ($forecastRows->isEmpty()) {
            return 0;
        }

        $dorms = $forecastRows->pluck('dorm')->filter()->unique()->count();
        $minimum = HousekeepingLabourTrainingStandard::coverageMinimum();

        return max($minimum, $dorms);
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $forecastRows
     */
    public function skillRequired(Collection $forecastRows): int
    {
        $inspection = $forecastRows->where('pool', 'inspection')->count()
            + $forecastRows->where('task_type', 'arrival_prep')->count()
            + $forecastRows->filter(fn (array $row) => ($row['priority'] ?? '') === 'Critical')->count();

        if ($inspection < 1) {
            return 0;
        }

        return max(1, (int) ceil($inspection / 8));
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $forecastRows
     * @param  array<string, int>  $available
     * @return array<string, array<string, mixed>>
     */
    public function poolDemand(Collection $forecastRows, array $available, HkWorkloadRule $rules): array
    {
        $pools = [];
        foreach (HousekeepingLabourTrainingStandard::STAFFING_POOLS as $pool) {
            $rows = $forecastRows->where('pool', $pool);
            $minutes = (int) $rows->sum('estimated_minutes');
            $productive = max(1, (int) ($rules->productive_minutes ?: 480));
            $required = $minutes > 0 ? (int) ceil($minutes / $productive) : 0;
            if ($pool === 'inspection') {
                $required = max($required, $this->skillRequired($forecastRows->where('pool', 'inspection')));
            }
            $have = $available[$pool] ?? 0;
            $pools[$pool] = [
                'required' => $required,
                'available' => $have,
                'shortage' => max(0, $required - $have),
                'surplus' => max(0, $have - $required),
                'tasks' => $rows->count(),
                'minutes' => $minutes,
            ];
        }

        return $pools;
    }

    /**
     * @return array<string, int>
     */
    public function availableByPool(Carbon $date): array
    {
        $counts = array_fill_keys(HousekeepingLabourTrainingStandard::STAFFING_POOLS, 0);
        $housekeepers = Housekeeper::active()->get();

        $live = config('accommodation_workforce.use_live_housekeeper_count', true)
            ? $this->scheduleIntegration->liveHousekeeperCountForDate($date)
            : null;

        if ($housekeepers->isEmpty()) {
            $fallback = (int) ($live ?? 0);
            $counts['attendant'] = $fallback;

            return $counts;
        }

        foreach ($housekeepers as $housekeeper) {
            $pool = $this->poolForHousekeeper($housekeeper);
            $counts[$pool]++;
        }

        return $counts;
    }

    public function poolForHousekeeper(Housekeeper $housekeeper): string
    {
        $role = strtolower(trim((string) $housekeeper->role));
        $skill = strtolower(trim((string) $housekeeper->skill_level));

        return match (true) {
            str_contains($role, 'inspect') => 'inspection',
            str_contains($role, 'laundry') => 'laundry',
            str_contains($role, 'public') || $role === 'pa' => 'public_area',
            str_contains($role, 'special') || str_contains($role, 'deep') => 'special_work',
            $skill === 'senior' && str_contains($role, 'inspect') => 'inspection',
            default => 'attendant',
        };
    }

    /**
     * @return array<string, mixed>
     */
    public function occupancyCount(Carbon $date): array
    {
        $dateStr = $date->toDateString();

        $inHouse = Reservation::query()
            ->whereDate('arrival_date', '<=', $dateStr)
            ->whereDate('departure_date', '>', $dateStr)
            ->whereIn('status', ForecastExecutableSplitter::OCCUPYING_STATUSES)
            ->count();

        $arrivals = Reservation::query()->whereDate('arrival_date', $dateStr)->count();
        $departures = Reservation::query()->whereDate('departure_date', $dateStr)->count();

        return [
            'in_house' => $inHouse,
            'arrivals' => $arrivals,
            'departures' => $departures,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function history(Carbon $date): array
    {
        $hk = HkForecast::query()->whereDate('forecast_date', $date->toDateString())->first();
        $snapshot = ForecastSnapshot::query()->whereDate('forecast_date', $date->toDateString())->first();

        return [
            'hk_forecast' => $hk ? [
                'required_housekeepers' => $hk->required_housekeepers,
                'available_housekeepers' => $hk->available_housekeepers,
                'estimated_points' => (float) $hk->estimated_points,
                'confidence' => $hk->confidence,
            ] : null,
            'forecast_snapshot' => $snapshot ? [
                'arrivals' => $snapshot->arrivals,
                'departures' => $snapshot->departures,
                'available' => $snapshot->available,
                'shortage' => $snapshot->shortage,
                'risk_level' => $snapshot->risk_level,
            ] : null,
            'class' => EvidenceClass::SOURCE_FACT,
        ];
    }

    /**
     * @param  array<string, mixed>  $draft
     * @param  list<array<string, mixed>>  $windows
     */
    public function readinessRisk(array $draft, int $shortage, array $windows): string
    {
        $blocked = count($draft['blocked_executable'] ?? []);
        $windowPeak = collect($windows)->max('required_workers') ?? 0;
        $todayRequired = $draft['versus_limits']['hours']['over'] ?? false;

        if ($shortage >= 2 || $blocked >= 5 || $windowPeak >= 8) {
            return 'critical';
        }
        if ($shortage >= 1 || $blocked >= 1 || $todayRequired) {
            return 'high';
        }
        if (($draft['versus_limits']['points']['over'] ?? false) || ($draft['versus_limits']['check_outs']['over'] ?? false)) {
            return 'medium';
        }

        return 'low';
    }

    /**
     * @return array<string, array<string, int>>
     */
    private function emptyPools(): array
    {
        $pools = [];
        foreach (HousekeepingLabourTrainingStandard::STAFFING_POOLS as $pool) {
            $pools[$pool] = [
                'required' => 0,
                'available' => 0,
                'shortage' => 0,
                'surplus' => 0,
                'tasks' => 0,
                'minutes' => 0,
            ];
        }

        return $pools;
    }
}
