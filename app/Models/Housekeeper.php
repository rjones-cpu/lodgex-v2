<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Housekeeper extends Model
{
    protected $fillable = [
        'first_name',
        'last_name',
        'role',
        'shift',
        'available_start',
        'available_end',
        'max_hours',
        'max_rooms',
        'max_checkouts',
        'max_points',
        'primary_dorm',
        'skill_level',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'max_points' => 'float',
            'is_active' => 'boolean',
        ];
    }

    public function fullName(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    public function workTasks(): HasMany
    {
        return $this->hasMany(HkWorkTask::class);
    }

    public function dailyAssignments(): HasMany
    {
        return $this->hasMany(HkDailyAssignment::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
