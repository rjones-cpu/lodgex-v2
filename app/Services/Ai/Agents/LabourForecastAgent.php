<?php

namespace App\Services\Ai\Agents;

use App\Models\AiProposal;
use App\Models\AiProposalAuditLog;
use App\Models\User;
use App\Services\Ai\AiFeatureFlags;
use App\Services\Ai\AiOutputValidator;
use App\Services\Ai\AiRunner;
use App\Services\Ai\CapabilityResolver;
use App\Services\Ai\Housekeeping\LabourDemandCalculator;
use App\Services\Ai\HousekeepingLabourTrainingStandard;
use App\Services\Ai\Support\AiCompletionRequest;
use App\Services\Authorization\OvertimeApprovalService;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class LabourForecastAgent
{
    public const AGENT = 'labour_forecast';

    public const CAPABILITY = 'SL-11';

    public const CAPABILITIES = ['SL-11'];

    public const CLASS_MODE = 'P';

    public function __construct(
        private readonly LabourDemandCalculator $calculator,
        private readonly CapabilityResolver $capabilities,
        private readonly AiFeatureFlags $flags,
        private readonly AiOutputValidator $validator,
        private readonly AiRunner $runner,
        private readonly OvertimeApprovalService $overtime,
    ) {}

    /**
     * Level 1 labelled labour forecast. Never publishes a roster or authorizes OT.
     *
     * @return array{proposal: AiProposal, forecast: array<string, mixed>}
     */
    public function forecastFrom(Carbon $from, ?User $user = null): array
    {
        $this->assertGenerationEnabled();
        $this->capabilities->assertKnownMany(self::CAPABILITIES);
        $this->assertAutoPublishOff();

        $forecast = $this->calculator->forecast($from);
        $payload = $this->validator->validateProposalPayload($this->forecastPayload($forecast));
        $fingerprint = sha1(self::AGENT.'|labour_forecast|'.$from->toDateString());
        $explanation = $this->explain($forecast, $user);

        $existing = AiProposal::query()->where('fingerprint', $fingerprint)->first();
        $today = $forecast['today'] ?? [];
        $proposal = AiProposal::query()->updateOrCreate(
            ['fingerprint' => $fingerprint],
            [
                'user_id' => $user?->id ?? $existing?->user_id,
                'capability_id' => self::CAPABILITY,
                'agent' => self::AGENT,
                'action' => 'labour_forecast',
                'issue' => 'Labour forecast vs occupancy, HK demand, and history from '.$from->toDateString().'.',
                'risk_level' => $today['readiness_risk'] ?? 'medium',
                'data_used' => $this->dataUsed($forecast),
                'recommendation' => $this->recommendationText($forecast),
                'approval_required' => 'Human approval to label this forecast. Wave 2 will not publish a roster or authorize overtime. Level 1A auto-publish is OFF.',
                'next_action' => 'Review horizons, required vs available, shortage/surplus, and Check-Out-to-Ready-Time windows. Approve to acknowledge or Dismiss.',
                'status' => $existing?->status === 'Approved' ? 'Approved' : 'Pending',
                'payload' => $payload,
                'explanation' => $explanation,
            ],
        );

        if ($proposal->wasRecentlyCreated) {
            $this->logProposal($proposal, 'generated', $user, 'Labour Forecast created a Level 1 labelled draft.');
        }

        return ['proposal' => $proposal, 'forecast' => $forecast];
    }

    /**
     * @return array<string, mixed>
     */
    public function shadowState(Carbon $from, ?User $user = null): array
    {
        if (! $this->flags->generationEnabled(self::AGENT)) {
            return [
                'enabled' => false,
                'flags' => $this->flags->publicState(self::AGENT),
                'forecast' => null,
                'proposals' => [],
            ];
        }

        $result = $this->forecastFrom($from, $user);

        return [
            'enabled' => true,
            'flags' => $this->flags->publicState(self::AGENT),
            'forecast' => $this->presentForecast($result['forecast']),
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
            'requiredWorkers' => $proposal->payload['required_workers'] ?? null,
            'shortage' => $proposal->payload['shortage'] ?? null,
            'bindingConstraint' => $proposal->payload['binding_constraint'] ?? null,
        ];
    }

    /**
     * @param  array<string, mixed>  $forecast
     * @return array<string, mixed>
     */
    public function presentForecast(array $forecast): array
    {
        $horizons = [];
        foreach ($forecast['horizons'] as $key => $row) {
            $horizons[] = [
                'horizon' => $key,
                'days' => $row['days'],
                'peakRequired' => $row['peak_required'],
                'peakDate' => $row['peak_date'],
                'averageRequired' => $row['average_required'],
                'note' => $row['note'],
            ];
        }

        $today = $forecast['today'] ?? [];

        return [
            'asOf' => $forecast['as_of'],
            'ruleProfile' => $forecast['rule_profile'],
            'horizons' => $horizons,
            'requiredWorkers' => $today['required_workers'] ?? 0,
            'availableWorkers' => $today['available_workers'] ?? 0,
            'shortage' => $today['shortage'] ?? 0,
            'surplus' => $today['surplus'] ?? 0,
            'bindingConstraint' => $today['binding_constraint'] ?? null,
            'constraints' => $today['constraints'] ?? [],
            'pools' => $today['pools'] ?? $forecast['pools'],
            'windows' => $today['windows'] ?? [],
            'occupancy' => $today['occupancy'] ?? null,
            'history' => $today['history'] ?? null,
            'readinessRisk' => $today['readiness_risk'] ?? 'low',
            'dailyAverageInsufficient' => true,
            'autoPublish' => false,
            'overtimeAuthorized' => false,
            'rosterPublished' => false,
            'evidenceNote' => $forecast['evidence_note'],
        ];
    }

    public function refusePublishBoard(): never
    {
        throw ValidationException::withMessages([
            'action' => 'Labour Forecast cannot publish a roster or HK assignment board. Level 1A auto-publish is OFF.',
        ]);
    }

    public function refuseOvertime(?User $user = null): never
    {
        if ($user !== null) {
            $this->overtime->canApprove($user);
        }

        throw ValidationException::withMessages([
            'action' => 'Labour Forecast cannot approve overtime. Only a Lodge Manager may approve overtime after a named-human Level 2 proposal.',
        ]);
    }

    private function assertGenerationEnabled(): void
    {
        if (! $this->flags->generationEnabled(self::AGENT)) {
            throw ValidationException::withMessages([
                'ai' => 'Labour Forecast is turned off.',
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
     * @param  array<string, mixed>  $forecast
     * @return array<string, mixed>
     */
    private function forecastPayload(array $forecast): array
    {
        $today = $forecast['today'] ?? [];
        $horizonPeaks = [];
        foreach ($forecast['horizons'] as $key => $row) {
            $horizonPeaks[$key] = [
                'peak_required' => $row['peak_required'],
                'peak_date' => $row['peak_date'],
            ];
        }

        return [
            'action' => 'labour_forecast',
            'intent' => 'draft_labour_forecast',
            'target' => ['as_of' => $forecast['as_of']],
            'current_state' => [
                'required_workers' => $today['required_workers'] ?? 0,
                'available_workers' => $today['available_workers'] ?? 0,
                'binding_constraint' => $today['binding_constraint'] ?? null,
            ],
            'requested_change' => [
                'label_draft' => true,
                'publish_roster' => false,
                'approve_overtime' => false,
                'execute' => false,
            ],
            'validation' => [
                'auto_publish' => false,
                'required_workers_formula' => 'max(minutes, points, rooms, check_outs, coverage, skill)',
                'windows' => true,
            ],
            'authority' => [
                'class' => self::CLASS_MODE,
                'level' => HousekeepingLabourTrainingStandard::LEVEL_1,
                'level_1a' => false,
                'human_approval_required' => true,
                'controlling_rule' => HousekeepingLabourTrainingStandard::citation(),
                'overtime' => 'Lodge Manager only',
            ],
            'decision' => 'approval required',
            'explanation' => null,
            'next_actions' => ['Person reviews required vs available. AI will not authorize overtime or publish a roster.'],
            'notifications' => ['describe_only' => true, 'send' => false],
            'audit' => [
                'policy' => HousekeepingLabourTrainingStandard::citation(),
                'model' => (string) config('ai.default_model'),
                'rule_version' => HousekeepingLabourTrainingStandard::ruleVersion(),
                'bound_capabilities' => self::CAPABILITIES,
            ],
            'bound_capabilities' => self::CAPABILITIES,
            'required_workers' => $today['required_workers'] ?? 0,
            'available_workers' => $today['available_workers'] ?? 0,
            'shortage' => $today['shortage'] ?? 0,
            'surplus' => $today['surplus'] ?? 0,
            'binding_constraint' => $today['binding_constraint'] ?? null,
            'constraints' => $today['constraints'] ?? [],
            'windows' => $today['windows'] ?? [],
            'pools' => $today['pools'] ?? [],
            'horizons' => $horizonPeaks,
            'readiness_risk' => $today['readiness_risk'] ?? 'low',
        ];
    }

    /**
     * @param  array<string, mixed>  $forecast
     */
    private function explain(array $forecast, ?User $user): string
    {
        $today = $forecast['today'] ?? [];
        $fallback = 'Deterministic required workers = max(minutes, points, rooms, check-outs, coverage, skill). Check-Out-to-Ready-Time windows bind today. AI recommends; people approve. Overtime stays Lodge Manager only.';

        try {
            $result = $this->runner->complete(new AiCompletionRequest(
                input: [
                    [
                        'role' => 'system',
                        'content' => HousekeepingLabourTrainingStandard::SYSTEM_INSTRUCTION_32_1,
                    ],
                    [
                        'role' => 'user',
                        'content' => 'Explain this SL-11 Labour Forecast class P draft. Required '.($today['required_workers'] ?? 0).' vs available '.($today['available_workers'] ?? 0).', binding '.($today['binding_constraint'] ?? 'n/a').', shortage '.($today['shortage'] ?? 0).'. Decision must be approval required. Do not approve overtime. Do not publish a roster.',
                    ],
                ],
                capabilityId: self::CAPABILITY,
                agent: self::AGENT,
                metadata: [
                    'rule_version' => HousekeepingLabourTrainingStandard::ruleVersion(),
                    'langsmith_project' => 'lodgex-labour-forecast',
                    'wave' => 'wave-2',
                ],
            ), $user);

            return $result->text !== '' ? $result->text : $fallback;
        } catch (\Throwable) {
            return $fallback;
        }
    }

    /**
     * @param  array<string, mixed>  $forecast
     */
    private function dataUsed(array $forecast): string
    {
        $today = $forecast['today'] ?? [];

        return implode('; ', [
            'LabourDemandCalculator + HousekeepingWorkloadCalculator',
            HousekeepingLabourTrainingStandard::citation(),
            'SL-11',
            'occupancy in-house '.($today['occupancy']['in_house'] ?? 0),
            'binding '.($today['binding_constraint'] ?? 'n/a'),
            'rule '.HousekeepingLabourTrainingStandard::ruleVersion(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $forecast
     */
    private function recommendationText(array $forecast): string
    {
        $today = $forecast['today'] ?? [];
        $required = $today['required_workers'] ?? 0;
        $available = $today['available_workers'] ?? 0;
        $binding = $today['binding_constraint'] ?? 'minutes';

        return "Required workers {$required} vs available {$available} (binding {$binding}). High confidence does not publish a roster or authorize overtime.";
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
                'as_of' => $proposal->payload['target']['as_of'] ?? null,
            ],
        ]);
    }
}
