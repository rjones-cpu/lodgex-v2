<?php

namespace App\Http\Controllers;

use App\Models\AiProposal;
use App\Services\Ai\Agents\RoomProposalApprovalService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AiProposalController extends Controller
{
    public function __construct(
        private readonly RoomProposalApprovalService $approvals,
    ) {}

    public function approve(Request $request, AiProposal $proposal): RedirectResponse
    {
        try {
            $reservation = $this->approvals->approve($proposal, $request->user());
        } catch (ValidationException $exception) {
            return redirect()->back()->withErrors($exception->errors());
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
        try {
            $this->approvals->dismiss($proposal, $request->user());
        } catch (ValidationException $exception) {
            return redirect()->back()->withErrors($exception->errors());
        }

        return redirect()->back()->with('toast', 'AI room proposal dismissed. No room was assigned.');
    }
}
