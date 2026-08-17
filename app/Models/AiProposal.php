<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiProposal extends Model
{
    use BelongsToUser;

    protected $fillable = [
        'user_id',
        'capability_id',
        'agent',
        'action',
        'fingerprint',
        'issue',
        'risk_level',
        'data_used',
        'recommendation',
        'approval_required',
        'next_action',
        'status',
        'payload',
        'explanation',
        'approved_by',
        'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'approved_at' => 'datetime',
        ];
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AiProposalAuditLog::class);
    }

    public function isPending(): bool
    {
        return $this->status === 'Pending';
    }
}
