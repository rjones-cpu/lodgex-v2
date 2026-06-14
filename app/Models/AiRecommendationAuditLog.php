<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiRecommendationAuditLog extends Model
{
    protected $fillable = [
        'ai_recommendation_id',
        'category',
        'action',
        'user_id',
        'notes',
        'context',
    ];

    protected function casts(): array
    {
        return [
            'context' => 'array',
        ];
    }

    public function recommendation(): BelongsTo
    {
        return $this->belongsTo(AiRecommendation::class, 'ai_recommendation_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
