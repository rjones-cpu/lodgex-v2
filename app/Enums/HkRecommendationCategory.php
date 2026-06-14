<?php

namespace App\Enums;

enum HkRecommendationCategory: string
{
    case LabourShortage = 'labour_shortage';
    case WorkloadOverload = 'workload_overload';
    case Rebalance = 'rebalance';
    case RoomReadiness = 'room_readiness';
    case Quality = 'quality';
    case Productivity = 'productivity';
    case Scenario = 'scenario';
}
