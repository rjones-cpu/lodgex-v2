<?php

namespace App\Services\HousekeepingPlanning;

use App\Models\HkDailyAssignment;
use App\Models\HkWorkTask;
use App\Models\Housekeeper;
use Carbon\Carbon;

class HousekeepingPlanningEngine
{
    public function __construct(
        private readonly HousekeepingStandardsService $standards,
    ) {}

    public function summarize(Carbon $date): HousekeepingPlanningSummary
    {
        $dateStr = $date->toDateString();
        $rules = $this->standards->rules();
        $tasks = HkWorkTask::query()->forDate($dateStr)->with(['room', 'housekeeper'])->get();
        $housekeepers = Housekeeper::active()->count();
        $productive = $housekeepers * $rules->productive_minutes;

        $unassigned = $tasks->whereNull('housekeeper_id')->whereNotIn('status', ['Completed', 'Passed Inspection', 'Cancelled']);
        $readinessRisks = $tasks->filter(fn ($t) => in_array($t->readiness_risk, ['high', 'critical'], true) && ! in_array($t->status, ['Completed', 'Passed Inspection'], true));

        $overloaded = HkDailyAssignment::query()
            ->whereDate('assignment_date', $dateStr)
            ->where('overload_flag', true)
            ->with('housekeeper')
            ->get()
            ->map(fn (HkDailyAssignment $a) => [
                'housekeeper' => $a->housekeeper->fullName(),
                'rooms' => $a->total_rooms,
                'points' => $a->total_points,
                'dorms' => $a->assigned_dorms,
            ]);

        $totalMinutes = (int) $tasks->sum('estimated_minutes');
        $required = max(1, (int) ceil($totalMinutes / max(1, $rules->productive_minutes)));

        return new HousekeepingPlanningSummary(
            totalTasks: $tasks->count(),
            pendingTasks: $tasks->where('status', 'Pending')->count(),
            assignedTasks: $tasks->where('status', 'Assigned')->count(),
            completedTasks: $tasks->whereIn('status', ['Completed', 'Passed Inspection'])->count(),
            unassignedCount: $unassigned->count(),
            arrivalPriorityCount: $tasks->where('arrival_today', true)->count(),
            checkoutCount: $tasks->where('task_type', 'checkout_clean')->count(),
            totalPointsToday: (float) $tasks->sum('points'),
            totalMinutesToday: $totalMinutes,
            activeHousekeepers: $housekeepers,
            availableProductiveMinutes: $productive,
            requiredHousekeepers: $required,
            labourShortage: max(0, $required - $housekeepers),
            unassignedTasks: $unassigned->take(10)->map(fn (HkWorkTask $t) => [
                'room' => $t->room->number,
                'dorm' => $t->room->dorm,
                'taskType' => $t->task_type,
                'priority' => $t->priority,
                'requiredBy' => $t->required_by?->format('g:i A'),
            ]),
            readinessRisks: $readinessRisks->take(8)->map(fn (HkWorkTask $t) => [
                'roomId' => $t->room_id,
                'room' => $t->room->number,
                'dorm' => $t->room->dorm,
                'risk' => $t->readiness_risk,
                'priority' => $t->priority,
                'status' => $t->status,
            ]),
            overloadedHousekeepers: $overloaded,
        );
    }
}
