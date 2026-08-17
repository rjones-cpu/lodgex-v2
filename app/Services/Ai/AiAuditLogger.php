<?php

namespace App\Services\Ai;

use App\Models\AiAuditLog;
use App\Models\User;

class AiAuditLogger
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function log(
        string $action,
        ?User $user = null,
        ?string $capabilityId = null,
        ?string $agent = null,
        ?string $provider = null,
        ?string $model = null,
        ?string $subjectType = null,
        ?int $subjectId = null,
        ?string $notes = null,
        array $context = [],
    ): AiAuditLog {
        return AiAuditLog::query()->create([
            'user_id' => $user?->id,
            'action' => $action,
            'capability_id' => $capabilityId,
            'agent' => $agent,
            'provider' => $provider,
            'model' => $model,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'notes' => $notes,
            'context' => $this->redact($context),
        ]);
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    private function redact(array $context): array
    {
        $blocked = ['api_key', 'authorization', 'token', 'password', 'secret', 'xai_api_key'];

        foreach ($context as $key => $value) {
            if (in_array(strtolower((string) $key), $blocked, true)) {
                $context[$key] = '[redacted]';
            }
        }

        return $context;
    }
}
