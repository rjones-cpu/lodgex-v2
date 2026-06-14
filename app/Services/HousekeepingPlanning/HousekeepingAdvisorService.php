<?php

namespace App\Services\HousekeepingPlanning;

use App\Enums\HkRecommendationCategory;
use App\Models\HkAiRecommendation;
use App\Models\HkWorkTask;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class HousekeepingAdvisorService
{
    public function __construct(
        private readonly HkAuditLogger $auditLogger,
    ) {}

    public function sync(HousekeepingPlanningSummary $summary): void
    {
        $generated = $this->generateAll($summary);
        $fingerprints = [];

        foreach ($generated as $payload) {
            $fingerprints[] = $payload['fingerprint'];
            $existing = HkAiRecommendation::query()->where('fingerprint', $payload['fingerprint'])->first();

            if ($existing && $existing->status === 'Approved') {
                continue;
            }

            $recommendation = HkAiRecommendation::updateOrCreate(
                ['fingerprint' => $payload['fingerprint']],
                [
                    ...$payload,
                    'status' => $existing?->status ?? 'Pending',
                ],
            );

            if ($recommendation->wasRecentlyCreated) {
                $this->auditLogger->logRecommendation($recommendation, 'generated', notes: 'Housekeeping advisor created recommendation.');
            }
        }

        HkAiRecommendation::query()
            ->where('status', 'Pending')
            ->whereNotNull('fingerprint')
            ->whereNotIn('fingerprint', $fingerprints)
            ->get()
            ->each(function (HkAiRecommendation $recommendation) {
                $recommendation->update(['status' => 'Superseded']);
                $this->auditLogger->logRecommendation($recommendation, 'superseded', notes: 'No longer applicable.');
            });
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function generateAll(HousekeepingPlanningSummary $summary): Collection
    {
        return collect()
            ->merge($this->labourShortageRecommendations($summary))
            ->merge($this->overloadRecommendations($summary))
            ->merge($this->readinessRecommendations($summary))
            ->merge($this->unassignedRecommendations($summary));
    }

    private function labourShortageRecommendations(HousekeepingPlanningSummary $summary): Collection
    {
        if ($summary->labourShortage <= 0) {
            return collect();
        }

        return collect([$this->payload(
            HkRecommendationCategory::LabourShortage,
            'labour_shortage:'.now()->toDateString(),
            "Labour shortage — {$summary->labourShortage} additional housekeeper(s) needed",
            'High',
            "Required {$summary->requiredHousekeepers} housekeepers, {$summary->activeHousekeepers} scheduled. {$summary->totalPointsToday} points / {$summary->totalMinutesToday} minutes today.",
            "Add {$summary->labourShortage} housekeeper(s) or extend shifts to cover {$summary->totalPointsToday} workload points.",
            'Housekeeping Supervisor + Lodge Manager',
            'Review shift roster and approve overtime or temp staff',
        )]);
    }

    private function overloadRecommendations(HousekeepingPlanningSummary $summary): Collection
    {
        return $summary->overloadedHousekeepers->map(function (array $row) {
            return $this->payload(
                HkRecommendationCategory::WorkloadOverload,
                'overload:'.Str::slug($row['housekeeper']).':'.now()->toDateString(),
                "Workload overload — {$row['housekeeper']}",
                'High',
                "{$row['rooms']} rooms, {$row['points']} points assigned across {$row['dorms']}.",
                'Rebalance check-out rooms to another housekeeper or remove non-critical tasks.',
                'Housekeeping Supervisor',
                'Publish rebalanced assignment board after approval',
            );
        });
    }

    private function readinessRecommendations(HousekeepingPlanningSummary $summary): Collection
    {
        if ($summary->readinessRisks->isEmpty()) {
            return collect();
        }

        return collect([$this->payload(
            HkRecommendationCategory::RoomReadiness,
            'readiness:'.now()->toDateString(),
            "{$summary->readinessRisks->count()} room(s) at readiness risk",
            'Critical',
            'Same-day arrivals and high-priority turns may miss required-by times.',
            'Prioritize Critical/High tasks in Dorm A and Dorm E; add inspection support.',
            'Housekeeping Supervisor',
            'Publish priority clean list to floor supervisors',
        )]);
    }

    private function unassignedRecommendations(HousekeepingPlanningSummary $summary): Collection
    {
        if ($summary->unassignedCount === 0) {
            return collect();
        }

        return collect([$this->payload(
            HkRecommendationCategory::Rebalance,
            'unassigned:'.now()->toDateString(),
            "{$summary->unassignedCount} unassigned housekeeping task(s)",
            'Medium',
            'Tasks generated but not yet assigned to a housekeeper.',
            'Run assignment rebalance or add housekeeper capacity before shift start.',
            'Housekeeping Supervisor',
            'Approve AI assignment rebalance recommendation',
        )]);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(
        HkRecommendationCategory $category,
        string $fingerprint,
        string $issue,
        string $risk,
        string $dataUsed,
        string $recommendation,
        string $approval,
        string $nextAction,
    ): array {
        return [
            'category' => $category->value,
            'fingerprint' => $fingerprint,
            'issue' => $issue,
            'risk_level' => $risk,
            'data_used' => $dataUsed,
            'recommendation' => $recommendation,
            'approval_required' => $approval,
            'next_action' => $nextAction,
        ];
    }
}
