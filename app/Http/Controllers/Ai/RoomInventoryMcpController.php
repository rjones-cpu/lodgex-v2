<?php

namespace App\Http\Controllers\Ai;

use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Services\Ai\Agents\RoomInventoryIntelligenceAgent;
use App\Services\Ai\ForbiddenActions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Read-only JSON surface for the Cloudflare lodgex-mcp Worker.
 * create_proposal persists an AiProposal. It does not assign a room.
 */
class RoomInventoryMcpController extends Controller
{
    public function __construct(
        private readonly RoomInventoryIntelligenceAgent $agent,
    ) {}

    public function listRooms(Request $request): JsonResponse
    {
        return response()->json([
            'ok' => true,
            'agent' => RoomInventoryIntelligenceAgent::AGENT,
            'capabilities' => RoomInventoryIntelligenceAgent::CAPABILITIES,
            'rooms' => $this->agent->listRooms((int) $request->integer('limit', 200)),
        ]);
    }

    public function occupancy(Request $request): JsonResponse
    {
        return response()->json([
            'ok' => true,
            'agent' => RoomInventoryIntelligenceAgent::AGENT,
            'occupancy' => $this->agent->occupancySummary(),
            'reservations' => $this->agent->listReservations((int) $request->integer('limit', 200)),
        ]);
    }

    public function reservations(Request $request): JsonResponse
    {
        return response()->json([
            'ok' => true,
            'reservations' => $this->agent->listReservations((int) $request->integer('limit', 200)),
        ]);
    }

    public function availability(Request $request): JsonResponse
    {
        $reservationId = $request->filled('reservation_id')
            ? (int) $request->integer('reservation_id')
            : null;

        return response()->json([
            'ok' => true,
            'rule' => 'Vacant Clean and not held, blocked, assigned, restricted, or on maintenance',
            'rooms' => $this->agent->listAvailability($reservationId, (int) $request->integer('limit', 200)),
        ]);
    }

    public function createProposal(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reservation_id' => ['required', 'integer', 'exists:reservations,id'],
        ]);

        $reservation = Reservation::query()
            ->with(['worker', 'room'])
            ->findOrFail($validated['reservation_id']);

        try {
            $proposal = $this->agent->proposeForReservation($reservation, $request->user());
        } catch (ValidationException $exception) {
            return response()->json([
                'ok' => false,
                'errors' => $exception->errors(),
            ], 422);
        }

        $reservation->refresh();

        return response()->json([
            'ok' => true,
            'proposal' => $this->agent->present($proposal),
            'occupancy_written' => $reservation->room_id !== null,
        ], 201);
    }

    public function refuseWrite(Request $request): JsonResponse
    {
        $action = strtolower((string) $request->route('action', $request->input('action', 'write')));

        return response()->json([
            'ok' => false,
            'error' => 'Room Inventory Intelligence is proposal-only. AI cannot assign, hold, release, check in, or write occupancy.',
            'action' => $action,
            'blocked' => ForbiddenActions::isBlocked($action) || in_array($action, [
                'assign', 'hold', 'release', 'check-in', 'check_in', 'write_occupancy',
            ], true),
            'allowed' => [
                'list_rooms',
                'get_occupancy',
                'list_reservations',
                'list_availability',
                'create_proposal',
            ],
        ], 403);
    }
}
