<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class HkWorkTask extends Model
{
    use BelongsToUser;

    protected $table = 'hk_work_tasks';

    protected $fillable = [
        'user_id',
        'room_id',
        'reservation_id',
        'housekeeper_id',
        'work_date',
        'task_type',
        'priority',
        'points',
        'estimated_minutes',
        'required_by',
        'status',
        'inspection_required',
        'arrival_today',
        'readiness_risk',
        'fingerprint',
        'notes',
        'started_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'work_date' => 'date',
            'points' => 'float',
            'required_by' => 'datetime',
            'inspection_required' => 'boolean',
            'arrival_today' => 'boolean',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function housekeeper(): BelongsTo
    {
        return $this->belongsTo(Housekeeper::class);
    }

    public function inspection(): HasOne
    {
        return $this->hasOne(HkInspection::class, 'hk_work_task_id');
    }

    public function scopeForDate(Builder $query, string $date): Builder
    {
        return $query->whereDate('work_date', $date);
    }

    public function scopeOpen(Builder $query): Builder
    {
        return $query->whereNotIn('status', ['Completed', 'Passed Inspection', 'Cancelled']);
    }
}
