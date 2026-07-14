<?php

namespace App\Http\Controllers;

use App\Models\HkAiRecommendation;
use App\Models\HkAuditLog;
use App\Models\HkDailyAssignment;
use App\Models\HkWorkTask;
use App\Models\HkForecast;
use App\Models\HkInspection;
use App\Models\Housekeeper;
use App\Services\HousekeepingPlanning\HkAuditLogger;
use App\Services\HousekeepingPlanning\HousekeepingAdvisorService;
use App\Services\HousekeepingPlanning\HousekeepingAssignmentService;
use App\Services\HousekeepingPlanning\HousekeepingForecastService;
use App\Services\HousekeepingPlanning\HousekeepingPlanningEngine;
use App\Services\HousekeepingPlanning\HousekeepingPlanningSummary;
use App\Services\HousekeepingPlanning\HousekeepingScheduleIntegrationService;
use App\Services\HousekeepingPlanning\HousekeepingScenarioService;
use App\Services\HousekeepingPlanning\HousekeepingTaskGenerationService;
use App\Services\RoomUtilization\CapacityForecastService;
use App\Services\RoomUtilization\RoomStatusEngine;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HousekeepingPlanningController extends Controller
{
    public function __construct(
        private readonly HousekeepingTaskGenerationService $taskGeneration,
        private readonly HousekeepingAssignmentService $assignmentService,
        private readonly HousekeepingForecastService $forecastService,
        private readonly HousekeepingPlanningEngine $planningEngine,
        private readonly HousekeepingAdvisorService $advisorService,
        private readonly HkAuditLogger $auditLogger,
        private readonly HousekeepingScenarioService $scenarioService,
        private readonly HousekeepingScheduleIntegrationService $scheduleIntegration,
        private readonly RoomStatusEngine $roomStatusEngine,
        private readonly CapacityForecastService $capacityForecastService,
    ) {}

    public function index(): Response
    {
        $today = Carbon::today();
        $this->taskGeneration->sync($today);
        // Mirror the Accommodation Workforce housekeeper roster into the local housekeepers
        // table so assignments and the Edit Assignment editor use the workforce-scheduled
        // people. No-op (keeps seeded data) when the workforce integration is not configured.
        $this->scheduleIntegration->syncWorkforceHousekeepersRoster();
        $this->ensureAssignmentsForActiveHousekeepers($today);
        if (! \App\Models\HkScheduleFeed::query()->exists()) {
            $this->scheduleIntegration->seedDemoFeeds();
        }
        // Pull the live housekeeper headcount from the Accommodation Workforce schedules.
        $this->scheduleIntegration->syncWorkforceHousekeepingFeed(7);
        $this->scheduleIntegration->applyToForecasts($today, 7);
        $forecasts = $this->forecastService->build($today, 7);
        $summary = $this->planningEngine->summarize($today);
        $this->advisorService->sync($summary);

        return Inertia::render('HousekeepingPlanningManager', [
            'metrics' => $this->buildMetrics($summary),
            'planningSummary' => $summary->toArray(),
            'tasks' => $this->buildTasks($today),
            'assignments' => $this->buildAssignments($today),
            'housekeepers' => $this->buildHousekeepers(),
            'housekeepersRoster' => $this->scheduleIntegration->fetchHousekeepersRoster(),
            'forecasts' => $forecasts->map(fn (HkForecast $f) => [
                'date' => $f->forecast_date->format('M j'),
                'arrivals' => $f->arrivals,
                'departures' => $f->departures,
                'points' => (float) $f->estimated_points,
                'required' => $f->required_housekeepers,
                'available' => $f->available_housekeepers,
                'shortage' => max(0, -$f->shortage_surplus),
                'confidence' => $f->confidence,
            ])->values()->all(),
            'inspections' => $this->buildInspections(),
            'productivity' => $this->buildProductivity($today),
            'aiRecommendations' => $this->buildAiRecommendations(),
            'recentAudit' => $this->buildRecentAudit(),
            'roomUtilization' => $this->buildRoomUtilizationContext(),
            'scheduleFeeds' => $this->buildScheduleFeeds(),
            'scenarioPresets' => $this->scenarioService->presets(),
            'lastUpdated' => now()->format('M j, Y g:i A'),
        ]);
    }

    /**
     * Keep today's assignment board aligned with the currently-active (workforce-sourced)
     * housekeepers. Builds the board when none exists yet, and — after a roster change has
     * deactivated the people who held today's work — frees their unfinished tasks and
     * redistributes them to the active housekeepers. Without this, the Assignments tab and
     * its Edit modal would reference housekeepers that no longer appear in the active list.
     */
    private function ensureAssignmentsForActiveHousekeepers(Carbon $today): void
    {
        $activeHkIds = Housekeeper::active()->pluck('id');

        // No active roster yet (e.g. a transient sync) — leave any existing board untouched.
        if ($activeHkIds->isEmpty()) {
            return;
        }

        $dateStr = $today->toDateString();

        if (! HkDailyAssignment::query()->whereDate('assignment_date', $today)->exists()) {
            $this->assignmentService->assignForDate($today);

            return;
        }

        $hasStaleAssignments = HkDailyAssignment::query()
            ->whereDate('assignment_date', $today)
            ->whereNotIn('housekeeper_id', $activeHkIds)
            ->exists();

        if (! $hasStaleAssignments) {
            return;
        }

        // Free unfinished work held by housekeepers who are no longer active (finished work
        // stays attributed to whoever completed it).
        HkWorkTask::query()
            ->forDate($dateStr)
            ->whereNotNull('housekeeper_id')
            ->whereNotIn('housekeeper_id', $activeHkIds)
            ->whereNotIn('status', ['Completed', 'Passed Inspection'])
            ->update(['housekeeper_id' => null, 'status' => 'Pending']);

        // Drop their stale assignment rows, then redistribute the freed work to active staff.
        HkDailyAssignment::query()
            ->whereDate('assignment_date', $today)
            ->whereNotIn('housekeeper_id', $activeHkIds)
            ->delete();

        $this->assignmentService->assignForDate($today);
    }

    public function runScenario(Request $request): RedirectResponse
    {
        $validated = $request->validate(['scenario' => 'required|string|max:50']);
        $summary = $this->planningEngine->summarize(Carbon::today());
        $result = $this->scenarioService->run($validated['scenario'], $summary);

        $this->auditLogger->log(
            'scenario',
            null,
            'run',
            $validated['scenario'],
            $request->user(),
            $result['title'] ?? 'Scenario run',
            ['result' => $result],
        );

        return redirect()->back()->with([
            'toast' => 'Scenario calculated — '.$result['title'],
            'scenarioResult' => $result,
        ]);
    }

    public function approveRecommendation(Request $request, HkAiRecommendation $recommendation): RedirectResponse
    {
        $recommendation->update([
            'status' => 'Approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        $this->auditLogger->logRecommendation($recommendation, 'approved', $request->user(), 'Recommendation approved for operational action.');

        return redirect()->back()->with('toast', 'Housekeeping recommendation approved.');
    }

    public function dismissRecommendation(Request $request, HkAiRecommendation $recommendation): RedirectResponse
    {
        $recommendation->update(['status' => 'Dismissed']);
        $this->auditLogger->logRecommendation($recommendation, 'dismissed', $request->user());

        return redirect()->back()->with('toast', 'Housekeeping recommendation dismissed.');
    }

    public function publishAssignments(Request $request): RedirectResponse
    {
        $today = Carbon::today();
        HkWorkTask::query()
            ->forDate($today->toDateString())
            ->whereNotIn('status', ['Completed', 'Passed Inspection'])
            ->update(['housekeeper_id' => null, 'status' => 'Pending']);
        HkDailyAssignment::query()->whereDate('assignment_date', $today)->delete();
        $this->assignmentService->assignForDate($today);
        $this->auditLogger->log('assignment_board', null, 'published', 'assignment', $request->user(), 'Assignment board regenerated.');

        return redirect()->back()->with('toast', 'Daily assignments published.');
    }

    /**
     * Manually reassign one or more tasks (rooms) to different housekeepers (or unassign).
     * Used by the Assignments tab editor in the UI. Warns on overload but does not block.
     */
    public function reassignTasks(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'changes' => 'required|array|min:1',
            'changes.*.taskId' => 'required|integer|exists:hk_work_tasks,id',
            'changes.*.housekeeperId' => 'nullable|integer|exists:housekeepers,id',
        ]);

        $today = Carbon::today();
        $dateStr = $today->toDateString();
        $affectedHousekeeperIds = [];
        $appliedCount = 0;
        $skippedCount = 0;

        foreach ($validated['changes'] as $change) {
            /** @var HkWorkTask|null $task */
            $task = HkWorkTask::query()
                ->whereKey($change['taskId'])
                ->whereDate('work_date', $dateStr)
                ->first();

            if (! $task) {
                $skippedCount++;
                continue;
            }

            // Don't allow re-routing tasks that are already done.
            if (in_array($task->status, ['Completed', 'Passed Inspection'], true)) {
                $skippedCount++;
                continue;
            }

            $previousHkId = $task->housekeeper_id;
            $newHkId = $change['housekeeperId'] ?? null;

            if ($previousHkId === $newHkId) {
                continue; // no-op
            }

            $task->update([
                'housekeeper_id' => $newHkId,
                'status' => $newHkId ? 'Assigned' : 'Pending',
            ]);

            $this->auditLogger->log(
                'hk_work_task',
                $task->id,
                'reassigned',
                'rebalance',
                $request->user(),
                sprintf(
                    'Room %s (%s) reassigned: %s → %s',
                    optional($task->room)->number ?? '—',
                    optional($task->room)->dorm ?? '—',
                    $this->housekeeperLabel($previousHkId),
                    $this->housekeeperLabel($newHkId),
                ),
                ['previousHousekeeperId' => $previousHkId, 'newHousekeeperId' => $newHkId],
            );

            if ($previousHkId) $affectedHousekeeperIds[$previousHkId] = true;
            if ($newHkId)      $affectedHousekeeperIds[$newHkId]      = true;
            $appliedCount++;
        }

        // Recompute every affected housekeeper's totals + dorm list + overload flag.
        $overloads = [];
        foreach (array_keys($affectedHousekeeperIds) as $hkId) {
            $hk = Housekeeper::find($hkId);
            if (! $hk) continue;
            $row = $this->assignmentService->recalculateForHousekeeper($hk, $today);
            if ($row->overload_flag) $overloads[] = $hk->fullName();
        }

        $toast = $appliedCount === 0
            ? 'No assignment changes applied.'
            : sprintf('%d assignment%s updated.', $appliedCount, $appliedCount === 1 ? '' : 's');

        if ($skippedCount > 0) $toast .= " {$skippedCount} skipped (completed or invalid).";
        if (! empty($overloads)) $toast .= ' Overload: '.implode(', ', $overloads);

        return redirect()->back()->with('toast', $toast);
    }

    private function housekeeperLabel(?int $id): string
    {
        if (! $id) return 'Unassigned';
        return Housekeeper::find($id)?->fullName() ?? "HK#{$id}";
    }

    /**
     * Render the printable publish-form sheets (one per housekeeper) for today's workload.
     * Format follows docs/Housekeeping_Workload_Publish_Form: cover + master roster + per-HK sheets.
     */
    public function publishSheet(): Response
    {
        $today = Carbon::today();
        $dateStr = $today->toDateString();

        $assignments = HkDailyAssignment::query()
            ->whereDate('assignment_date', $today)
            ->with('housekeeper')
            ->get()
            ->sortBy(fn ($a) => $a->housekeeper?->fullName())
            ->values();

        $tasks = HkWorkTask::query()
            ->forDate($dateStr)
            ->with(['room', 'housekeeper'])
            ->get();

        $housekeeperSheets = $assignments->map(function (HkDailyAssignment $a) use ($tasks) {
            $hk = $a->housekeeper;
            $hkTasks = $tasks
                ->where('housekeeper_id', $hk?->id)
                ->sortBy([
                    fn ($t1, $t2) => optional($t1->required_by)->getTimestamp() <=> optional($t2->required_by)->getTimestamp(),
                    fn ($t1, $t2) => $this->priorityRank($t1->priority) <=> $this->priorityRank($t2->priority),
                    fn ($t1, $t2) => strcmp((string) optional($t1->room)->number, (string) optional($t2->room)->number),
                ])
                ->values()
                ->map(fn (HkWorkTask $t, int $i) => $this->formatTaskRow($t, $i + 1))
                ->all();

            return [
                'housekeeperId' => $hk?->id,
                'housekeeper' => $hk?->fullName() ?? '—',
                'shift' => $hk?->shift ?: 'Day Shift',
                'primaryDorm' => $hk?->primary_dorm ?: '—',
                'totalRooms' => $a->total_rooms,
                'totalCheckouts' => $a->total_checkouts,
                'totalPoints' => (float) $a->total_points,
                'totalMinutes' => $a->total_minutes,
                'assignedDorms' => $a->assigned_dorms ?: '—',
                'overload' => (bool) $a->overload_flag,
                'tasks' => $hkTasks,
            ];
        })->values()->all();

        // Master roster across all housekeepers (PDF page 2)
        $masterRoster = $tasks
            ->sortBy([
                fn ($t1, $t2) => strcmp((string) optional($t1->housekeeper)->fullName(), (string) optional($t2->housekeeper)->fullName()),
                fn ($t1, $t2) => optional($t1->required_by)->getTimestamp() <=> optional($t2->required_by)->getTimestamp(),
                fn ($t1, $t2) => strcmp((string) optional($t1->room)->number, (string) optional($t2->room)->number),
            ])
            ->values()
            ->map(fn (HkWorkTask $t) => array_merge(
                ['housekeeper' => $t->housekeeper?->fullName() ?? '— Unassigned —'],
                $this->formatTaskRow($t, 0),
            ))
            ->all();

        $shiftName = $assignments->first()?->housekeeper?->shift ?: 'Day Shift';

        return Inertia::render('HousekeepingPublishSheet', [
            'cover' => [
                'workloadDate' => $today->format('Y-m-d'),
                'workloadDateLong' => $today->format('l, F j, Y'),
                'shift' => $shiftName,
                'totalRooms' => (int) $assignments->sum('total_rooms'),
                'totalCheckouts' => (int) $assignments->sum('total_checkouts'),
                'totalPoints' => (float) $assignments->sum('total_points'),
                'totalMinutes' => (int) $assignments->sum('total_minutes'),
                'housekeeperCount' => $assignments->count(),
                'taskCount' => $tasks->count(),
                'generatedAt' => now()->format('M j, Y g:i A'),
            ],
            'sheets' => $housekeeperSheets,
            'masterRoster' => $masterRoster,
        ]);
    }

    private function priorityRank(?string $priority): int
    {
        return match ($priority) {
            'Critical' => 1,
            'High' => 2,
            'Medium' => 3,
            'Low' => 4,
            default => 5,
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function formatTaskRow(HkWorkTask $t, int $seq): array
    {
        return [
            'seq' => $seq,
            'room' => $t->room?->number ?? '—',
            'dorm' => $t->room?->dorm ?? '—',
            'roomStatus' => $this->humanize($t->room?->status),
            'taskType' => $this->humanize($t->task_type),
            'priority' => $t->priority ?? 'Normal',
            'requiredBy' => $t->required_by?->format('H:i') ?? '—',
            'points' => (float) $t->points,
            'minutes' => (int) $t->estimated_minutes,
            'status' => $t->status ?? 'Pending',
            'inspect' => $t->inspection_required ? 'Yes' : 'No',
            'notes' => $t->notes ?? '',
        ];
    }

    private function humanize(?string $value): string
    {
        if ($value === null || $value === '') {
            return '—';
        }

        return ucwords(str_replace(['_', '-'], ' ', strtolower($value)));
    }

    /**
     * @return array<string, mixed>
     */
    private function buildRoomUtilizationContext(): array
    {
        $ruSummary = $this->roomStatusEngine->summarize();
        $ruForecast = $this->capacityForecastService->build($ruSummary);
        $outlook7 = $ruForecast->outlook['7d'] ?? [];

        return [
            'url' => route('room-utilization'),
            'assignableNow' => $ruSummary->assignableNow,
            'vacantDirty' => $ruSummary->vacantDirty,
            'cleanableTonight' => $ruSummary->cleanableForTonight,
            'onHold' => $ruSummary->onHold,
            'overPolicyHolds' => $ruSummary->overPolicyHolds,
            'projectedShortageTonight' => $ruSummary->projectedShortageTonight,
            'usableCapacityTonight' => $ruSummary->usableCapacityTonight,
            'peakRisk7d' => $outlook7['peakRisk'] ?? 'low',
            'peakShortage7d' => $outlook7['peakShortage'] ?? 0,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildScheduleFeeds(): array
    {
        return $this->scheduleIntegration->recent()->map(fn ($feed) => [
            'id' => $feed->id,
            'source' => $feed->source,
            'title' => $feed->title,
            'effectiveDate' => $feed->effective_date->format('M j, Y'),
            'arrivalsDelta' => $feed->arrivals_delta,
            'departuresDelta' => $feed->departures_delta,
            'workforceDelta' => $feed->workforce_delta,
            'summary' => $feed->summary,
            'receivedAt' => $feed->received_at?->format('M j, g:i A'),
        ])->values()->all();
    }

    /**
     * @return list<array{label: string, icon: string, value: string, change: string, direction: string}>
     */
    private function buildMetrics(HousekeepingPlanningSummary $summary): array
    {
        return [
            ['label' => 'Tasks Today', 'icon' => '🧹', 'value' => (string) $summary->totalTasks, 'change' => "{$summary->unassignedCount} unassigned", 'direction' => 'down'],
            ['label' => 'Points Today', 'icon' => '📊', 'value' => number_format($summary->totalPointsToday, 1), 'change' => "{$summary->totalMinutesToday} min", 'direction' => 'up'],
            ['label' => 'Arrival Priority', 'icon' => '🏃', 'value' => (string) $summary->arrivalPriorityCount, 'change' => 'Same-day arrivals', 'direction' => 'down'],
            ['label' => 'Check-Out Cleans', 'icon' => '☑️', 'value' => (string) $summary->checkoutCount, 'change' => 'Turnovers', 'direction' => 'up'],
            ['label' => 'Active Housekeepers', 'icon' => '👥', 'value' => (string) $summary->activeHousekeepers, 'change' => "Need {$summary->requiredHousekeepers}", 'direction' => 'up'],
            ['label' => 'Labour Gap', 'icon' => '⚠️', 'value' => (string) $summary->labourShortage, 'change' => $summary->labourShortage > 0 ? 'Shortage' : 'OK', 'direction' => $summary->labourShortage > 0 ? 'down' : 'up'],
            ['label' => 'Readiness Risks', 'icon' => '🛏️', 'value' => (string) $summary->readinessRisks->count(), 'change' => 'At-risk rooms', 'direction' => 'down'],
            ['label' => 'Completed', 'icon' => '✅', 'value' => (string) $summary->completedTasks, 'change' => "{$summary->assignedTasks} assigned", 'direction' => 'up'],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildTasks(Carbon $date): array
    {
        return HkWorkTask::query()
            ->forDate($date->toDateString())
            ->with(['room', 'housekeeper'])
            ->orderByRaw("CASE priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END")
            ->get()
            ->map(fn (HkWorkTask $t) => [
                'id' => $t->id,
                'room' => $t->room->number,
                'dorm' => $t->room->dorm,
                'taskType' => str_replace('_', ' ', $t->task_type),
                'priority' => $t->priority,
                'points' => $t->points,
                'minutes' => $t->estimated_minutes,
                'status' => $t->status,
                'housekeeper' => $t->housekeeper?->fullName() ?? '—',
                'housekeeperId' => $t->housekeeper_id,
                'requiredBy' => $t->required_by?->format('g:i A') ?? '—',
                'risk' => $t->readiness_risk,
                'arrivalToday' => $t->arrival_today,
                'locked' => in_array($t->status, ['Completed', 'Passed Inspection'], true),
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildAssignments(Carbon $date): array
    {
        return HkDailyAssignment::query()
            ->whereDate('assignment_date', $date)
            ->with('housekeeper')
            ->orderBy('total_points', 'desc')
            ->get()
            ->map(fn (HkDailyAssignment $a) => [
                'housekeeperId' => $a->housekeeper_id,
                'housekeeper' => $a->housekeeper->fullName(),
                'dorms' => $a->assigned_dorms ?? '—',
                'rooms' => $a->total_rooms,
                'checkouts' => $a->total_checkouts,
                'points' => $a->total_points,
                'minutes' => $a->total_minutes,
                'status' => $a->status,
                'overload' => $a->overload_flag,
            ])
            ->values()
            ->all();
    }

    /**
     * Active housekeepers with their workload limits — used by the Assignments editor modal
     * to show capacity headroom when reassigning rooms manually.
     *
     * @return list<array<string, mixed>>
     */
    private function buildHousekeepers(): array
    {
        return Housekeeper::active()
            ->orderBy('first_name')
            ->get()
            ->map(fn (Housekeeper $hk) => [
                'id' => $hk->id,
                'name' => $hk->fullName(),
                'shift' => $hk->shift,
                'primaryDorm' => $hk->primary_dorm,
                'skill' => $hk->skill_level,
                'maxRooms' => $hk->max_rooms,
                'maxCheckouts' => $hk->max_checkouts,
                'maxPoints' => (float) $hk->max_points,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildInspections(): array
    {
        return HkInspection::query()
            ->with(['room', 'task'])
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn (HkInspection $i) => [
                'room' => $i->room->number,
                'dorm' => $i->room->dorm,
                'result' => $i->result,
                'score' => $i->score,
                'reclean' => $i->reclean_required,
                'inspector' => $i->inspector_name ?? '—',
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildProductivity(Carbon $date): array
    {
        return Housekeeper::active()
            ->withCount(['workTasks as completed_count' => fn ($q) => $q->forDate($date->toDateString())->whereIn('status', ['Completed', 'Passed Inspection'])])
            ->get()
            ->map(fn (Housekeeper $hk) => [
                'housekeeper' => $hk->fullName(),
                'dorm' => $hk->primary_dorm,
                'completed' => $hk->completed_count,
                'skill' => $hk->skill_level,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildAiRecommendations(): array
    {
        return HkAiRecommendation::query()
            ->whereNotIn('status', ['Superseded'])
            ->orderByRaw("CASE risk_level WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END")
            ->get()
            ->map(fn (HkAiRecommendation $r) => [
                'id' => $r->id,
                'category' => $r->category,
                'issue' => $r->issue,
                'risk' => $r->risk_level,
                'dataUsed' => $r->data_used,
                'recommendation' => $r->recommendation,
                'approval' => $r->approval_required,
                'nextAction' => $r->next_action,
                'status' => $r->status,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildRecentAudit(): array
    {
        return HkAuditLog::query()
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn (HkAuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'category' => $log->category,
                'issue' => $log->notes,
                'at' => $log->created_at?->format('M j, g:i A'),
            ])
            ->values()
            ->all();
    }
}
