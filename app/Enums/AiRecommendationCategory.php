<?php

namespace App\Enums;

enum AiRecommendationCategory: string
{
    case Overflow = 'overflow';
    case Release = 'release';
    case Waste = 'waste';
    case Allotment = 'allotment';
    case Housekeeping = 'housekeeping';
    case Maintenance = 'maintenance';
    case DataQuality = 'data_quality';
}
