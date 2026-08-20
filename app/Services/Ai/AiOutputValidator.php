<?php

namespace App\Services\Ai;

use Illuminate\Validation\ValidationException;

class AiOutputValidator
{
    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function validateProposalPayload(array $payload): array
    {
        $action = (string) ($payload['action'] ?? '');

        if ($action === '') {
            throw ValidationException::withMessages([
                'action' => 'AI output is missing an action.',
            ]);
        }

        if (ForbiddenActions::isBlocked($action)) {
            throw ValidationException::withMessages([
                'action' => "AI cannot emit forbidden action [{$action}].",
            ]);
        }

        if (! ForbiddenActions::isAllowedProposal($action)) {
            throw ValidationException::withMessages([
                'action' => "AI action [{$action}] is not an allowed proposal type.",
            ]);
        }

        if (! empty($payload['execute']) || ! empty($payload['auto_execute'])) {
            throw ValidationException::withMessages([
                'execute' => 'AI cannot mark a proposal for auto-execution.',
            ]);
        }

        $decision = strtolower(trim((string) ($payload['decision'] ?? '')));
        if ($decision !== '' && ForbiddenActions::isExecutableDecision($decision)) {
            throw ValidationException::withMessages([
                'decision' => 'AI cannot emit an execute decision. Wave 1 is recommend / flag only.',
            ]);
        }

        return $payload;
    }

    public function assertModelAllowed(string $model): void
    {
        $allowed = config('ai.allowed_models', []);
        if (in_array($model, $allowed, true)) {
            return;
        }

        foreach (config('ai.allowed_model_prefixes', []) as $prefix) {
            if (is_string($prefix) && $prefix !== '' && str_starts_with($model, $prefix)) {
                return;
            }
        }

        throw ValidationException::withMessages([
            'model' => "Model [{$model}] is not an official allowed slug.",
        ]);
    }
}
