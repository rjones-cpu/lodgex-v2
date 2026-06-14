<?php

namespace App\Enums;

enum HkTaskType: string
{
    case RegularClean = 'regular_clean';
    case LinenChange = 'linen_change';
    case CheckoutClean = 'checkout_clean';
    case OnHoldDirtyClean = 'on_hold_dirty_clean';
    case ArrivalPrep = 'arrival_prep';
    case DeepClean = 'deep_clean';
    case Reclean = 'reclean';
    case Inspection = 'inspection';
    case LaundryRoom = 'laundry_room';
    case Miscellaneous = 'miscellaneous';
    case WalkDown = 'walk_down';
}
