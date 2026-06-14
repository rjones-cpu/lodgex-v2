<?php

namespace App\Services\RoomUtilization;

use App\Enums\AiRecommendationCategory;
use App\Models\AiRecommendation;
use App\Models\ContractorAllotment;
use App\Models\HousekeepingTask;
use App\Models\MaintenanceHold;
use App\Models\RoomHold;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class RoomUtilizationAdvisorService
{
    public function __construct(
        private readonly AiRecommendationAuditLogger $auditLogger,
    ) {}

    public function sync(RoomStatusSummary $summary, CapacityForecastResult $forecast): void
    {
        $generated = $this->generateAll($summary, $forecast);
        $fingerprints = [];

        foreach ($generated as $payload) {
            $fingerprints[] = $payload['fingerprint'];
            $existing = AiRecommendation::query()->where('fingerprint', $payload['fingerprint'])->first();

            if ($existing && $existing->status === 'Approved') {
                continue;
            }

            $recommendation = AiRecommendation::updateOrCreate(
                ['fingerprint' => $payload['fingerprint']],
                [
                    ...$payload,
                    'status' => $existing?->status ?? 'Pending',
                ],
            );

            if ($recommendation->wasRecentlyCreated) {
                $this->auditLogger->log($recommendation, 'generated', notes: 'Advisor created recommendation.');
            } elseif ($recommendation->wasChanged(['issue', 'recommendation', 'risk_level'])) {
                $this->auditLogger->log($recommendation, 'regenerated', notes: 'Advisor refreshed recommendation content.');
            }
        }

        $stale = AiRecommendation::query()
            ->where('status', 'Pending')
            ->whereNotNull('fingerprint')
            ->whereNotIn('fingerprint', $fingerprints)
            ->get();

        foreach ($stale as $recommendation) {
            $recommendation->update(['status' => 'Superseded']);
            $this->auditLogger->log($recommendation, 'superseded', notes: 'No longer applicable based on current data.');
        }
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function generateAll(RoomStatusSummary $summary, CapacityForecastResult $forecast): Collection
    {
        return collect()
            ->merge($this->overflowRecommendations($summary, $forecast))
            ->merge($this->releaseRecommendations())
            ->merge($this->wasteDetection($summary))
            ->merge($this->allotmentReview())
            ->merge($this->housekeepingRecommendations())
            ->merge($this->maintenanceEscalations())
            ->merge($this->dataQualityRecommendations($summary));
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function overflowRecommendations(RoomStatusSummary $summary, CapacityForecastResult $forecast): Collection
    {
        $recommendations = collect();
        $outlook7 = $forecast->outlook['7d'] ?? [];

        if ($summary->projectedShortageTonight > 0) {
            $recommendations->push($this->payload(
                AiRecommendationCategory::Overflow,
                'tonight_shortage',
                "Projected shortage of {$summary->projectedShortageTonight} rooms tonight",
                'High',
                "Usable capacity {$summary->usableCapacityTonight}, assignable {$summary->assignableNow}, on-holds {$summary->onHold}",
                "Review releasable on-holds and vacant dirty turnover before hotel overflow ({$summary->cleanableForTonight} cleanable tonight).",
                'WFA Coordinator + Lodge Manager',
                'Generate release candidate list and confirm housekeeping priorities.',
            ));
        }

        if (($outlook7['maxShortage'] ?? 0) > 0) {
            $recommendations->push($this->payload(
                AiRecommendationCategory::Overflow,
                'seven_day_peak',
                "7-day peak shortage of {$outlook7['maxShortage']} rooms ({$outlook7['peakDate']})",
                $this->normalizeRisk($outlook7['peakRisk'] ?? 'medium'),
                "7-day outlook: {$outlook7['criticalDays']} high/critical days, overflow est. {$outlook7['overflowRooms']} room-nights",
                'Schedule overflow planning review and confirm internal recovery options before hotel bookings.',
                'Lodge Manager',
                'Hold overflow planning meeting and track daily shortage trend.',
            ));
        }

        return $recommendations;
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function releaseRecommendations(): Collection
    {
        return RoomHold::query()
            ->active()
            ->with(['room', 'worker'])
            ->where('release_eligible', true)
            ->orderByDesc('over_policy')
            ->limit(5)
            ->get()
            ->map(function (RoomHold $hold) {
                $room = $hold->room;
                $holdDays = $hold->hold_started_at?->diffInDays(now()) ?? 0;

                return $this->payload(
                    AiRecommendationCategory::Release,
                    'release_'.$room->number.'_'.$room->dorm,
                    "Release on-hold room {$room->number} ({$room->dorm})",
                    $hold->risk_level,
                    "Hold {$holdDays} days, worker: {$hold->worker?->name}, return: ".($hold->return_date?->format('M j, Y') ?? 'Unknown'),
                    "Recommend release review — eligible per policy with estimated recovery of 1 room.",
                    $hold->over_policy ? 'WFA Coordinator + Lodge Manager' : 'Lodge Manager',
                    'Add to release approval queue and notify contractor if required.',
                );
            });
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function wasteDetection(RoomStatusSummary $summary): Collection
    {
        $recommendations = collect();

        if ($summary->onHold > 0 && $summary->assignableNow < 50) {
            $pressure = $summary->onHold > 0
                ? round(($summary->onHold / max(1, $summary->totalActiveRooms)) * 100)
                : 0;

            $recommendations->push($this->payload(
                AiRecommendationCategory::Waste,
                'on_hold_pressure',
                "High on-hold volume may be stranding capacity ({$summary->onHold} rooms, {$pressure}% of inventory)",
                $pressure >= 15 ? 'High' : 'Medium',
                "On-hold: {$summary->onHold}, over policy: {$summary->overPolicyHolds}, vacant clean: {$summary->assignableNow}",
                'Audit on-holds over 7 days with no confirmed return date; adjust hold policy timeouts if pattern continues.',
                'WFA Coordinator',
                'Run on-hold review board and document release decisions.',
            ));
        }

        $longVacantDirty = $summary->vacantDirtyRooms->filter(fn (array $room) => ($room['holdDays'] ?? 0) === 0)->count();
        if ($longVacantDirty >= 3) {
            $recommendations->push($this->payload(
                AiRecommendationCategory::Waste,
                'vacant_dirty_backlog',
                "{$summary->vacantDirty} vacant dirty rooms — turnover backlog risk",
                'Medium',
                "Vacant dirty: {$summary->vacantDirty}, cleanable tonight: {$summary->cleanableForTonight}",
                'Prioritize housekeeping on dirty rooms blocking same-day assignments to reduce hidden capacity loss.',
                'Housekeeping Lead',
                'Publish housekeeping priority list for today.',
            ));
        }

        return $recommendations;
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function allotmentReview(): Collection
    {
        return ContractorAllotment::query()
            ->get()
            ->filter(fn (ContractorAllotment $row) => abs($row->variance) > 15 || $row->trend === 'over')
            ->map(function (ContractorAllotment $row) {
                $over = $row->variance > 0;

                return $this->payload(
                    AiRecommendationCategory::Allotment,
                    'allotment_'.Str::slug($row->contractor),
                    $over
                        ? "{$row->contractor} over allotment by {$row->variance} rooms"
                        : "{$row->contractor} under allotment by ".abs($row->variance).' rooms',
                    $over ? 'High' : 'Medium',
                    "Allotted {$row->allotted}, in use {$row->used}, no-shows {$row->noShows}, trend: {$row->trend}",
                    $over
                        ? 'Request forecast update and hold new arrivals until allotment is reconciled with WFA contact.'
                        : 'Unused allotment capacity may be reallocated — confirm with contractor before releasing reserved block.',
                    'Lodge Manager',
                    $over ? "Notify {$row->contractor} WFA contact" : 'Review allotment reallocation options',
                );
            });
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function housekeepingRecommendations(): Collection
    {
        $criticalCount = HousekeepingTask::query()
            ->where('is_complete', false)
            ->where('priority', 'Critical')
            ->where('arrival_today', true)
            ->count();

        if ($criticalCount === 0) {
            return collect();
        }

        $rooms = HousekeepingTask::query()
            ->with('room')
            ->where('is_complete', false)
            ->where('priority', 'Critical')
            ->limit(3)
            ->get()
            ->map(fn (HousekeepingTask $t) => $t->room->number)
            ->join(', ');

        return collect([
            $this->payload(
                AiRecommendationCategory::Housekeeping,
                'hk_critical_arrivals',
                "{$criticalCount} critical cleans needed for same-day arrivals",
                'High',
                "Critical housekeeping tasks: {$rooms}",
                'Prioritize listed rooms for cleaning before 12:00 to protect tonight assignments.',
                'Housekeeping Lead',
                'Assign priority cleans and confirm ETAs with front desk.',
            ),
        ]);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function maintenanceEscalations(): Collection
    {
        return MaintenanceHold::query()
            ->active()
            ->with('room')
            ->where('overdue', true)
            ->get()
            ->map(function (MaintenanceHold $hold) {
                $room = $hold->room;

                return $this->payload(
                    AiRecommendationCategory::Maintenance,
                    'maint_overdue_'.$room->number,
                    "Maintenance hold overdue — room {$room->number} ({$room->dorm})",
                    'Medium',
                    "Issue: {$hold->issue}, ETA was ".$hold->eta_return?->format('M j, Y'),
                    'Escalate to maintenance supervisor for return-to-service date and capacity impact review.',
                    'Maintenance Supervisor',
                    'Send maintenance escalation and update room status when cleared.',
                );
            });
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function dataQualityRecommendations(RoomStatusSummary $summary): Collection
    {
        if ($summary->conflicts->isEmpty()) {
            return collect();
        }

        $critical = $summary->conflicts->where('severity', 'critical')->count();
        $total = $summary->conflicts->count();

        return collect([
            $this->payload(
                AiRecommendationCategory::DataQuality,
                'status_conflicts',
                "{$total} room status conflicts detected ({$critical} critical)",
                $critical > 0 ? 'High' : 'Medium',
                'Conflicts between room status, holds, maintenance records, or duplicate assignments.',
                'Resolve critical status conflicts before automated release or overflow actions — data must be trusted.',
                'Lodge Manager',
                'Review conflict list on Overview and correct room status records.',
            ),
        ]);
    }

    private function payload(
        AiRecommendationCategory $category,
        string $key,
        string $issue,
        string $risk,
        string $dataUsed,
        string $recommendation,
        string $approval,
        string $nextAction,
    ): array {
        return [
            'category' => $category->value,
            'fingerprint' => hash('sha256', $category->value.'|'.$key),
            'issue' => $issue,
            'risk_level' => $this->normalizeRisk($risk),
            'data_used' => $dataUsed,
            'recommendation' => $recommendation,
            'approval_required' => $approval,
            'next_action' => $nextAction,
        ];
    }

    private function normalizeRisk(string $risk): string
    {
        return ucfirst(strtolower($risk));
    }
}
