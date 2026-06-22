<?php

namespace App\Http\Controllers;

use App\Models\LodgePolicy;
use App\Models\Room;
use App\Services\Policies\OnHoldGuestSearchService;
use App\Support\LodgePolicyPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PolicyController extends Controller
{
    public function __construct(
        private readonly OnHoldGuestSearchService $guestSearch,
    ) {}

    public function index(): Response
    {
        $policy = LodgePolicy::forCurrentUser();

        return Inertia::render('Policies', [
            'policy' => LodgePolicyPresenter::present($policy),
            'dormOptions' => $this->dormOptions(),
            'definitions' => $this->definitions(),
        ]);
    }

    public function searchOnHoldExemptGuests(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:120'],
        ]);

        $user = $request->user();
        if (! $user) {
            return response()->json(['results' => []]);
        }

        return response()->json([
            'results' => $this->guestSearch->search($user, $validated['q']),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'on_hold_enabled' => ['required', 'boolean'],
            'max_hold_days' => ['nullable', 'integer', 'min:1', 'max:365', 'required_if:on_hold_enabled,true'],
            'on_hold_dorm_restriction' => ['nullable', 'string', 'max:120'],
            'on_hold_exempt_dorms' => ['nullable', 'array'],
            'on_hold_exempt_dorms.*' => ['string', 'max:120'],
            'on_hold_exempt_guests' => ['nullable', 'array'],
            'on_hold_exempt_guests.*' => ['string', 'max:120'],
            'no_show_cutoff_time' => ['required', 'date_format:H:i'],
            'no_show_release_requires_approval' => ['required', 'boolean'],
            'walk_ins_allowed' => ['required', 'boolean'],
            'walk_ins_require_supervisor_approval' => ['required', 'boolean'],
            'walk_ins_allow_one_night' => ['required', 'boolean'],
            'walk_ins_require_reason' => ['required', 'boolean'],
            'auto_approval_enabled' => ['required', 'boolean'],
            'same_day_reservations_require_approval' => ['required', 'boolean'],
            'extension_submission_cutoff_day' => ['required', 'integer', 'min:0', 'max:6'],
            'extension_submission_cutoff_time' => ['required', 'date_format:H:i'],
            'hotel_overflow_decision_cutoff_time' => ['required', 'date_format:H:i'],
            'cancellation_auto_release_enabled' => ['required', 'boolean'],
            'forecast_horizon_days' => ['required', 'integer', 'min:7', 'max:90'],
        ]);

        $policy = LodgePolicy::forCurrentUser();
        $policy->fill([
            'on_hold_enabled' => $validated['on_hold_enabled'],
            'max_hold_days' => $validated['on_hold_enabled'] ? $validated['max_hold_days'] : $policy->max_hold_days,
            'on_hold_dorm_restriction' => $validated['on_hold_dorm_restriction'] ?: null,
            'on_hold_exempt_dorms' => array_values(array_unique($validated['on_hold_exempt_dorms'] ?? [])),
            'on_hold_exempt_guests' => array_values(array_unique($validated['on_hold_exempt_guests'] ?? [])),
            'no_show_cutoff_time' => $validated['no_show_cutoff_time'],
            'no_show_release_requires_approval' => $validated['no_show_release_requires_approval'],
            'walk_ins_allowed' => $validated['walk_ins_allowed'],
            'walk_ins_require_supervisor_approval' => $validated['walk_ins_require_supervisor_approval'],
            'walk_ins_allow_one_night' => $validated['walk_ins_allow_one_night'],
            'walk_ins_require_reason' => $validated['walk_ins_require_reason'],
            'auto_approval_enabled' => $validated['auto_approval_enabled'],
            'same_day_reservations_require_approval' => $validated['same_day_reservations_require_approval'],
            'extension_submission_cutoff_day' => $validated['extension_submission_cutoff_day'],
            'extension_submission_cutoff_time' => $validated['extension_submission_cutoff_time'],
            'hotel_overflow_decision_cutoff_time' => $validated['hotel_overflow_decision_cutoff_time'],
            'cancellation_auto_release_enabled' => $validated['cancellation_auto_release_enabled'],
            'forecast_horizon_days' => $validated['forecast_horizon_days'],
        ]);
        $policy->save();

        return redirect()
            ->route('policies')
            ->with('toast', 'Lodge policies saved.');
    }

    /**
     * @return list<string>
     */
    private function dormOptions(): array
    {
        return Room::query()
            ->active()
            ->whereNotNull('dorm')
            ->where('dorm', '!=', '')
            ->distinct()
            ->orderBy('dorm')
            ->pluck('dorm')
            ->values()
            ->all();
    }

    /**
     * @return list<array{title: string, items: list<string>}>
     */
    private function definitions(): array
    {
        return [
            [
                'title' => 'Reservation lifecycle statuses',
                'items' => [
                    'Pending — submitted, awaiting review or approval.',
                    'Waitlisted — valid worker awaiting capacity, release, allotment, or approval.',
                    '24-Hour Arrival — expected within the next 24 hours.',
                    'Checked-In — worker occupies a room; room status should be Occupied.',
                    'On-Hold — room protected for a returning worker or approved operational need.',
                    'No-Show — failed to check in by the configured cutoff without a valid delay note.',
                    'Modification Request — extensions, room changes, cancellations, and other changes.',
                    'Discrepancy — missing, conflicting, duplicate, or stale reservation/room data.',
                ],
            ],
            [
                'title' => 'Room availability golden rule',
                'items' => [
                    'A room is available only when it is vacant, clean, safe, unassigned, not on hold, not blocked, not on maintenance hold, not out of service, and not reserved for another arrival.',
                    'Occupied, Vacant Dirty, On-Hold Clean/Dirty, Maintenance Hold, Out of Service, Blocked/Reserved, and Assigned Arrival rooms are not assignable unless released through the correct workflow.',
                ],
            ],
            [
                'title' => 'AI assistant boundaries',
                'items' => [
                    'AI may validate data, detect conflicts, predict no-shows, recommend rooms/releases, optimize allotments, and improve forecasts.',
                    'Human approval is required before exceptions, walk-ins, room release, on-hold overrides, allotment changes, hotel overflow, extension denial, maintenance return-to-service, or formal notices.',
                    'All recommendations and approvals must be auditable with prior/new values and the data used.',
                ],
            ],
        ];
    }
}
