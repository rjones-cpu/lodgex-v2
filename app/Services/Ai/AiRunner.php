<?php

namespace App\Services\Ai;

use App\Models\User;
use App\Services\Ai\Support\AiCompletionRequest;
use App\Services\Ai\Support\AiCompletionResult;

class AiRunner
{
    public function __construct(
        private readonly AiProviderRegistry $registry,
        private readonly AiOutputValidator $validator,
        private readonly AiAuditLogger $auditLogger,
        private readonly AiFeatureFlags $flags,
    ) {}

    public function complete(AiCompletionRequest $request, ?User $user = null): AiCompletionResult
    {
        $model = $request->model ?? (string) config('ai.default_model', 'grok-4.6');
        $this->validator->assertModelAllowed($model);

        $provider = $this->registry->driver();
        $result = $provider->complete($request);

        $this->auditLogger->log(
            action: 'provider_complete',
            user: $user,
            capabilityId: $request->capabilityId,
            agent: $request->agent,
            provider: $result->provider,
            model: $result->model,
            subjectType: 'provider_run',
            notes: 'AI runner completed a provider call.',
            context: [
                'mode' => $this->flags->mode($request->agent),
                'response_id' => $result->providerResponseId,
                'input_roles' => array_map(fn (array $m) => $m['role'] ?? '', $request->input()),
            ],
        );

        return $result;
    }
}
