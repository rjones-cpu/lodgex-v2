<?php

namespace App\Services\AuditTrail;

use App\Models\User;
use App\Services\AccommodationWorkforce\CampManagerReservationsService;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Reads camp-reservations `activity_logs` from the shared DB and presents
 * them for the LodgeX Audit Trail page.
 *
 * Visibility matches camp.site Manager `/audit/trail`: camp + billing-company
 * (and camp provinces), not every raw activity_logs row for the camp.
 */
class ReservationAuditTrailService
{
    public function __construct(
        private readonly CampManagerReservationsService $campManagerReservations,
    ) {}
    public const OPEN_TYPE_IDS = [7, 8, 9, 10, 15, 16, 17, 18, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 34, 35, 40];

    public const HISTORY_TYPE_IDS = [8, 31, 32];

    /**
     * @param  array{search?: string, type?: string, sort?: string, dir?: string, per_page?: int}  $filters
     * @return array{
     *   trails: list<array<string, mixed>>,
     *   pagination: array<string, mixed>,
     *   filters: array<string, mixed>,
     *   stats: array<string, int>,
     *   types: list<array{value: string, label: string}>,
     *   available: bool,
     *   message: string|null
     * }
     */
    public function paginate(?User $user, array $filters = []): array
    {
        $empty = $this->emptyPayload($filters, 'No reservation audit log is available for this camp.');

        if (! $user || ! Schema::hasTable('activity_logs')) {
            return $empty;
        }

        $campId = (int) $user->getAttribute('camp_id');
        if ($campId < 1) {
            return $this->emptyPayload($filters, 'Your account is not assigned to a camp.');
        }

        $search = trim((string) ($filters['search'] ?? ''));
        $type = trim((string) ($filters['type'] ?? ''));
        $sort = in_array($filters['sort'] ?? 'date', ['date', 'name'], true) ? (string) $filters['sort'] : 'date';
        $dir = ($filters['dir'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $perPage = max(5, min((int) ($filters['per_page'] ?? 25), 100));

        $companyIds = $this->campManagerReservations->companyIdsForManager($user);
        $provinceIds = $this->provinceIdsForCamp($campId);

        $query = DB::table('activity_logs as al')
            ->leftJoin('users as actors', 'actors.id', '=', 'al.user_id')
            ->leftJoin('activity_types as atypes', 'atypes.id', '=', 'al.activity_type_id')
            ->where('al.camp_id', $campId);

        if (Schema::hasColumn('activity_logs', 'deleted_at')) {
            $query->whereNull('al.deleted_at');
        }

        $this->applyCompanyProvinceScope($query, $companyIds, $provinceIds);

        if ($type !== '' && $type !== 'all') {
            if ($type === 'discrepancy') {
                $query->where(function ($q) {
                    $q->where('al.activity_type_id', 40)
                        ->orWhere('al.heading', 'like', 'Discrepancy Review%');
                });
            } else {
                $query->where('al.activity_type', $type);
            }
        }

        if ($search !== '') {
            $this->applySearch($query, $search);
        }

        $stats = $this->buildStats($campId, $companyIds, $provinceIds);

        $eventTime = $this->eventTimeSql();
        if ($sort === 'name' && Schema::hasTable('bookings')) {
            $query->leftJoin('bookings as name_bookings', function ($join) {
                $join->on('name_bookings.id', '=', 'al.ref_id')
                    ->where('al.activity_type', '=', 'reservation');
            });
            $query->orderByRaw('LOWER(TRIM(CONCAT(COALESCE(name_bookings.first_name,\'\'), \' \', COALESCE(name_bookings.last_name,\'\')))) '.$dir)
                ->orderByDesc('al.id');
        } else {
            $query->orderByRaw($eventTime.' '.$dir)
                ->orderBy('al.id', $dir);
        }

        $page = $query->paginate($perPage, [
            'al.id',
            'al.ref_id',
            'al.camp_id',
            'al.heading',
            'al.description',
            'al.user_id',
            'al.activity_type',
            'al.activity_type_id',
            'al.created_at',
            'al.updated_at',
            'actors.name as actor_name',
            'atypes.name as activity_name',
        ])->withQueryString();

        $rows = $this->hydrate(collect($page->items()));

        return [
            'trails' => $rows,
            'pagination' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'from' => $page->firstItem(),
                'to' => $page->lastItem(),
            ],
            'filters' => [
                'search' => $search,
                'type' => $type !== '' ? $type : 'all',
                'sort' => $sort,
                'dir' => $dir,
                'per_page' => $perPage,
            ],
            'stats' => $stats,
            'types' => [
                ['value' => 'all', 'label' => 'All activity'],
                ['value' => 'reservation', 'label' => 'Reservations'],
                ['value' => 'request', 'label' => 'Requests'],
                ['value' => 'schedule_modification', 'label' => 'Schedule changes'],
                ['value' => 'discrepancy', 'label' => 'Discrepancies'],
            ],
            'available' => true,
            'message' => null,
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function emptyPayload(array $filters, string $message): array
    {
        return [
            'trails' => [],
            'pagination' => [
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => (int) ($filters['per_page'] ?? 25),
                'total' => 0,
                'from' => null,
                'to' => null,
            ],
            'filters' => [
                'search' => trim((string) ($filters['search'] ?? '')),
                'type' => (string) ($filters['type'] ?? 'all') ?: 'all',
                'sort' => (string) ($filters['sort'] ?? 'date'),
                'dir' => (string) ($filters['dir'] ?? 'desc'),
                'per_page' => (int) ($filters['per_page'] ?? 25),
            ],
            'stats' => ['total' => 0, 'today' => 0, 'reservations' => 0, 'modifications' => 0],
            'types' => [
                ['value' => 'all', 'label' => 'All activity'],
                ['value' => 'reservation', 'label' => 'Reservations'],
                ['value' => 'request', 'label' => 'Requests'],
                ['value' => 'schedule_modification', 'label' => 'Schedule changes'],
                ['value' => 'discrepancy', 'label' => 'Discrepancies'],
            ],
            'available' => false,
            'message' => $message,
        ];
    }

    /**
     * @param  list<int>  $companyIds
     * @param  list<int>  $provinceIds
     * @return array{total: int, today: int, reservations: int, modifications: int}
     */
    private function buildStats(int $campId, array $companyIds, array $provinceIds): array
    {
        $base = DB::table('activity_logs as al')->where('al.camp_id', $campId);
        if (Schema::hasColumn('activity_logs', 'deleted_at')) {
            $base->whereNull('al.deleted_at');
        }
        $this->applyCompanyProvinceScope($base, $companyIds, $provinceIds);

        $todayStart = Carbon::today()->toDateTimeString();

        return [
            'total' => (int) (clone $base)->count(),
            'today' => (int) (clone $base)->where('al.created_at', '>=', $todayStart)->count(),
            'reservations' => (int) (clone $base)->where('al.activity_type', 'reservation')->count(),
            'modifications' => (int) (clone $base)->where('al.activity_type', 'schedule_modification')->count(),
        ];
    }

    /**
     * Same company/province visibility as camp-reservations
     * DashboardController::applyAuditTrailCompanyProvinceScope for Lodge Managers.
     *
     * @param  list<int>  $companyIds
     * @param  list<int>  $provinceIds
     */
    private function applyCompanyProvinceScope($query, array $companyIds, array $provinceIds): void
    {
        if ($companyIds === [] || ! Schema::hasTable('bookings')) {
            $query->whereRaw('1 = 0');

            return;
        }

        $query->where(function ($scope) use ($companyIds, $provinceIds) {
            $scope->where(function ($sub) use ($companyIds, $provinceIds) {
                $sub->where('al.activity_type', 'reservation')
                    ->whereIn('al.ref_id', function ($sq) use ($companyIds, $provinceIds) {
                        $sq->select('id')
                            ->from('bookings')
                            ->whereIn('company_id', $companyIds)
                            ->whereNull('deleted_at');
                        if ($provinceIds !== []) {
                            $sq->whereIn('province_id', $provinceIds);
                        }
                    });
            })->orWhere(function ($sub) use ($companyIds, $provinceIds) {
                $sub->where('al.activity_type', 'request')
                    ->whereIn('al.ref_id', function ($sq) use ($companyIds, $provinceIds) {
                        $sq->select('id')
                            ->from('request_reservations')
                            ->whereIn('company_id', $companyIds);
                        if ($provinceIds !== []) {
                            $sq->whereIn('province_id', $provinceIds);
                        }
                    });
            })->orWhere(function ($sub) use ($companyIds, $provinceIds) {
                $sub->where('al.activity_type', 'schedule_modification')
                    ->where(function ($d) {
                        $d->where('al.activity_type_id', 40)
                            ->orWhere('al.heading', 'like', 'Discrepancy Review%');
                    })
                    ->whereIn('al.ref_id', function ($sq) use ($companyIds, $provinceIds) {
                        $sq->select('d.id')
                            ->from('site_schedules_drafts as d')
                            ->join('bookings as b', 'b.id', '=', 'd.reservation_id')
                            ->whereIn('b.company_id', $companyIds)
                            ->whereNull('b.deleted_at');
                        if ($provinceIds !== []) {
                            $sq->whereIn('b.province_id', $provinceIds);
                        }
                    });
            })->orWhere(function ($sub) use ($companyIds, $provinceIds) {
                $sub->where('al.activity_type', 'schedule_modification')
                    ->where(function ($mod) use ($companyIds, $provinceIds) {
                        $mod->where(function ($pub) use ($companyIds, $provinceIds) {
                            $pub->where('al.activity_type_id', 34)
                                ->whereIn('al.ref_id', function ($sq) use ($companyIds, $provinceIds) {
                                    $sq->select('d.id')
                                        ->from('site_schedules_drafts as d')
                                        ->join('bookings as b', 'b.id', '=', 'd.reservation_id')
                                        ->where('d.status', 4)
                                        ->whereIn('b.company_id', $companyIds)
                                        ->whereNull('b.deleted_at');
                                    if ($provinceIds !== []) {
                                        $sq->whereIn('b.province_id', $provinceIds);
                                    }
                                });
                        })->orWhere(function ($ack) use ($companyIds, $provinceIds) {
                            $ack->where('al.heading', 'Schedule Modification Acknowledged')
                                ->whereIn('al.ref_id', function ($sq) use ($companyIds, $provinceIds) {
                                    $sq->select('d.id')
                                        ->from('site_schedules_drafts as d')
                                        ->join('bookings as b', 'b.id', '=', 'd.reservation_id')
                                        ->whereIn('b.company_id', $companyIds)
                                        ->whereNull('b.deleted_at');
                                    if ($provinceIds !== []) {
                                        $sq->whereIn('b.province_id', $provinceIds);
                                    }
                                });
                        })->orWhere(function ($arch) use ($companyIds, $provinceIds) {
                            $arch->whereIn('al.activity_type_id', [37, 38])
                                ->whereIn('al.ref_id', function ($sq) use ($companyIds, $provinceIds) {
                                    $sq->select('s.id')
                                        ->from('site_schedules as s')
                                        ->join('bookings as b', 'b.id', '=', 's.reservation_id')
                                        ->whereIn('b.company_id', $companyIds)
                                        ->whereNull('b.deleted_at');
                                    if ($provinceIds !== []) {
                                        $sq->whereIn('b.province_id', $provinceIds);
                                    }
                                });
                        })->orWhere(function ($walkin) use ($companyIds, $provinceIds) {
                            $walkin->where('al.activity_type_id', 17)
                                ->whereIn('al.ref_id', function ($sq) use ($companyIds, $provinceIds) {
                                    $sq->select('id')
                                        ->from('bookings')
                                        ->whereIn('company_id', $companyIds)
                                        ->whereNull('deleted_at');
                                    if ($provinceIds !== []) {
                                        $sq->whereIn('province_id', $provinceIds);
                                    }
                                });
                        });
                    });
            });
        });
    }

    /**
     * @return list<int>
     */
    private function provinceIdsForCamp(int $campId): array
    {
        if (! Schema::hasTable('provinces')) {
            return [];
        }

        return DB::table('provinces')
            ->where('camp_id', $campId)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    private function applySearch($query, string $search): void
    {
        $like = '%'.$search.'%';

        $query->where(function ($outer) use ($like, $search) {
            $outer->where('al.heading', 'like', $like)
                ->orWhere('al.description', 'like', $like)
                ->orWhere('actors.name', 'like', $like)
                ->orWhere('atypes.name', 'like', $like);

            if (Schema::hasTable('bookings')) {
                $outer->orWhere(function ($sub) use ($search) {
                    $sub->where('al.activity_type', 'reservation')
                        ->whereIn('al.ref_id', function ($sq) use ($search) {
                            $sq->select('id')->from('bookings')
                                ->whereRaw("CONCAT(COALESCE(first_name,''), ' ', COALESCE(last_name,'')) LIKE ?", ['%'.$search.'%']);
                        });
                });
            }

            if (Schema::hasTable('request_reservations')) {
                $outer->orWhere(function ($sub) use ($search) {
                    $sub->where('al.activity_type', 'request')
                        ->whereIn('al.ref_id', function ($sq) use ($search) {
                            $sq->select('id')->from('request_reservations')
                                ->whereRaw("CONCAT(COALESCE(first_name,''), ' ', COALESCE(last_name,'')) LIKE ?", ['%'.$search.'%']);
                        });
                });
            }
        });
    }

    private function eventTimeSql(): string
    {
        return 'CASE WHEN al.created_at > DATE_ADD(al.updated_at, INTERVAL 1 HOUR) THEN al.updated_at ELSE COALESCE(al.created_at, al.updated_at) END';
    }

    /**
     * @param  Collection<int, object>  $items
     * @return list<array<string, mixed>>
     */
    private function hydrate(Collection $items): array
    {
        if ($items->isEmpty()) {
            return [];
        }

        $lookups = $this->buildLookups($items);

        return $items->map(function ($log) use ($lookups) {
            $reservation = $this->resolveReservation($log, $lookups);
            $eventAt = $this->eventOccurredAt($log);
            $heading = (string) ($log->heading ?? '');
            $isDiscrepancy = (int) ($log->activity_type_id ?? 0) === 40
                || str_starts_with($heading, 'Discrepancy Review');

            $activityLabel = $isDiscrepancy
                ? ($heading !== '' ? $heading : 'Discrepancy Review')
                : ((string) ($log->activity_name ?? '') !== ''
                    ? (string) $log->activity_name
                    : ($heading !== '' ? $heading : $this->fallbackActivityLabel((string) ($log->activity_type ?? ''))));

            $username = $heading === 'Discrepancy Review — Sent to Lodge Manager'
                ? 'System'
                : (trim((string) ($log->actor_name ?? '')) !== '' ? (string) $log->actor_name : 'System');

            $guestName = trim((string) ($reservation['first_name'] ?? '').' '.(string) ($reservation['last_name'] ?? ''));
            $bookingId = (int) ($reservation['id'] ?? 0);
            $note = $bookingId > 0 ? ($lookups['notes'][$bookingId] ?? null) : null;

            $arrival = $reservation['arrival_date'] ?? null;
            $departure = $reservation['departure_date'] ?? ($reservation['check_out'] ?? null);

            return [
                'id' => (int) $log->id,
                'refId' => (int) ($log->ref_id ?? 0),
                'bookingId' => $bookingId ?: null,
                'guestName' => $guestName !== '' ? $guestName : '—',
                'initials' => $this->initials($guestName !== '' ? $guestName : $activityLabel),
                'activityType' => (string) ($log->activity_type ?? ''),
                'activityLabel' => $activityLabel,
                'heading' => $heading,
                'description' => (string) ($log->description ?? ''),
                'date' => $eventAt->format('M j, Y'),
                'time' => $eventAt->format('g:i A'),
                'occurredAt' => $eventAt->toIso8601String(),
                'username' => $username,
                'arrival' => $this->formatDate($arrival),
                'departure' => $this->formatDate($departure),
                'stay' => trim($this->formatDate($arrival).' / '.$this->formatDate($departure), ' /'),
                'company' => (string) ($reservation['company'] ?? '—') ?: '—',
                'province' => (string) ($reservation['province'] ?? '—') ?: '—',
                'shift' => (string) ($reservation['shift'] ?? '—') ?: '—',
                'roomType' => $this->normalizeRoomType((string) ($reservation['room_type'] ?? '')),
                'canOpen' => in_array((int) ($log->activity_type_id ?? 0), self::OPEN_TYPE_IDS, true) || $isDiscrepancy,
                'hasNotes' => $note !== null,
                'notes' => $note ? [[
                    'role' => (string) ($note->role_name ?? 'Note'),
                    'status' => (string) ($note->status ?? ''),
                    'date' => $this->formatDateTime($note->created_at ?? null),
                    'note' => (string) ($note->notes ?? ''),
                ]] : [],
            ];
        })->values()->all();
    }

    /**
     * @param  Collection<int, object>  $items
     * @return array<string, mixed>
     */
    private function buildLookups(Collection $items): array
    {
        $reservationRefs = $items
            ->filter(fn ($log) => (string) $log->activity_type === 'reservation'
                && ! in_array((int) ($log->activity_type_id ?? 0), self::HISTORY_TYPE_IDS, true))
            ->pluck('ref_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        $historyRefs = $items
            ->filter(fn ($log) => in_array((int) ($log->activity_type_id ?? 0), self::HISTORY_TYPE_IDS, true))
            ->pluck('ref_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        $requestRefs = $items
            ->filter(fn ($log) => (string) $log->activity_type === 'request')
            ->pluck('ref_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        $modRefs = $items
            ->filter(fn ($log) => (string) $log->activity_type === 'schedule_modification')
            ->pluck('ref_id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        $bookingHistories = collect();
        if ($historyRefs !== [] && Schema::hasTable('bookings_history')) {
            $bookingHistories = DB::table('bookings_history')->whereIn('id', $historyRefs)->get()->keyBy('id');
        }

        $rrHistoryIds = $bookingHistories->pluck('request')->filter()->unique()->values()->all();
        $rrHistories = collect();
        if ($rrHistoryIds !== [] && Schema::hasTable('request_reservation_history')) {
            $rrHistories = DB::table('request_reservation_history')->whereIn('id', $rrHistoryIds)->get()->keyBy('id');
        }

        $requests = collect();
        if ($requestRefs !== [] && Schema::hasTable('request_reservations')) {
            $requests = DB::table('request_reservations')->whereIn('id', $requestRefs)->get()->keyBy('id');
        }

        $walkinStatuses = ['pending_walkin', 'walkin_approved', 'declined_walkin'];
        $directBookingIds = [];
        $requestHistoryIds = [];
        foreach ($requests as $request) {
            $ref = (int) ($request->request ?? 0);
            if ($ref <= 0) {
                continue;
            }
            if (in_array((string) ($request->status ?? ''), $walkinStatuses, true)) {
                $directBookingIds[] = $ref;
            } else {
                $requestHistoryIds[] = $ref;
            }
        }

        $requestHistoryToBooking = collect();
        if ($requestHistoryIds !== [] && Schema::hasTable('request_reservation_history')) {
            $requestHistoryToBooking = DB::table('request_reservation_history')
                ->whereIn('id', $requestHistoryIds)
                ->pluck('request', 'id');
        }

        $drafts = collect();
        if ($modRefs !== [] && Schema::hasTable('site_schedules_drafts')) {
            $drafts = DB::table('site_schedules_drafts')->whereIn('id', $modRefs)->get()->keyBy('id');
        }

        $schedules = collect();
        if ($modRefs !== [] && Schema::hasTable('site_schedules')) {
            $schedules = DB::table('site_schedules')->whereIn('id', $modRefs)->get()->keyBy('id');
        }

        $bookingIds = array_values(array_unique(array_filter(array_merge(
            $reservationRefs,
            $directBookingIds,
            $rrHistories->pluck('request')->map(fn ($id) => (int) $id)->all(),
            $requestHistoryToBooking->map(fn ($id) => (int) $id)->all(),
            $drafts->pluck('reservation_id')->map(fn ($id) => (int) $id)->all(),
            $schedules->pluck('reservation_id')->map(fn ($id) => (int) $id)->all(),
            $modRefs,
        ))));

        $bookings = collect();
        if ($bookingIds !== [] && Schema::hasTable('bookings')) {
            $bookings = DB::table('bookings')->whereIn('id', $bookingIds)->get()->keyBy('id');
        }

        $companyIds = $bookings->pluck('company_id')->merge($requests->pluck('company_id'))->filter()->unique()->values()->all();
        $provinceIds = $bookings->pluck('province_id')->merge($requests->pluck('province_id'))->filter()->unique()->values()->all();
        $shiftIds = $bookings->pluck('shift')->merge($requests->pluck('shift'))->filter()->unique()->values()->all();
        $roomTypeIds = $bookings->pluck('room_type')->merge($requests->pluck('room_type'))->filter()->unique()->values()->all();

        return [
            'bookings' => $bookings,
            'requests' => $requests,
            'bookingHistories' => $bookingHistories,
            'rrHistories' => $rrHistories,
            'requestHistoryToBooking' => $requestHistoryToBooking,
            'drafts' => $drafts,
            'schedules' => $schedules,
            'companies' => $this->keyedNames('user_companies', $companyIds),
            'provinces' => $this->keyedNames('provinces', $provinceIds),
            'shifts' => $this->keyedNames('worker_shifts', $shiftIds),
            'roomTypes' => $this->keyedNames('room_types', $roomTypeIds),
            'notes' => $this->latestNotes($bookingIds),
        ];
    }

    /**
     * @param  array<string, mixed>  $lookups
     * @return array<string, mixed>|null
     */
    private function resolveReservation(object $log, array $lookups): ?array
    {
        $typeId = (int) ($log->activity_type_id ?? 0);
        $type = (string) ($log->activity_type ?? '');
        $refId = (int) ($log->ref_id ?? 0);
        $booking = null;
        $request = null;

        if (in_array($typeId, self::HISTORY_TYPE_IDS, true)) {
            $history = $lookups['bookingHistories']->get($refId);
            if ($history) {
                $rrh = $lookups['rrHistories']->get($history->request);
                if ($rrh) {
                    $booking = $lookups['bookings']->get((int) $rrh->request);
                }
            }
        } elseif ($type === 'reservation') {
            $booking = $lookups['bookings']->get($refId);
        } elseif ($type === 'request') {
            $request = $lookups['requests']->get($refId);
            if ($request) {
                $linked = (int) ($request->request ?? 0);
                $walkinStatuses = ['pending_walkin', 'walkin_approved', 'declined_walkin'];
                $bookingId = in_array((string) ($request->status ?? ''), $walkinStatuses, true)
                    ? $linked
                    : (int) ($lookups['requestHistoryToBooking'][$linked] ?? 0);
                $booking = $bookingId > 0 ? $lookups['bookings']->get($bookingId) : null;
            }
        } elseif ($type === 'schedule_modification') {
            if (in_array($typeId, [37, 38], true)) {
                $schedule = $lookups['schedules']->get($refId);
                $booking = $schedule ? $lookups['bookings']->get((int) $schedule->reservation_id) : null;
            } elseif ($typeId === 17) {
                $booking = $lookups['bookings']->get($refId);
                if (! $booking) {
                    $draft = $lookups['drafts']->get($refId);
                    $booking = $draft ? $lookups['bookings']->get((int) $draft->reservation_id) : null;
                }
            } else {
                $draft = $lookups['drafts']->get($refId);
                $booking = $draft ? $lookups['bookings']->get((int) $draft->reservation_id) : $lookups['bookings']->get($refId);
            }
        }

        $source = $booking ?: $request;
        if (! $source) {
            return null;
        }

        $companyId = (int) ($source->company_id ?? 0);
        $provinceId = (int) ($source->province_id ?? 0);
        $shiftId = (int) ($source->shift ?? 0);
        $roomTypeId = (int) ($source->room_type ?? 0);

        return [
            'id' => (int) ($booking->id ?? 0),
            'first_name' => (string) ($source->first_name ?? ''),
            'last_name' => (string) ($source->last_name ?? ''),
            'arrival_date' => $source->arrival_date ?? null,
            'departure_date' => $source->departure_date ?? null,
            'check_out' => $source->check_out ?? null,
            'company' => (string) ($lookups['companies'][$companyId] ?? ''),
            'province' => (string) ($lookups['provinces'][$provinceId] ?? ''),
            'shift' => (string) ($lookups['shifts'][$shiftId] ?? ''),
            'room_type' => (string) ($lookups['roomTypes'][$roomTypeId] ?? ''),
        ];
    }

    /**
     * @param  list<int|string>  $ids
     * @return array<int, string>
     */
    private function keyedNames(string $table, array $ids): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
        if ($ids === [] || ! Schema::hasTable($table)) {
            return [];
        }

        return DB::table($table)
            ->whereIn('id', $ids)
            ->pluck('name', 'id')
            ->map(fn ($name) => (string) $name)
            ->all();
    }

    /**
     * @param  list<int>  $bookingIds
     * @return Collection<int, object>
     */
    private function latestNotes(array $bookingIds): Collection
    {
        $bookingIds = array_values(array_unique(array_filter(array_map('intval', $bookingIds))));
        if ($bookingIds === [] || ! Schema::hasTable('reservation_notes')) {
            return collect();
        }

        $query = DB::table('reservation_notes as n')
            ->leftJoin('roles', 'roles.id', '=', 'n.role_id')
            ->whereIn('n.reservation_id', $bookingIds)
            ->whereNotNull('n.notes')
            ->where('n.notes', '!=', '')
            ->where('n.notes', '!=', '--')
            ->orderByDesc('n.created_at');

        if (Schema::hasColumn('reservation_notes', 'status')) {
            $query->where(function ($q) {
                $q->whereNull('n.status')->orWhere('n.status', '');
            });
        }

        return $query
            ->get(['n.id', 'n.reservation_id', 'n.notes', 'n.status', 'n.created_at', 'roles.name as role_name'])
            ->unique('reservation_id')
            ->keyBy('reservation_id');
    }

    private function eventOccurredAt(object $log): Carbon
    {
        try {
            $created = ! empty($log->created_at) ? Carbon::parse($log->created_at) : null;
            $updated = ! empty($log->updated_at) ? Carbon::parse($log->updated_at) : null;
            if ($created && $updated && $created->gt($updated->copy()->addHour())) {
                return $updated;
            }

            return $created ?: ($updated ?: Carbon::now());
        } catch (\Throwable) {
            return Carbon::now();
        }
    }

    private function fallbackActivityLabel(string $type): string
    {
        return match ($type) {
            'schedule_modification' => 'Schedule Modification',
            'reservation' => 'Reservation',
            'request' => 'Request',
            default => $type !== '' ? ucwords(str_replace('_', ' ', $type)) : 'Activity',
        };
    }

    private function normalizeRoomType(string $raw): string
    {
        $trimmed = trim($raw);
        if ($trimmed === 'Senior Executive') {
            return 'Sr. Executive';
        }

        return $trimmed !== '' ? $trimmed : '—';
    }

    private function formatDate(mixed $value): string
    {
        if (empty($value)) {
            return '—';
        }

        try {
            return Carbon::parse($value)->format('M j, Y');
        } catch (\Throwable) {
            return (string) $value;
        }
    }

    private function formatDateTime(mixed $value): string
    {
        if (empty($value)) {
            return '—';
        }

        try {
            return Carbon::parse($value)->format('M j, Y g:i A');
        } catch (\Throwable) {
            return (string) $value;
        }
    }

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name)) ?: [];
        $letters = array_slice(array_filter($parts), 0, 2);

        return strtoupper(implode('', array_map(fn ($part) => mb_substr($part, 0, 1), $letters))) ?: 'AT';
    }
}
