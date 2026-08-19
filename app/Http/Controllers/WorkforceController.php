<?php

namespace App\Http\Controllers;

use App\Services\AccommodationWorkforce\CampManagerReservationsService;
use App\Services\AccommodationWorkforce\CampManagerModificationRequestsService;
use App\Services\AccommodationWorkforce\CampWorkforceInventoryService;
use App\Services\AccommodationWorkforce\WorkforceScheduleService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class WorkforceController extends Controller
{
    public function __construct(
        private readonly CampManagerReservationsService $campReservations,
    ) {}

    public function overview(): Response
    {
        return Inertia::render('Workforce/Overview');
    }

    public function positionsForecast(Request $request): Response
    {
        $user = $request->user();

        $forecastDates = [
            '2026-08-15',
            '2026-08-16',
            '2026-08-17',
            '2026-08-18',
            '2026-08-19',
            '2026-08-20',
            '2026-08-21',
        ];
        $inHouseByDate = $user
            ? $this->campReservations->inHouseByDates($user, $forecastDates)
            : array_map(fn (string $date) => ['date' => $date, 'occupancy' => 0], $forecastDates);

        return Inertia::render('Workforce/PositionsForecast', [
            'inHouseCount' => $user ? $this->campReservations->inHouseCount($user) : 0,
            'occupancyForecast' => array_map(fn (array $row) => [
                'date' => Carbon::parse($row['date'])->format('M j'),
                'key' => $row['date'],
                'occupancy' => $row['occupancy'],
            ], $inHouseByDate),
        ]);
    }

    public function schedule(
        Request $request,
        WorkforceScheduleService $schedules,
        CampManagerModificationRequestsService $modificationRequests,
    ): Response
    {
        $user = $request->user();
        $availability = $user
            ? $schedules->availability($user)
            : ['available' => false, 'message' => 'Not authenticated.'];
        $scheduleOptions = [];
        $scheduleRows = [];
        if ($user && $availability['available']) {
            $scheduleRows = $schedules->list($user);

            try {
                $scheduleOptions = $schedules->options($user);
            } catch (RuntimeException $exception) {
                $availability = ['available' => false, 'message' => $exception->getMessage()];
            }
        }

        return Inertia::render('Workforce/Schedule', [
            'availability' => $availability,
            'lastUpdated' => now()->format('M j, Y g:i A'),
            'scheduleOptions' => $scheduleOptions,
            'schedules' => $scheduleRows,
            'changeRequests' => $user ? $modificationRequests->forUser($user) : [],
            'campDashboardUrl' => filled(config('accommodation_workforce.scheduling_base'))
                ? rtrim((string) config('accommodation_workforce.scheduling_base'), '/').'/dashboard'
                : null,
        ]);
    }

    public function scheduleRooms(Request $request, CampWorkforceInventoryService $inventory): JsonResponse
    {
        $validated = $request->validate([
            'dorm_id' => ['required', 'integer', 'min:1'],
        ]);
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        try {
            return response()->json([
                'rooms' => $inventory->rooms($user, (int) $validated['dorm_id']),
            ]);
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 502);
        }
    }

    public function storeSchedule(Request $request, WorkforceScheduleService $schedules): RedirectResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:120'],
            'last_name' => ['required', 'string', 'max:120'],
            'company_id' => ['required', 'integer', 'min:1'],
            'province_id' => ['required', 'integer', 'min:1'],
            'department' => ['required', 'string', 'max:120'],
            'position_id' => ['required', 'integer', 'min:1'],
            'shift_id' => ['required', 'integer', 'min:1'],
            'room_type_id' => ['required', 'integer', 'min:1'],
            'dorm_id' => ['required', 'integer', 'min:1'],
            'room_id' => ['required', 'integer', 'min:1'],
            'arrival_date' => ['required', 'date'],
            'departure_date' => ['required', 'date', 'after:arrival_date'],
            'project_departure_date' => [
                'required',
                'date',
                'after_or_equal:departure_date',
                function (string $attribute, mixed $value, \Closure $fail) use ($request): void {
                    $arrival = strtotime((string) $request->input('arrival_date'));
                    $projectDeparture = strtotime((string) $value);
                    if ($arrival === false || $projectDeparture === false) {
                        return;
                    }

                    if (($projectDeparture - $arrival) > (730 * 86400)) {
                        $fail('The project schedule cannot exceed two years.');
                    }
                },
            ],
            'workdays' => ['required', 'array', 'min:1'],
            'workdays.*' => ['required', 'integer', 'between:1,7', 'distinct'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        try {
            $schedules->create($user, $validated);
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages([
                'schedule' => $exception->getMessage(),
            ]);
        }

        return redirect()
            ->route('workforce.schedule')
            ->with('toast', 'Schedule added successfully.');
    }

    public function staffingMatrix(): Response
    {
        return Inertia::render('Workforce/StaffingMatrix');
    }

    public function shortagesAlerts(): Response
    {
        return Inertia::render('Workforce/ShortagesAlerts');
    }

    public function reports(): Response
    {
        return Inertia::render('Workforce/Reports');
    }
}
