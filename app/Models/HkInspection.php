<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HkInspection extends Model
{
    use BelongsToUser;

    protected $table = 'hk_inspections';

    protected $fillable = [
        'user_id',
        'hk_work_task_id',
        'room_id',
        'inspector_name',
        'result',
        'score',
        'reclean_required',
        'deficiencies',
        'inspected_at',
    ];

    protected function casts(): array
    {
        return [
            'reclean_required' => 'boolean',
            'inspected_at' => 'datetime',
        ];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(HkWorkTask::class, 'hk_work_task_id');
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }
}
