<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HkScheduleFeed extends Model
{
    protected $table = 'hk_schedule_feeds';

    protected $fillable = [
        'source',
        'title',
        'effective_date',
        'arrivals_delta',
        'departures_delta',
        'workforce_delta',
        'summary',
        'payload',
        'received_at',
    ];

    protected function casts(): array
    {
        return [
            'effective_date' => 'date',
            'payload' => 'array',
            'received_at' => 'datetime',
        ];
    }
}
