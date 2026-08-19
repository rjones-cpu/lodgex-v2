<?php

namespace App\Services\AccommodationWorkforce;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class WorkforceScheduleService
{
    private const REQUIRED_TABLES = [
        'bookings',
        'site_schedules',
        'site_schedule_dates',
        'site_schedule_types',
        'user_companies',
        'positions',
        'provinces',
        'room_types',
        'worker_shifts',
    ];

    public function __construct(
        private readonly WorkforceReservationSyncService $reservationSync,
        private readonly CampWorkforceInventoryService $inventory,
    ) {}

    /**
     * @return array{available: bool, message: ?string}
     */
    public function availability(User $user): array
    {
        $missing = array_values(array_filter(
            self::REQUIRED_TABLES,
            fn (string $table) => ! Schema::hasTable($table),
        ));

        if ($missing !== []) {
            return [
                'available' => false,
                'message' => 'The shared scheduling schema is unavailable: '.implode(', ', $missing).'.',
            ];
        }

        if ((int) $user->getAttribute('camp_id') <= 0) {
            return [
                'available' => false,
                'message' => 'Your account is not assigned to a camp.',
            ];
        }

        if ($this->cateringCompanyIds((int) $user->getAttribute('camp_id')) === []) {
            return [
                'available' => false,
                'message' => 'No catering companies are available for this camp.',
            ];
        }

        return ['available' => true, 'message' => null];
    }

