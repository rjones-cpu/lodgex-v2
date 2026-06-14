<?php

namespace App\Enums;

enum UtilizationApprovalType: string
{
    case RoomRelease = 'room_release';
    case WalkIn = 'walk_in';
    case HotelOverflow = 'hotel_overflow';
    case AllotmentChange = 'allotment_change';
}
