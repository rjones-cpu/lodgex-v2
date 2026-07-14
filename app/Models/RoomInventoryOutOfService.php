<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ported from camp-reservations (RoomInventoryOutOfService) — drops camp scoping.
 */
class RoomInventoryOutOfService extends Model
{
    use BelongsToUser;

    protected $table = 'room_inventory_out_of_service';

    protected $fillable = [
        'user_id',
        'room_inventory_location_id',
        'room_identifier',
        'room_category',
        'reason',
        'other_note',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function location(): BelongsTo
    {
        return $this->belongsTo(RoomInventoryLocation::class, 'room_inventory_location_id');
    }
}
