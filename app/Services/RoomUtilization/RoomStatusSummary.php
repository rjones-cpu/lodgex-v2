<?php

namespace App\Services\RoomUtilization;

use Illuminate\Support\Collection;

class RoomStatusSummary
{
    /**
     * @param  Collection<int, array<string, mixed>>  $vacantCleanRooms
     * @param  Collection<int, array<string, mixed>>  $vacantDirtyRooms
     * @param  Collection<int, array<string, mixed>>  $onHoldCleanRooms
     * @param  Collection<int, array<string, mixed>>  $onHoldDirtyRooms
     * @param  Collection<int, array<string, mixed>>  $maintenanceHoldRooms
     * @param  Collection<int, array<string, mixed>>  $conflicts
     * @param  Collection<int, array<string, mixed>>  $validationIssues
     */
    public function __construct(
        public readonly int $totalActiveRooms,
        public readonly int $inHouse,
        public readonly int $vacantClean,
        public readonly int $vacantDirty,
        public readonly int $onHold,
        public readonly int $maintenanceHold,
        public readonly int $outOfService,
        public readonly int $blocked,
        public readonly int $assignableNow,
        public readonly int $cleanableForTonight,
        public readonly int $usableCapacityTonight,
        public readonly int $projectedShortageTonight,
        public readonly int $overPolicyHolds,
        public readonly int $overdueMaintenance,
        public readonly Collection $vacantCleanRooms,
        public readonly Collection $vacantDirtyRooms,
        public readonly Collection $onHoldCleanRooms,
        public readonly Collection $onHoldDirtyRooms,
        public readonly Collection $maintenanceHoldRooms,
        public readonly Collection $conflicts,
        public readonly Collection $validationIssues,
    ) {}

    public function occupancyPercentage(): float
    {
        if ($this->totalActiveRooms === 0) {
            return 0.0;
        }

        return round(($this->inHouse / $this->totalActiveRooms) * 100, 1);
    }

    public function hasConflicts(): bool
    {
        return $this->conflicts->isNotEmpty();
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'totalActiveRooms' => $this->totalActiveRooms,
            'inHouse' => $this->inHouse,
            'vacantClean' => $this->vacantClean,
            'vacantDirty' => $this->vacantDirty,
            'onHold' => $this->onHold,
            'maintenanceHold' => $this->maintenanceHold,
            'outOfService' => $this->outOfService,
            'blocked' => $this->blocked,
            'assignableNow' => $this->assignableNow,
            'cleanableForTonight' => $this->cleanableForTonight,
            'usableCapacityTonight' => $this->usableCapacityTonight,
            'projectedShortageTonight' => $this->projectedShortageTonight,
            'occupancyPercentage' => $this->occupancyPercentage(),
            'overPolicyHolds' => $this->overPolicyHolds,
            'overdueMaintenance' => $this->overdueMaintenance,
            'conflictCount' => $this->conflicts->count(),
            'vacantCleanRooms' => $this->vacantCleanRooms->values()->all(),
            'vacantDirtyRooms' => $this->vacantDirtyRooms->values()->all(),
            'onHoldCleanRooms' => $this->onHoldCleanRooms->values()->all(),
            'onHoldDirtyRooms' => $this->onHoldDirtyRooms->values()->all(),
            'maintenanceHoldRooms' => $this->maintenanceHoldRooms->values()->all(),
            'conflicts' => $this->conflicts->values()->all(),
            'validationIssues' => $this->validationIssues->values()->all(),
        ];
    }
}
