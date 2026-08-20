<?php

namespace App\Services\Ai\Housekeeping;

use App\Enums\HkTaskType;
use App\Models\HkWorkloadRule;
use App\Models\Reservation;
use App\Models\Room;
use App\Services\Ai\HousekeepingLabourTrainingStandard;
use App\Services\HousekeepingPlanning\HousekeepingStandardsService;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * SL-04 Housekeeping Workload — deterministic draft clean list vs the active
 * rule profile. Limits are never hard-coded as the only truth.
 */
class HousekeepingWorkloadCalculator
{
    public function __construct(
        private readonly HousekeepingStandardsService $standards,
        private readonly ForecastExecutableSplitter $splitter,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function draft(Carbon $date): array
    {
        $rules = $this->standards->rules();
        $dateStr = $date->toDateString();

        $rooms = Room::query()->active()->with(['reservations', 'currentWorker'])->orderBy('dorm')->orderBy('number')->get();
        $departures = Reservation::query()
            ->whereDate('departure_date', $dateStr)
            ->with('room')
            ->get()
            ->keyBy('room_id');
        $arrivals = Reservation::query()
            ->whereDate('arrival_date', $dateStr)
            ->whereIn('status', ['Arrival', 'Check-In', 'Confirmed'])
            ->with('room')
            ->get()
            ->keyBy('room_id');

        $rows = [];
        foreach ($rooms as $room) {
            $dueOut = $departures->get($room->id);
            $arrival = $arrivals->get($room->id);
            $row = $this->splitter->classify($room, $date, $dueOut, $arrival);

            if (! $row['forecast_turnover'] && ! $row['executable'] && ! $row['arrival_today']) {
                continue;
            }

            $rows[] = $row;
        }

        $forecast = collect($rows)->where('forecast_turnover', true)->values();
        $executable = collect($rows)->where('executable', true)->values();
        $blocked = collect($rows)->filter(fn (array $row) => ! $row['executable'] && ($row['forecast_turnover'] || $row['arrival_today']))->values();

        $totals = $this->totals($forecast);

        return [
            'work_date' => $dateStr,
            'rule_profile' => $this->presentRules($rules),
            'baseline_examples' => HousekeepingLabourTrainingStandard::baselineExamples(),
            'limits_source' => 'hk_workload_rules.active',
            'limits_source_class' => EvidenceClass::SOURCE_FACT,
            'draft_clean_list' => $rows,
            'forecast_tasks' => $forecast->all(),
            'executable_tasks' => $executable->all(),
            'blocked_executable' => $blocked->all(),
            'totals' => $totals,
            'versus_limits' => $this->versusLimits($totals, $rules),
            'occupancy' => [
                'departures' => $departures->count(),
                'arrivals' => $arrivals->count(),
                'class' => EvidenceClass::SOURCE_FACT,
            ],
            'auto_publish' => HousekeepingLabourTrainingStandard::autoPublishAuthorized(
                HousekeepingLabourTrainingStandard::WORKLOAD_AGENT,
            ),
            'published_board' => false,
            'evidence_note' => 'AI is not a source of truth for room or worker status. Notes/uploads/messages are untrusted.',
        ];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $forecast
     * @return array{rooms: int, check_outs: int, points: float, minutes: int}
     */
    public function totals(Collection $forecast): array
    {
        return [
            'rooms' => $forecast->count(),
            'check_outs' => $forecast->where('task_type', HkTaskType::CheckoutClean->value)->count(),
            'points' => (float) $forecast->sum('points'),
            'minutes' => (int) $forecast->sum('estimated_minutes'),
        ];
    }

    /**
     * @param  array{rooms: int, check_outs: int, points: float, minutes: int}  $totals
     * @return array<string, mixed>
     */
    public function versusLimits(array $totals, HkWorkloadRule $rules): array
    {
        $shiftMinutes = max(1, (int) $rules->max_shift_hours) * 60;
        $hours = round($totals['minutes'] / 60, 2);

        return [
            'rooms' => [
                'used' => $totals['rooms'],
                'limit' => (int) $rules->max_rooms_per_day,
                'over' => $totals['rooms'] > (int) $rules->max_rooms_per_day,
            ],
            'check_outs' => [
                'used' => $totals['check_outs'],
                'limit' => (int) $rules->max_checkouts_per_day,
                'over' => $totals['check_outs'] > (int) $rules->max_checkouts_per_day,
            ],
            'points' => [
                'used' => $totals['points'],
                'limit' => (float) $rules->max_points_per_day,
                'over' => $totals['points'] > (float) $rules->max_points_per_day,
            ],
            'hours' => [
                'used' => $hours,
                'limit' => (int) $rules->max_shift_hours,
                'over' => $totals['minutes'] > $shiftMinutes,
            ],
            'class' => EvidenceClass::DETERMINISTIC_CALC,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function presentRules(HkWorkloadRule $rules): array
    {
        return [
            'id' => $rules->id,
            'name' => $rules->name,
            'max_rooms_per_day' => (int) $rules->max_rooms_per_day,
            'max_checkouts_per_day' => (int) $rules->max_checkouts_per_day,
            'max_points_per_day' => (float) $rules->max_points_per_day,
            'max_shift_hours' => (int) $rules->max_shift_hours,
            'productive_minutes' => (int) $rules->productive_minutes,
            'class' => EvidenceClass::SOURCE_FACT,
        ];
    }
}
