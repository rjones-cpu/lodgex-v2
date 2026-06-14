<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HkWorkloadRule extends Model
{
    protected $table = 'hk_workload_rules';

    protected $fillable = [
        'name',
        'max_shift_hours',
        'max_rooms_per_day',
        'max_checkouts_per_day',
        'max_points_per_day',
        'productive_minutes',
        'safety_meeting_minutes',
        'meal_break_minutes',
        'prefer_single_dorm',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'max_points_per_day' => 'float',
            'prefer_single_dorm' => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}
