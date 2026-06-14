<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ForecastSnapshot extends Model
{
    protected $fillable = [
        'forecast_date',
        'arrivals',
        'departures',
        'net',
        'available',
        'shortage',
        'risk_level',
    ];

    protected function casts(): array
    {
        return [
            'forecast_date' => 'date',
            'arrivals' => 'integer',
            'departures' => 'integer',
            'net' => 'integer',
            'available' => 'integer',
            'shortage' => 'integer',
        ];
    }
}
