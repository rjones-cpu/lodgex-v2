<?php

namespace App\Services\AccommodationWorkforce;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Mirrors camp-reservations Manager `/reservations` tab membership
 * (BookingsController::reservations_list) against the shared bookings DB.
 */
class CampManagerReservationsService
{
    public const LIST_FROM_DATE = '2026-03-01';

    /** @var list<int> */
    private const ROTATION_TYPE_FALLBACK_IDS = [5, 1, 2, 3, 11, 7, 8];

    /** @var list<string> */
    private const ROTATION_TYPE_NAMES = [
        'travel day', 'work day', 'camp', 'loa', 'local', 'no show', 'no sleep',
    ];

    /**
     * LodgeX queue tab key → camp booking ids currently in that tab for the user.
     *
     * @return array{
     *   Waitlisted: list<int>,
     *   24-Hr Arrival: list<int>,
     *   Checked-In: list<int>,
     *   On-Hold: list<int>,
     *   History: list<int>
     * }
     */
    public function tabBookingIdSets(User $user): array
    {
        if (! Schema::hasTable('bookings') || empty($user->getAttribute('camp_id'))) {
            return $this->emptyTabs();
        }

        $campId = (int) $user->getAttribute('camp_id');
        $companyIds = $this->companyIdsForManager($user);
        if ($companyIds === []) {
            return $this->emptyTabs();
        }

        $today = Carbon::today()->toDateString();
        $tomorrow = Carbon::tomorrow()->toDateString();

        return [
            'Waitlisted' => $this->idsForWaitlisted($campId, $companyIds),
            '24-Hr Arrival' => $this->idsFor24HrArrivals($campId, $companyIds, $today, $tomorrow),
            'Checked-In' => $this->idsForInHouse($campId, $companyIds),
            'On-Hold' => $this->idsForOnHold($campId, $companyIds),
            'History' => $this->idsForHistory($campId, $companyIds),
        ];
    }

