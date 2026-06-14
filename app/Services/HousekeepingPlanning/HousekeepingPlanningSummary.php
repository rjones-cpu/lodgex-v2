<?php

namespace App\Services\HousekeepingPlanning;

use Illuminate\Support\Collection;

class HousekeepingPlanningSummary
{
    /**
     * @param  Collection<int, array<string, mixed>>  $unassignedTasks
     * @param  Collection<int, array<string, mixed>>  $readinessRisks
     * @param  Collection<int, array<string, mixed>>  $overloadedHousekeepers
     */
    public function __construct(
        public readonly int $totalTasks,
        public readonly int $pendingTasks,
        public readonly int $assignedTasks,
        public readonly int $completedTasks,
        public readonly int $unassignedCount,
        public readonly int $arrivalPriorityCount,
        public readonly int $checkoutCount,
        public readonly float $totalPointsToday,
        public readonly int $totalMinutesToday,
        public readonly int $activeHousekeepers,
        public readonly int $availableProductiveMinutes,
        public readonly int $requiredHousekeepers,
        public readonly int $labourShortage,
        public readonly Collection $unassignedTasks,
        public readonly Collection $readinessRisks,
        public readonly Collection $overloadedHousekeepers,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'totalTasks' => $this->totalTasks,
            'pendingTasks' => $this->pendingTasks,
            'assignedTasks' => $this->assignedTasks,
            'completedTasks' => $this->completedTasks,
            'unassignedCount' => $this->unassignedCount,
            'arrivalPriorityCount' => $this->arrivalPriorityCount,
            'checkoutCount' => $this->checkoutCount,
            'totalPointsToday' => $this->totalPointsToday,
            'totalMinutesToday' => $this->totalMinutesToday,
            'activeHousekeepers' => $this->activeHousekeepers,
            'availableProductiveMinutes' => $this->availableProductiveMinutes,
            'requiredHousekeepers' => $this->requiredHousekeepers,
            'labourShortage' => $this->labourShortage,
            'unassignedTasks' => $this->unassignedTasks->values()->all(),
            'readinessRisks' => $this->readinessRisks->values()->all(),
            'overloadedHousekeepers' => $this->overloadedHousekeepers->values()->all(),
        ];
    }
}
