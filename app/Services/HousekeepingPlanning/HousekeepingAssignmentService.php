<?php

namespace App\Services\HousekeepingPlanning;

use App\Enums\HkTaskType;
use App\Models\HkDailyAssignment;
use App\Models\HkWorkTask;
use App\Models\Housekeeper;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class HousekeepingAssignmentService
{
    public function __construct(
        private readonly HousekeepingStandardsService $standards,
    ) {}

    public function assignForDate(Carbon $date): void
    {
        $rules = $this->standards->rules();
        $housekeepers = Housekeeper::active()->orderBy('primary_dorm')->get();
        $tasks = HkWorkTask::query()
            ->forDate($date->toDateString())
            ->open()
            ->with('room')
            ->orderByRaw("CASE priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END")
            ->get();

        $loads = [];
        foreach ($housekeepers as $hk) {
            $loads[$hk->id] = [
                'housekeeper' => $hk,
                'rooms' => 0,
                'checkouts' => 0,
                'points' => 0.0,
                'minutes' => 0,
                'dorms' => [],
            ];
        }

        foreach ($tasks as $task) {
            if ($task->housekeeper_id) {
                continue;
            }

            $dorm = $task->room->dorm;
            $candidate = collect($loads)
                ->filter(fn (array $load) => $this->canAccept($load, $task, $rules))
                ->sortBy(fn (array $load) => $this->assignmentScore($load, $dorm, $rules))
                ->keys()
                ->first();

            if (! $candidate) {
                continue;
            }

            $task->update([
                'housekeeper_id' => $candidate,
                'status' => 'Assigned',
            ]);

            $loads[$candidate]['rooms']++;
            if ($task->task_type === HkTaskType::CheckoutClean->value) {
                $loads[$candidate]['checkouts']++;
            }
            $loads[$candidate]['points'] += (float) $task->points;
            $loads[$candidate]['minutes'] += $task->estimated_minutes;
            $loads[$candidate]['dorms'][$dorm] = true;
        }

        foreach ($loads as $housekeeperId => $load) {
            $hk = $load['housekeeper'];
            $overload = $load['points'] > $hk->max_points
                || $load['rooms'] > $hk->max_rooms
                || $load['checkouts'] > $hk->max_checkouts;

            HkDailyAssignment::updateOrCreate(
                [
                    'assignment_date' => $date->toDateString(),
                    'housekeeper_id' => (int) $housekeeperId,
                ],
                [
                    'total_rooms' => $load['rooms'],
                    'total_checkouts' => $load['checkouts'],
                    'total_points' => $load['points'],
                    'total_minutes' => $load['minutes'],
                    'assigned_dorms' => implode(', ', array_keys($load['dorms'])),
                    'status' => 'Published',
                    'overload_flag' => $overload,
                ],
            );
        }
    }

    /**
     * Recompute one housekeeper's daily assignment row from their currently-assigned tasks.
     * Used after manual reassignment edits so totals, dorm list, and overload flag stay accurate.
     *
     * NOTE: Looks up the existing row via whereDate() rather than a strict string equality match.
     * SQLite stores `date` columns as TEXT and Laravel's `date` cast serializes with `H:i:s`, so
     * a plain WHERE assignment_date = '2026-05-20' would miss a row stored as '2026-05-20 00:00:00'
     * and trigger a UNIQUE constraint violation on (assignment_date, housekeeper_id).
     */
    public function recalculateForHousekeeper(Housekeeper $housekeeper, Carbon $date): HkDailyAssignment
    {
        $tasks = HkWorkTask::query()
            ->forDate($date->toDateString())
            ->where('housekeeper_id', $housekeeper->id)
            ->with('room')
            ->get();

        $rooms = $tasks->count();
        $checkouts = $tasks->where('task_type', HkTaskType::CheckoutClean->value)->count();
        $points = (float) $tasks->sum('points');
        $minutes = (int) $tasks->sum('estimated_minutes');
        $dorms = $tasks->pluck('room.dorm')->filter()->unique()->sort()->values();

        $overload = $points > $housekeeper->max_points
            || $rooms > $housekeeper->max_rooms
            || $checkouts > $housekeeper->max_checkouts;

        $payload = [
            'total_rooms' => $rooms,
            'total_checkouts' => $checkouts,
            'total_points' => $points,
            'total_minutes' => $minutes,
            'assigned_dorms' => $dorms->implode(', '),
            'status' => 'Published',
            'overload_flag' => $overload,
        ];

        $existing = HkDailyAssignment::query()
            ->whereDate('assignment_date', $date->toDateString())
            ->where('housekeeper_id', $housekeeper->id)
            ->first();

        if ($existing) {
            $existing->update($payload);
            return $existing->refresh();
        }

        return HkDailyAssignment::create(array_merge($payload, [
            'assignment_date' => $date->toDateString(),
            'housekeeper_id' => $housekeeper->id,
        ]));
    }

    /**
     * @param  array{housekeeper: Housekeeper, rooms: int, checkouts: int, points: float, minutes: int, dorms: array<string, bool>}  $load
     */
    private function canAccept(array $load, HkWorkTask $task, $rules): bool
    {
        $hk = $load['housekeeper'];
        $isCheckout = $task->task_type === HkTaskType::CheckoutClean->value;

        return $load['rooms'] < $hk->max_rooms
            && $load['points'] + $task->points <= $hk->max_points
            && (! $isCheckout || $load['checkouts'] < $hk->max_checkouts);
    }

    /**
     * @param  array{housekeeper: Housekeeper, rooms: int, checkouts: int, points: float, minutes: int, dorms: array<string, bool>}  $load
     */
    private function assignmentScore(array $load, string $dorm, $rules): int
    {
        $hk = $load['housekeeper'];
        $score = (int) ($load['points'] * 10) + ($load['rooms'] * 5);

        if ($hk->primary_dorm === $dorm) {
            $score -= 50;
        } elseif (isset($load['dorms'][$dorm])) {
            $score -= 25;
        } elseif ($rules->prefer_single_dorm && count($load['dorms']) > 0) {
            $score += 30;
        }

        return $score;
    }
}
