<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HkCleaningStandard extends Model
{
    protected $table = 'hk_cleaning_standards';

    protected $fillable = [
        'task_type',
        'default_minutes',
        'default_points',
        'inspection_required',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'default_points' => 'float',
            'inspection_required' => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}
