<?php

namespace App\Services\HousekeepingPlanning;

use App\Models\HkWorkloadRule;

class HousekeepingScenarioService
{
    /**
     * @return list<array{key: string, label: string, description: string}>
     */
    public function presets(): array
    {
        return [
            ['key' => 'housekeeper_sick', 'label' => 'Housekeeper calls in sick', 'description' => 'Remove one active housekeeper from today’s capacity.'],
            ['key' => 'extra_checkouts', 'label' => '+20 check-outs tomorrow', 'description' => 'Adds 20 checkout cleans (40 points, ~600 min).'],
            ['key' => 'arrivals_spike', 'label' => 'Arrivals +15%', 'description' => 'Increases arrival-prep workload by 15%.'],
            ['key' => 'on_hold_dirty_all', 'label' => 'Clean all on-hold dirty today', 'description' => 'Adds one checkout-equivalent clean per on-hold dirty room.'],
            ['key' => 'cleaning_slower', 'label' => 'Cleaning 20% slower', 'description' => 'Increases estimated minutes by 20% across open tasks.'],
            ['key' => 'reclean_increase', 'label' => 'Re-cleans +10%', 'description' => 'Adds 10% more re-clean tasks to today’s plan.'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function run(string $key, HousekeepingPlanningSummary $summary): array
    {
        $rules = HkWorkloadRule::query()->where('is_active', true)->first();
        $productiveMinutes = $rules?->productive_minutes ?? 480;
        $activeHousekeepers = $summary->activeHousekeepers;
        $availableMinutes = $activeHousekeepers * $productiveMinutes;

        return match ($key) {
            'housekeeper_sick' => $this->housekeeperSick($summary, $productiveMinutes, $availableMinutes),
            'extra_checkouts' => $this->extraCheckouts($summary, $availableMinutes, 20),
            'arrivals_spike' => $this->arrivalsSpike($summary, $availableMinutes),
            'on_hold_dirty_all' => $this->onHoldDirtyAll($summary, $availableMinutes),
            'cleaning_slower' => $this->cleaningSlower($summary, $availableMinutes),
            'reclean_increase' => $this->recleanIncrease($summary, $availableMinutes),
            default => [
                'title' => 'Unknown scenario',
                'risk' => 'low',
                'baselineMinutes' => $summary->totalMinutesToday,
                'projectedMinutes' => $summary->totalMinutesToday,
                'deltaMinutes' => 0,
                'requiredHousekeepers' => $summary->requiredHousekeepers,
                'availableHousekeepers' => $activeHousekeepers,
                'labourGap' => $summary->labourShortage,
                'recommendation' => 'Select a valid scenario preset.',
                'approval' => '—',
            ],
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function housekeeperSick(HousekeepingPlanningSummary $summary, int $productiveMinutes, int $availableMinutes): array
    {
        $lostMinutes = $productiveMinutes;
        $projected = $summary->totalMinutesToday;
        $required = max(1, (int) ceil($projected / max(1, $availableMinutes - $lostMinutes)));
        $gap = max(0, $required - ($summary->activeHousekeepers - 1));

        return [
            'title' => 'Housekeeper calls in sick',
            'risk' => $gap > 0 ? 'high' : 'medium',
            'baselineMinutes' => $summary->totalMinutesToday,
            'projectedMinutes' => $projected,
            'deltaMinutes' => 0,
            'requiredHousekeepers' => $required,
            'availableHousekeepers' => max(0, $summary->activeHousekeepers - 1),
            'labourGap' => $gap,
            'recommendation' => $gap > 0
                ? "Cover {$gap} housekeeper gap via overtime, temp staff, or rebalance high-priority dorms."
                : 'Remaining staff can absorb workload if tasks are rebalanced to primary dorms.',
            'approval' => 'Housekeeping Supervisor',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function extraCheckouts(HousekeepingPlanningSummary $summary, int $availableMinutes, int $count): array
    {
        $addedMinutes = $count * 30;
        $addedPoints = $count * 2;
        $projected = $summary->totalMinutesToday + $addedMinutes;
        $required = max(1, (int) ceil($projected / max(1, $availableMinutes)));
        $gap = max(0, $required - $summary->activeHousekeepers);

        return [
            'title' => "+{$count} additional check-outs",
            'risk' => $gap > 1 ? 'critical' : ($gap > 0 ? 'high' : 'medium'),
            'baselineMinutes' => $summary->totalMinutesToday,
            'projectedMinutes' => $projected,
            'deltaMinutes' => $addedMinutes,
            'deltaPoints' => $addedPoints,
            'requiredHousekeepers' => $required,
            'availableHousekeepers' => $summary->activeHousekeepers,
            'labourGap' => $gap,
            'recommendation' => 'Prioritize checkout rooms tied to same-day arrivals; request approval before pulling staff from other dorms.',
            'approval' => 'Housekeeping Supervisor + Lodge Manager',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function arrivalsSpike(HousekeepingPlanningSummary $summary, int $availableMinutes): array
    {
        $addedMinutes = (int) round($summary->arrivalPriorityCount * 30 * 0.15);
        $projected = $summary->totalMinutesToday + $addedMinutes;
        $required = max(1, (int) ceil($projected / max(1, $availableMinutes)));
        $gap = max(0, $required - $summary->activeHousekeepers);

        return [
            'title' => 'Arrivals increase 15%',
            'risk' => $gap > 0 ? 'high' : 'medium',
            'baselineMinutes' => $summary->totalMinutesToday,
            'projectedMinutes' => $projected,
            'deltaMinutes' => $addedMinutes,
            'requiredHousekeepers' => $required,
            'availableHousekeepers' => $summary->activeHousekeepers,
            'labourGap' => $gap,
            'recommendation' => 'Move arrival-prep rooms to front of assignment queue; coordinate with Room Utilization on vacant dirty recovery.',
            'approval' => 'Housekeeping Supervisor',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function onHoldDirtyAll(HousekeepingPlanningSummary $summary, int $availableMinutes): array
    {
        $onHoldDirty = $summary->readinessRisks->count() + (int) floor($summary->checkoutCount * 0.1);
        $addedMinutes = max(1, $onHoldDirty) * 30;
        $projected = $summary->totalMinutesToday + $addedMinutes;
        $required = max(1, (int) ceil($projected / max(1, $availableMinutes)));
        $gap = max(0, $required - $summary->activeHousekeepers);

        return [
            'title' => 'Clean all on-hold dirty rooms today',
            'risk' => $gap > 1 ? 'high' : 'medium',
            'baselineMinutes' => $summary->totalMinutesToday,
            'projectedMinutes' => $projected,
            'deltaMinutes' => $addedMinutes,
            'requiredHousekeepers' => $required,
            'availableHousekeepers' => $summary->activeHousekeepers,
            'labourGap' => $gap,
            'recommendation' => 'Confirm with WFA which holds can convert to release after clean; align with Room Utilization release policy.',
            'approval' => 'WFA Coordinator + Housekeeping Supervisor',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function cleaningSlower(HousekeepingPlanningSummary $summary, int $availableMinutes): array
    {
        $projected = (int) round($summary->totalMinutesToday * 1.2);
        $required = max(1, (int) ceil($projected / max(1, $availableMinutes)));
        $gap = max(0, $required - $summary->activeHousekeepers);

        return [
            'title' => 'Cleaning time +20%',
            'risk' => $gap > 0 ? 'high' : 'medium',
            'baselineMinutes' => $summary->totalMinutesToday,
            'projectedMinutes' => $projected,
            'deltaMinutes' => $projected - $summary->totalMinutesToday,
            'requiredHousekeepers' => $required,
            'availableHousekeepers' => $summary->activeHousekeepers,
            'labourGap' => $gap,
            'recommendation' => 'Reduce non-critical stayover cleans; add supervisor walk-down support on arrival dorms.',
            'approval' => 'Housekeeping Supervisor',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function recleanIncrease(HousekeepingPlanningSummary $summary, int $availableMinutes): array
    {
        $added = max(1, (int) ceil($summary->totalTasks * 0.1)) * 30;
        $projected = $summary->totalMinutesToday + $added;
        $required = max(1, (int) ceil($projected / max(1, $availableMinutes)));
        $gap = max(0, $required - $summary->activeHousekeepers);

        return [
            'title' => 'Re-clean rate +10%',
            'risk' => $gap > 0 ? 'medium' : 'low',
            'baselineMinutes' => $summary->totalMinutesToday,
            'projectedMinutes' => $projected,
            'deltaMinutes' => $added,
            'requiredHousekeepers' => $required,
            'availableHousekeepers' => $summary->activeHousekeepers,
            'labourGap' => $gap,
            'recommendation' => 'Increase inspection frequency on checkout rooms; coach housekeepers with elevated re-clean history.',
            'approval' => 'Housekeeping Supervisor',
        ];
    }
}
