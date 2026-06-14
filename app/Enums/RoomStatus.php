<?php

namespace App\Enums;

enum RoomStatus: string
{
    case Occupied = 'Occupied';
    case VacantClean = 'Vacant Clean';
    case VacantDirty = 'Vacant Dirty';
    case OnHoldClean = 'On-Hold Clean';
    case OnHoldDirty = 'On-Hold Dirty';
    case MaintenanceHold = 'Maintenance Hold';
    case OutOfService = 'Out of Service';
    case BlockedReserved = 'Blocked / Reserved';
    case AssignedArrival = 'Assigned Arrival';
    case PendingAssignment = 'Pending Assignment';

    public function isAssignable(): bool
    {
        return $this === self::VacantClean;
    }

    public function countsTowardUsableCapacity(): bool
    {
        return ! in_array($this, [
            self::MaintenanceHold,
            self::OutOfService,
            self::BlockedReserved,
        ], true);
    }

    /**
     * @return list<string>
     */
    public static function onHoldValues(): array
    {
        return [
            self::OnHoldClean->value,
            self::OnHoldDirty->value,
        ];
    }
}

