<?php

namespace App\Services\Ai\Agents;

use App\Models\AiProposal;
use App\Models\AiProposalAuditLog;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\User;
use App\Services\Ai\RoomInventoryAvailabilityInspector;
use App\Services\RoomUtilization\RoomAssignmentService;
use Illuminate\Validation\ValidationException;

class RoomProposalApprovalService
{
    public function __construct(
        private readonly RoomAssignmentService $assignmentService,
        private readonly RoomInventoryAvailabilityInspector $inspector,
    ) {}

    public function approve(AiProposal $proposal, User $user): ?Reservation
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

        if ($proposal->action === 'flag_risk') {
            $this->mark($proposal, $user, 'Approved', 'Human acknowledged conflict flag. No occupancy written.');

            return null;
        }

        if ($proposal->action !== 'recommend_room') {
            throw ValidationException::withMessages([
                'proposal' => 'This proposal cannot be executed as an assignment.',
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

        if (! $this->inspector->isAvailable($room, $reservation)) {
            throw ValidationException::withMessages([
                'room' => 'This room is not actually available. AI will not write occupancy.',
            ]);
        }

        $reservation = $this->assignmentService->assign($reservation, $room, $user, method: 'manual');

        $this->mark($proposal, $user, 'Approved', 'Human approved room proposal; RoomAssignmentService::assign executed.');

        return $reservation;
    }

    public function dismiss(AiProposal $proposal, User $user): void
    {
        if (! $proposal->isPending()) {
            throw ValidationException::withMessages([
                'proposal' => 'Only pending proposals can be dismissed.',
            ]);
        }

        $this->mark($proposal, $user, 'Dismissed', 'Human dismissed room proposal. No assignment written.');
    }

    private function mark(AiProposal $proposal, User $user, string $status, string $notes): void
    {
        $proposal->update([
            'status' => $status,
            'approved_by' => $status === 'Approved' ? $user->id : $proposal->approved_by,
            'approved_at' => $status === 'Approved' ? now() : $proposal->approved_at,
        ]);

        AiProposalAuditLog::query()->create([
            'ai_proposal_id' => $proposal->id,
            'user_id' => $user->id,
            'action' => strtolower($status) === 'approved' ? 'approved' : 'dismissed',
            'notes' => $notes,
            'context' => $proposal->payload ?? [],
        ]);
    }
}
