<?php

namespace App\Http\Controllers;

use App\Services\Ai\Agents\RoomInventoryIntelligenceAgent;
use App\Services\Ai\AiFeatureFlags;
use Inertia\Inertia;
use Inertia\Response;

class ReservationManagerController extends Controller
{
    public function __construct(
        private readonly RoomInventoryIntelligenceAgent $roomInventoryAgent,
        private readonly AiFeatureFlags $aiFlags,
    ) {}

    public function index(): Response
    {
        try {
            $this->roomInventoryAgent->scanConflicts(auth()->user());
        } catch (\Throwable) {
            // Shadow scan must never block Reservation Manager.
        }

        return Inertia::render('ReservationManager', [
            'lastUpdated' => now()->format('M j, Y g:i A'),
            'siteName' => 'Boon Lodge • Main Site',
            'selectedDate' => now()->format('M j, Y'),
            'aiProposals' => $this->roomInventoryAgent->presentPending(),
            'aiFlags' => $this->aiFlags->publicState(RoomInventoryIntelligenceAgent::AGENT),
        ]);
    }
}
