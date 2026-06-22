<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use App\Services\AccommodationWorkforce\WorkforceReservationSyncService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reservation extends Model
{
    use BelongsToUser;

    protected static function booted(): void
    {
        // Reflect a status change back onto the Accommodation Workforce schedule
        // for reservations mirrored from there. Skipped while an inbound sync is
        // writing (so camp-originated changes are not echoed back).
        static::updated(function (Reservation $reservation): void {
            if (WorkforceReservationSyncService::$syncing) {
                return;
            }

            if (! $reservation->wasChanged('status')
                || $reservation->external_source !== WorkforceReservationSyncService::SOURCE) {
                return;
            }

            app(WorkforceReservationSyncService::class)->pushStatus($reservation);
        });
    }

    protected $fillable = [
        'user_id',
        'worker_id',
        'room_id',
        'company',
        'project',
        'arrival_date',
        'departure_date',
        'status',
        'approval_status',
        'allotment_status',
        'room_type',
        'ai_match_score',
        'external_source',
        'external_booking_id',
    ];

    protected function casts(): array
    {
        return [
            'arrival_date' => 'date',
            'departure_date' => 'date',
            'ai_match_score' => 'integer',
        ];
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }
}
