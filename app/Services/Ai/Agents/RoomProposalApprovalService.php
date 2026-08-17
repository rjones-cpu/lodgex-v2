<?php

namespace App\Services\Ai\Agents;

use App\Models\AiProposal;
use App\Models\AiProposalAuditLog;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\User;
use App\Services\RoomUtilization\RoomAssignmentService;
use Illuminate\Validation\ValidationException;

class RoomProposalApprovalService
{
    public function __construct(
        private readonly RoomAssignmentService $assignmentService,
    ) {}

    public function approve(AiProposal $proposal, User $user): Reservation
    {
        if ($proposal->agent !== RoomInventoryIntelligenceAgent::AGENT) {
            throw ValidationException::withMessages([
                'proposal' => 'This proposal is not a room-inventory recommendation.',
            ]);
        }

        if (! $proposal->isPending()) {
            throw ValidationException::withMessages([
                'proposal' => 'Only pending proposals can be approved.',
            ]);
        }

        $reservationId = (int) ($proposal->payload['reservation_id'] ?? 0);
        $roomId = (int) ($proposal->payload['room_id'] ?? 0);

        if ($reservationId < 1 || $roomId < 1) {
            throw ValidationException::withMessages([
                'proposal' => 'Proposal is missing reservation or room.',
            ]);
        }

        $reservation = Reservation::query()->with(['worker', 'room'])->findOrFail($reservationId);
        $room = Room::query()->with(['activeHold', 'activeMaintenanceHold'])->findOrFail($roomId);

        $reservation = $this->assignmentService->assign($reservation, $room, $user, method: 'manual');

        $proposal->update([
            'status' => 'Approved',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        $this->log($proposal, 'approved', $user, 'Human approved room proposal; RoomAssignmentService::assign executed.');

        return $reservation;
    }

    public function dismiss(AiProposal $proposal, User $user): void
    {
        if (! $proposal->isPending()) {
            throw ValidationException::withMessages([
                'proposal' => 'Only pending proposals can be dismissed.',
            ]);
        }

        $proposal->update(['status' => 'Dismissed']);
        $this->log($proposal, 'dismissed', $user, 'Human dismissed room proposal. No assignment written.');
    }

    private function log(AiProposal $proposal, string $action, User $user, string $notes): void
    {
        AiProposalAuditLog::query()->create([
            'ai_proposal_id' => $proposal->id,
            'user_id' => $user->id,
            'action' => $action,
            'notes' => $notes,
            'context' => $proposal->payload ?? [],
        ]);
    }
}
