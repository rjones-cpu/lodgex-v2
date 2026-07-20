<?php

namespace App\Http\Controllers;

use App\Models\LodgePolicy;
use App\Models\Reservation;
use App\Models\Room;
use App\Support\LodgePolicyPresenter;
use App\Services\AccommodationWorkforce\CampManagerModificationRequestsService;
use App\Services\AccommodationWorkforce\CampManagerReservationsService;
use App\Services\AccommodationWorkforce\WorkforceReservationSyncService;
use App\Services\RoomUtilization\ReservationCheckInService;
use App\Services\RoomUtilization\ReservationExtendStayService;
use App\Services\RoomUtilization\RoomAiMatchingService;
use App\Services\RoomUtilization\RoomAssignmentService;
use App\Services\RoomUtilization\RoomAvailabilityService;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private readonly RoomAssignmentService $assignmentService,
        private readonly RoomAvailabilityService $availability,
        private readonly ReservationCheckInService $checkInService,
        private readonly ReservationExtendStayService $extendStayService,
        private readonly RoomAiMatchingService $aiMatching,
        private readonly WorkforceReservationSyncService $workforceSync,
        private readonly CampManagerReservationsService $campManagerReservations,
        private readonly CampManagerModificationRequestsService $campModificationRequests,
    ) {}

    public function index(Request $request): Response
    {
        // Mirror any Accommodation Workforce additions into the local reservation
        // queue before rendering (cached + fail-soft inside the service).
        $user = $request->user();
        if ($user) {
            $this->workforceSync->syncForUser($user);
        }

        $policy = LodgePolicy::forCurrentUser();
        $lodgePolicy = LodgePolicyPresenter::present($policy);

        $schedulingBase = rtrim((string) config('accommodation_workforce.scheduling_base', ''), '/');

        return Inertia::render('Dashboard', [
            'reservations' => $this->buildReservations(),
            // Camp Manager `/dashboard` pending request_reservations (not reservation statuses).
            'modificationRequests' => $user
                ? $this->campModificationRequests->forUser($user)
                : [],
            'campDashboardUrl' => $schedulingBase !== '' ? $schedulingBase.'/dashboard' : null,
            'assignableRooms' => $this->buildAssignableRooms(),
            'metricValues' => $this->buildMetricValues(),
            'lastUpdated' => now()->format('M j, Y g:i A'),
            'lodgePolicy' => $lodgePolicy,
            // Backward-compatible alias for on-hold modal wiring.
            'onHoldPolicy' => [
                'onHoldEnabled' => $lodgePolicy['onHoldEnabled'],
                'maxHoldDays' => $lodgePolicy['maxHoldDays'],
            ],
        ]);
    }

    /**
     * Live counts + vs-yesterday deltas for the operations metric cards.
     * Keys match the Dashboard METRICS labels exactly.
     *
     * @return array<string, array{value: int|string, change: string, direction: 'up'|'down'}>
     */
    private function buildMetricValues(): array
    {
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();

        $reservations = Reservation::query()->get([
            'room_id', 'status', 'approval_status', 'arrival_date', 'departure_date',
        ]);

        $onDay = fn ($date) => fn (Reservation $r) => $r->arrival_date && $r->arrival_date->isSameDay($date);
        $departsOn = fn ($date) => fn (Reservation $r) => $r->departure_date && $r->departure_date->isSameDay($date);
        $spans = fn ($date) => fn (Reservation $r) => $r->arrival_date && $r->departure_date
            && $r->arrival_date->lte($date)
            && $r->departure_date->gte($date);

        $isPendingApproval = fn (Reservation $r) => ! in_array($r->approval_status, ['Approved', '—', null], true)
            || $r->status === 'Pending';

        $needsRoom = fn (Reservation $r) => $r->room_id === null
            && ! in_array($r->status, ['No-Show', 'Check-Out', 'No-Sleep'], true);

        // Point-in-time (current inventory) — compare against same definition
        // evaluated as if "today" were yesterday (arrival/span relative to that day).
        $pendingToday = $reservations->filter($isPendingApproval)->count();
        $pendingYesterday = $reservations
            ->filter($isPendingApproval)
            ->filter($onDay($yesterday))
            ->count();

        $allocateToday = $reservations->filter($needsRoom)->count();
        $allocateYesterday = $reservations
            ->filter($needsRoom)
            ->filter($onDay($yesterday))
            ->count();

        $allottedToday = $reservations
            ->filter(fn (Reservation $r) => $r->room_id !== null)
            ->filter($spans($today))
            ->count();
        $allottedYesterday = $reservations
            ->filter(fn (Reservation $r) => $r->room_id !== null)
            ->filter($spans($yesterday))
            ->count();

        $expectedInToday = $reservations->filter($onDay($today))->count();
        $checkedInToday = $reservations
            ->filter($onDay($today))
            ->where('status', 'Check-In')
            ->count();
        $expectedInYesterday = $reservations->filter($onDay($yesterday))->count();

        $expectedOutToday = $reservations->filter($departsOn($today))->count();
        $checkedOutToday = $reservations
            ->filter($departsOn($today))
            ->where('status', 'Check-Out')
            ->count();
        $expectedOutYesterday = $reservations->filter($departsOn($yesterday))->count();

        $extensionsToday = $reservations->where('status', 'Extension')->count();
        $extensionsYesterday = $reservations
            ->where('status', 'Extension')
            ->filter($spans($yesterday))
            ->count();

        $walkInsToday = $reservations
            ->where('status', 'Walk-In')
            ->filter($onDay($today))
            ->count();
        $walkInsYesterday = $reservations
            ->where('status', 'Walk-In')
            ->filter($onDay($yesterday))
            ->count();

        $noShowsToday = $reservations
            ->where('status', 'No-Show')
            ->filter($onDay($today))
            ->count();
        $noShowsTotal = $reservations->where('status', 'No-Show')->count();
        $noShowsYesterday = $reservations
            ->where('status', 'No-Show')
            ->filter($onDay($yesterday))
            ->count();

        // Prefer today's no-show count for the headline when any exist today;
        // otherwise show the open no-show total (matches queue visibility).
        $noShowsValue = $noShowsToday > 0 ? $noShowsToday : $noShowsTotal;
        $noShowsCompareFrom = $noShowsToday > 0 ? $noShowsToday : $noShowsTotal;
        $noShowsCompareTo = $noShowsYesterday;

        return [
            'Pending Approvals' => $this->metricPayload(
                $pendingToday,
                $pendingYesterday,
                higherIsBetter: false,
            ),
            'Rooms to Allocate' => $this->metricPayload(
                $allocateToday,
                $allocateYesterday,
                higherIsBetter: false,
            ),
            'Rooms Allotted Tonight' => $this->metricPayload(
                $allottedToday,
                $allottedYesterday,
                higherIsBetter: true,
            ),
            'Check-Ins' => $this->metricPayload(
                "{$checkedInToday} / {$expectedInToday}",
                $expectedInYesterday,
                higherIsBetter: true,
                compareToday: $expectedInToday,
            ),
            'Check-Outs' => $this->metricPayload(
                "{$checkedOutToday} / {$expectedOutToday}",
                $expectedOutYesterday,
                higherIsBetter: true,
                compareToday: $expectedOutToday,
            ),
            'Active Extensions' => $this->metricPayload(
                $extensionsToday,
                $extensionsYesterday,
                higherIsBetter: false,
            ),
            'Walk-Ins' => $this->metricPayload(
                $walkInsToday,
                $walkInsYesterday,
                higherIsBetter: true,
            ),
            'No-Shows' => $this->metricPayload(
                $noShowsValue,
                $noShowsCompareTo,
                higherIsBetter: false,
                compareToday: $noShowsCompareFrom,
            ),
        ];
    }

    /**
     * @return array{value: int|string, change: string, direction: 'up'|'down'}
     */
    private function metricPayload(
        int|string $value,
        int|float $yesterday,
        bool $higherIsBetter,
        int|float|null $compareToday = null,
    ): array {
        $todayNum = $compareToday ?? (is_numeric($value) ? (float) $value : 0.0);
        $yesterdayNum = (float) $yesterday;

        if ($yesterdayNum == 0.0) {
            $change = $todayNum == 0.0 ? '—' : '↑ 100%';
            $rose = $todayNum > 0;
        } else {
            $pct = (($todayNum - $yesterdayNum) / $yesterdayNum) * 100;
            $rose = $pct >= 0;
            $arrow = $rose ? '↑' : '↓';
            $change = sprintf('%s %.1f%%', $arrow, abs($pct));
        }

        // `direction` drives green/red: green when the move is favorable.
        $favorable = $higherIsBetter ? $rose : ! $rose;
        if ($change === '—') {
            $favorable = true;
        }

        return [
            'value' => $value,
            'change' => $change,
            'direction' => $favorable ? 'up' : 'down',
        ];
    }

    public function assignRoom(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'reservation_id' => ['required', 'integer', 'exists:reservations,id'],
            'room_id' => ['required', 'integer', Rule::exists(Room::class, 'id')],
        ]);

        $reservation = Reservation::query()
            ->with(['worker', 'room'])
            ->findOrFail($validated['reservation_id']);

        $room = Room::query()
            ->with(['activeHold', 'activeMaintenanceHold'])
            ->findOrFail($validated['room_id']);

        try {
            $this->assignmentService->assign($reservation, $room, $request->user());
        } catch (ValidationException $exception) {
            return redirect()->back()->withErrors($exception->errors());
        }

        $workerName = $reservation->worker?->name ?? 'worker';

        return redirect()->back()->with(
            'toast',
            "Room {$room->number} ({$room->dorm}) assigned to {$workerName}.",
        );
    }

    public function aiAssignRoom(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'reservation_id' => ['required', 'integer', 'exists:reservations,id'],
        ]);

        $reservation = Reservation::query()
            ->with(['worker', 'room'])
            ->findOrFail($validated['reservation_id']);

        try {
            $reservation = $this->assignmentService->aiAssign($reservation, $request->user());
        } catch (ValidationException $exception) {
            return redirect()->back()->withErrors($exception->errors());
        }

        $room = $reservation->room;
        $workerName = $reservation->worker?->name ?? 'worker';

        return redirect()->back()->with(
            'toast',
            "AI assigned room {$room->number} ({$room->dorm}) to {$workerName}.",
        );
    }

    public function approve(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'reservation_id' => ['required', 'integer', 'exists:reservations,id'],
        ]);

        $reservation = Reservation::query()
            ->with(['worker'])
            ->findOrFail($validated['reservation_id']);

        $reservation->approval_status = 'Approved';
        // Approving a pending reservation moves it into the Arrival lane so it
        // advances from the Approvals queue to Room Allocation.
        if ($reservation->status === 'Pending') {
            $reservation->status = 'Arrival';
        }
        $reservation->save();

        $workerName = $reservation->worker?->name ?? 'worker';

        return redirect()->back()->with('toast', "{$workerName} approved.");
    }

    public function checkInWorker(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'reservation_id' => ['required', 'integer', 'exists:reservations,id'],
        ]);

        $reservation = Reservation::query()
            ->with(['worker', 'room'])
            ->findOrFail($validated['reservation_id']);

        try {
            $reservation = $this->checkInService->checkIn($reservation, $request->user());
        } catch (ValidationException $exception) {
            return redirect()->back()->withErrors($exception->errors());
        }

        $workerName = $reservation->worker?->name ?? 'worker';
        $room = $reservation->room;

        return redirect()->back()->with(
            'toast',
            $room
                ? "{$workerName} checked in to room {$room->number} ({$room->dorm})."
                : "{$workerName} checked in.",
        );
    }

    public function extendStay(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'reservation_id' => ['required', 'integer', 'exists:reservations,id'],
            'new_departure_date' => ['required', 'date'],
        ]);

        $reservation = Reservation::query()
            ->with(['worker', 'room'])
            ->findOrFail($validated['reservation_id']);

        try {
            $reservation = $this->extendStayService->extend(
                $reservation,
                Carbon::parse($validated['new_departure_date']),
                $request->user(),
            );
        } catch (ValidationException $exception) {
            return redirect()->back()->withErrors($exception->errors());
        }

        $workerName = $reservation->worker?->name ?? 'worker';

        return redirect()->back()->with(
            'toast',
            "{$workerName}'s stay extended to {$reservation->departure_date->format('M j, Y')}.",
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildReservations(): array
    {
        // Fetch the assignable pool once so we can score every row's AI
        // recommendation in memory instead of re-querying per reservation.
        $assignablePool = $this->aiMatching->assignableRooms();

        $tabSets = auth()->user()
            ? $this->campManagerReservations->tabBookingIdSets(auth()->user())
            : [
                'Waitlisted' => [],
                '24-Hr Arrival' => [],
                'Checked-In' => [],
                'On-Hold' => [],
                'History' => [],
            ];

        // booking_id → list of LodgeX tab keys (Manager /reservations parity).
        $tabsByBooking = [];
        foreach ($tabSets as $tabKey => $bookingIds) {
            foreach ($bookingIds as $bookingId) {
                $tabsByBooking[(int) $bookingId][] = $tabKey;
            }
        }

        // Unassigned rooms surface first so "Rooms to Allocate" is prioritised,
        // but the cap must stay well above the active reservation count: a low
        // limit silently truncates the assigned-room rows (which sort last),
        // dropping reservations out of every queue once they get a room.
        $reservations = Reservation::query()
            ->with(['worker', 'room'])
            ->orderByRaw('CASE WHEN room_id IS NULL THEN 0 ELSE 1 END')
            ->orderBy('arrival_date')
            ->limit(1000)
            ->get()
            ->unique('id')
            ->values();

        $onHoldByBooking = $this->campManagerReservations->onHoldColumnByBookingIds(
            $reservations
                ->pluck('external_booking_id')
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values()
                ->all()
        );

        return $reservations
            ->map(fn (Reservation $reservation) => $this->formatReservation(
                $reservation,
                $assignablePool,
                $tabsByBooking,
                $onHoldByBooking,
            ))
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, Room>  $assignablePool
     * @param  array<int, list<string>>  $tabsByBooking
     * @param  array<int, array{policy: ?string, display: string, allowed: bool}>  $onHoldByBooking
     * @return array<string, mixed>
     */
    private function formatReservation(
        Reservation $reservation,
        Collection $assignablePool,
        array $tabsByBooking,
        array $onHoldByBooking,
    ): array {
        $worker = $reservation->worker;
        $room = $reservation->room;

        $recommended = $reservation->worker_id
            ? $this->aiMatching->bestRoomFromPool($reservation, $assignablePool)
            : null;

        $bookingId = $reservation->external_booking_id !== null
            ? (int) $reservation->external_booking_id
            : 0;
        $campTabs = $bookingId > 0 ? ($tabsByBooking[$bookingId] ?? []) : [];
        $onHold = $bookingId > 0
            ? ($onHoldByBooking[$bookingId] ?? null)
            : null;

        // Camp ONHOLD column: company onhold_policy — date when "yes", else policy / N/A.
        $onHoldDisplay = $onHold['display']
            ?? ($reservation->departure_date?->format('M j, Y') ?? 'N/A');
        $onHoldAllowed = $onHold['allowed'] ?? false;

        return [
            'id' => $reservation->id,
            'worker' => $worker?->name ?? 'Unknown',
            'company' => $reservation->company ?? $worker?->company ?? '—',
            'status' => $reservation->status,
            'arrival' => $reservation->arrival_date?->format('M j, Y') ?? '—',
            'departure' => $reservation->departure_date?->format('M j, Y') ?? '—',
            'arrivalDate' => $reservation->arrival_date?->format('Y-m-d'),
            'departureDate' => $reservation->departure_date?->format('Y-m-d'),
            'externalBookingId' => $reservation->external_booking_id,
            'campTabs' => array_values($campTabs),
            'in24HrArrival' => in_array('24-Hr Arrival', $campTabs, true),
            'onHoldDisplay' => $onHoldDisplay,
            'onHoldAllowed' => $onHoldAllowed,
            'room' => $room ? "{$room->number} ({$room->dorm})" : 'Unassigned',
            'dorm' => $room?->dorm,
            'roomId' => $room?->id,
            'aiRoom' => $recommended ? "{$recommended->number} ({$recommended->dorm})" : null,
            'aiRoomId' => $recommended?->id,
            'aiRoomScore' => $recommended ? $this->aiMatching->score($reservation, $recommended) : null,
            'approval' => $reservation->approval_status ?? 'Pending',
            'allotment' => $reservation->allotment_status ?? 'Pending',
            'score' => $reservation->ai_match_score ?? 0,
            'roomType' => $reservation->room_type ?? '—',
            'gender' => $worker?->gender ?? '—',
            'project' => $worker?->project ?? $reservation->project ?? '—',
        ];
    }

    /**
     * Build the room pool exposed to the Manual Assign modal.
     *
     * Historically this returned only Vacant-Clean rooms (i.e. rooms you can
     * assign right now). The Lodge manager workflow needs visibility into the
     * full Room Inventory — including occupied / dirty / on-hold rooms — so
     * dorms with no currently free rooms still appear in the dorm filter and
     * the manager can plan ahead. Each row carries an `isAvailable` flag from
     * `RoomAvailabilityService::roomListItem()`; the front-end disables
     * selection of rows where it's false, and `RoomAssignmentService` re-checks
     * availability server-side before any actual assignment is committed.
     *
     * The AI Assign path uses `RoomAiMatchingService::assignableRooms()`,
     * which still applies the strict Vacant-Clean filter, so AI suggestions
     * never recommend a room that can't actually be assigned.
     *
     * @return list<array<string, mixed>>
     */
    private function buildAssignableRooms(): array
    {
        return Room::query()
            ->active()
            ->with(['activeHold', 'activeMaintenanceHold', 'currentWorker'])
            ->orderBy('dorm')
            ->orderBy('number')
            ->get()
            ->map(fn (Room $room) => $this->availability->roomListItem($room))
            ->values()
            ->all();
    }
}
