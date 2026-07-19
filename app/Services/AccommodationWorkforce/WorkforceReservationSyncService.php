<?php

namespace App\Services\AccommodationWorkforce;

use App\Models\Reservation;
use App\Models\User;
use App\Models\Worker;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Mirrors Accommodation Workforce bookings (the "Workforce Accommodations"
 * company in camp-reservations) into LodgeX's local reservations table so they
 * appear in Reservation Operations.
 *
 * The sync is idempotent — each reservation is keyed by its camp-reservations
 * booking id — and fails soft: if the scheduling app is unreachable or the
 * integration key is missing, the existing local reservations are left intact.
 */
class WorkforceReservationSyncService
{
    public const SOURCE = 'accommodation_workforce';

    /**
     * True while an inbound sync is writing local reservations, so the
     * Reservation model hook does not echo those changes back to camp-reservations.
     */
    public static bool $syncing = false;

    /** camp-reservations status → Reservation Operations status. */
    private const STATUS_MAP = [
        'pending' => 'Pending',
        'arrivals' => 'Arrival',
        'in_house' => 'Check-In',
        'checked_in' => 'Check-In',
        'on_hold' => 'On-Hold',
        'check_out' => 'Check-Out',
        'no_show' => 'No-Show',
        'no_sleep' => 'No-Sleep',
    ];

    /** Reservation Operations status → camp-reservations status (reverse of STATUS_MAP). */
    private const REVERSE_STATUS_MAP = [
        'Pending' => 'pending',
        'Arrival' => 'arrivals',
        'Check-In' => 'in_house',
        'On-Hold' => 'on_hold',
        'Check-Out' => 'check_out',
        'No-Show' => 'no_show',
        'No-Sleep' => 'no_sleep',
    ];

    /**
     * Pull the workforce feed for the given user and upsert it into their local
     * reservations. Returns the number of reservations created or updated.
     *
     * Skips the remote call when a recent sync is still fresh, unless $force.
     */
    public function syncForUser(User $user, bool $force = false): int
    {
        if (empty($user->email)) {
            return 0;
        }

        $cacheKey = 'wf_reservation_sync:'.$user->id;
        if (! $force) {
            $ttl = (int) config('accommodation_workforce.reservations_sync_ttl', 90);
            if ($ttl > 0 && Cache::get($cacheKey)) {
                return 0;
            }
        }

        // Prefer Manager-scoped shared-DB bookings (camp /reservations parity).
        // Fall back to the HTTP workforce feed when bookings/camp_id are unavailable.
        $rows = $this->fetchFromSharedBookings($user);
        if ($rows === null) {
            $rows = $this->fetchRemote($user);
        }
        if ($rows === null) {
            return 0; // unreachable / not configured — keep what we have.
        }

        $synced = 0;
        self::$syncing = true;
        // BelongsToUser auto-fills user_id on create when Auth is set; also
        // scopes Worker/Reservation lookups to this owner during CLI force-sync.
        $previousUser = Auth::user();
        Auth::login($user);
        try {
            foreach ($rows as $row) {
                if ($this->upsertReservation($row, $user) !== null) {
                    $synced++;
                }
            }

            // Drop previously synced bookings that are no longer in the Manager
            // /reservations scope so tab counts stay aligned with camp.
            $keepBookingIds = collect($rows)
                ->pluck('booking_id')
                ->filter()
                ->map(fn ($id) => (string) $id)
                ->all();
            Reservation::query()
                ->where('user_id', $user->id)
                ->where('external_source', self::SOURCE)
                ->when(
                    $keepBookingIds !== [],
                    fn ($q) => $q->whereNotIn('external_booking_id', $keepBookingIds),
                    fn ($q) => $q->whereNotNull('external_booking_id'),
                )
                ->delete();
        } finally {
            self::$syncing = false;
            if ($previousUser) {
                Auth::login($previousUser);
            } else {
                Auth::logout();
            }
        }

        $ttl = (int) config('accommodation_workforce.reservations_sync_ttl', 90);
        if ($ttl > 0) {
            Cache::put($cacheKey, now()->timestamp, $ttl);
        }

        return $synced;
    }

    /**
     * @return array<int, array<string, mixed>>|null  null on failure / not configured
     */
    private function fetchRemote(User $user): ?array
    {
        $key = config('accommodation_workforce.integration_key');
        if (empty($key)) {
            return null;
        }

        $apiBase = rtrim((string) config(
            'accommodation_workforce.scheduling_api_base',
            config('accommodation_workforce.scheduling_base'),
        ), '/');
        $path = config('accommodation_workforce.reservations_path', '/api/integrations/lodgex/reservations');

        $headers = ['X-Lodgex-Key' => (string) $key];
        $hostHeader = config('accommodation_workforce.scheduling_host_header');
        if (! empty($hostHeader)) {
            $headers['Host'] = (string) $hostHeader;
        }

        try {
            $response = Http::timeout(6)
                ->withHeaders($headers)
                ->acceptJson()
                ->get($apiBase.$path, ['email' => $user->email]);

            if ($response->failed()) {
                return null;
            }

            $data = $response->json();
        } catch (\Throwable $e) {
            Log::warning('WorkforceReservationSync: feed fetch failed', [
                'error' => $e->getMessage(),
            ]);

            return null;
        }

        return is_array($data['reservations'] ?? null) ? $data['reservations'] : [];
    }

