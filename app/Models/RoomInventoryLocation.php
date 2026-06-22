<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Ported from camp-reservations (RoomInventoryLocation) — drops camp scoping.
 */
class RoomInventoryLocation extends Model
{
    use BelongsToUser;

    protected $fillable = [
        'user_id',
        'name',
        'location_type',
        'total_rooms',
        'rooms_executive',
        'rooms_senior_executive',
        'rooms_wellsite',
        'sort_order',
    ];

    protected $casts = [
        'total_rooms' => 'integer',
        'rooms_executive' => 'integer',
        'rooms_senior_executive' => 'integer',
        'rooms_wellsite' => 'integer',
        'sort_order' => 'integer',
    ];

    public function outOfServiceRooms(): HasMany
    {
        return $this->hasMany(RoomInventoryOutOfService::class, 'room_inventory_location_id');
    }

    /**
     * Concrete rooms materialized from this location (consumed by Housekeeping,
     * Room Utilization, Dashboard, Reports).
     */
    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class, 'room_inventory_location_id');
    }

    public function typedRoomTotal(): int
    {
        return (int) $this->rooms_executive
            + (int) $this->rooms_senior_executive
            + (int) $this->rooms_wellsite;
    }
}
