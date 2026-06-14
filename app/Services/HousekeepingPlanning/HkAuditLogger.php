<?php

namespace App\Services\HousekeepingPlanning;

use App\Models\HkAiRecommendation;
use App\Models\HkAuditLog;
use App\Models\User;

class HkAuditLogger
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function log(
        string $subjectType,
        ?int $subjectId,
        string $action,
        ?string $category = null,
        ?User $user = null,
        ?string $notes = null,
        array $context = [],
    ): HkAuditLog {
        return HkAuditLog::create([
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'category' => $category,
            'action' => $action,
            'user_id' => $user?->id,
            'notes' => $notes,
            'context' => $context,
        ]);
    }

    public function logRecommendation(
        HkAiRecommendation $recommendation,
        string $action,
        ?User $user = null,
        ?string $notes = null,
    ): HkAuditLog {
        return $this->log(
            'ai_recommendation',
            $recommendation->id,
            $action,
            $recommendation->category,
            $user,
            $notes,
        );
    }
}
