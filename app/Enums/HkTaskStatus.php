<?php

namespace App\Enums;

enum HkTaskStatus: string
{
    case Pending = 'Pending';
    case Assigned = 'Assigned';
    case InProgress = 'In Progress';
    case Completed = 'Completed';
    case InspectionRequired = 'Inspection Required';
    case PassedInspection = 'Passed Inspection';
    case RecleanRequired = 'Re-Clean Required';
    case Delayed = 'Delayed';
    case Cancelled = 'Cancelled';
}
