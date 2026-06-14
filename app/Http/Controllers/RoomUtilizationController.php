<?php

namespace App\Http\Controllers;

use App\Enums\RoomStatus;
use App\Models\AiRecommendation;
use App\Models\AiRecommendationAuditLog;
use App\Models\ContractorAllotment;
use App\Models\HousekeepingTask;
use App\Models\MaintenanceHold;
use App\Models\OverflowScenario;
use App\Models\ReleaseCandidate;
use App\Models\Room;
use App\Models\RoomHold;
use App\Models\UtilizationApprovalRequest;
use App\Models\UtilizationAuditLog;
use App\Services\RoomUtilization\AiRecommendationAuditLogger;
use App\Services\RoomUtilization\CapacityForecastResult;
use App\Services\RoomUtilization\CapacityForecastService;
use App\Services\RoomUtilization\DailyUtilizationReportService;
use App\Services\RoomUtilization\RoomAvailabilityService;
use App\Services\RoomUtilization\RoomStatusEngine;
use App\Services\RoomUtilization\RoomStatusSummary;
use App\Services\RoomUtilization\RoomUtilizationAdvisorService;
use App\Services\RoomUtilization\UtilizationApprovalService;
use App\Services\RoomUtilization\UtilizationAuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class RoomUtilizationController extends Controller
{
    public function __construct(
        private readonly RoomStatusEngine $statusEngine,
        private readonly RoomAvailabilityService $availability,
        private readonly CapacityForecastService $forecastService,
        private readonly RoomUtilizationAdvisorService $advisorService,
        private readonly AiRecommendationAuditLogger $auditLogger,
        private readonly UtilizationApprovalService $approvalService,
        private readonly UtilizationAuditLogger $utilizationAuditLogger,
        private readonly DailyUtilizationReportService $reportService,
    ) {}

    public function index(): Response
    {
        $summary = $this->statusEngine->summarize();
        $forecast = $this->forecastService->build($summary);
        $this->advisorService->sync($summary, $forecast);
        $this->approvalService->seedEscalationsIfEmpty($summary, $forecast);

        return Inertia::render('RoomUtilizationManager', [
            'metrics' => $this->buildMetrics($summary, $forecast),
            'rooms' => $this->buildRooms($summary),
            'statusEngine' => $summary->toArray(),
            'forecastDays' => $forecast->dailyForecasts->values()->all(),
            'forecastOutlook' => $forecast->outlook,
            'occupancyByDormForecast' => $forecast->occupancyByDorm,
            'occupancyByContractor' => $forecast->occupancyByContractor,
            'dormOccupancy' => $this->buildDormOccupancy(),
            'onHoldReview' => $this->buildOnHoldReview(),
            'releaseCandidates' => $this->buildReleaseCandidates(),
            'overflowOptions' => $this->buildOverflowOptions(),
            'housekeepingPriority' => $this->buildHousekeepingPriority(),
            'maintenanceImpact' => $this->buildMaintenanceImpact(),
            'contractorAllotments' => $this->buildContractorAllotments(),
            'aiRecommendations' => $this->buildAiRecommendations(),
            'pendingApprovals' => $this->buildPendingApprovals(),
            'recentAudit' => $this->buildRecentAudit(),
            'lastUpdated' => now()->format('M j, Y g:i A'),
        ]);
    }

    public function submitReleaseList(Request $request): RedirectResponse
    {
        $candidates = $this->buildReleaseCandidates();
        $this->approvalService->submitReleaseList($candidates, $request->user());

        return redirect()->back()->with('toast', 'Release list submitted for approval.');
    }

    public function submitOverflowEscalation(Request $request): RedirectResponse
    {
        $summary = $this->statusEngine->summarize();
        $forecast = $this->forecastService->build($summary);
        $this->approvalService->submitOverflowEscalation($forecast, $summary, $request->user());

        return redirect()->back()->with('toast', 'Hotel overflow packet submitted for approval.');
    }

    public function generateDailyReport(Request $request): RedirectResponse
    {
        $summary = $this->statusEngine->summarize();
        $forecast = $this->forecastService->build($summary);
        $report = $this->reportService->build($summary, $forecast);

        $this->utilizationAuditLogger->log(
            'daily_report',
            null,
            'generated',
            'report',
            $request->user(),
            'Daily utilization report generated.',
            ['title' => $report['title']],
        );

        return redirect()->back()->with([
            'toast' => 'Daily utilization report generated.',
            'dailyReport' => $report,
        ]);
    }

    public function approveRequest(Request $request, UtilizationApprovalRequest $approval): RedirectResponse
    {
        $this->approvalService->approve($approval, $request->user());

        return redirect()->back()->with('toast', 'Approval request approved — logged to audit trail.');
    }

    public function rejectRequest(Request $request, UtilizationApprovalRequest $approval): RedirectResponse
    {
        $this->approvalService->reject($approval, $request->user());

        return redirect()->back()->with('toast', 'Approval request rejected — logged to audit trail.');
    }

    public function approveRecommendation(Request $request, AiRecommendation $recommendation): RedirectResponse
    {
        $recommendation->update([
            'status' => 'Approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        $this->auditLogger->log(
            $recommendation,
            'approved',
            $request->user(),
            'Human approval recorded for operational action.',
        );

        return redirect()->back()->with('toast', 'Recommendation approved — audit log recorded.');
    }

    public function dismissRecommendation(Request $request, AiRecommendation $recommendation): RedirectResponse
    {
        $recommendation->update(['status' => 'Dismissed']);

        $this->auditLogger->log(
            $recommendation,
            'dismissed',
            $request->user(),
            'Recommendation dismissed without operational action.',
        );

        return redirect()->back()->with('toast', 'Recommendation dismissed — audit log recorded.');
    }

    /**
     * @return list<array{label: string, icon: string, value: string, change: string, direction: string}>
     */
    private function buildMetrics(RoomStatusSummary $summary, CapacityForecastResult $forecast): array
    {
        $peakRisk = $forecast->outlook['7d']['peakRisk'] ?? 'low';

        return [
            ['label' => 'Total Active Rooms', 'icon' => '🏨', 'value' => number_format($summary->totalActiveRooms), 'change' => '—', 'direction' => 'up'],
            ['label' => 'In-House', 'icon' => '🛏️', 'value' => number_format($summary->inHouse), 'change' => "{$summary->occupancyPercentage()}% occ.", 'direction' => 'up'],
            ['label' => 'Vacant Clean', 'icon' => '✅', 'value' => (string) $summary->vacantClean, 'change' => "{$summary->assignableNow} assignable", 'direction' => 'up'],
            ['label' => 'On-Hold', 'icon' => '⏸️', 'value' => (string) $summary->onHold, 'change' => "{$summary->overPolicyHolds} over policy", 'direction' => 'down'],
            ['label' => 'Vacant Dirty', 'icon' => '🧹', 'value' => (string) $summary->vacantDirty, 'change' => "{$summary->cleanableForTonight} cleanable tonight", 'direction' => 'down'],
            ['label' => 'Maintenance Hold', 'icon' => '🔧', 'value' => (string) $summary->maintenanceHold, 'change' => "{$summary->overdueMaintenance} overdue", 'direction' => 'down'],
            ['label' => 'Usable Capacity Tonight', 'icon' => '📊', 'value' => (string) $summary->usableCapacityTonight, 'change' => "Shortage: {$summary->projectedShortageTonight}", 'direction' => $summary->projectedShortageTonight > 0 ? 'down' : 'up'],
            ['label' => 'Overflow Risk', 'icon' => '🏨', 'value' => ucfirst($peakRisk), 'change' => $forecast->peakShortageDate ?? '—', 'direction' => 'down'],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildRooms(RoomStatusSummary $summary): array
    {
        $issueKeys = $summary->validationIssues
            ->concat($summary->conflicts)
            ->map(fn (array $issue) => $issue['room'].'|'.$issue['dorm'])
            ->flip();

        return $this->statusEngine->loadActiveRooms()
            ->map(function (Room $room) use ($issueKeys) {
                $key = $room->number.'|'.$room->dorm;

                return [
                    ...$this->availability->roomListItem($room),
                    'hasDataIssue' => $issueKeys->has($key),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return list<array{0: string, 1: int, 2: string}>
     */
    private function buildDormOccupancy(): array
    {
        $rows = Room::active()
            ->select('dorm', DB::raw('count(*) as total'), DB::raw("sum(case when status = '".RoomStatus::Occupied->value."' then 1 else 0 end) as occupied"))
            ->groupBy('dorm')
            ->orderBy('dorm')
            ->get();

        return $rows->map(function ($row) {
            $pct = $row->total > 0 ? (int) round(($row->occupied / $row->total) * 100) : 0;
            $tone = $pct >= 90 ? 'red' : ($pct >= 80 ? 'orange' : 'green');

            return [$row->dorm, $pct, $tone];
        })->values()->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildOnHoldReview(): array
    {
        return RoomHold::query()
            ->active()
            ->with(['room', 'worker'])
            ->get()
            ->map(fn (RoomHold $hold) => [
                'room' => $hold->room->number,
                'dorm' => $hold->room->dorm,
                'worker' => $hold->worker?->name ?? '—',
                'company' => $hold->company ?? $hold->worker?->company,
                'holdDays' => $hold->hold_started_at ? $hold->hold_started_at->diffInDays(now()) : 0,
                'returnDate' => $hold->return_date?->format('M j, Y') ?? 'Unknown',
                'policy' => "{$hold->policy_days} days",
                'overPolicy' => $hold->over_policy,
                'releaseEligible' => $hold->release_eligible,
                'risk' => $hold->risk_level,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildReleaseCandidates(): array
    {
        $fromHolds = RoomHold::query()
            ->active()
            ->with(['room', 'worker'])
            ->where('release_eligible', true)
            ->get()
            ->map(fn (RoomHold $hold) => [
                'holdId' => $hold->id,
                'room' => $hold->room->number,
                'dorm' => $hold->room->dorm,
                'reason' => $hold->over_policy
                    ? 'On-hold over policy — eligible for release review'
                    : 'On-hold eligible for release per policy',
                'recovery' => '1 room',
                'approval' => $hold->over_policy ? 'WFA Coordinator + Lodge Manager' : 'Lodge Manager',
                'risk' => $hold->risk_level,
            ]);

        if ($fromHolds->isNotEmpty()) {
            return $fromHolds->values()->all();
        }

        return ReleaseCandidate::query()
            ->active()
            ->orderBy('id')
            ->get()
            ->map(fn (ReleaseCandidate $r) => [
                'room' => $r->room_number,
                'dorm' => $r->dorm,
                'reason' => $r->reason,
                'recovery' => $r->recovery,
                'approval' => $r->approval_required,
                'risk' => $r->risk_level,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildOverflowOptions(): array
    {
        return OverflowScenario::query()
            ->orderBy('scenario_date')
            ->get()
            ->map(fn (OverflowScenario $o) => [
                'date' => $o->scenario_date->format('M j'),
                'shortage' => $o->shortage,
                'internalRecovery' => $o->internal_recovery,
                'hotelRooms' => $o->hotel_rooms,
                'cost' => $o->cost_estimate,
                'recommendation' => $o->recommendation,
                'risk' => $o->risk_level,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildHousekeepingPriority(): array
    {
        return HousekeepingTask::query()
            ->with('room')
            ->where('is_complete', false)
            ->orderByRaw("CASE priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END")
            ->get()
            ->map(fn (HousekeepingTask $task) => [
                'room' => $task->room->number,
                'dorm' => $task->room->dorm,
                'status' => $task->status,
                'arrivalToday' => $task->arrival_today,
                'priority' => $task->priority,
                'eta' => $task->eta_clean,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildMaintenanceImpact(): array
    {
        return MaintenanceHold::query()
            ->active()
            ->with('room')
            ->get()
            ->map(fn (MaintenanceHold $m) => [
                'room' => $m->room->number,
                'dorm' => $m->room->dorm,
                'issue' => $m->issue,
                'eta' => $m->eta_return?->format('M j') ?? '—',
                'overdue' => $m->overdue,
                'capacityImpact' => $m->capacity_impact,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildContractorAllotments(): array
    {
        return ContractorAllotment::query()
            ->orderBy('contractor')
            ->get()
            ->map(fn (ContractorAllotment $c) => [
                'contractor' => $c->contractor,
                'allotted' => $c->allotted,
                'used' => $c->used,
                'variance' => $c->variance,
                'noShows' => $c->no_shows,
                'trend' => $c->trend,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildAiRecommendations(): array
    {
        return AiRecommendation::query()
            ->whereNotIn('status', ['Superseded'])
            ->orderByRaw("CASE risk_level WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END")
            ->orderBy('id')
            ->get()
            ->map(fn (AiRecommendation $r) => [
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
    private function buildPendingApprovals(): array
    {
        return UtilizationApprovalRequest::query()
            ->pending()
            ->orderByRaw("CASE risk_level WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END")
            ->orderBy('id')
            ->get()
            ->map(fn (UtilizationApprovalRequest $r) => [
                'id' => $r->id,
                'type' => $r->type,
                'title' => $r->title,
                'summary' => $r->summary,
                'risk' => $r->risk_level,
                'approval' => $r->approval_required,
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
        $aiLogs = AiRecommendationAuditLog::query()
            ->with('recommendation:id,issue')
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn (AiRecommendationAuditLog $log) => [
                'id' => 'ai-'.$log->id,
                'source' => 'ai',
                'action' => $log->action,
                'category' => $log->category,
                'issue' => $log->recommendation?->issue,
                'at' => $log->created_at?->format('M j, g:i A'),
                'sortAt' => $log->created_at,
            ]);

        $opsLogs = UtilizationAuditLog::query()
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn (UtilizationAuditLog $log) => [
                'id' => 'ops-'.$log->id,
                'source' => 'operations',
                'action' => $log->action,
                'category' => $log->category,
                'issue' => $log->notes,
                'at' => $log->created_at?->format('M j, g:i A'),
                'sortAt' => $log->created_at,
            ]);

        return $aiLogs
            ->concat($opsLogs)
            ->sortByDesc('sortAt')
            ->take(8)
            ->map(fn (array $row) => collect($row)->except('sortAt')->all())
            ->values()
            ->all();
    }
}
