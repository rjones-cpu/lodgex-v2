<?php

namespace App\Http\Controllers;

use App\Models\AiProposal;
use App\Services\Ai\Agents\HousekeepingLabourProposalApprovalService;
use App\Services\Ai\Agents\RoomProposalApprovalService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AiProposalController extends Controller
{
    public function __construct(
        private readonly RoomProposalApprovalService $roomApprovals,
        private readonly HousekeepingLabourProposalApprovalService $housekeepingApprovals,
    ) {}

    public function approve(Request $request, AiProposal $proposal): RedirectResponse
    {
        $user = $request->user();

        try {
            if ($this->housekeepingApprovals->handles($proposal)) {
                $this->housekeepingApprovals->approve($proposal, $user);

                return redirect()->back()->with(
                    'toast',
                    'Draft labelled. No HK board published, no overtime authorized, no room status written.',
                );
            }

            $reservation = $this->roomApprovals->approve($proposal, $user);
        } catch (ValidationException $exception) {
            return redirect()->back()->withErrors($exception->errors());
        }

        if ($reservation === null) {
            return redirect()->back()->with('toast', 'Conflict flag acknowledged. No occupancy was written.');
        }

        $room = $reservation->room;
        $workerName = $reservation->worker?->name ?? 'worker';
        $roomLabel = $room ? "{$room->number} ({$room->dorm})" : 'room';

        return redirect()->back()->with(
            'toast',
            "Approved proposal — {$roomLabel} assigned to {$workerName}.",
        );
    }

    public function dismiss(Request $request, AiProposal $proposal): RedirectResponse
    {
        $user = $request->user();

        try {
            if ($this->housekeepingApprovals->handles($proposal)) {
                $this->housekeepingApprovals->dismiss($proposal, $user);

                return redirect()->back()->with('toast', 'AI housekeeping/labour draft dismissed. No ops write.');
            }

            $this->roomApprovals->dismiss($proposal, $user);
        } catch (ValidationException $exception) {
            return redirect()->back()->withErrors($exception->errors());
        }

        return redirect()->back()->with('toast', 'AI room proposal dismissed. No room was assigned.');
    }
}
