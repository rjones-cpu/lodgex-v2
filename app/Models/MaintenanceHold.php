<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceHold extends Model
{
    protected $fillable = [
        'room_id',
        'issue',
        'eta_return',
        'overdue',
        'capacity_impact',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'eta_return' => 'date',
            'overdue' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