    /**
     * Booking rows to mirror into LodgeX reservations (union of Manager tabs).
     *
     * @return list<array<string, mixed>>
     */
    public function bookingsForSync(User $user): array
    {
        $tabs = $this->tabBookingIdSets($user);
        $ids = array_values(array_unique(array_merge(
            $tabs['Waitlisted'],
            $tabs['24-Hr Arrival'],
            $tabs['Checked-In'],
            $tabs['On-Hold'],
            $tabs['History'],
        )));

        if ($ids === []) {
            return [];
        }

        return DB::table('bookings')
            ->leftJoin('user_companies', 'user_companies.id', '=', 'bookings.company_id')
            ->leftJoin('room_types', 'room_types.id', '=', 'bookings.room_type')
            ->whereIn('bookings.id', $ids)
            ->orderBy('bookings.arrival_date')
            ->get([
                'bookings.id as booking_id',
                'bookings.first_name',
                'bookings.last_name',
                'bookings.arrival_date',
                'bookings.check_out as departure_date',
                'bookings.reservation_status as status',
                'user_companies.name as company',
                'room_types.name as room_type',
            ])
            ->unique('booking_id')
            ->map(function ($row) {
                $name = trim(implode(' ', array_filter([(string) $row->first_name, (string) $row->last_name])));
                $roomType = (string) ($row->room_type ?? '');
                if ($roomType === 'Senior Executive') {
                    $roomType = 'Sr. Executive';
                }

                return [
                    'booking_id' => (int) $row->booking_id,
                    'name' => $name !== '' ? $name : 'Worker',
                    'company' => $row->company ?: '—',
                    'arrival_date' => $row->arrival_date,
                    'departure_date' => $row->departure_date,
                    'status' => $row->status,
                    'room_type' => $roomType !== '' ? $roomType : null,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Camp `/reservations` ONHOLD column values keyed by booking id.
     * Policy "yes" → project end date (last rotation block) or check_out;
     * otherwise the company policy string or N/A.
     *
     * @param  list<int>  $bookingIds
     * @return array<int, array{policy: ?string, display: string, allowed: bool}>
     */
    public function onHoldColumnByBookingIds(array $bookingIds): array
    {
        $bookingIds = array_values(array_unique(array_filter(array_map('intval', $bookingIds))));
        if ($bookingIds === [] || ! Schema::hasTable('bookings') || ! Schema::hasTable('user_companies')) {
            return [];
        }

        $rows = DB::table('bookings')
            ->leftJoin('user_companies', 'user_companies.id', '=', 'bookings.company_id')
            ->whereIn('bookings.id', $bookingIds)
            ->get([
                'bookings.id as booking_id',
                'bookings.check_out',
                'user_companies.onhold_policy',
            ]);

        $projectEnds = $this->projectDepartureDatesByBookingId(
            $rows
                ->filter(fn ($row) => strtolower(trim((string) ($row->onhold_policy ?? ''))) === 'yes')
                ->pluck('booking_id')
                ->map(fn ($id) => (int) $id)
                ->all()
        );

        $out = [];
        foreach ($rows as $row) {
            $bookingId = (int) $row->booking_id;
            $policy = $row->onhold_policy !== null ? trim((string) $row->onhold_policy) : null;
            $allowed = strtolower((string) $policy) === 'yes';

            if ($allowed) {
                $end = $projectEnds[$bookingId] ?? $row->check_out;
                $display = $end
                    ? Carbon::parse($end)->format('M j, Y')
                    : 'N/A';
            } else {
                $display = ($policy !== null && $policy !== '') ? $policy : 'N/A';
            }

            $out[$bookingId] = [
                'policy' => $policy,
                'display' => $display,
                'allowed' => $allowed,
            ];
        }

        return $out;
    }

    /**
     * End date of the last rotation block for each booking (camp project_departure_date).
     *
     * @param  list<int>  $bookingIds
     * @return array<int, string> booking_id → Y-m-d
     */
    private function projectDepartureDatesByBookingId(array $bookingIds): array
    {
        $bookingIds = array_values(array_unique(array_filter(array_map('intval', $bookingIds))));
        if (
            $bookingIds === []
            || ! Schema::hasTable('site_schedule_dates')
            || ! Schema::hasTable('site_schedules')
        ) {
            return [];
        }

        $rotationTypeIds = $this->rotationSegmentTypeIds();

        $byBookingId = DB::table('site_schedule_dates')
            ->whereIn('booking_id', $bookingIds)
            ->orderBy('date')
            ->get(['date', 'site_schedule_type_id', DB::raw('booking_id as _rid')]);

        $viaSchedule = DB::table('site_schedule_dates')
            ->join('site_schedules', 'site_schedules.id', '=', 'site_schedule_dates.site_schedule_id')
            ->whereIn('site_schedules.reservation_id', $bookingIds)
            ->whereNotNull('site_schedules.reservation_id')
            ->where('site_schedules.archive_it', 0)
            ->where('site_schedules.draft_status', 0)
            ->orderBy('site_schedule_dates.date')
            ->get([
                'site_schedule_dates.date',
                'site_schedule_dates.site_schedule_type_id',
                DB::raw('site_schedules.reservation_id as _rid'),
            ]);

        /** @var array<int, Collection<int, object>> $byReservation */
        $byReservation = [];
        foreach ($byBookingId->merge($viaSchedule) as $row) {
            $rid = (int) $row->_rid;
            $byReservation[$rid] ??= collect();
            $byReservation[$rid]->push($row);
        }

        $out = [];
        foreach ($byReservation as $rid => $rows) {
            $sorted = $rows->unique('date')->sortBy('date')->values();
            $blocks = $this->collectRotationBlocks($sorted, $rotationTypeIds);
            if ($blocks === []) {
                continue;
            }
            $last = end($blocks);
            $out[$rid] = (string) $sorted[$last['end']]->date;
        }

        return $out;
    }

    /**
     * @param  Collection<int, object>  $sortedByDate
     * @param  list<int>  $rotationTypeIds
     * @return list<array{start: int, end: int}>
     */
    private function collectRotationBlocks(Collection $sortedByDate, array $rotationTypeIds): array
    {
        $sorted = $sortedByDate->sortBy('date')->values();
        $n = $sorted->count();
        $blocks = [];
        for ($i = 0; $i < $n; $i++) {
            $type = (int) $sorted[$i]->site_schedule_type_id;
            if (! in_array($type, $rotationTypeIds, true)) {
                continue;
            }
            $prevNotRotation = $i === 0
                || ! in_array((int) $sorted[$i - 1]->site_schedule_type_id, $rotationTypeIds, true);
            if (! $prevNotRotation) {
                continue;
            }
            $start = $i;
            $end = $i;
            while (
                $end + 1 < $n
                && in_array((int) $sorted[$end + 1]->site_schedule_type_id, $rotationTypeIds, true)
            ) {
                $end++;
            }
            $blocks[] = ['start' => $start, 'end' => $end];
            $i = $end;
        }

        return $blocks;
    }

    /**
     * @return list<int>
     */
    public function companyIdsForManager(User $user): array
    {
        if (! Schema::hasTable('user_companies') || ! Schema::hasTable('roles')) {
            return [];
        }

        $campId = (int) $user->getAttribute('camp_id');
        $projectId = (int) $user->getAttribute('project_id');
        if ($campId <= 0) {
            return [];
        }

        $rmIds = $this->userIdsWithRoles($campId, $projectId, ['Reservation Manager']);
        $caIds = $this->userIdsWithRoles($campId, $projectId, ['Client Admin']);

        $rmCompanies = [];
        if ($rmIds !== []) {
            $rmCompanies = DB::table('user_companies')
                ->where('camp_id', $campId)
                ->where('archive', '0')
                ->whereIn('user_id', $rmIds)
                ->whereIn('is_client', ['false', 'prime', 'prime_division', 'prime_sub'])
                ->where(function ($q) {
                    $q->whereNull('hierarchy')
                        ->orWhereIn('hierarchy', ['prime', 'prime_division', 'prime_sub']);
                })
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();
        }

        $caCompanies = [];
        if ($caIds !== []) {
            $caCompanies = DB::table('user_companies')
                ->where('camp_id', $campId)
                ->where('archive', '0')
                ->whereIn('user_id', $caIds)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();
        }

        $ids = array_values(array_unique(array_filter(array_merge($rmCompanies, $caCompanies))));

        if ($ids === [] && Schema::hasTable('user_companies')) {
            $ids = DB::table('user_companies')
                ->where('name', 'Other (Default)')
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();
        }

        return $ids;
    }

    /**
     * @param  list<int>  $companyIds
     * @return list<int>
     */
    private function idsForWaitlisted(int $campId, array $companyIds): array
    {
        return $this->baseQuery($campId, $companyIds)
            ->whereIn('bookings.reservation_status', ['pending', 'arrivals'])
            ->tap(fn ($q) => $this->applyPublishedScheduleScope($q, $campId))
            ->pluck('bookings.id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    /**
     * @param  list<int>  $companyIds
     * @return list<int>
     */
    private function idsFor24HrArrivals(int $campId, array $companyIds, string $today, string $tomorrow): array
    {
        return $this->baseQuery($campId, $companyIds)
            ->whereNotIn('bookings.reservation_status', ['in_house', 'checked_in'])
            ->tap(fn ($q) => $this->applyPublishedScheduleScope($q, $campId))
            ->tap(fn ($q) => $this->applyStintStartScope($q, $campId, $today, $tomorrow))
            ->pluck('bookings.id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    /**
     * @param  list<int>  $companyIds
     * @return list<int>
     */
    private function idsForInHouse(int $campId, array $companyIds): array
    {
        return $this->baseQuery($campId, $companyIds)
            ->whereIn('bookings.reservation_status', ['in_house', 'checked_in'])
            ->tap(fn ($q) => $this->applyPublishedScheduleScope($q, $campId))
            ->pluck('bookings.id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    /**
     * @param  list<int>  $companyIds
     * @return list<int>
     */
    private function idsForOnHold(int $campId, array $companyIds): array
    {
        return $this->baseQuery($campId, $companyIds)
            ->where('bookings.reservation_status', 'on_hold')
            ->pluck('bookings.id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    /**
     * @param  list<int>  $companyIds
     * @return list<int>
     */
    private function idsForHistory(int $campId, array $companyIds): array
    {
        return $this->baseQuery($campId, $companyIds)
            ->whereIn('bookings.reservation_status', ['no_sleep', 'check_out', 'no_show'])
            ->pluck('bookings.id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    /**
     * @param  list<int>  $companyIds
     */
    private function baseQuery(int $campId, array $companyIds)
    {
        return DB::table('bookings')
            ->where('bookings.camp_id', $campId)
            ->where(function ($q) {
                $q->whereIn('bookings.hotel_id', [0])->orWhereNull('bookings.hotel_id');
            })
            ->where('bookings.arrival_date', '>=', self::LIST_FROM_DATE)
            ->whereIn('bookings.company_id', $companyIds)
            ->whereNull('bookings.deleted_at');
    }

    private function applyPublishedScheduleScope($query, int $campId): void
    {
        if (! Schema::hasTable('site_schedules')) {
            return;
        }

        $query->whereIn('bookings.id', function ($sub) use ($campId) {
            $sub->select('site_schedules.reservation_id')
                ->from('site_schedules')
                ->where('site_schedules.camp_id', $campId)
                ->where('site_schedules.archive_it', 0)
                ->where('site_schedules.draft_status', 0)
                ->whereNotNull('site_schedules.reservation_id');
        });
    }

    private function applyStintStartScope($query, int $campId, string $fromYmd, string $toYmd): void
    {
        if (! Schema::hasTable('site_schedule_dates') || ! Schema::hasTable('site_schedules')) {
            return;
        }

        $rotationTypeIds = $this->rotationSegmentTypeIds();
        if ($rotationTypeIds === []) {
            return;
        }

        $query->whereIn('bookings.id', function ($sub) use ($campId, $fromYmd, $toYmd, $rotationTypeIds) {
            $sub->select('site_schedules.reservation_id')
                ->from('site_schedule_dates')
                ->join('site_schedules', 'site_schedules.id', '=', 'site_schedule_dates.site_schedule_id')
                ->where('site_schedules.camp_id', $campId)
                ->where('site_schedules.archive_it', 0)
                ->where('site_schedules.draft_status', 0)
                ->whereNotNull('site_schedules.reservation_id')
                ->whereBetween('site_schedule_dates.date', [$fromYmd, $toYmd])
                ->whereIn('site_schedule_dates.site_schedule_type_id', $rotationTypeIds)
                ->whereNotExists(function ($prev) use ($rotationTypeIds) {
                    $prev->from('site_schedule_dates as ssd_prev')
                        ->whereColumn('ssd_prev.site_schedule_id', 'site_schedule_dates.site_schedule_id')
                        ->whereRaw('ssd_prev.date = DATE_SUB(site_schedule_dates.date, INTERVAL 1 DAY)')
                        ->whereIn('ssd_prev.site_schedule_type_id', $rotationTypeIds);
                });
        });
    }

    /**
     * @param  list<string>  $roleNames
     * @return list<int>
     */
    private function userIdsWithRoles(int $campId, int $projectId, array $roleNames): array
    {
        if (! Schema::hasTable('model_has_roles') || ! Schema::hasTable('roles')) {
            return [];
        }

        $q = DB::table('users')
            ->join('model_has_roles', function ($j) {
                $j->on('model_has_roles.model_id', '=', 'users.id')
                    ->where('model_has_roles.model_type', '=', 'App\\Models\\User');
            })
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('users.camp_id', $campId)
            ->whereIn('roles.name', $roleNames);

        if ($projectId > 0) {
            $q->where('users.project_id', $projectId);
        }

        return $q->pluck('users.id')->map(fn ($id) => (int) $id)->unique()->values()->all();
    }

    /**
     * @return list<int>
     */
    private function rotationSegmentTypeIds(): array
    {
        if (! Schema::hasTable('site_schedule_types')) {
            return self::ROTATION_TYPE_FALLBACK_IDS;
        }

        $byName = DB::table('site_schedule_types')
            ->get(['id', 'name'])
            ->mapWithKeys(fn ($row) => [mb_strtolower(trim((string) $row->name)) => (int) $row->id]);

        $ids = self::ROTATION_TYPE_FALLBACK_IDS;
        foreach (self::ROTATION_TYPE_NAMES as $name) {
            if (isset($byName[$name])) {
                $ids[] = $byName[$name];
            }
        }

        return array_values(array_unique($ids));
    }

    /**
     * @return array{
     *   Waitlisted: list<int>,
     *   24-Hr Arrival: list<int>,
     *   Checked-In: list<int>,
     *   On-Hold: list<int>,
     *   History: list<int>
     * }
     */
    private function emptyTabs(): array
    {
        return [
            'Waitlisted' => [],
            '24-Hr Arrival' => [],
            'Checked-In' => [],
            'On-Hold' => [],
            'History' => [],
        ];
    }
}
