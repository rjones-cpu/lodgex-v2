<?php

namespace App\Services\RoomUtilization;

use App\Models\AiRecommendation;
use App\Models\UtilizationApprovalRequest;
use Carbon\Carbon;

class DailyUtilizationReportService
{
    public function build(RoomStatusSummary $summary, CapacityForecastResult $forecast): array
    {
        $today = Carbon::today()->format('l, F j, Y');
        $outlook7 = $forecast->outlook['7d'] ?? [];
        $pendingApprovals = UtilizationApprovalRequest::pending()->count();
        $pendingRecs = AiRecommendation::query()->where('status', 'Pending')->count();

        $lines = [
            "Daily Room Utilization Report — {$today}",
            '',
            'Capacity snapshot',
            "- Total active rooms: {$summary->totalActiveRooms}",
            "- In-house: {$summary->inHouse} ({$summary->occupancyPercentage()}% occupancy)",
            "- Vacant clean: {$summary->vacantClean} ({$summary->assignableNow} assignable now)",
            "- On-hold: {$summary->onHold} ({$summary->overPolicyHolds} over policy)",
            "- Vacant dirty: {$summary->vacantDirty} ({$summary->cleanableForTonight} cleanable tonight)",
            "- Maintenance hold: {$summary->maintenanceHold} ({$summary->overdueMaintenance} overdue)",
            "- Usable capacity tonight: {$summary->usableCapacityTonight}",
            "- Projected shortage tonight: {$summary->projectedShortageTonight}",
            '',
            '7-day outlook',
            '- Peak risk: '.ucfirst($outlook7['peakRisk'] ?? 'low'),
            '- Peak shortage: '.($outlook7['peakShortage'] ?? 0).' rooms',
            '- Days at high/critical risk: '.($outlook7['highRiskDays'] ?? 0),
            '',
            'Decision queue',
            "- Pending operational approvals: {$pendingApprovals}",
            "- Pending AI recommendations: {$pendingRecs}",
            '- Data conflicts flagged: '.$summary->conflicts->count(),
            '',
            'Note: High-impact actions require human approval before execution.',
        ];

        return [
            'generatedAt' => now()->format('M j, Y g:i A'),
            'title' => "Daily Utilization — {$today}",
            'lines' => $lines,
            'text' => implode("\n", $lines),
        ];
    }
}
