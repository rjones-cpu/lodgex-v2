<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HousekeepingTask extends Model
{
    use BelongsToUser;

    protected $fillable = [
        'user_id',
        'room_id',
        'status',
        'arrival_today',
        'priority',
        'eta_clean',
        'is_complete',
    ];

    protected function casts(): array
    {
        return [
            'arrival_today' => 'boolean',
            'is_complete' => 'boolean',
        ];
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }
}
