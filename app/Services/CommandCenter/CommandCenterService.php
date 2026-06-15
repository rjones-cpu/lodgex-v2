<?php

namespace App\Services\CommandCenter;

use App\Models\AiRecommendation;
use App\Models\HkAiRecommendation;
use App\Services\HousekeepingPlanning\HousekeepingPlanningEngine;
use App\Services\RoomUtilization\CapacityForecastResult;
use App\Services\RoomUtilization\CapacityForecastService;
use App\Services\RoomUtilization\RoomStatusEngine;
use Carbon\Carbon;

class CommandCenterService
{
    public function __construct(
        private readonly RoomStatusEngine $roomStatusEngine,
        private readonly CapacityForecastService $capacityForecast,
        private readonly HousekeepingPlanningEngine $housekeepingEngine,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function buildDashboardPayload(): array
    {
        $roomSummary = $this->roomStatusEngine->summarize();
        $forecast = $this->capacityForecast->build($roomSummary);
        $hkSummary = $this->housekeepingEngine->summarize(Carbon::today());

        $totalRooms = max(1, $roomSummary->totalActiveRooms);
        $occupied = $roomSummary->inHouse;
        $occupancyPct = round(($occupied / $totalRooms) * 100, 1);
        $availableTotal = $roomSummary->vacantClean + $roomSummary->vacantDirty;
        $roomsAtRisk = $roomSummary->maintenanceHold
            + $roomSummary->vacantDirty
            + $roomSummary->conflicts->count()
            + $roomSummary->overdueMaintenance;
        $hkRemaining = $roomSummary->vacantDirty + $hkSummary->readinessRisks->count();
        $hkReadiness = $hkSummary->totalTasks > 0
            ? (int) round(($hkSummary->completedTasks / $hkSummary->totalTasks) * 100)
            : 92;
        $labourCoverage = $hkSummary->requiredHousekeepers > 0
            ? (int) round(min(100, ($hkSummary->activeHousekeepers / $hkSummary->requiredHousekeepers) * 100))
            : 96;
        $labourShortage = $hkSummary->labourShortage;

        $openRuAlerts = $roomSummary->projectedShortageTonight > 0 ? 1 : 0;
        $openRuAlerts += $roomSummary->conflicts->count();
        $openRuAlerts += $roomSummary->overdueMaintenance > 0 ? 1 : 0;
        $openAlerts = max(4, $openRuAlerts + ($hkSummary->labourShortage > 0 ? 1 : 0) + 2);

        $ruRecs = AiRecommendation::query()->where('status', 'Pending')->count();
        $hkRecs = HkAiRecommendation::query()->where('status', 'Pending')->count();
        $aiRecCount = max(3, $ruRecs + $hkRecs);

        $todaysBookings = max(48, $occupied);
        $roomsToClean = max(32, $hkRemaining);

        return [
            'lastUpdated' => now()->format('M j, Y g:i A'),
            'headerDateTime' => now()->format('M j, Y'),
            'headerDayTime' => now()->format('D, g:i A'),
            'siteName' => 'Bracebridge Lodge',
            'siteLabel' => 'Main Site',
            'notificationCount' => max(12, $openAlerts),
            'quickActions' => $this->quickActions(),
            'commandSummary' => $this->commandSummary(
                $occupied,
                $totalRooms,
                $occupancyPct,
                $openAlerts,
                $roomsAtRisk,
                $hkReadiness,
                $hkRemaining,
                $labourCoverage,
                $labourShortage,
            ),
            'commandFunctions' => $this->commandFunctions($openAlerts),
            'occupancyEngine' => $this->occupancyEngine(
                $todaysBookings,
                $occupancyPct,
                $roomsToClean,
                $roomsAtRisk,
                $hkReadiness,
                $labourCoverage,
                $labourShortage,
            ),
            'guestEngine' => $this->guestEngine(),
            'intelligenceOutputs' => $this->intelligenceOutputs(),
            'systemStatus' => $this->systemStatus(),
            'alerts' => $this->alerts($forecast, $hkSummary->labourShortage),
            'aiRecommendations' => $this->aiRecommendations($roomSummary->onHold),
            'childModuleHealth' => $this->childModuleHealth(),
            'integrations' => $this->integrations(),
            'childModules' => $this->childModules(),
            'strategicRecommendations' => $this->strategicRecommendations($aiRecCount),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function buildDetailPayload(string $view): array
    {
        $ctx = $this->detailContext();

        return match ($view) {
            'executive-dashboards' => $this->executiveDashboardDetail($ctx),
            'predictive-analytics' => $this->predictiveAnalyticsDetail($ctx),
            'alerts' => $this->alertsDetail($ctx),
            'scenario-planning' => $this->scenarioPlanningDetail($ctx),
            'strategic-recommendations' => $this->strategicRecommendationsDetail($ctx),
            'ai-recommendations' => $this->aiRecommendationsDetail($ctx),
            'module-health' => $this->moduleHealthDetail($ctx),
            'integrations' => $this->integrationsDetail($ctx),
            'consumables-intelligence' => $this->consumablesDetail($ctx),
            'labour-forecaster' => $this->labourForecasterDetail($ctx),
            'guest-profile' => $this->guestProfileDetail($ctx),
            'events-director' => $this->eventsDirectorDetail($ctx),
            'guest-portal' => $this->guestPortalDetail($ctx),
            'food-preferences' => $this->foodPreferencesDetail($ctx),
            'communication-engine' => $this->communicationEngineDetail($ctx),
            'guest-concerns' => $this->guestConcernsDetail($ctx),
            'guest-experience' => $this->guestExperienceDetail($ctx),
            default => [
                'title' => 'Command Center',
                'subtitle' => 'Detail view not found.',
                'theme' => 'blue',
                'sections' => [],
            ],
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function detailContext(): array
    {
        $roomSummary = $this->roomStatusEngine->summarize();
        $forecast = $this->capacityForecast->build($roomSummary);
        $hkSummary = $this->housekeepingEngine->summarize(Carbon::today());

        $totalRooms = max(1, $roomSummary->totalActiveRooms);
        $occupied = $roomSummary->inHouse;
        $occupancyPct = round(($occupied / $totalRooms) * 100, 1);
        $availableTotal = $roomSummary->vacantClean + $roomSummary->vacantDirty;
        $roomsAtRisk = $roomSummary->maintenanceHold
            + $roomSummary->vacantDirty
            + $roomSummary->conflicts->count()
            + $roomSummary->overdueMaintenance;
        $hkRemaining = $roomSummary->vacantDirty + $hkSummary->readinessRisks->count();
        $hkReadiness = $hkSummary->totalTasks > 0
            ? (int) round(($hkSummary->completedTasks / $hkSummary->totalTasks) * 100)
            : 92;
        $labourCoverage = $hkSummary->requiredHousekeepers > 0
            ? (int) round(min(100, ($hkSummary->activeHousekeepers / $hkSummary->requiredHousekeepers) * 100))
            : 96;

        $openRuAlerts = $roomSummary->projectedShortageTonight > 0 ? 1 : 0;
        $openRuAlerts += $roomSummary->conflicts->count();
        $openRuAlerts += $roomSummary->overdueMaintenance > 0 ? 1 : 0;
        $openAlerts = max(4, $openRuAlerts + ($hkSummary->labourShortage > 0 ? 1 : 0) + 2);

        $ruRecs = AiRecommendation::query()->where('status', 'Pending')->count();
        $hkRecs = HkAiRecommendation::query()->where('status', 'Pending')->count();
        $aiRecCount = max(3, $ruRecs + $hkRecs);

        return [
            'roomSummary' => $roomSummary,
            'forecast' => $forecast,
            'hkSummary' => $hkSummary,
            'totalRooms' => $totalRooms,
            'occupied' => $occupied,
            'occupancyPct' => $occupancyPct,
            'availableTotal' => $availableTotal,
            'vacantClean' => $roomSummary->vacantClean,
            'vacantDirty' => $roomSummary->vacantDirty,
            'roomsAtRisk' => $roomsAtRisk,
            'hkRemaining' => $hkRemaining,
            'hkReadiness' => $hkReadiness,
            'labourCoverage' => $labourCoverage,
            'labourShortage' => $hkSummary->labourShortage,
            'openAlerts' => $openAlerts,
            'aiRecCount' => $aiRecCount,
            'alerts' => $this->alerts($forecast, $hkSummary->labourShortage),
            'strategicRecommendations' => $this->strategicRecommendations($aiRecCount),
            'aiRecommendations' => $this->aiRecommendations($roomSummary->onHold),
            'childModuleHealth' => $this->childModuleHealth(),
            'childModules' => $this->childModules(),
            'integrations' => $this->integrations(),
            'summaryWidgets' => $this->summaryWidgets($openAlerts, $forecast->peakShortageDate ?? 'Mon'),
            'kpiWidgets' => $this->kpiWidgets(
                $occupied,
                $totalRooms,
                $occupancyPct,
                $roomSummary->vacantClean,
                $roomSummary->vacantDirty,
                $availableTotal,
                $roomsAtRisk,
                $hkReadiness,
                $hkRemaining,
                $labourCoverage,
                $hkSummary->labourShortage,
            ),
        ];
    }

    /**
     * @param  array<string, mixed>  $ctx
     * @return array<string, mixed>
     */
    private function executiveDashboardDetail(array $ctx): array
    {
        /** @var CapacityForecastResult $forecast */
        $forecast = $ctx['forecast'];
        $health = $ctx['childModuleHealth'];
        $alerts = $ctx['alerts'];
        $highPriorityCount = collect($alerts)->where('tone', 'high')->count();
        $healthScore = (int) ($health['healthScore'] ?? 94);
        $labourShortage = (int) $ctx['labourShortage'];
        $onHoldCount = $ctx['roomSummary']->onHold ?? 0;
        $releaseCount = min(8, max(1, (int) round($onHoldCount * 0.04)));

        $occupancyTrend = $forecast->dailyForecasts->take(14)->map(fn (array $d) => [
            'label' => $d['date'],
            'value' => $d['projectedOccupancy'],
        ])->values()->all();

        $peakOccupancy = collect($occupancyTrend)->max('value') ?? $ctx['occupancyPct'];

        return [
            'title' => 'Executive Dashboard',
            'subtitle' => 'Command-level performance overview for lodge operations.',
            'theme' => 'blue',
            'kpis' => [
                [
                    'id' => 'health',
                    'title' => 'Lodge Health Score',
                    'value' => "{$healthScore}%",
                    'subtext' => 'Stable',
                    'icon' => '💚',
                    'accent' => 'green',
                    'route' => 'command-center.show',
                    'routeParams' => ['view' => 'module-health'],
                ],
                [
                    'id' => 'occupancy',
                    'title' => 'Current Occupancy',
                    'value' => "{$ctx['occupied']} / {$ctx['totalRooms']}",
                    'subtext' => "{$ctx['occupancyPct']}% occupied",
                    'icon' => '🏨',
                    'accent' => 'blue',
                    'route' => 'room-utilization',
                ],
                [
                    'id' => 'available-rooms',
                    'title' => 'Available Rooms',
                    'value' => "{$ctx['vacantClean']} clean",
                    'subtext' => "{$ctx['vacantDirty']} dirty",
                    'icon' => '🛏️',
                    'accent' => 'green',
                    'route' => 'room-utilization',
                ],
                [
                    'id' => 'open-risks',
                    'title' => 'Open Risks',
                    'value' => (string) $ctx['openAlerts'],
                    'subtext' => "{$highPriorityCount} high priority",
                    'icon' => '⚠️',
                    'accent' => 'red',
                    'route' => 'command-center.show',
                    'routeParams' => ['view' => 'alerts'],
                ],
                [
                    'id' => 'hk-readiness',
                    'title' => 'HK Readiness',
                    'value' => "{$ctx['hkReadiness']}%",
                    'subtext' => "{$ctx['hkRemaining']} rooms remaining",
                    'icon' => '🧹',
                    'accent' => 'amber',
                    'route' => 'housekeeping-planning',
                ],
                [
                    'id' => 'labour-coverage',
                    'title' => 'Labour Coverage',
                    'value' => "{$ctx['labourCoverage']}%",
                    'subtext' => $labourShortage > 0
                        ? "{$labourShortage} role shortage tomorrow"
                        : 'Coverage stable',
                    'icon' => '👥',
                    'accent' => 'purple',
                    'route' => 'command-center.show',
                    'routeParams' => ['view' => 'labour-forecaster'],
                ],
                [
                    'id' => 'utility-services',
                    'title' => 'Utility Services',
                    'value' => '3.2 days',
                    'subtext' => 'Fuel + sewage risk',
                    'icon' => '⛽',
                    'accent' => 'teal',
                    'route' => 'command-center.show',
                    'routeParams' => ['view' => 'consumables-intelligence'],
                ],
                [
                    'id' => 'guest-experience',
                    'title' => 'Guest Experience',
                    'value' => '4.6 / 5',
                    'subtext' => '6 open concerns',
                    'icon' => '⭐',
                    'accent' => 'teal',
                    'route' => 'command-center.show',
                    'routeParams' => ['view' => 'guest-experience'],
                ],
            ],
            'summaryColumns' => [
                [
                    'title' => 'Operational Performance',
                    'cards' => [
                        [
                            'id' => 'occupancy-summary',
                            'title' => 'Occupancy Summary',
                            'primaryValue' => "{$ctx['occupied']} / {$ctx['totalRooms']}",
                            'secondaryValue' => "{$ctx['occupancyPct']}% occupied",
                            'status' => 'Stable',
                            'statusTone' => 'good',
                            'ctaLabel' => 'View Room Utilization',
                            'route' => 'room-utilization',
                        ],
                        [
                            'id' => 'room-availability',
                            'title' => 'Room Availability',
                            'primaryValue' => "{$ctx['vacantClean']} clean",
                            'secondaryValue' => "{$ctx['vacantDirty']} dirty",
                            'status' => $ctx['vacantDirty'] > 5 ? 'Medium risk' : 'Good',
                            'statusTone' => $ctx['vacantDirty'] > 5 ? 'warning' : 'good',
                            'ctaLabel' => 'Open Availability',
                            'route' => 'room-utilization',
                        ],
                        [
                            'id' => 'hk-readiness-summary',
                            'title' => 'Housekeeping Readiness',
                            'primaryValue' => "{$ctx['hkReadiness']}%",
                            'secondaryValue' => "{$ctx['hkRemaining']} rooms remaining",
                            'status' => 'Active',
                            'statusTone' => 'good',
                            'ctaLabel' => 'View Workload',
                            'route' => 'housekeeping-planning',
                        ],
                        [
                            'id' => 'labour-coverage-summary',
                            'title' => 'Labour Coverage',
                            'primaryValue' => "{$ctx['labourCoverage']}%",
                            'secondaryValue' => $labourShortage > 0
                                ? "{$labourShortage} role shortage tomorrow"
                                : 'Coverage stable',
                            'status' => $labourShortage > 0 ? 'Watch' : 'Good',
                            'statusTone' => $labourShortage > 0 ? 'warning' : 'good',
                            'ctaLabel' => 'Open Labour Forecast',
                            'route' => 'command-center.show',
                            'routeParams' => ['view' => 'labour-forecaster'],
                        ],
                    ],
                ],
                [
                    'title' => 'Risk & Forecast',
                    'cards' => [
                        [
                            'id' => 'risk-summary',
                            'title' => 'Risk & Alert Summary',
                            'primaryValue' => "{$ctx['openAlerts']} open risks",
                            'secondaryValue' => "{$highPriorityCount} high priority",
                            'status' => $highPriorityCount > 0 ? 'Attention required' : 'Stable',
                            'statusTone' => $highPriorityCount > 0 ? 'warning' : 'good',
                            'ctaLabel' => 'Open Alert Center',
                            'route' => 'command-center.show',
                            'routeParams' => ['view' => 'alerts'],
                        ],
                        [
                            'id' => 'occupancy-forecast',
                            'title' => '14-Day Occupancy Forecast',
                            'primaryValue' => round($peakOccupancy, 1).'% peak',
                            'secondaryValue' => 'Peak expected '.$forecast->peakShortageDate,
                            'status' => 'Stable',
                            'statusTone' => 'good',
                            'ctaLabel' => 'View Predictive Analytics',
                            'route' => 'command-center.show',
                            'routeParams' => ['view' => 'predictive-analytics'],
                        ],
                        [
                            'id' => 'forecast-accuracy',
                            'title' => 'Forecast Accuracy',
                            'primaryValue' => '91.8%',
                            'secondaryValue' => 'Last 14 days',
                            'status' => 'Good',
                            'statusTone' => 'good',
                            'ctaLabel' => 'View Forecast Accuracy',
                            'route' => 'command-center.show',
                            'routeParams' => ['view' => 'predictive-analytics'],
                        ],
                        [
                            'id' => 'data-quality',
                            'title' => 'Data Quality',
                            'primaryValue' => '94%',
                            'secondaryValue' => '2 schedule gaps',
                            'status' => 'Needs review',
                            'statusTone' => 'warning',
                            'ctaLabel' => 'View Data Issues',
                            'route' => 'command-center.show',
                            'routeParams' => ['view' => 'module-health'],
                        ],
                    ],
                ],
                [
                    'title' => 'Business & Experience',
                    'cards' => [
                        [
                            'id' => 'guest-experience-summary',
                            'title' => 'Guest Experience',
                            'primaryValue' => '4.6 / 5',
                            'secondaryValue' => '6 open concerns',
                            'status' => 'Stable',
                            'statusTone' => 'good',
                            'ctaLabel' => 'Open Guest Intelligence',
                            'route' => 'command-center.show',
                            'routeParams' => ['view' => 'guest-experience'],
                        ],
                        [
                            'id' => 'utility-coverage',
                            'title' => 'Utility & Site Service Coverage',
                            'primaryValue' => '3.2 days',
                            'secondaryValue' => 'Fuel + sewage risk',
                            'status' => 'Medium risk',
                            'statusTone' => 'warning',
                            'ctaLabel' => 'Open Utility Services',
                            'route' => 'command-center.show',
                            'routeParams' => ['view' => 'consumables-intelligence'],
                            'utilityServices' => [
                                'diesel fuel',
                                'propane',
                                'sewage disposal',
                                'water deliveries',
                                'garbage removal',
                                'recycling removal',
                            ],
                        ],
                        [
                            'id' => 'lodge-supplies',
                            'title' => 'Lodge Operating Supplies',
                            'primaryValue' => '12.5 days',
                            'secondaryValue' => '4 below par',
                            'status' => 'Review required',
                            'statusTone' => 'warning',
                            'ctaLabel' => 'View Consumables',
                            'route' => 'command-center.show',
                            'routeParams' => ['view' => 'consumables-intelligence'],
                        ],
                        [
                            'id' => 'cost-summary',
                            'title' => 'Cost & Resource Summary',
                            'primaryValue' => '+3.8%',
                            'secondaryValue' => 'Hotel + labour drivers',
                            'status' => 'Watch',
                            'statusTone' => 'warning',
                            'ctaLabel' => 'Open Cost Summary',
                            'route' => 'reports',
                        ],
                    ],
                ],
            ],
            'executiveRecommendations' => [
                [
                    'recommendation' => "Release {$releaseCount} on-hold rooms",
                    'impact' => 'Avoid hotel overflow',
                    'module' => 'Room Utilization',
                    'approval' => 'WFA Coordinator',
                    'route' => 'room-utilization',
                ],
                [
                    'recommendation' => 'Confirm utility service schedule',
                    'impact' => 'Reduce fuel and sewage risk',
                    'module' => 'Consumables',
                    'approval' => 'Lodge Manager / Maintenance Lead',
                    'route' => 'command-center.show',
                    'routeParams' => ['view' => 'consumables-intelligence'],
                ],
                [
                    'recommendation' => 'Rebalance housekeeping workload',
                    'impact' => 'Protect same-day arrivals',
                    'module' => 'Housekeeping',
                    'approval' => 'Housekeeping Supervisor',
                    'route' => 'housekeeping-planning',
                ],
                [
                    'recommendation' => 'Correct contractor schedule gaps',
                    'impact' => 'Improve forecast confidence',
                    'module' => 'Reservation Manager',
                    'approval' => 'Contractor Admin',
                    'route' => 'reservations',
                ],
                [
                    'recommendation' => 'Review lodge supply reorder list',
                    'impact' => 'Prevent below-par supplies',
                    'module' => 'Consumables',
                    'approval' => 'Purchasing',
                    'route' => 'command-center.show',
                    'routeParams' => ['view' => 'consumables-intelligence'],
                ],
            ],
            'trends' => [
                [
                    'id' => 'occupancy-trend',
                    'title' => '14-Day Occupancy Trend',
                    'currentValue' => "{$ctx['occupancyPct']}%",
                    'direction' => 'stable',
                    'directionLabel' => 'Stable',
                    'points' => $occupancyTrend,
                ],
                [
                    'id' => 'hk-readiness-trend',
                    'title' => 'Housekeeping Readiness Trend',
                    'currentValue' => "{$ctx['hkReadiness']}%",
                    'direction' => 'up',
                    'directionLabel' => 'Improving',
                    'points' => [
                        ['label' => 'D-6', 'value' => max(70, $ctx['hkReadiness'] - 8)],
                        ['label' => 'D-5', 'value' => max(72, $ctx['hkReadiness'] - 6)],
                        ['label' => 'D-4', 'value' => max(74, $ctx['hkReadiness'] - 5)],
                        ['label' => 'D-3', 'value' => max(76, $ctx['hkReadiness'] - 4)],
                        ['label' => 'D-2', 'value' => max(78, $ctx['hkReadiness'] - 3)],
                        ['label' => 'D-1', 'value' => max(80, $ctx['hkReadiness'] - 2)],
                        ['label' => 'Today', 'value' => $ctx['hkReadiness']],
                    ],
                ],
                [
                    'id' => 'labour-coverage-trend',
                    'title' => 'Labour Coverage Trend',
                    'currentValue' => "{$ctx['labourCoverage']}%",
                    'direction' => 'stable',
                    'directionLabel' => 'Stable',
                    'points' => [
                        ['label' => 'Mon', 'value' => max(88, $ctx['labourCoverage'] - 4)],
                        ['label' => 'Tue', 'value' => max(90, $ctx['labourCoverage'] - 2)],
                        ['label' => 'Wed', 'value' => $ctx['labourCoverage']],
                        ['label' => 'Thu', 'value' => min(100, $ctx['labourCoverage'] + 1)],
                        ['label' => 'Fri', 'value' => $ctx['labourCoverage']],
                    ],
                ],
                [
                    'id' => 'cost-variance-trend',
                    'title' => 'Cost Variance Trend',
                    'currentValue' => '+3.8%',
                    'direction' => 'up',
                    'directionLabel' => 'Watch',
                    'points' => [
                        ['label' => 'W1', 'value' => 1.2],
                        ['label' => 'W2', 'value' => 1.8],
                        ['label' => 'W3', 'value' => 2.4],
                        ['label' => 'W4', 'value' => 3.1],
                        ['label' => 'W5', 'value' => 3.8],
                    ],
                ],
                [
                    'id' => 'guest-experience-trend',
                    'title' => 'Guest Experience Trend',
                    'currentValue' => '4.6 / 5',
                    'direction' => 'up',
                    'directionLabel' => 'Improving',
                    'points' => [
                        ['label' => 'Mon', 'value' => 4.4],
                        ['label' => 'Tue', 'value' => 4.5],
                        ['label' => 'Wed', 'value' => 4.5],
                        ['label' => 'Thu', 'value' => 4.6],
                        ['label' => 'Fri', 'value' => 4.6],
                    ],
                ],
                [
                    'id' => 'utility-coverage-trend',
                    'title' => 'Utility Service Coverage Trend',
                    'currentValue' => '3.2 days',
                    'direction' => 'down',
                    'directionLabel' => 'Declining',
                    'points' => [
                        ['label' => 'Mon', 'value' => 5.1],
                        ['label' => 'Tue', 'value' => 4.6],
                        ['label' => 'Wed', 'value' => 4.1],
                        ['label' => 'Thu', 'value' => 3.7],
                        ['label' => 'Fri', 'value' => 3.2],
                    ],
                ],
            ],
            'moduleDrillDown' => [
                [
                    'id' => 'reservations',
                    'title' => 'Reservation Manager',
                    'status' => 'Active',
                    'keyMetric' => '412 active bookings',
                    'openItems' => '2 schedule gaps',
                    'route' => 'reservations',
                ],
                [
                    'id' => 'room-utilization',
                    'title' => 'Room Utilization Manager',
                    'status' => 'Active',
                    'keyMetric' => "{$ctx['occupancyPct']}% occupancy",
                    'openItems' => "{$ctx['openAlerts']} open risks",
                    'route' => 'room-utilization',
                ],
                [
                    'id' => 'housekeeping',
                    'title' => 'Housekeeping Planning & Workload',
                    'status' => 'Active',
                    'keyMetric' => "{$ctx['hkReadiness']}% readiness",
                    'openItems' => "{$ctx['hkRemaining']} rooms remaining",
                    'route' => 'housekeeping-planning',
                ],
                [
                    'id' => 'labour',
                    'title' => 'Lodge Labour Forecaster',
                    'status' => 'Active',
                    'keyMetric' => "{$ctx['labourCoverage']}% coverage",
                    'openItems' => $labourShortage > 0 ? "{$labourShortage} shortage tomorrow" : 'No shortages',
                    'route' => 'command-center.show',
                    'routeParams' => ['view' => 'labour-forecaster'],
                ],
                [
                    'id' => 'consumables',
                    'title' => 'Consumables Intelligence',
                    'status' => 'Active',
                    'keyMetric' => '12.5 days cover',
                    'openItems' => '4 below par',
                    'route' => 'command-center.show',
                    'routeParams' => ['view' => 'consumables-intelligence'],
                ],
                [
                    'id' => 'guest-intelligence',
                    'title' => 'Guest Intelligence',
                    'status' => 'Active',
                    'keyMetric' => '4.6 / 5 satisfaction',
                    'openItems' => '6 open concerns',
                    'route' => 'command-center.show',
                    'routeParams' => ['view' => 'guest-experience'],
                ],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $ctx
     * @return array<string, mixed>
     */
    private function predictiveAnalyticsDetail(array $ctx): array
    {
        /** @var CapacityForecastResult $forecast */
        $forecast = $ctx['forecast'];

        return [
            'title' => 'Predictive Analytics',
            'subtitle' => 'AI-powered forecasts and predictive insights.',
            'theme' => 'green',
            'outlook' => $forecast->outlook,
            'forecastDays' => $forecast->dailyForecasts->take(7)->values()->all(),
            'peakShortage' => $forecast->peakShortage,
            'peakShortageDate' => $forecast->peakShortageDate,
            'peakOverflowRooms' => $forecast->peakOverflowRooms,
            'hkForecast' => [
                ['day' => 'Mon', 'points' => 142, 'capacity' => 128, 'risk' => 'high'],
                ['day' => 'Tue', 'points' => 156, 'capacity' => 128, 'risk' => 'high'],
                ['day' => 'Wed', 'points' => 118, 'capacity' => 128, 'risk' => 'medium'],
                ['day' => 'Thu', 'points' => 104, 'capacity' => 128, 'risk' => 'low'],
                ['day' => 'Fri', 'points' => 121, 'capacity' => 128, 'risk' => 'medium'],
            ],
            'insights' => [
                'Arrival-driven demand peaks Monday with 8-room projected shortage.',
                'Housekeeping workload exceeds capacity Tuesday by 18 points.',
                'Overflow risk window: '.$forecast->peakShortageDate.' ('.$forecast->peakShortage.' rooms).',
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $ctx
     * @return array<string, mixed>
     */
    private function alertsDetail(array $ctx): array
    {
        $alerts = $ctx['alerts'];

        return [
            'title' => 'Risk & Alert Management',
            'subtitle' => 'Monitor risks, alerts and operational exceptions.',
            'theme' => 'orange',
            'alerts' => $alerts,
            'stats' => [
                ['label' => 'High priority', 'value' => collect($alerts)->where('tone', 'high')->count(), 'tone' => 'high'],
                ['label' => 'Medium priority', 'value' => collect($alerts)->where('tone', 'medium')->count(), 'tone' => 'medium'],
                ['label' => 'Low priority', 'value' => collect($alerts)->where('tone', 'low')->count(), 'tone' => 'low'],
                ['label' => 'Open total', 'value' => count($alerts), 'tone' => 'neutral'],
            ],
            'recentActions' => [
                ['action' => 'Escalated Monday capacity alert', 'time' => '12 min ago'],
                ['action' => 'Assigned utility risk to facilities', 'time' => '34 min ago'],
                ['action' => 'Acknowledged data quality warning', 'time' => '1 hr ago'],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $ctx
     * @return array<string, mixed>
     */
    private function scenarioPlanningDetail(array $ctx): array
    {
        return [
            'title' => 'Scenario Planning',
            'subtitle' => 'Model scenarios and assess operational impact.',
            'theme' => 'purple',
            'scenarios' => [
                [
                    'name' => 'Monday capacity pressure',
                    'impact' => 'High',
                    'shortage' => 8,
                    'status' => 'Active',
                    'summary' => 'Simulates release of 6 on-hold rooms and accelerated turnover.',
                ],
                [
                    'name' => 'Tuesday HK workload spike',
                    'impact' => 'Medium',
                    'shortage' => 0,
                    'status' => 'Saved',
                    'summary' => 'Adds 2 housekeepers and rebalances Dorm B assignments.',
                ],
                [
                    'name' => 'Utility service delay',
                    'impact' => 'Medium',
                    'shortage' => 0,
                    'status' => 'Saved',
                    'summary' => 'Models diesel delivery slip and guest communication plan.',
                ],
            ],
            'levers' => [
                'Adjust arrival assumptions',
                'Simulate room releases',
                'Model housekeeping rebalance',
                'Test contractor allotment mix',
            ],
            'ctaRoute' => 'housekeeping-planning',
            'ctaLabel' => 'Open HK Scenarios',
        ];
    }

    /**
     * @param  array<string, mixed>  $ctx
     * @return array<string, mixed>
     */
    private function strategicRecommendationsDetail(array $ctx): array
    {
        $items = $ctx['strategicRecommendations'];

        return [
            'title' => 'Strategic Recommendations',
            'subtitle' => 'AI-prioritized actions to improve performance.',
            'theme' => 'teal',
            'items' => $items,
            'stats' => [
                ['label' => 'Total recommendations', 'value' => count($items)],
                ['label' => 'Approval required', 'value' => collect($items)->where('approval', 'Required')->count()],
                ['label' => 'Optional review', 'value' => collect($items)->where('approval', 'Optional')->count()],
            ],
            'priorityMatrix' => [
                ['title' => 'Release on-hold rooms', 'impact' => 'High', 'effort' => 'Low'],
                ['title' => 'Confirm diesel delivery', 'impact' => 'High', 'effort' => 'Medium'],
                ['title' => 'Publish HK assignment board', 'impact' => 'Medium', 'effort' => 'Low'],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $ctx
     * @return array<string, mixed>
     */
    private function aiRecommendationsDetail(array $ctx): array
    {
        return [
            'title' => 'Command AI Recommendations',
            'subtitle' => 'Parent-level AI review queue across occupancy and guest operations.',
            'theme' => 'purple',
            'items' => collect($ctx['aiRecommendations'])->map(fn (array $item, int $i) => [
                'id' => $i + 1,
                'text' => $item['text'],
                'confidence' => [92, 88, 84][$i] ?? 80,
                'source' => ['Room utilization', 'Integrations', 'Housekeeping'][$i] ?? 'Command AI',
                'status' => 'Pending',
            ])->values()->all(),
            'stats' => [
                ['label' => 'Pending review', 'value' => $ctx['aiRecCount']],
                ['label' => 'High confidence', 'value' => 2],
                ['label' => 'Modules contributing', 'value' => 3],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $ctx
     * @return array<string, mixed>
     */
    private function moduleHealthDetail(array $ctx): array
    {
        return [
            // Renamed to match the Smart Lodge Intelligence Hub design.
            // Page subtitle is unchanged — it already matches the new design.
            'title' => 'Smart Lodge Intelligence Hub',
            'subtitle' => 'Health and freshness across child agents.',
            'theme' => 'blue',
            'health' => $ctx['childModuleHealth'],
            'modules' => $ctx['childModules'],
            'syncTimeline' => [
                ['module' => 'Reservation Engine', 'status' => 'Synced', 'time' => '2 min ago'],
                ['module' => 'Room Utilization', 'status' => 'Synced', 'time' => '2 min ago'],
                ['module' => 'Housekeeping Planning', 'status' => 'Synced', 'time' => '5 min ago'],
                ['module' => 'Food Cost Forecasting', 'status' => 'Synced', 'time' => '6 min ago'],
                ['module' => 'Boon Schedule Feed', 'status' => 'Pending validation', 'time' => '18 min ago'],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $ctx
     * @return array<string, mixed>
     */
    private function integrationsDetail(array $ctx): array
    {
        return [
            'title' => 'External Integration Health',
            'subtitle' => 'Connected systems and sync status.',
            'theme' => 'slate',
            'items' => $ctx['integrations'],
            'syncLog' => [
                ['system' => 'Property Management System', 'event' => 'Reservation sync completed', 'time' => '3 min ago', 'status' => 'ok'],
                ['system' => 'Finance / ERP', 'event' => 'Charge sheet export succeeded', 'time' => '11 min ago', 'status' => 'ok'],
                ['system' => 'Supplier Network', 'event' => 'Low stock alert received', 'time' => '24 min ago', 'status' => 'warn'],
            ],
            'stats' => [
                ['label' => 'Connected systems', 'value' => count($ctx['integrations'])],
                ['label' => 'Healthy feeds', 'value' => 3],
                ['label' => 'Warnings', 'value' => 1],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $ctx
     * @return array<string, mixed>
     */
    private function consumablesDetail(array $ctx): array
    {
        return [
            'title' => 'Consumables Intelligence',
            'subtitle' => 'Monitor supplies, inventory levels, and reorder planning.',
            'theme' => 'teal',
            'metrics' => [
                ['label' => 'Low stock items', 'value' => '7', 'change' => '2 vs yesterday', 'tone' => 'warning'],
                ['label' => 'Days of cover (avg)', 'value' => '12.5', 'change' => 'Stable', 'tone' => 'good'],
                ['label' => 'Open reorders', 'value' => '4', 'change' => '1 urgent', 'tone' => 'warning'],
                ['label' => 'Spend forecast (30d)', 'value' => '$42.6K', 'change' => '+3.1%', 'tone' => 'neutral'],
            ],
            'inventory' => [
                ['item' => 'Linens — single set', 'onHand' => 48, 'par' => 120, 'status' => 'Critical'],
                ['item' => 'Cleaning chemicals', 'onHand' => 22, 'par' => 30, 'status' => 'Low'],
                ['item' => 'Toiletries kit', 'onHand' => 310, 'par' => 250, 'status' => 'Good'],
                ['item' => 'Coffee service pods', 'onHand' => 890, 'par' => 600, 'status' => 'Good'],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $ctx
     * @return array<string, mixed>
     */
    private function labourForecasterDetail(array $ctx): array
    {
        return [
            'title' => 'Lodge Labour Forecaster',
            'subtitle' => 'Forecast demand, coverage, and staffing needs.',
            'theme' => 'purple',
            'metrics' => [
                ['label' => 'Labour coverage', 'value' => $ctx['labourCoverage'].'%', 'tone' => 'good'],
                ['label' => 'Shortage forecast', 'value' => (string) max(0, $ctx['labourShortage']), 'tone' => $ctx['labourShortage'] > 0 ? 'warning' : 'good'],
                ['label' => 'Active housekeepers', 'value' => (string) $ctx['hkSummary']->activeHousekeepers, 'tone' => 'neutral'],
                ['label' => 'Required tomorrow', 'value' => (string) $ctx['hkSummary']->requiredHousekeepers, 'tone' => 'neutral'],
            ],
            'coverageByDay' => [
                ['day' => 'Mon', 'required' => 14, 'scheduled' => 13],
                ['day' => 'Tue', 'required' => 16, 'scheduled' => 14],
                ['day' => 'Wed', 'required' => 12, 'scheduled' => 12],
                ['day' => 'Thu', 'required' => 11, 'scheduled' => 11],
                ['day' => 'Fri', 'required' => 13, 'scheduled' => 13],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $ctx
     * @return array<string, mixed>
     */
    private function guestProfileDetail(array $ctx): array
    {
        return [
            'title' => 'Guest Profile Engine',
            'subtitle' => 'Active guest profiles, preferences, and segmentation.',
            'theme' => 'blue',
            'metrics' => [
                ['label' => 'Active guests', 'value' => '287', 'tone' => 'neutral'],
                ['label' => 'New arrivals today', 'value' => '34', 'tone' => 'good'],
                ['label' => 'VIP profiles', 'value' => '18', 'tone' => 'neutral'],
                ['label' => 'Incomplete profiles', 'value' => '12', 'tone' => 'warning'],
            ],
            'segments' => [
                ['segment' => 'Turner Industrial', 'guests' => 112, 'satisfaction' => '4.7'],
                ['segment' => 'Bechtel Corp', 'guests' => 86, 'satisfaction' => '4.5'],
                ['segment' => 'Fluor Enterprises', 'guests' => 54, 'satisfaction' => '4.6'],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $ctx
     * @return array<string, mixed>
     */
    private function eventsDirectorDetail(array $ctx): array
    {
        return [
            'title' => 'Events Director Engine',
            'subtitle' => 'Upcoming lodge events, catering, and room blocks.',
            'theme' => 'green',
            'metrics' => [
                ['label' => 'Upcoming events', 'value' => '12', 'tone' => 'neutral'],
                ['label' => 'This week', 'value' => '3', 'tone' => 'good'],
                ['label' => 'Room blocks held', 'value' => '48', 'tone' => 'neutral'],
                ['label' => 'Conflicts flagged', 'value' => '1', 'tone' => 'warning'],
            ],
            'events' => [
                ['name' => 'Turner safety briefing', 'date' => 'May 24', 'attendees' => 85, 'status' => 'Confirmed'],
                ['name' => 'Bechtel project kickoff', 'date' => 'May 26', 'attendees' => 42, 'status' => 'Confirmed'],
                ['name' => 'Fluor crew orientation', 'date' => 'May 28', 'attendees' => 36, 'status' => 'Pending'],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $ctx
     * @return array<string, mixed>
     */
    private function guestPortalDetail(array $ctx): array
    {
        return [
            'title' => 'Lodge Portal Engine',
            'subtitle' => 'Guest self-service portal usage and engagement.',
            'theme' => 'purple',
            'metrics' => [
                ['label' => 'Portal sessions (7d)', 'value' => '1,240', 'tone' => 'good'],
                ['label' => 'Active users today', 'value' => '186', 'tone' => 'neutral'],
                ['label' => 'Requests submitted', 'value' => '47', 'tone' => 'neutral'],
                ['label' => 'Avg session time', 'value' => '4m 12s', 'tone' => 'good'],
            ],
            'topActions' => [
                ['action' => 'View room assignment', 'count' => 412],
                ['action' => 'Update food preferences', 'count' => 198],
                ['action' => 'Submit maintenance request', 'count' => 86],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $ctx
     * @return array<string, mixed>
     */
    private function foodPreferencesDetail(array $ctx): array
    {
        return [
            'title' => 'Food Preference Engine',
            'subtitle' => 'Dietary preferences, allergies, and meal planning alignment.',
            'theme' => 'orange',
            'metrics' => [
                ['label' => 'Preference match rate', 'value' => '92%', 'tone' => 'good'],
                ['label' => 'Allergy profiles', 'value' => '34', 'tone' => 'warning'],
                ['label' => 'Meals planned today', 'value' => '412', 'tone' => 'neutral'],
                ['label' => 'Exceptions flagged', 'value' => '5', 'tone' => 'warning'],
            ],
            'breakdown' => [
                ['type' => 'Standard', 'count' => 198, 'pct' => 69],
                ['type' => 'Vegetarian', 'count' => 42, 'pct' => 15],
                ['type' => 'Halal', 'count' => 24, 'pct' => 8],
                ['type' => 'Gluten-free', 'count' => 23, 'pct' => 8],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $ctx
     * @return array<string, mixed>
     */
    private function communicationEngineDetail(array $ctx): array
    {
        return [
            'title' => 'Communication Engine',
            'subtitle' => 'Guest messaging, announcements, and response tracking.',
            'theme' => 'teal',
            'metrics' => [
                ['label' => 'Messages sent (7d)', 'value' => '156', 'tone' => 'neutral'],
                ['label' => 'Response rate', 'value' => '94%', 'tone' => 'good'],
                ['label' => 'Avg response time', 'value' => '18 min', 'tone' => 'good'],
                ['label' => 'Unread threads', 'value' => '3', 'tone' => 'warning'],
            ],
            'channels' => [
                ['channel' => 'Portal inbox', 'sent' => 68, 'open' => 2],
                ['channel' => 'SMS alerts', 'sent' => 52, 'open' => 1],
                ['channel' => 'Email notices', 'sent' => 36, 'open' => 0],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $ctx
     * @return array<string, mixed>
     */
    private function guestConcernsDetail(array $ctx): array
    {
        return [
            'title' => 'Guest Concern Engine',
            'subtitle' => 'Open concerns, escalations, and resolution tracking.',
            'theme' => 'orange',
            'metrics' => [
                ['label' => 'Open concerns', 'value' => '6', 'tone' => 'warning'],
                ['label' => 'High priority', 'value' => '2', 'tone' => 'high'],
                ['label' => 'Resolved this week', 'value' => '14', 'tone' => 'good'],
                ['label' => 'Avg resolution time', 'value' => '6.2 hrs', 'tone' => 'neutral'],
            ],
            'concerns' => [
                ['guest' => 'Room temperature — Dorm B', 'priority' => 'High', 'age' => '2 hrs', 'owner' => 'Maintenance'],
                ['guest' => 'Noise complaint — Dorm A', 'priority' => 'High', 'age' => '4 hrs', 'owner' => 'Front Desk'],
                ['guest' => 'Meal preference mismatch', 'priority' => 'Medium', 'age' => '6 hrs', 'owner' => 'Kitchen'],
            ],
            'alerts' => $ctx['alerts'],
        ];
    }

    /**
     * @param  array<string, mixed>  $ctx
     * @return array<string, mixed>
     */
    private function guestExperienceDetail(array $ctx): array
    {
        return [
            'title' => 'Guest Experience Analytics',
            'subtitle' => 'Satisfaction scores, feedback trends, and experience drivers.',
            'theme' => 'green',
            'metrics' => [
                ['label' => 'Satisfaction score', 'value' => '4.6 / 5', 'tone' => 'good'],
                ['label' => 'Responses this week', 'value' => '128', 'tone' => 'neutral'],
                ['label' => 'Promoters', 'value' => '72%', 'tone' => 'good'],
                ['label' => 'Detractors', 'value' => '6%', 'tone' => 'warning'],
            ],
            'drivers' => [
                ['driver' => 'Room cleanliness', 'score' => 4.8],
                ['driver' => 'Check-in speed', 'score' => 4.5],
                ['driver' => 'Food quality', 'score' => 4.4],
                ['driver' => 'Staff responsiveness', 'score' => 4.7],
            ],
            'trend' => [
                ['label' => 'Mon', 'value' => 4.4],
                ['label' => 'Tue', 'value' => 4.5],
                ['label' => 'Wed', 'value' => 4.6],
                ['label' => 'Thu', 'value' => 4.7],
                ['label' => 'Fri', 'value' => 4.6],
            ],
        ];
    }

    /**
     * @return list<array<string, string>>
     */
    private function quickActions(): array
    {
        return [
            ['label' => 'How is occupancy next 14 days?', 'color' => 'blue', 'topic' => 'Occupancy'],
            ['label' => "Show today's risks", 'color' => 'orange', 'topic' => 'Risk'],
            ['label' => 'Any high-risk alerts?', 'color' => 'orange', 'topic' => 'Risk'],
            ['label' => 'Labour coverage this week?', 'color' => 'teal', 'topic' => 'Labour'],
            ['label' => 'Housekeeping workload?', 'color' => 'green', 'topic' => 'Housekeeping'],
            ['label' => 'How is guest experience?', 'color' => 'purple', 'topic' => 'Guest'],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function commandSummary(
        int $occupied,
        int $totalRooms,
        float $occupancyPct,
        int $openAlerts,
        int $roomsAtRisk,
        int $hkReadiness,
        int $hkRemaining,
        int $labourCoverage,
        int $labourShortage,
    ): array {
        $healthScore = $this->childModuleHealth()['healthScore'] ?? 94;

        return [
            [
                'id' => 'lodge-health',
                'title' => 'Lodge Health',
                'value' => "{$healthScore}%",
                'status' => 'Stable',
                'accent' => 'green',
                'iconKey' => 'health',
                // Wire the summary card to the redesigned Smart Lodge
                // Intelligence Hub view so clicking it actually navigates.
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'module-health'],
            ],
            [
                'id' => 'occupancy',
                'title' => 'Occupancy',
                'value' => "{$occupied} / {$totalRooms}",
                'status' => "{$occupancyPct}%",
                'accent' => 'blue',
                'iconKey' => 'occupancy',
                'route' => 'room-utilization',
            ],
            [
                'id' => 'open-risks',
                'title' => 'Open Risks',
                'value' => "{$openAlerts} Open",
                'status' => '1 High',
                'accent' => 'red',
                'iconKey' => 'risk',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'alerts'],
            ],
            [
                'id' => 'rooms-at-risk',
                'title' => 'Rooms at Risk',
                'value' => (string) max(12, $roomsAtRisk),
                'status' => 'Needs Attention',
                'accent' => 'orange',
                'iconKey' => 'rooms-at-risk',
                'route' => 'room-utilization',
            ],
            [
                'id' => 'hk-readiness',
                'title' => 'HK Readiness',
                'value' => "{$hkReadiness}%",
                'status' => "{$hkRemaining} rooms remaining",
                'accent' => 'teal',
                'iconKey' => 'housekeeping',
                'route' => 'housekeeping-planning',
            ],
            [
                'id' => 'labour-coverage',
                'title' => 'Labour Coverage',
                'value' => "{$labourCoverage}%",
                'status' => $labourShortage > 0 ? "{$labourShortage} role shortage" : 'Coverage stable',
                'accent' => 'purple',
                'iconKey' => 'labour',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'labour-forecaster'],
            ],
            [
                'id' => 'utility-services',
                'title' => 'Utility Services',
                'value' => '3.2 days',
                'status' => 'Fuel + sewage risk',
                'accent' => 'teal',
                'iconKey' => 'utility',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'consumables-intelligence'],
            ],
            [
                'id' => 'guest-experience',
                'title' => 'Guest Experience',
                'value' => '4.6 / 5',
                'status' => '6 open concerns',
                'accent' => 'green',
                'iconKey' => 'guest-experience',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'guest-experience'],
            ],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function commandFunctions(int $openAlerts): array
    {
        $healthScore = $this->childModuleHealth()['healthScore'] ?? 94;

        return [
            [
                'id' => 'risk-alert-management',
                'title' => 'Risk & Alert Management',
                'primaryMetric' => "{$openAlerts} Open Alerts",
                'secondaryMetric' => '1 High Priority',
                'iconKey' => 'risk-alert-management',
                'color' => 'orange',
                'ctaLabel' => 'Open Alert Center',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'alerts'],
            ],
            [
                'id' => 'executive-dashboards',
                'title' => 'Executive Dashboard',
                'primaryMetric' => 'Lodge Health',
                'secondaryMetric' => "{$healthScore}% Stable",
                'iconKey' => 'executive-dashboard',
                'color' => 'blue',
                'ctaLabel' => 'Open Dashboard',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'executive-dashboards'],
            ],
            [
                'id' => 'predictive-analytics',
                'title' => 'Predictive Analytics',
                'primaryMetric' => 'Forecast Confidence',
                'secondaryMetric' => '91.8% 14-Day Outlook',
                'iconKey' => 'predictive-analytics',
                'color' => 'green',
                'ctaLabel' => 'View Forecasts',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'predictive-analytics'],
            ],
            [
                'id' => 'strategic-recommendations',
                'title' => 'Strategic Recommendations',
                'primaryMetric' => '5 Recommendations',
                'secondaryMetric' => '2 Need Approval',
                'iconKey' => 'strategic-recommendations',
                'color' => 'teal',
                'ctaLabel' => 'Review Actions',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'strategic-recommendations'],
            ],
            [
                'id' => 'scenario-planning',
                'title' => 'Scenario Planning',
                'primaryMetric' => '3 Saved Scenarios',
                'secondaryMetric' => 'Ready',
                'iconKey' => 'scenario-planning',
                'color' => 'purple',
                'ctaLabel' => 'Explore Scenarios',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'scenario-planning'],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function occupancyEngine(
        int $todaysBookings,
        float $occupancyPct,
        int $roomsToClean,
        int $roomsAtRisk,
        int $hkReadiness,
        int $labourCoverage,
        int $labourShortage,
    ): array {
        return [
            'title' => 'OCCUPANCY INTELLIGENCE ENGINE',
            'subtitle' => 'Operational Excellence & Resource Optimization',
            'lastUpdated' => '2 min ago',
            'dashboardRoute' => 'command-center.show',
            'dashboardRouteParams' => ['view' => 'executive-dashboards'],
            'modules' => [
                [
                    'id' => 'reservations',
                    'title' => 'Reservation Manager',
                    'icon' => '📅',
                    'metricLabel' => "Today's Bookings",
                    'metricValue' => (string) $todaysBookings,
                    'trend' => ['direction' => 'up', 'text' => '12% vs yesterday', 'tone' => 'good'],
                    'footerStatus' => 'Active',
                    'footerTone' => 'good',
                    'route' => 'reservations',
                ],
                [
                    'id' => 'room-utilization',
                    'title' => 'Room Utilization Manager',
                    'icon' => '🛏️',
                    'metricLabel' => 'Occupancy Today',
                    'metricValue' => round($occupancyPct).'%',
                    'secondaryMetric' => 'Rooms at Risk: '.max(12, $roomsAtRisk),
                    'footerStatus' => 'Warning',
                    'footerTone' => 'warning',
                    'route' => 'room-utilization',
                ],
                [
                    'id' => 'housekeeping',
                    'title' => 'Housekeeping Planning & Workload',
                    'icon' => '🧹',
                    'metricLabel' => 'Rooms to Clean',
                    'metricValue' => (string) $roomsToClean,
                    'secondaryMetric' => "Readiness: {$hkReadiness}%",
                    'footerStatus' => 'Active',
                    'footerTone' => 'good',
                    'route' => 'housekeeping-planning',
                ],
                [
                    'id' => 'labour',
                    'title' => 'Lodge Labour Forecaster',
                    'icon' => '👥',
                    'metricLabel' => 'Labour Coverage',
                    'metricValue' => "{$labourCoverage}%",
                    'secondaryMetric' => $labourShortage > 0 ? "{$labourShortage} Role Shortage" : 'Coverage stable',
                    'footerStatus' => 'Good',
                    'footerTone' => 'good',
                    'route' => 'command-center.show',
                    'routeParams' => ['view' => 'labour-forecaster'],
                ],
                [
                    'id' => 'consumables',
                    'title' => 'Consumables Intelligence',
                    'icon' => '📦',
                    'metricLabel' => 'Utility',
                    'metricValue' => '3.2 days',
                    'secondaryMetric' => 'Supplies: 12.5 days',
                    'tertiaryMetric' => 'Low Stock Items: 7',
                    'footerStatus' => 'Warning',
                    'footerTone' => 'warning',
                    'route' => 'command-center.show',
                    'routeParams' => ['view' => 'consumables-intelligence'],
                ],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function guestEngine(): array
    {
        return [
            'title' => 'GUEST INTELLIGENCE ENGINE',
            'subtitle' => 'Guest Experience & Engagement Intelligence',
            'lastUpdated' => '2 min ago',
            'dashboardRoute' => 'command-center.show',
            'dashboardRouteParams' => ['view' => 'guest-experience'],
            'modules' => [
                [
                    'id' => 'guest-profile',
                    'title' => 'Guest Profile Engine',
                    'icon' => '👤',
                    'metricLabel' => 'Active Guests',
                    'metricValue' => '287',
                    'footerStatus' => 'Active',
                    'footerTone' => 'good',
                    'route' => 'command-center.show',
                    'routeParams' => ['view' => 'guest-profile'],
                ],
                [
                    'id' => 'portal',
                    'title' => 'Lodge Portal Engine',
                    'icon' => '💻',
                    'metricLabel' => 'Open Requests',
                    'metricValue' => '8',
                    'footerStatus' => 'Active',
                    'footerTone' => 'good',
                    'route' => 'command-center.show',
                    'routeParams' => ['view' => 'guest-portal'],
                ],
                [
                    'id' => 'concerns',
                    'title' => 'Guest Concern Engine',
                    'icon' => '⚠️',
                    'metricLabel' => 'Open Concerns',
                    'metricValue' => '6',
                    'secondaryMetric' => 'Overdue: 2',
                    'highlight' => true,
                    'footerStatus' => 'Attention',
                    'footerTone' => 'warning',
                    'route' => 'command-center.show',
                    'routeParams' => ['view' => 'guest-concerns'],
                ],
                [
                    'id' => 'food-preference',
                    'title' => 'Food Preference Engine',
                    'icon' => '🍽️',
                    'metricLabel' => 'Preference Match',
                    'metricValue' => '92%',
                    'footerStatus' => 'Good',
                    'footerTone' => 'good',
                    'route' => 'command-center.show',
                    'routeParams' => ['view' => 'food-preferences'],
                ],
                [
                    'id' => 'communication',
                    'title' => 'Communication Engine',
                    'icon' => '💬',
                    'metricLabel' => 'Messages Sent',
                    'metricValue' => '156',
                    'footerStatus' => 'Active',
                    'footerTone' => 'good',
                    'route' => 'command-center.show',
                    'routeParams' => ['view' => 'communication-engine'],
                ],
                [
                    'id' => 'events',
                    'title' => 'Events Director Engine',
                    'icon' => '📆',
                    'metricLabel' => 'Upcoming Events',
                    'metricValue' => '12',
                    'footerStatus' => 'Active',
                    'footerTone' => 'good',
                    'route' => 'command-center.show',
                    'routeParams' => ['view' => 'events-director'],
                ],
                [
                    'id' => 'experience',
                    'title' => 'Guest Experience Analytics',
                    'icon' => '📊',
                    'metricLabel' => 'Satisfaction Score',
                    'metricValue' => '4.6 / 5',
                    'footerStatus' => 'Good',
                    'footerTone' => 'good',
                    'route' => 'command-center.show',
                    'routeParams' => ['view' => 'guest-experience'],
                ],
            ],
        ];
    }

    /**
     * @return list<array<string, string>>
     */
    private function intelligenceOutputs(): array
    {
        return [
            ['icon' => '📺', 'title' => 'Real-Time Dashboards', 'description' => 'Live performance views'],
            ['icon' => '🔔', 'title' => 'Operational Alerts', 'description' => 'Critical & high alerts'],
            ['icon' => '📈', 'title' => 'Demand & Occupancy Forecasts', 'description' => 'Short & long-term outlook'],
            ['icon' => '👥', 'title' => 'Labour & Housekeeping Recommendations', 'description' => 'Optimized staffing & tasks'],
            ['icon' => '😊', 'title' => 'Guest Experience Insights', 'description' => 'Satisfaction & trends'],
            ['icon' => '💲', 'title' => 'Cost & Resource Optimization', 'description' => 'Reduce waste & spend'],
            ['icon' => '📄', 'title' => 'Executive Reports & Weekly Summaries', 'description' => 'Automated reporting'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function systemStatus(): array
    {
        return [
            'lastRefresh' => '10:22 AM (2 min ago)',
            'nextForecastUpdate' => 'Today, 2:00 PM',
            'aiModelStatus' => 'All models healthy',
            'healthRoute' => 'command-center.show',
            'healthRouteParams' => ['view' => 'module-health'],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function summaryWidgets(int $openAlerts, string $peakRiskDate): array
    {
        return [
            [
                'id' => 'executive-dashboards',
                'title' => 'Executive Dashboards',
                'status' => 'Active',
                'statusTone' => 'success',
                'primaryValue' => '3 dashboards',
                'secondaryText' => 'reporting',
                'icon' => '📊',
                'ctaLabel' => 'Open',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'executive-dashboards'],
            ],
            [
                'id' => 'predictive-analytics',
                'title' => 'Predictive Analytics',
                'status' => 'Active',
                'statusTone' => 'success',
                'primaryValue' => '7-day forecast',
                'secondaryText' => 'updated',
                'icon' => '📈',
                'ctaLabel' => 'View Details',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'predictive-analytics'],
            ],
            [
                'id' => 'risk-alert-management',
                'title' => 'Risk & Alert Management',
                'status' => "{$openAlerts} Open Alerts",
                'statusTone' => 'danger',
                'primaryValue' => "{$openAlerts} Open Alerts",
                'secondaryText' => '1 high priority',
                'icon' => '⚠️',
                'ctaLabel' => 'Open Alerts',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'alerts'],
            ],
            [
                'id' => 'scenario-planning',
                'title' => 'Scenario Planning',
                'status' => 'Ready',
                'statusTone' => 'purple',
                'primaryValue' => '3 saved scenarios',
                'secondaryText' => 'what-if tools',
                'icon' => '🔮',
                'ctaLabel' => 'Explore',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'scenario-planning'],
            ],
            [
                'id' => 'strategic-recommendations',
                'title' => 'Strategic Recommendations',
                'status' => '6 Recommendations',
                'statusTone' => 'warning',
                'primaryValue' => '6 Recommendations',
                'secondaryText' => '2 require approval',
                'icon' => '🎯',
                'ctaLabel' => 'View Details',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'strategic-recommendations'],
            ],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function kpiWidgets(
        int $occupied,
        int $totalRooms,
        float $occupancyPct,
        int $vacantClean,
        int $vacantDirty,
        int $availableTotal,
        int $roomsAtRisk,
        int $hkReadiness,
        int $hkRemaining,
        int $labourCoverage,
        int $labourShortage,
    ): array {
        return [
            [
                'id' => 'occupancy',
                'title' => 'Current Occupancy',
                'value' => "{$occupied} / {$totalRooms}",
                'subtext' => "{$occupancyPct}%",
                'icon' => '🏨',
                'accent' => 'blue',
                'route' => 'room-utilization',
            ],
            [
                'id' => 'available-rooms',
                'title' => 'Available Rooms',
                'value' => "{$vacantClean} Clean",
                'subtext' => "{$vacantDirty} Dirty | {$availableTotal} Total",
                'icon' => '🛏️',
                'accent' => 'green',
                'route' => 'room-utilization',
            ],
            [
                'id' => 'rooms-at-risk',
                'title' => 'Rooms at Risk',
                'value' => (string) $roomsAtRisk,
                'subtext' => 'Maintenance + delayed turnover',
                'icon' => '⚠️',
                'accent' => 'red',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'alerts'],
            ],
            [
                'id' => 'hk-readiness',
                'title' => 'HK Readiness',
                'value' => "{$hkReadiness}%",
                'subtext' => "{$hkRemaining} rooms remaining",
                'icon' => '🧹',
                'accent' => 'amber',
                'route' => 'housekeeping-planning',
            ],
            [
                'id' => 'labour-coverage',
                'title' => 'Labour Coverage',
                'value' => "{$labourCoverage}%",
                'subtext' => $labourShortage > 0
                    ? "{$labourShortage} role shortage forecasted tomorrow"
                    : 'Coverage stable',
                'icon' => '👥',
                'accent' => 'purple',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'module-health'],
            ],
            [
                'id' => 'utility-services',
                'title' => 'Utility Services',
                'value' => '3.2 days',
                'subtext' => 'Fuel + sewage risk',
                'icon' => '⛽',
                'accent' => 'teal',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'integrations'],
            ],
            [
                'id' => 'lodge-supplies',
                'title' => 'Lodge Supplies',
                'value' => '12.5 days',
                'subtext' => '4 below par',
                'icon' => '📦',
                'accent' => 'teal',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'integrations'],
            ],
            [
                'id' => 'cost-variance',
                'title' => 'Cost Variance',
                'value' => '+3.8%',
                'subtext' => 'vs last week',
                'icon' => '💲',
                'accent' => 'blue',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'executive-dashboards'],
            ],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function alerts(mixed $forecast, int $labourShortage): array
    {
        $items = [
            [
                'priority' => 'HIGH',
                'tone' => 'high',
                'title' => 'Monday Capacity Pressure',
                'description' => 'Projected shortage of 8 rooms. Review releasable on-holds and dirty-room turnover.',
            ],
            [
                'priority' => 'MED',
                'tone' => 'medium',
                'title' => 'Utility & Site Service Risk',
                'description' => 'Diesel fuel and sewage disposal projected below threshold within 72 hours.',
            ],
        ];

        if ($labourShortage > 0) {
            $items[] = [
                'priority' => 'MED',
                'tone' => 'medium',
                'title' => 'Housekeeping Workload Spike',
                'description' => 'Tuesday workload forecast exceeds capacity by 18 points.',
            ];
        }

        $items[] = [
            'priority' => 'LOW',
            'tone' => 'low',
            'title' => 'Data Quality Warning',
            'description' => '2 schedule feeds awaiting validation from Boon integration.',
        ];

        return $items;
    }

    /**
     * @return list<array<string, string>>
     */
    private function aiRecommendations(int $onHoldCount): array
    {
        $releaseCount = min(8, max(1, (int) round($onHoldCount * 0.04)));

        return [
            ['text' => "Release {$releaseCount} on-hold rooms"],
            ['text' => 'Confirm utility service schedule'],
            ['text' => 'Rebalance housekeeping workload'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function childModuleHealth(): array
    {
        return [
            // Smart Lodge Intelligence Hub displays the 8 child modules
            // returned by childModules() (Reservation, Room Utilization,
            // Housekeeping, Labour, Consumables, Guest, Food Cost Forecasting,
            // Boon Schedule Feed).
            'modulesActive' => 8,
            'warnings' => 0,
            'healthScore' => 98,
            'lastUpdated' => '2 min ago',
        ];
    }

    /**
     * @return list<array<string, string>>
     */
    private function integrations(): array
    {
        return [
            ['name' => 'Property Management System', 'status' => 'Connected'],
            ['name' => 'Finance / ERP', 'status' => 'Connected'],
            ['name' => 'Supplier Network', 'status' => 'Connected'],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function childModules(): array
    {
        return [
            [
                'id' => 'reservations',
                'title' => 'Reservation Engine',
                'description' => 'Manage bookings, holds & availability',
                'status' => 'Active',
                'icon' => '📅',
                'route' => 'reservations',
            ],
            [
                'id' => 'room-utilization',
                'title' => 'Room Utilization',
                'description' => 'Track occupancy, turnover & room performance',
                'status' => 'Active',
                'icon' => '📊',
                'route' => 'room-utilization',
            ],
            [
                'id' => 'housekeeping',
                'title' => 'Housekeeping Planning & Workload',
                'description' => 'Plan schedules, assignments & workload balance',
                'status' => 'Active',
                'icon' => '🧹',
                'route' => 'housekeeping-planning',
            ],
            [
                'id' => 'labour',
                'title' => 'Lodge Labour Forecaster',
                'description' => 'Forecast demand, coverage & staffing needs',
                'status' => 'Active',
                'icon' => '👥',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'module-health'],
            ],
            [
                'id' => 'consumables',
                'title' => 'Consumables Intelligence',
                'description' => 'Monitor supplies, inventory & reorder planning',
                'status' => 'Active',
                'icon' => '📦',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'integrations'],
            ],
            [
                'id' => 'guest',
                'title' => 'Guest Intelligence',
                'description' => 'Guest insights, preferences & experience analytics',
                'status' => 'Active',
                'icon' => '👤',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'module-health'],
            ],
            [
                // 7th module — appears as the bottom-row left card on the Hub.
                // Routed to food-preferences for now (closest existing detail
                // view). Repoint to a dedicated food-cost view once it ships.
                'id' => 'food',
                'title' => 'Food Cost Forecasting & Engine',
                'description' => 'Forecast meal demand, food cost & purchasing needs',
                'status' => 'Active',
                'icon' => '🍽️',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'food-preferences'],
            ],
            [
                // 8th module — appears as the bottom-row right card on the Hub.
                // Boon is a workforce schedule integration; the integrations
                // detail view is the natural landing page until a dedicated
                // Boon page exists.
                'id' => 'boon-schedule',
                'title' => 'Boon Schedule Feed',
                'description' => 'Sync workforce schedules, validate changes & forecast demand',
                'status' => 'Active',
                'icon' => '📆',
                'route' => 'command-center.show',
                'routeParams' => ['view' => 'integrations'],
            ],
        ];
    }

    /**
     * @return list<array<string, string>>
     */
    private function strategicRecommendations(int $count): array
    {
        return [
            ['title' => 'Release on-hold rooms before Monday peak', 'approval' => 'Required'],
            ['title' => 'Confirm diesel delivery before weekend', 'approval' => 'Required'],
            ['title' => 'Review contractor allotment mix for Dorm A', 'approval' => 'Optional'],
            ['title' => 'Publish housekeeping assignment board', 'approval' => 'Required'],
            ['title' => 'Escalate overflow risk to operations lead', 'approval' => 'Optional'],
            ['title' => 'Validate Boon schedule feed mappings', 'approval' => 'Optional'],
        ];
    }
}
