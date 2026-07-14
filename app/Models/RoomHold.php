<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoomHold extends Model
{
    use BelongsToUser;

    protected $fillable = [
        'user_id',
        'room_id',
        'worker_id',
        'company',
        'reason',
        'return_date',
        'hold_started_at',
        'policy_days',
        'over_policy',
        'release_eligible',
        'risk_level',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'return_date' => 'date',
            'hold_started_at' => 'datetime',
            'over_policy' => 'boolean',
            'release_eligible' => 'boolean',
            'is_active' => 'boolean',
            'policy_days' => 'integer',
        ];
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
