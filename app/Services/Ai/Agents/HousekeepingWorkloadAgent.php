<?php

namespace App\Services\Ai\Agents;

use App\Models\AiProposal;
use App\Models\AiProposalAuditLog;
use App\Models\HkDailyAssignment;
use App\Models\Room;
use App\Models\User;
use App\Services\Ai\AiFeatureFlags;
use App\Services\Ai\AiOutputValidator;
use App\Services\Ai\AiRunner;
use App\Services\Ai\CapabilityResolver;
use App\Services\Ai\Housekeeping\HousekeepingWorkloadCalculator;
use App\Services\Ai\HousekeepingLabourTrainingStandard;
use App\Services\Ai\Support\AiCompletionRequest;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class HousekeepingWorkloadAgent
{
    public const AGENT = 'housekeeping_workload';

    public const CAPABILITY = 'SL-04';

    public const CAPABILITIES = ['SL-04'];

    public const CLASS_MODE = 'P';

    public function __construct(
        private readonly HousekeepingWorkloadCalculator $calculator,
        private readonly CapabilityResolver $capabilities,
        private readonly AiFeatureFlags $flags,
        private readonly AiOutputValidator $validator,
        private readonly AiRunner $runner,
    ) {}

    /**
     * Level 1 labelled draft clean list. Never publishes the HK board.
     *
     * @return array{proposal: AiProposal, draft: array<string, mixed>}
     */
    public function draftForDate(Carbon $date, ?User $user = null): array
    {
        $this->assertGenerationEnabled();
        $this->capabilities->assertKnownMany(self::CAPABILITIES);
        $this->assertAutoPublishOff();

        $draft = $this->calculator->draft($date);
        $payload = $this->validator->validateProposalPayload($this->draftPayload($draft));
        $fingerprint = sha1(self::AGENT.'|draft_clean_list|'.$date->toDateString());
        $explanation = $this->explain($draft, $user);

        $existing = AiProposal::query()->where('fingerprint', $fingerprint)->first();
        $proposal = AiProposal::query()->updateOrCreate(
            ['fingerprint' => $fingerprint],
            [
                'user_id' => $user?->id ?? $existing?->user_id,
                'capability_id' => self::CAPABILITY,
                'agent' => self::AGENT,
                'action' => 'draft_clean_list',
                'issue' => 'Draft housekeeping workload vs the active rule profile for '.$date->toDateString().'.',
                'risk_level' => $this->riskFromDraft($draft),
                'data_used' => $this->dataUsed($draft),
                'recommendation' => $this->recommendationText($draft),
                'approval_required' => 'Human approval to label this draft. Wave 2 will not publish the HK board. Level 1A auto-publish is OFF.',
                'next_action' => 'Review forecast vs executable split, then Approve to acknowledge or Dismiss. Do not treat this as a published assignment board.',
                'status' => $existing?->status === 'Approved' ? 'Approved' : 'Pending',
                'payload' => $payload,
                'explanation' => $explanation,
            ],
        );

        if ($proposal->wasRecentlyCreated) {
            $this->logProposal($proposal, 'generated', $user, 'Housekeeping Workload created a Level 1 labelled draft.');
        }

        return ['proposal' => $proposal, 'draft' => $draft];
    }

    /**
     * @return array<string, mixed>
     */
    public function shadowState(Carbon $date, ?User $user = null): array
    {
        if (! $this->flags->generationEnabled(self::AGENT)) {
            return [
                'enabled' => false,
                'flags' => $this->flags->publicState(self::AGENT),
                'draft' => null,
                'proposals' => [],
            ];
        }

        $result = $this->draftForDate($date, $user);

        return [
            'enabled' => true,
            'flags' => $this->flags->publicState(self::AGENT),
            'draft' => $this->presentDraft($result['draft']),
            'proposals' => $this->presentPending(),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function presentPending(?int $limit = 20): array
    {
        return AiProposal::query()
            ->where('agent', self::AGENT)
            ->where('status', 'Pending')
            ->latest()
            ->limit($limit ?? 20)
            ->get()
            ->map(fn (AiProposal $proposal) => $this->present($proposal))
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function present(AiProposal $proposal): array
    {
        return [
            'id' => $proposal->id,
            'capabilityId' => $proposal->capability_id,
            'capabilityIds' => $proposal->payload['bound_capabilities'] ?? self::CAPABILITIES,
            'agent' => $proposal->agent,
            'action' => $proposal->action,
            'issue' => $proposal->issue,
            'risk' => $proposal->risk_level,
            'dataUsed' => $proposal->data_used,
            'recommendation' => $proposal->recommendation,
            'approvalRequired' => $proposal->approval_required,
            'nextAction' => $proposal->next_action,
            'status' => $proposal->status,
            'explanation' => $proposal->explanation,
            'decision' => $proposal->payload['decision'] ?? null,
            'versusLimits' => $proposal->payload['versus_limits'] ?? null,
            'forecastCount' => $proposal->payload['forecast_count'] ?? null,
            'executableCount' => $proposal->payload['executable_count'] ?? null,
        ];
    }

    /**
     * @param  array<string, mixed>  $draft
     * @return array<string, mixed>
     */
    public function presentDraft(array $draft): array
    {
        return [
            'workDate' => $draft['work_date'],
            'ruleProfile' => $draft['rule_profile'],
            'baselineExamples' => $draft['baseline_examples'],
            'limitsSource' => $draft['limits_source'],
            'totals' => $draft['totals'],
            'versusLimits' => $draft['versus_limits'],
            'occupancy' => $draft['occupancy'],
            'forecastCount' => count($draft['forecast_tasks']),
            'executableCount' => count($draft['executable_tasks']),
            'blockedCount' => count($draft['blocked_executable']),
            'forecastTasks' => array_slice($draft['forecast_tasks'], 0, 40),
            'executableTasks' => array_slice($draft['executable_tasks'], 0, 40),
            'blockedExecutable' => array_slice($draft['blocked_executable'], 0, 20),
            'autoPublish' => $draft['auto_publish'],
            'publishedBoard' => false,
            'evidenceNote' => $draft['evidence_note'],
        ];
    }

    public function refusePublishBoard(): never
    {
        throw ValidationException::withMessages([
            'action' => 'Housekeeping Workload cannot publish the HK assignment board. Level 1A auto-publish is OFF. A person publishes via the existing housekeeping flow.',
        ]);
    }

    public function refuseOvertime(): never
    {
        throw ValidationException::withMessages([
            'action' => 'Housekeeping Workload cannot approve overtime. Only a Lodge Manager may approve overtime.',
        ]);
    }

    public function refuseMarkReady(Room $room): never
    {
        throw ValidationException::withMessages([
            'room' => "AI cannot mark room {$room->number} Ready or invent Vacant. Housekeeping status stays {$room->status} (source fact).",
        ]);
    }

    public function publishedAssignmentCount(Carbon $date): int
    {
        return HkDailyAssignment::query()->whereDate('assignment_date', $date)->count();
    }

    private function assertGenerationEnabled(): void
    {
        if (! $this->flags->generationEnabled(self::AGENT)) {
            throw ValidationException::withMessages([
                'ai' => 'Housekeeping Workload is turned off.',
            ]);
        }
    }

    private function assertAutoPublishOff(): void
    {
        if (HousekeepingLabourTrainingStandard::autoPublishAuthorized(self::AGENT)) {
            throw ValidationException::withMessages([
                'ai' => 'Level 1A auto-publish is configuration required. Wave 2 keeps it OFF.',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $draft
     * @return array<string, mixed>
     */
    private function draftPayload(array $draft): array
    {
        return [
            'action' => 'draft_clean_list',
            'intent' => 'draft_housekeeping_workload',
            'target' => ['work_date' => $draft['work_date']],
            'current_state' => [
                'rule_profile' => $draft['rule_profile'],
                'occupancy' => $draft['occupancy'],
                'forecast_count' => count($draft['forecast_tasks']),
                'executable_count' => count($draft['executable_tasks']),
            ],
            'requested_change' => [
                'label_draft' => true,
                'publish_hk_board' => false,
                'execute' => false,
            ],
            'validation' => [
                'auto_publish' => false,
                'limits_from_profile' => true,
            ],
            'authority' => [
                'class' => self::CLASS_MODE,
                'level' => HousekeepingLabourTrainingStandard::LEVEL_1,
                'level_1a' => false,
                'human_approval_required' => true,
                'controlling_rule' => HousekeepingLabourTrainingStandard::citation(),
                'grok_owner' => 'Head Housekeeper already has the written Grok seat on SL-04. This agent does not create a second Grok owner.',
            ],
            'decision' => 'approval required',
            'explanation' => null,
            'next_actions' => ['Person reviews the draft clean list. AI will not publish the board.'],
            'notifications' => ['describe_only' => true, 'send' => false],
            'audit' => [
                'policy' => HousekeepingLabourTrainingStandard::citation(),
                'model' => (string) config('ai.default_model'),
                'rule_version' => HousekeepingLabourTrainingStandard::ruleVersion(),
                'bound_capabilities' => self::CAPABILITIES,
            ],
            'bound_capabilities' => self::CAPABILITIES,
            'versus_limits' => $draft['versus_limits'],
            'totals' => $draft['totals'],
            'forecast_count' => count($draft['forecast_tasks']),
            'executable_count' => count($draft['executable_tasks']),
            'blocked_count' => count($draft['blocked_executable']),
            'work_date' => $draft['work_date'],
        ];
    }

    /**
     * @param  array<string, mixed>  $draft
     */
    private function explain(array $draft, ?User $user): string
    {
        $fallback = 'Deterministic draft vs the active housekeeping rule profile. Forecast tasks stay separate from executable cleans. AI recommends; people approve. Auto-publish is OFF.';

        try {
            $result = $this->runner->complete(new AiCompletionRequest(
                input: [
                    [
                        'role' => 'system',
                        'content' => HousekeepingLabourTrainingStandard::SYSTEM_INSTRUCTION_32_1,
                    ],
                    [
                        'role' => 'user',
                        'content' => 'Explain this SL-04 Housekeeping Workload class P draft. Forecast '.$draft['totals']['rooms'].' rooms / '.$draft['totals']['check_outs'].' COs / '.$draft['totals']['points'].' pts. Executable '.count($draft['executable_tasks']).'. Blocked '.count($draft['blocked_executable']).'. Decision must be approval required. Do not publish the board. Do not invent Ready.',
                    ],
                ],
                capabilityId: self::CAPABILITY,
                agent: self::AGENT,
                metadata: [
                    'rule_version' => HousekeepingLabourTrainingStandard::ruleVersion(),
                    'langsmith_project' => 'lodgex-housekeeping-workload',
                    'wave' => 'wave-2',
                ],
            ), $user);

            return $result->text !== '' ? $result->text : $fallback;
        } catch (\Throwable) {
            return $fallback;
        }
    }

    /**
     * @param  array<string, mixed>  $draft
     */
    private function dataUsed(array $draft): string
    {
        $profile = $draft['rule_profile'];

        return implode('; ', [
            'HousekeepingWorkloadCalculator + ForecastExecutableSplitter',
            HousekeepingLabourTrainingStandard::citation(),
            'SL-04',
            'rule profile '.$profile['name'].' rooms '.$profile['max_rooms_per_day'].' / COs '.$profile['max_checkouts_per_day'].' / pts '.$profile['max_points_per_day'].' / '.$profile['max_shift_hours'].'h',
            'occupancy departures '.$draft['occupancy']['departures'],
            'rule '.HousekeepingLabourTrainingStandard::ruleVersion(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $draft
     */
    private function recommendationText(array $draft): string
    {
        return 'Label this draft clean list ('.count($draft['forecast_tasks']).' forecast / '.count($draft['executable_tasks']).' executable). Do not publish the assignment board. Due Out that is not vacant stays forecast-only.';
    }

    /**
     * @param  array<string, mixed>  $draft
     */
    private function riskFromDraft(array $draft): string
    {
        $over = $draft['versus_limits'];
        if (($over['hours']['over'] ?? false) || count($draft['blocked_executable']) >= 5) {
            return 'high';
        }
        if (($over['points']['over'] ?? false) || ($over['check_outs']['over'] ?? false) || count($draft['blocked_executable']) >= 1) {
            return 'medium';
        }

        return 'low';
    }

    private function logProposal(AiProposal $proposal, string $action, ?User $user, string $notes): void
    {
        AiProposalAuditLog::query()->create([
            'ai_proposal_id' => $proposal->id,
            'user_id' => $user?->id,
            'action' => $action,
            'notes' => $notes,
            'context' => [
                'capability_id' => $proposal->capability_id,
                'bound_capabilities' => self::CAPABILITIES,
                'work_date' => $proposal->payload['work_date'] ?? null,
            ],
        ]);
    }
}
