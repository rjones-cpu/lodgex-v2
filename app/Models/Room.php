<?php

namespace App\Models;

use App\Enums\RoomStatus;
use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Room extends Model
{
    use BelongsToUser;

    protected $fillable = [
        'user_id',
        'number',
        'dorm',
        'room_inventory_location_id',
        'room_type',
        'status',
        'current_worker_id',
        'company',
        'hold_days',
        'status_updated_at',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'status_updated_at' => 'datetime',
            'is_active' => 'boolean',
            'hold_days' => 'integer',
        ];
    }

    public function currentWorker(): BelongsTo
    {
        return $this->belongsTo(Worker::class, 'current_worker_id');
    }

    public function inventoryLocation(): BelongsTo
    {
        return $this->belongsTo(RoomInventoryLocation::class, 'room_inventory_location_id');
    }

    public function scopeFromInventory(Builder $query): Builder
    {
        return $query->whereNotNull('room_inventory_location_id');
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function holds(): HasMany
    {
        return $this->hasMany(RoomHold::class);
    }

    public function activeHold(): HasOne
    {
        return $this->hasOne(RoomHold::class)->where('is_active', true)->latestOfMany();
    }

    public function maintenanceHolds(): HasMany
    {
        return $this->hasMany(MaintenanceHold::class);
    }

    public function activeMaintenanceHold(): HasOne
    {
        return $this->hasOne(MaintenanceHold::class)->where('is_active', true)->latestOfMany();
    }

    public function housekeepingTasks(): HasMany
    {
        return $this->hasMany(HousekeepingTask::class);
    }

    public function roomStatus(): ?RoomStatus
    {
        return RoomStatus::tryFrom($this->status);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }
}
