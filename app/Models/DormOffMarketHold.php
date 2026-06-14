<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

/**
 * Ported from camp-reservations (DormOffMarketHold) — drops camp scoping.
 *
 * Tracks dorms held "off market" so booking flows can hide them. Backend
 * endpoints exist; no dedicated UI yet (matches source behavior).
 */
class DormOffMarketHold extends Model
{
    protected $table = 'dorm_off_market_holds';

    protected $fillable = [
        'portal_dorm_id',
        'returned_at',
        'expected_return_at',
    ];

    protected $casts = [
        'returned_at' => 'datetime',
        'expected_return_at' => 'datetime',
    ];

    /**
     * Whether this portal dorm id should be blocked for reservations
     * (still held off market — `returned_at` is null).
     */
    public static function holdsBlockPortalDormId(int $portalDormId): bool
    {
        if ($portalDormId < 1) {
            return false;
        }

        if (! Schema::hasTable((new static)->getTable())) {
            return false;
        }

        return static::query()
            ->where('portal_dorm_id', $portalDormId)
            ->whereNull('returned_at')
            ->exists();
    }
}
