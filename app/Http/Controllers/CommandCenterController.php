<?php

namespace App\Http\Controllers;

use App\Services\CommandCenter\CommandCenterService;
use Inertia\Inertia;
use Inertia\Response;

class CommandCenterController extends Controller
{
    private const VIEWS = [
        'executive-dashboards',
        'predictive-analytics',
        'alerts',
        'scenario-planning',
        'strategic-recommendations',
        'ai-recommendations',
        'module-health',
        'integrations',
        'consumables-intelligence',
        'labour-forecaster',
        'guest-profile',
        'events-director',
        'guest-portal',
        'food-preferences',
        'communication-engine',
        'guest-concerns',
        'guest-experience',
    ];

    public function __construct(
        private readonly CommandCenterService $commandCenter,
    ) {}

    public function index(): Response
    {
        return Inertia::render('CommandCenter/Index', $this->commandCenter->buildDashboardPayload());
    }

    public function show(string $view): Response
    {
        abort_unless(in_array($view, self::VIEWS, true), 404);

        return Inertia::render('CommandCenter/Detail', [
            'view' => $view,
            'detail' => $this->commandCenter->buildDetailPayload($view),
            'lastUpdated' => now()->format('M j, Y g:i A'),
        ]);
    }
}
