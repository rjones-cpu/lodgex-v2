<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Worker extends Model
{
    use BelongsToUser;

    protected $fillable = [
        'user_id',
        'name',
        'company',
        'project',
        'gender',
        'external_source',
        'external_ref',
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
