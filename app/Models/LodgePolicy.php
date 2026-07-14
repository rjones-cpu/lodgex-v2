<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Model;

/**
 * Operator-scoped reservation & utilization policy settings (one row per user).
 */
class LodgePolicy extends Model
{
    use BelongsToUser;

    public const DEFAULT_MAX_HOLD_DAYS = 7;

    public const DEFAULT_NO_SHOW_CUTOFF = '07:00';

    public const DEFAULT_EXTENSION_CUTOFF_TIME = '12:00';

    public const DEFAULT_HOTEL_OVERFLOW_CUTOFF = '16:00';

    public const DEFAULT_FORECAST_HORIZON_DAYS = 14;

    protected $fillable = [
        'user_id',
        'on_hold_enabled',
        'max_hold_days',
        'on_hold_dorm_restriction',
        'on_hold_exempt_dorms',
        'on_hold_exempt_guests',
        'no_show_cutoff_time',
        'no_show_release_requires_approval',
        'walk_ins_allowed',
        'walk_ins_require_supervisor_approval',
        'walk_ins_allow_one_night',
        'walk_ins_require_reason',
        'auto_approval_enabled',
        'same_day_reservations_require_approval',
        'extension_submission_cutoff_day',
        'extension_submission_cutoff_time',
        'hotel_overflow_decision_cutoff_time',
        'cancellation_auto_release_enabled',
        'forecast_horizon_days',
    ];

    protected function casts(): array
    {
        return [
            'on_hold_enabled' => 'boolean',
            'max_hold_days' => 'integer',
            'on_hold_exempt_dorms' => 'array',
            'on_hold_exempt_guests' => 'array',
            'no_show_release_requires_approval' => 'boolean',
            'walk_ins_allowed' => 'boolean',
            'walk_ins_require_supervisor_approval' => 'boolean',
            'walk_ins_allow_one_night' => 'boolean',
            'walk_ins_require_reason' => 'boolean',
            'auto_approval_enabled' => 'boolean',
            'same_day_reservations_require_approval' => 'boolean',
            'extension_submission_cutoff_day' => 'integer',
            'cancellation_auto_release_enabled' => 'boolean',
            'forecast_horizon_days' => 'integer',
        ];
    }

    public static function forCurrentUser(): self
    {
        return static::query()->firstOrCreate([], [
            'on_hold_enabled' => true,
            'max_hold_days' => self::DEFAULT_MAX_HOLD_DAYS,
            'on_hold_dorm_restriction' => null,
            'on_hold_exempt_dorms' => [],
            'on_hold_exempt_guests' => [],
            'no_show_cutoff_time' => self::DEFAULT_NO_SHOW_CUTOFF,
            'no_show_release_requires_approval' => true,
            'walk_ins_allowed' => true,
            'walk_ins_require_supervisor_approval' => true,
            'walk_ins_allow_one_night' => true,
            'walk_ins_require_reason' => true,
            'auto_approval_enabled' => false,
            'same_day_reservations_require_approval' => true,
            'extension_submission_cutoff_day' => 0,
            'extension_submission_cutoff_time' => self::DEFAULT_EXTENSION_CUTOFF_TIME,
            'hotel_overflow_decision_cutoff_time' => self::DEFAULT_HOTEL_OVERFLOW_CUTOFF,
            'cancellation_auto_release_enabled' => true,
            'forecast_horizon_days' => self::DEFAULT_FORECAST_HORIZON_DAYS,
        ]);
    }

    /**
     * Whether a guest/dorm pairing bypasses on-hold limits and restrictions.
     */
    public function isOnHoldExempt(?string $guestName, ?string $dorm): bool
    {
        $guests = collect($this->on_hold_exempt_guests ?? [])
            ->map(fn ($name) => mb_strtolower(trim((string) $name)))
            ->filter();

        if ($guestName && $guests->contains(mb_strtolower(trim($guestName)))) {
            return true;
        }

        $dorms = collect($this->on_hold_exempt_dorms ?? [])
            ->map(fn ($value) => trim((string) $value))
            ->filter();

        return $dorm !== null && $dorm !== '' && $dorms->contains(trim($dorm));
    }
}