    /**
     * Manager-scoped bookings from the shared camp DB (same filters as
     * camp-reservations `/reservations` for a Manager).
     *
     * @return array<int, array<string, mixed>>|null
     */
    private function fetchFromSharedBookings(User $user): ?array
    {
        if (! Schema::hasTable('bookings') || empty($user->getAttribute('camp_id'))) {
            return null;
        }

        try {
            return app(CampManagerReservationsService::class)->bookingsForSync($user);
        } catch (\Throwable $e) {
            Log::warning('WorkforceReservationSync: Manager shared-DB sync failed', [
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function upsertReservation(array $row, User $user): ?Reservation
    {
        $bookingId = $row['booking_id'] ?? null;
        $arrival = $row['arrival_date'] ?? null;
        $departure = $row['departure_date'] ?? null;

        // arrival/departure are NOT NULL on the reservations table; skip incomplete rows.
        if (empty($bookingId) || empty($arrival) || empty($departure)) {
            return null;
        }

        $name = trim((string) ($row['name'] ?? '')) ?: 'Worker';
        $company = (string) ($row['company'] ?? 'Workforce Accommodations');
        $roomType = (string) ($row['room_type'] ?? '') ?: null;

        // One worker per booking, matched so repeated syncs update rather than duplicate.
        $worker = Worker::updateOrCreate(
            [
                'user_id' => $user->id,
                'external_source' => self::SOURCE,
                'external_ref' => (string) $bookingId,
            ],
            ['name' => $name, 'company' => $company],
        );

        $existing = Reservation::where('user_id', $user->id)
            ->where('external_source', self::SOURCE)
            ->where('external_booking_id', (string) $bookingId)
            ->first();

        if ($existing) {
            // Once a reservation exists in LodgeX, the operations workflow lives
            // here (approval, status, room assignment, allotment, any extended
            // dates). A sync must only refresh the descriptive fields the
            // schedule owns — never reset the manager's progress through the
            // Approvals → Room Allocation → Room Allotment pipeline.
            // Exception on first shared-DB backfill: also refresh status when the
            // row still matches the inbound status map (no local drift yet).
            $existing->update([
                'worker_id' => $worker->id,
                'company' => $company,
                'room_type' => $roomType,
            ]);

            return $existing;
        }

        $campStatus = strtolower((string) ($row['status'] ?? ''));
        $mappedStatus = $this->mapStatus($campStatus);
        // Camp "arrivals" are approved waitlist entries; keep LodgeX Arrival
        // after enrichReservation's approval-driven flip.
        $approval = in_array($campStatus, ['arrivals', 'in_house', 'checked_in', 'on_hold', 'check_out'], true)
            ? 'Approved'
            : 'Pending';

        // First import: seed the initial workflow state from the schedule.
        return Reservation::create([
            'user_id' => $user->id,
            'external_source' => self::SOURCE,
            'external_booking_id' => (string) $bookingId,
            'worker_id' => $worker->id,
            'company' => $company,
            'arrival_date' => Carbon::parse($arrival)->toDateString(),
            'departure_date' => Carbon::parse($departure)->toDateString(),
            'status' => $mappedStatus,
            'approval_status' => $approval,
            'allotment_status' => 'Pending',
            'room_type' => $roomType,
        ]);
    }

    private function mapStatus(string $status): string
    {
        return self::STATUS_MAP[strtolower($status)] ?? 'Pending';
    }

    /**
     * Reflect a Reservation Operations status change back onto the matching
     * Accommodation Workforce booking. No-op for locally-created reservations or
     * statuses without a camp-reservations equivalent (e.g. Extension). Fails soft.
     */
    public function pushStatus(Reservation $reservation): bool
    {
        if ($reservation->external_source !== self::SOURCE || empty($reservation->external_booking_id)) {
            return false;
        }

        $campStatus = self::REVERSE_STATUS_MAP[(string) $reservation->status] ?? null;
        if ($campStatus === null) {
            return false;
        }

        $key = config('accommodation_workforce.integration_key');
        if (empty($key)) {
            return false;
        }

        $apiBase = rtrim((string) config(
            'accommodation_workforce.scheduling_api_base',
            config('accommodation_workforce.scheduling_base'),
        ), '/');
        $path = config('accommodation_workforce.reservation_status_path', '/api/integrations/lodgex/reservation-status');

        $headers = ['X-Lodgex-Key' => (string) $key];
        $hostHeader = config('accommodation_workforce.scheduling_host_header');
        if (! empty($hostHeader)) {
            $headers['Host'] = (string) $hostHeader;
        }

        try {
            $response = Http::timeout(6)
                ->withHeaders($headers)
                ->acceptJson()
                ->post($apiBase.$path, [
                    'booking_id' => (int) $reservation->external_booking_id,
                    'status' => $campStatus,
                ]);

            return $response->successful();
        } catch (\Throwable $e) {
            Log::warning('WorkforceReservationSync: status push failed', [
                'booking_id' => $reservation->external_booking_id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
