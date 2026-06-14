<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OverflowScenario extends Model
{
    protected $fillable = [
        'scenario_date',
        'shortage',
        'internal_recovery',
        'hotel_rooms',
        'cost_estimate',
        'recommendation',
        'risk_level',
    ];

    protected function casts(): array
    {
        return [
            'scenario_date' => 'date',
            'shortage' => 'integer',
            'internal_recovery' => 'integer',
            'hotel_rooms' => 'integer',
        ];
    }
}
