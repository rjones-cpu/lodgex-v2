<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;

class ForecastSnapshot extends Model
{
    use BelongsToUser;

    protected $fillable = [
        'user_id',
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