    /**
     * @return array<string, list<array<string, mixed>>>
     */
    public function options(User $user): array
    {
        if (! $this->availability($user)['available']) {
            return [
                'companies' => [],
                'provinces' => [],
                'positions' => [],
                'roomTypes' => [],
                'shifts' => [],
                'scheduleTypes' => [],
            ];
        }

        $campId = (int) $user->getAttribute('camp_id');
        $companyIds = $this->cateringCompanyIds($campId);
        $inventoryOptions = $this->inventory->options($user);

        return [
            'companies' => DB::table('user_companies')
                ->whereIn('id', $companyIds)
                ->where('camp_id', $campId)
                ->where('archive', 0)
                ->where('is_client', 'catering')
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn ($row) => ['id' => (int) $row->id, 'name' => (string) $row->name])
                ->all(),
            'provinces' => DB::table('provinces')
                ->where('camp_id', $campId)
                ->where('is_active', 1)
                ->orderBy('name')
                ->get(['id', 'name', 'code'])
                ->map(fn ($row) => [
                    'id' => (int) $row->id,
                    'name' => (string) $row->name,
                    'code' => $row->code ? (string) $row->code : null,
                ])
                ->all(),
            'positions' => DB::table('positions')
                ->where('status', 0)
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn ($row) => [
                    'id' => (int) $row->id,
                    'name' => Str::title((string) $row->name),
                    'department' => $this->departmentForPosition((int) $row->id),
                ])
                ->all(),
            'location' => $inventoryOptions['location'] ?? null,
            'dorms' => $inventoryOptions['dorms'] ?? [],
            'roomTypes' => $inventoryOptions['roomTypes'] ?? [],
            'shifts' => $inventoryOptions['shifts'] ?? [],
            'scheduleTypes' => DB::table('site_schedule_types')
                ->whereIn('id', [2, 5, 11])
                ->orderBy('id')
                ->get(['id', 'name', 'color'])
                ->map(fn ($row) => [
                    'id' => (int) $row->id,
                    'name' => trim((string) $row->name),
                    'color' => trim((string) $row->color),
                ])
                ->all(),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function list(
        User $user,
        int $limit = 100,
        ?string $startDate = null,
        ?string $endDate = null,
    ): array
    {
        if (! $this->availability($user)['available']) {
            return [];
        }

        $campId = (int) $user->getAttribute('camp_id');
        $companyIds = $this->cateringCompanyIds($campId);
        $rangeStart = $startDate ?: Carbon::today()->subDays(30)->toDateString();
        $rangeEnd = $endDate ?: Carbon::today()->addDays(180)->toDateString();

        $query = DB::table('bookings')
            ->join('site_schedules', function ($join) use ($campId) {
                $join->on('site_schedules.reservation_id', '=', 'bookings.id')
                    ->where('site_schedules.camp_id', $campId)
                    ->where('site_schedules.archive_it', 0)
                    ->where('site_schedules.draft_status', '0');
            })
            ->leftJoin('user_companies', 'user_companies.id', '=', 'bookings.company_id')
            ->leftJoin('positions', 'positions.id', '=', 'bookings.position_id')
            ->leftJoin('worker_shifts', 'worker_shifts.id', '=', 'bookings.shift')
            ->leftJoin('room_types', 'room_types.id', '=', 'bookings.room_type')
            ->where('bookings.camp_id', $campId)
            ->whereIn('bookings.company_id', $companyIds)
            ->whereNull('bookings.deleted_at')
            ->whereNotIn('bookings.reservation_status', ['archived', 'cancel', 'cancelled'])
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('site_schedules as archived_schedules')
                    ->whereColumn('archived_schedules.reservation_id', 'bookings.id')
                    ->where('archived_schedules.archive_it', 1)
                    ->whereIn('archived_schedules.draft_status', [0, '0']);
            });

        if (Schema::hasColumn('site_schedules', 'sorting_order')) {
            $query
                ->orderByRaw('CASE WHEN site_schedules.sorting_order IS NULL THEN 1 ELSE 0 END')
                ->orderBy('site_schedules.sorting_order');
        }

        $rows = $query
            ->orderByDesc('site_schedules.id')
            ->limit($limit)
            ->get([
                'bookings.id',
                'bookings.first_name',
                'bookings.last_name',
                'bookings.arrival_date',
                'bookings.check_out',
                'bookings.reservation_status',
                'bookings.position_id',
                'user_companies.name as company',
                'positions.name as position',
                'worker_shifts.name as shift',
                'room_types.name as room_type',
                'site_schedules.id as schedule_id',
                'site_schedules.work_start_date',
                'site_schedules.work_end_date',
                'site_schedules.days_on',
                'site_schedules.days_off',
            ]);

        $scheduleIds = $rows
            ->pluck('schedule_id')
            ->map(fn ($id) => (int) $id)
            ->all();
        $scheduleData = $this->dailyScheduleData($scheduleIds, $rangeStart, $rangeEnd);

        return $rows
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'scheduleId' => (int) $row->schedule_id,
                'worker' => trim((string) $row->first_name.' '.(string) $row->last_name),
                'company' => $row->company ?: '—',
                'department' => $this->departmentForPosition((int) ($row->position_id ?? 0)),
                'position' => $row->position ? Str::title((string) $row->position) : 'Unassigned',
                'shift' => $row->shift ?: 'Unassigned',
                'arrivalDate' => $row->arrival_date,
                'departureDate' => $row->check_out,
                'workStartDate' => $row->work_start_date,
                'workEndDate' => $row->work_end_date,
                'daysOn' => $row->days_on !== null ? (int) $row->days_on : null,
                'daysOff' => is_numeric($row->days_off) ? (int) $row->days_off : null,
                'roomType' => $row->room_type ?: '—',
                'status' => $row->reservation_status ?: 'pending',
                'scheduleData' => $scheduleData[(int) $row->schedule_id] ?? [],
            ])
            ->all();
    }

    /**
     * Load the published day cells and open draft overlays used by the scheduling board.
     *
     * @param  list<int>  $scheduleIds
     * @return array<int, array<string, array{typeId: int, typeName: string, needsRoom: bool, isPending: bool}>>
     */
    private function dailyScheduleData(array $scheduleIds, string $startDate, string $endDate): array
    {
        if ($scheduleIds === []) {
            return [];
        }

        $typeNames = DB::table('site_schedule_types')
            ->pluck('name', 'id')
            ->mapWithKeys(fn ($name, $id) => [(int) $id => trim((string) $name)])
            ->all();
        $scheduleData = [];

        DB::table('site_schedule_dates')
            ->whereIn('site_schedule_id', $scheduleIds)
            ->whereBetween('date', [$startDate, $endDate])
            ->orderBy('date')
            ->get(['site_schedule_id', 'date', 'site_schedule_type_id', 'needs_room'])
            ->each(function ($row) use (&$scheduleData, $typeNames): void {
                $scheduleId = (int) $row->site_schedule_id;
                $date = Carbon::parse($row->date)->toDateString();
                $typeId = (int) $row->site_schedule_type_id;
                $scheduleData[$scheduleId][$date] = [
                    'typeId' => $typeId,
                    'typeName' => $typeNames[$typeId] ?? '',
                    'needsRoom' => (bool) ($row->needs_room ?? false),
                    'isPending' => false,
                ];
            });

        if (
            ! Schema::hasTable('site_schedule_history')
            || ! Schema::hasTable('site_schedules_drafts')
            || ! Schema::hasColumn('site_schedule_history', 'draft_id')
            || ! Schema::hasColumn('site_schedule_history', 'is_approved')
        ) {
            return $scheduleData;
        }

        DB::table('site_schedule_history as history')
            ->join('site_schedules_drafts as drafts', 'drafts.id', '=', 'history.draft_id')
            ->whereIn('history.site_schedule_id', $scheduleIds)
            ->whereIn('drafts.status', [1, 2])
            ->where('history.is_approved', 0)
            ->whereBetween('history.date', [$startDate, $endDate])
            ->get([
                'history.site_schedule_id',
                'history.date',
                'history.change_schedule_type_id',
            ])
            ->each(function ($row) use (&$scheduleData, $typeNames): void {
                $scheduleId = (int) $row->site_schedule_id;
                $date = Carbon::parse($row->date)->toDateString();

                // The board only paints modifications over an existing published day cell.
                if (! isset($scheduleData[$scheduleId][$date])) {
                    return;
                }

                $typeId = (int) $row->change_schedule_type_id;
                $scheduleData[$scheduleId][$date] = [
                    ...$scheduleData[$scheduleId][$date],
                    'typeId' => $typeId,
                    'typeName' => $typeNames[$typeId] ?? '',
                    'isPending' => true,
                ];
            });

        return $scheduleData;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(User $user, array $data): int
    {
        $availability = $this->availability($user);
        if (! $availability['available']) {
            throw new RuntimeException($availability['message'] ?? 'Scheduling is unavailable.');
        }

        $campId = (int) $user->getAttribute('camp_id');
        $company = DB::table('user_companies')
            ->where('camp_id', $campId)
            ->where('id', (int) $data['company_id'])
            ->where('archive', 0)
            ->where('is_client', 'catering')
            ->first(['id', 'is_client']);

        if (! $company) {
            throw new RuntimeException('The selected company is not available for your account.');
        }

        $this->assertCampLookup('provinces', (int) $data['province_id'], $campId, ['is_active' => 1]);
        $this->assertLookup('worker_shifts', (int) $data['shift_id']);
        $this->assertLookup('positions', (int) $data['position_id'], ['status' => 0]);
        $this->assertLookup('room_types', (int) $data['room_type_id'], ['status' => 0]);
        $dormName = $this->inventory->assertRoomAvailable(
            $user,
            (int) $data['dorm_id'],
            (int) $data['room_id'],
        );

        $arrival = Carbon::parse($data['arrival_date'])->startOfDay();
        $departure = Carbon::parse($data['departure_date'])->startOfDay();
        $projectDeparture = Carbon::parse($data['project_departure_date'])->startOfDay();
        $workdays = array_map('intval', $data['workdays']);
        $now = now();

        $bookingId = null;
        $scheduleId = null;

        try {
            $createdBookingId = DB::transaction(function () use (
                $user,
                $data,
                $campId,
                $company,
                $arrival,
                $departure,
                $projectDeparture,
                $workdays,
                $dormName,
                $now,
                &$bookingId,
                &$scheduleId,
            ) {
                $bookingId = DB::table('bookings')->insertGetId([
                    'user_id' => $user->getKey(),
                    'project_id' => $user->getAttribute('project_id'),
                    'company_id' => (int) $company->id,
                    'is_client_reservation' => $company->is_client,
                    'camp_id' => $campId,
                    'hotel_id' => 0,
                    'booking_code' => $this->uniqueBookingCode(),
                    'dorm_id' => (int) $data['dorm_id'],
                    'room_id' => (int) $data['room_id'],
                    'dorm_room' => $dormName,
                    'position_id' => (int) $data['position_id'],
                    'province_id' => (string) $data['province_id'],
                    'first_name' => trim((string) $data['first_name']),
                    'last_name' => trim((string) $data['last_name']),
                    'arrival_date' => $arrival->toDateString(),
                    'check_in' => $arrival->toDateString(),
                    'check_out' => $projectDeparture->toDateString(),
                    'shift' => (int) $data['shift_id'],
                    'room_type' => (int) $data['room_type_id'],
                    'status' => 6,
                    'is_no_show' => 0,
                    'notes' => $this->scheduleNotes($data),
                    'reservation_status' => 'pending',
                    'is_walkin' => '0',
                    'is_onboarded' => 0,
                    'is_changed' => 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $dates = $this->buildScheduleDates($arrival, $projectDeparture, $workdays);
                $firstWorkDate = collect($dates)->firstWhere('site_schedule_type_id', 11)['date'] ?? $arrival->toDateString();
                $firstOffDate = collect($dates)->firstWhere('site_schedule_type_id', 2)['date'] ?? '1969-12-31';
                $workDayCount = collect($dates)->where('site_schedule_type_id', 11)->count();
                $offDayCount = collect($dates)->where('site_schedule_type_id', 2)->count();

                $scheduleId = DB::table('site_schedules')->insertGetId([
                    'reservation_id' => $bookingId,
                    'camp_id' => $campId,
                    'working_days' => (string) $workDayCount,
                    'days_on' => max(1, (int) $arrival->diffInDays($departure)),
                    'days_off' => (string) $offDayCount,
                    'first_day_off' => $firstOffDate,
                    'work_start_date' => $firstWorkDate,
                    'work_end_date' => $projectDeparture->toDateString(),
                    'status' => '0',
                    'archive_it' => 0,
                    'draft_status' => '0',
                    'travel_day_start_shift' => $arrival->toDateString(),
                    'travel_day_back_shift' => $projectDeparture->toDateString(),
                    'travel_to_work' => 'same_day',
                    'travel_out' => 'last_day',
                    'schedule_type' => $offDayCount > 0 ? 'multiple' : 'single',
                    'on_hold' => 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                DB::table('site_schedule_dates')->insert(array_map(
                    fn (array $date) => [
                        'booking_id' => $bookingId,
                        'camp_id' => $campId,
                        'site_schedule_id' => $scheduleId,
                        'site_schedule_type_id' => $date['site_schedule_type_id'],
                        'needs_room' => 0,
                        'previous_type_id' => '0',
                        'date' => $date['date'],
                        'status' => '1',
                        'archive_it' => 0,
                        'is_sub_user' => '0',
                        'is_open_request' => '0',
                        'is_approved' => 0,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ],
                    $dates,
                ));

                return (int) $bookingId;
            });

        } catch (Throwable $exception) {
            // `bookings` is MyISAM in the imported schema, so compensate even
            // though the InnoDB schedule inserts are transaction-protected.
            if ($scheduleId) {
                DB::table('site_schedule_dates')->where('site_schedule_id', $scheduleId)->delete();
                DB::table('site_schedules')->where('id', $scheduleId)->delete();
            }
            if ($bookingId) {
                DB::table('bookings')->where('id', $bookingId)->delete();
            }

            throw $exception;
        }

        // Canonical creation is authoritative. A local mirror failure must not
        // roll back the camp schedule; normal dashboard sync can retry it.
        try {
            $this->reservationSync->syncForUser($user, force: true);
        } catch (Throwable) {
            // Fail soft, matching the existing Accommodation Workforce flow.
        }

        return $createdBookingId;
    }

    /**
     * @return list<array{date: string, site_schedule_type_id: int}>
     */
    private function buildScheduleDates(Carbon $start, Carbon $end, array $workdays): array
    {
        $dates = [];
        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            $isBoundary = $date->isSameDay($start) || $date->isSameDay($end);
            $dates[] = [
                'date' => $date->toDateString(),
                'site_schedule_type_id' => $isBoundary
                    ? 5
                    : (in_array($date->dayOfWeekIso, $workdays, true) ? 11 : 2),
            ];
        }

        return $dates;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function scheduleNotes(array $data): ?string
    {
        $parts = ['Department: '.$this->departmentForPosition((int) $data['position_id'])];
        if (! empty($data['notes'])) {
            $parts[] = trim((string) $data['notes']);
        }

        return implode(PHP_EOL, $parts);
    }

    private function uniqueBookingCode(): string
    {
        do {
            $code = 'LX'.now()->format('ymd').strtoupper(Str::random(6));
        } while (DB::table('bookings')->where('booking_code', $code)->exists());

        return $code;
    }

    /**
     * @return list<int>
     */
    private function cateringCompanyIds(int $campId): array
    {
        return DB::table('user_companies')
            ->where('camp_id', $campId)
            ->where('archive', 0)
            ->where('is_client', 'catering')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * @param  array<string, int|string>  $conditions
     */
    private function assertCampLookup(string $table, int $id, int $campId, array $conditions = []): void
    {
        $query = DB::table($table)->where('id', $id)->where('camp_id', $campId);
        foreach ($conditions as $column => $value) {
            $query->where($column, $value);
        }

        if (! $query->exists()) {
            throw new RuntimeException('A selected schedule option is not available for this camp.');
        }
    }

    /**
     * @param  array<string, int|string>  $conditions
     */
    private function assertLookup(string $table, int $id, array $conditions = []): void
    {
        $query = DB::table($table)->where('id', $id);
        foreach ($conditions as $column => $value) {
            $query->where($column, $value);
        }

        if (! $query->exists()) {
            throw new RuntimeException('A selected schedule option is invalid.');
        }
    }

    private function departmentForPosition(int $positionId): string
    {
        return match (true) {
            in_array($positionId, [1], true) => 'Front Desk & Admin',
            in_array($positionId, [2, 3], true) => 'Housekeeping',
            in_array($positionId, [4, 5], true) => 'Maintenance',
            in_array($positionId, [6, 7, 8, 10, 11, 12, 13, 15], true) => 'Kitchen',
            in_array($positionId, [16], true) => 'Janitorial',
            default => 'Other',
        };
    }
}
