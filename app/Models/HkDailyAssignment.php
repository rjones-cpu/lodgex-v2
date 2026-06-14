<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HkDailyAssignment extends Model
{
    protected $table = 'hk_daily_assignments';

    protected $fillable = [
        'assignment_date',
        'housekeeper_id',
        'total_rooms',
        'total_checkouts',
        'total_points',
        'total_minutes',
        'assigned_dorms',
        'status',
        'overload_flag',
    ];

    protected function casts(): array
    {
        return [
            'assignment_date' => 'date',
            'total_points' => 'float',
            'overload_flag' => 'boolean',
        ];
    }

    public function housekeeper(): BelongsTo
    {
        return $this->belongsTo(Housekeeper::class);
    }
}
