<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UtilizationAuditLog extends Model
{
    use BelongsToUser;

    protected $fillable = [
        'subject_type',
        'subject_id',
        'action',
        'category',
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
