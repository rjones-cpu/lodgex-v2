<?php

namespace App\Http\Controllers\Ai;

use App\Http\Controllers\Controller;
use App\Services\Ai\Agents\HousekeepingWorkloadAgent;
use App\Services\Ai\Agents\LabourForecastAgent;
use App\Services\Ai\ForbiddenActions;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Read-only JSON surface for lodgex-mcp Wave 2 stubs (SL-04 + SL-11).
 * Drafts persist AiProposal rows. They never publish a board or authorize OT.
 */
class HousekeepingLabourMcpController extends Controller
{
    public function __construct(
        private readonly HousekeepingWorkloadAgent $workload,
        private readonly LabourForecastAgent $labour,
    ) {}

    public function workload(Request $request): JsonResponse
    {
        $date = $this->date($request);

        try {
            $result = $this->workload->draftForDate($date, $request->user());
        } catch (ValidationException $exception) {
            return response()->json(['ok' => false, 'errors' => $exception->errors()], 422);
        }

        return response()->json([
            'ok' => true,
            'agent' => HousekeepingWorkloadAgent::AGENT,
            'capabilities' => HousekeepingWorkloadAgent::CAPABILITIES,
            'class' => HousekeepingWorkloadAgent::CLASS_MODE,
            'auto_publish' => false,
            'draft' => $this->workload->presentDraft($result['draft']),
            'proposal' => $this->workload->present($result['proposal']),
        ]);
    }

    public function labour(Request $request): JsonResponse
    {
        $date = $this->date($request);

        try {
            $result = $this->labour->forecastFrom($date, $request->user());
        } catch (ValidationException $exception) {
            return response()->json(['ok' => false, 'errors' => $exception->errors()], 422);
        }

        return response()->json([
            'ok' => true,
            'agent' => LabourForecastAgent::AGENT,
            'capabilities' => LabourForecastAgent::CAPABILITIES,
            'class' => LabourForecastAgent::CLASS_MODE,
            'auto_publish' => false,
            'forecast' => $this->labour->presentForecast($result['forecast']),
            'proposal' => $this->labour->present($result['proposal']),
        ]);
    }

    public function refuseWrite(Request $request): JsonResponse
    {
        $action = strtolower((string) $request->route('action', $request->input('action', 'write')));

        return response()->json([
            'ok' => false,
            'error' => 'Housekeeping Workload and Labour Forecast are proposal-only. AI cannot publish the HK board, approve overtime, mark Ready, or write occupancy.',
            'action' => $action,
            'blocked' => ForbiddenActions::isBlocked($action) || in_array($action, [
                'publish_hk_board',
                'publish_assignment_board',
                'approve_overtime',
                'mark_ready',
                'mark_vacant',
            ], true),
            'allowed' => [
                'get_housekeeping_workload',
                'get_labour_forecast',
            ],
        ], 403);
    }

    private function date(Request $request): Carbon
    {
        $raw = $request->input('date');
        if (is_string($raw) && $raw !== '') {
            return Carbon::parse($raw)->startOfDay();
        }

        return Carbon::today();
    }
}
