<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UtilizationApprovalRequest extends Model
{
    protected $fillable = [
        'type',
        'title',
        'summary',
        'risk_level',
        'status',
        'approval_required',
        'fingerprint',
        'payload',
        'ai_recommendation_id',
        'requested_by',
        'decided_by',
        'decided_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'decided_at' => 'datetime',
        ];
    }

    public function aiRecommendation(): BelongsTo
    {
        return $this->belongsTo(AiRecommendation::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'Pending');
    }
}
