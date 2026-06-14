<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Worker extends Model
{
    protected $fillable = [
        'name',
        'company',
        'project',
        'gender',
    ];

    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class, 'current_worker_id');
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function roomHolds(): HasMany
    {
        return $this->hasMany(RoomHold::class);
    }
}
