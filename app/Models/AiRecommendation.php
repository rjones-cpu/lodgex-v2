<?php

namespace App\Models;

use App\Enums\AiRecommendationCategory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiRecommendation extends Model
{
    protected $fillable = [
        'category',
        'fingerprint',
        'issue',
        'risk_level',
        'data_used',
        'recommendation',
        'approval_required',
        'next_action',
        'status',
        'approved_by',
        'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'approved_at' => 'datetime',
        ];
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AiRecommendationAuditLog::class);
    }

    public function categoryEnum(): ?AiRecommendationCategory
    {
        return AiRecommendationCategory::tryFrom($this->category ?? '');
    }
}
