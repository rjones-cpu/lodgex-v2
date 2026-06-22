<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;

class HkScheduleFeed extends Model
{
    use BelongsToUser;

    protected $table = 'hk_schedule_feeds';

    protected $fillable = [
        'user_id',
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
