<?php

namespace App\Services\RoomUtilization;

use App\Enums\RoomStatus;
use App\Models\MaintenanceHold;
use App\Models\Room;
use App\Models\RoomHold;
use Illuminate\Support\Collection;

class RoomStatusEngine
{
    public function __construct(
        private readonly RoomAvailabilityService $availability,
        private readonly UsableCapacityService $capacity,
        private readonly RoomStatusValidator $validator,
        private readonly RoomConflictDetector $conflicts,
    ) {}

    public function summarize(): RoomStatusSummary
    {
        $rooms = $this->loadActiveRooms();

        $vacantClean = $this->roomsByStatus($rooms, RoomStatus::VacantClean);
        $vacantDirty = $this->roomsByStatus($rooms, RoomStatus::VacantDirty);
        $onHoldClean = $this->roomsByStatus($rooms, RoomStatus::OnHoldClean);
        $onHoldDirty = $this->roomsByStatus($rooms, RoomStatus::OnHoldDirty);
        $maintenance = $this->roomsByStatus($rooms, RoomStatus::MaintenanceHold);

        $capacity = $this->capacity->calculate($rooms, $this->capacity->arrivalsTonight());
        $conflictList = $this->conflicts->detect($rooms);
        $validationIssues = $this->validator->validateAll($rooms);

        return new RoomStatusSummary(
            totalActiveRooms: $rooms->count(),
            inHouse: $this->roomsByStatus($rooms, RoomStatus::Occupied)->count(),
            vacantClean: $vacantClean->count(),
            vacantDirty: $vacantDirty->count(),
            onHold: $onHoldClean->count() + $onHoldDirty->count(),
            maintenanceHold: $maintenance->count(),
            outOfService: $this->roomsByStatus($rooms, RoomStatus::OutOfService)->count(),
            blocked: $this->roomsByStatus($rooms, RoomStatus::BlockedReserved)->count(),
            assignableNow: $capacity['assignableNow'],
            cleanableForTonight: $capacity['cleanableForTonight'],
            usableCapacityTonight: $capacity['usableCapacityTonight'],
            projectedShortageTonight: $capacity['projectedShortageTonight'],
            overPolicyHolds: RoomHold::active()->where('over_policy', true)->count(),
            overdueMaintenance: MaintenanceHold::active()->where('overdue', true)->count(),
            vacantCleanRooms: $vacantClean,
            vacantDirtyRooms: $vacantDirty,
            onHoldCleanRooms: $onHoldClean,
            onHoldDirtyRooms: $onHoldDirty,
            maintenanceHoldRooms: $maintenance,
            conflicts: $conflictList,
            validationIssues: $validationIssues,
        );
    }

    /**
     * @return Collection<int, Room>
     */
    public function loadActiveRooms(): Collection
    {
        return Room::query()
            ->active()
            ->with([
                'currentWorker',
                'activeHold',
                'activeMaintenanceHold',
                'holds' => fn ($query) => $query->where('is_active', true),
            ])
            ->orderBy('dorm')
            ->orderBy('number')
            ->get();
    }

    /**
     * @param  Collection<int, Room>  $rooms
     * @return Collection<int, array<string, mixed>>
     */
    private function roomsByStatus(Collection $rooms, RoomStatus $status): Collection
    {
        return $rooms
            ->filter(fn (Room $room) => $room->roomStatus() === $status)
            ->map(fn (Room $room) => $this->availability->roomListItem($room));
    }
}
