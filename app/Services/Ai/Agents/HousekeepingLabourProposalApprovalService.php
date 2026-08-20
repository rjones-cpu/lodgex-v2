<?php

namespace App\Services\Ai\Agents;

use App\Models\AiProposal;
use App\Models\AiProposalAuditLog;
use App\Models\User;
use App\Services\Ai\ForbiddenActions;
use App\Services\HousekeepingPlanning\HousekeepingAssignmentService;
use Illuminate\Validation\ValidationException;

/**
 * Wave 2 approve/dismiss for SL-04 / SL-11 drafts.
 *
 * Acknowledge only. Never publishes the HK board, never authorizes overtime,
 * never writes room or worker status.
 */
class HousekeepingLabourProposalApprovalService
{
    /**
     * @var list<string>
     */
    public const AGENTS = [
        HousekeepingWorkloadAgent::AGENT,
        LabourForecastAgent::AGENT,
    ];

    /**
     * @var list<string>
     */
    public const ACKNOWLEDGE_ACTIONS = [
        'draft_clean_list',
        'labour_forecast',
        'flag_risk',
        'draft_for_review',
        'propose_overtime',
        'propose_limit_override',
        'propose_special_clean_exception',
        'propose_ready_with_exception',
    ];

    public function handles(AiProposal $proposal): bool
    {
        return in_array($proposal->agent, self::AGENTS, true);
    }

    public function approve(AiProposal $proposal, User $user): void
    {
        if (! $this->handles($proposal)) {
            throw ValidationException::withMessages([
                'proposal' => 'This proposal is not a housekeeping or labour-forecast draft.',
            ]);
        }

        if (! $proposal->isPending()) {
            throw ValidationException::withMessages([
                'proposal' => 'Only pending proposals can be approved.',
            ]);
        }

        $this->assertNotExecutable($proposal);

        if (! in_array($proposal->action, self::ACKNOWLEDGE_ACTIONS, true)) {
            throw ValidationException::withMessages([
                'proposal' => 'This proposal cannot be executed. Wave 2 acknowledgements are labelled drafts only.',
            ]);
        }

        $this->mark(
            $proposal,
            $user,
            'Approved',
            'Human labelled a Level 1 draft. No HK board published, no overtime authorized, no room status written.',
        );
    }

    public function dismiss(AiProposal $proposal, User $user): void
    {
        if (! $proposal->isPending()) {
            throw ValidationException::withMessages([
                'proposal' => 'Only pending proposals can be dismissed.',
            ]);
        }

        $this->mark($proposal, $user, 'Dismissed', 'Human dismissed housekeeping/labour draft. No ops write.');
    }

    /**
     * Explicit refuse path used by tests and MCP.
     */
    public function refusePublishBoard(AiProposal $proposal): never
    {
        throw ValidationException::withMessages([
            'action' => 'AI cannot publish the housekeeping assignment board. '.HousekeepingAssignmentService::class.' stays human-triggered.',
        ]);
    }

    public function refuseOvertime(AiProposal $proposal): never
    {
        throw ValidationException::withMessages([
            'action' => 'AI cannot approve overtime. Lodge Manager only, via OvertimeApprovalService.',
        ]);
    }

    private function assertNotExecutable(AiProposal $proposal): void
    {
        $action = (string) $proposal->action;
        if (ForbiddenActions::isBlocked($action)) {
            throw ValidationException::withMessages([
                'action' => "AI cannot approve forbidden action [{$action}].",
            ]);
        }

        $requested = $proposal->payload['requested_change'] ?? [];
        foreach (['publish_hk_board', 'publish_roster', 'approve_overtime', 'execute', 'auto_execute', 'mark_ready'] as $flag) {
            if (! empty($requested[$flag])) {
                throw ValidationException::withMessages([
                    $flag => 'Wave 2 drafts cannot execute '.$flag.'.',
                ]);
            }
        }

        $decision = (string) ($proposal->payload['decision'] ?? '');
        if (ForbiddenActions::isExecutableDecision($decision)) {
            throw ValidationException::withMessages([
                'decision' => 'AI cannot emit an execute decision.',
            ]);
        }
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
