<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HkAuditLog extends Model
{
    use BelongsToUser;

    protected $table = 'hk_audit_logs';

    protected $fillable = [
        'subject_type',
        'subject_id',
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
