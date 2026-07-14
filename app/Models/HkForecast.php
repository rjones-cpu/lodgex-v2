<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;

class HkForecast extends Model
{
    use BelongsToUser;

    protected $table = 'hk_forecasts';

    protected $fillable = [
        'user_id',
        'forecast_date',
        'arrivals',
        'departures',
        'stayovers',
        'vacant_dirty',
        'on_hold_dirty',
        'estimated_points',
        'estimated_minutes',
        'required_housekeepers',
        'available_housekeepers',
        'shortage_surplus',
        'confidence',
    ];

    protected function casts(): array
    {
        return [
            'forecast_date' => 'date',
            'estimated_points' => 'float',
        ];
    }
}
