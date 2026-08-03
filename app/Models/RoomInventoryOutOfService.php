<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCamp;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ported from camp-reservations (RoomInventoryOutOfService).
 * Scoped by the logged-in user's `camp_id`.
 */
class RoomInventoryOutOfService extends Model
{
    use BelongsToCamp;

    protected $table = 'room_inventory_out_of_service';

    protected $fillable = [
        'camp_id',
        'user_id',
        'room_inventory_location_id',
        'room_identifier',
        'room_category',
        'reason',
        'other_note',
        'is_active',
    ];

    protected $casts = [
        'camp_id' => 'integer',
        'is_active' => 'boolean',
    ];

    public function location(): BelongsTo
    {
        return $this->belongsTo(RoomInventoryLocation::class, 'room_inventory_location_id');
    }
}
