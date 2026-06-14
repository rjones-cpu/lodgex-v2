<?php

namespace App\Services\RoomUtilization;

use App\Models\AiRecommendation;
use App\Models\AiRecommendationAuditLog;
use App\Models\User;

class AiRecommendationAuditLogger
{
    /**
     * @param  array<string, mixed>  $context
     */
    public function log(
        AiRecommendation $recommendation,
        string $action,
        ?User $user = null,
        ?string $notes = null,
        array $context = [],
    ): AiRecommendationAuditLog {
        return AiRecommendationAuditLog::create([
            'ai_recommendation_id' => $recommendation->id,
            'category' => $recommendation->category,
            'action' => $action,
            'user_id' => $user?->id,
            'notes' => $notes,
            'context' => $context,
        ]);
    }
}
