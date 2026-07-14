<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HkAiRecommendation extends Model
{
    use BelongsToUser;

    protected $table = 'hk_ai_recommendations';

    protected $fillable = [
        'user_id',
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
}
