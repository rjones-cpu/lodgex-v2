<?php

namespace App\Http\Controllers;

use App\Models\DormOffMarketHold;
use App\Models\RoomInventoryLocation;
use App\Models\RoomInventoryOutOfService;
use App\Services\RoomInventory\RoomInventoryAvailabilityService;
use App\Services\RoomInventory\RoomInventorySyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Room Inventory — locations, room-type counts, out-of-service tracking,
 * dorm off-market holds.
 *
 * Ported from camp-reservations (RoomInventoryAgentController). Differences:
 *   - Inertia/React render in place of Blade view.
 *   - Scoped by the logged-in user's `camp_id` (same partition as camp-reservations).
 *   - Gated by `auth + verified` middleware in routes (no Spatie role check).
 */
class RoomInventoryController extends Controller
{
    public const LOCATION_TYPES = ['dorm', 'floor', 'wellsite'];

    public const REASONS = ['maintenance', 'storage', 'medic_room', 'other'];

    public const ROOM_CATEGORIES = ['executive', 'senior_executive', 'wellsite'];

    public function __construct(
        private readonly RoomInventoryAvailabilityService $availability,
        private readonly RoomInventorySyncService $sync,
    ) {}

    public function index(Request $request): Response
    {
        $this->campId($request);

        $locations = RoomInventoryLocation::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $outOfService = RoomInventoryOutOfService::query()
            ->where('is_active', true)
            ->with('location')
            ->orderByDesc('id')
            ->get();

        $stats = $this->availability->buildStats($locations, $outOfService);

        return Inertia::render('RoomInventory', [
            'locations' => $locations->map(fn (RoomInventoryLocation $loc) => [
                'id' => $loc->id,
                'name' => $loc->name,
                'location_type' => $loc->location_type,
                'total_rooms' => (int) $loc->total_rooms,
                'rooms_executive' => (int) $loc->rooms_executive,
                'rooms_senior_executive' => (int) $loc->rooms_senior_executive,
                'rooms_wellsite' => (int) $loc->rooms_wellsite,
                'sort_order' => (int) $loc->sort_order,
            ])->values(),
            'outOfService' => $outOfService->map(fn (RoomInventoryOutOfService $r) => [
                'id' => $r->id,
                'room_identifier' => $r->room_identifier,
                'room_category' => $r->room_category,
                'reason' => $r->reason,
                'other_note' => $r->other_note,
                'location_id' => $r->room_inventory_location_id,
                'location_name' => $r->location?->name,
                'created_at' => $r->created_at?->toIso8601String(),
            ])->values(),
            'stats' => $stats,
            'locationTypes' => self::LOCATION_TYPES,
            'reasons' => self::REASONS,
            'roomCategories' => self::ROOM_CATEGORIES,
        ]);
    }

    public function storeLocation(Request $request): RedirectResponse
    {
        $campId = $this->campId($request);
        $data = $this->validateLocation($request);
        $data['camp_id'] = $campId;
        $data['user_id'] = $request->user()->id;
        $data['sort_order'] = (int) (RoomInventoryLocation::query()->max('sort_order') + 1);

        $location = RoomInventoryLocation::query()->create($data);
        $this->sync->syncLocation($location);

        return redirect()->route('room-inventory')->with('toast', 'Location added.');
    }

    public function updateLocation(Request $request, int $id): RedirectResponse
    {
        $this->campId($request);

        $location = RoomInventoryLocation::query()->findOrFail($id);
        $data = $this->validateLocation($request);
        $location->update($data);
        $this->sync->syncLocation($location);

        return redirect()->route('room-inventory')->with('toast', 'Location updated.');
    }

    public function destroyLocation(Request $request, int $id): RedirectResponse
    {
        $this->campId($request);

        $location = RoomInventoryLocation::query()->findOrFail($id);

        // Retire the concrete rooms first (occupied rooms are preserved), then
        // detach OOS rows so historical records survive the delete.
        $this->sync->retireLocationRooms($location);

        RoomInventoryOutOfService::query()
            ->where('room_inventory_location_id', $location->id)
            ->update(['room_inventory_location_id' => null]);

        $location->delete();

        return redirect()->route('room-inventory')->with('toast', 'Location removed.');
    }

    public function storeOutOfService(Request $request): RedirectResponse
    {
        $campId = $this->campId($request);

        $validated = $request->validate([
            'room_inventory_location_id' => 'required|exists:room_inventory_locations,id',
            'room_identifier' => 'required|string|max:120',
            'room_category' => 'required|in:'.implode(',', self::ROOM_CATEGORIES),
            'reason' => 'required|in:'.implode(',', self::REASONS),
            'other_note' => 'nullable|string|max:2000',
        ]);

        if ($validated['reason'] === 'other' && trim((string) ($validated['other_note'] ?? '')) === '') {
            throw ValidationException::withMessages([
                'other_note' => 'Please explain when Other is selected.',
            ]);
        }

        $location = RoomInventoryLocation::query()->findOrFail($validated['room_inventory_location_id']);

        $roomNumber = (int) $validated['room_identifier'];
        if ($roomNumber < 1 || $roomNumber > (int) $location->total_rooms) {
            throw ValidationException::withMessages([
                'room_identifier' => 'Select a room number from 1 to '.$location->total_rooms.' for this location.',
            ]);
        }

        $roomIdentifier = (string) $roomNumber;

        $alreadyHeld = RoomInventoryOutOfService::query()
            ->where('room_inventory_location_id', $location->id)
            ->where('room_identifier', $roomIdentifier)
            ->where('is_active', true)
            ->exists();

        if ($alreadyHeld) {
            throw ValidationException::withMessages([
                'room_identifier' => 'Room '.$roomIdentifier.' is already out of service at this location.',
            ]);
        }

        $roomCategory = $this->availability->inferCategoryForLocationRoom($location, $roomNumber);

        $oos = RoomInventoryOutOfService::create([
            'camp_id' => $campId,
            'room_inventory_location_id' => $location->id,
            'room_identifier' => $roomIdentifier,
            'room_category' => $roomCategory,
            'reason' => $validated['reason'],
            'other_note' => $validated['reason'] === 'other' ? ($validated['other_note'] ?? null) : null,
            'is_active' => true,
        ]);

        $this->sync->applyOutOfService($oos);

        return redirect()->route('room-inventory')->with('toast', 'Room marked out of service.');
    }

    public function returnToService(Request $request, int $id): RedirectResponse
    {
        $this->campId($request);

        $row = RoomInventoryOutOfService::query()->findOrFail($id);
        $row->is_active = false;
        $row->save();

        $this->sync->returnOutOfService($row);

        return redirect()->route('room-inventory')->with('toast', 'Room returned to service.');
    }

    public function storeDormOffMarket(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'portal_dorm_id' => 'required|integer|min:1',
            'expected_return_at' => 'nullable|date',
        ]);

        $portalDormId = (int) $validated['portal_dorm_id'];
        $expected = $validated['expected_return_at'] ?? null;

        $open = DormOffMarketHold::query()
            ->where('portal_dorm_id', $portalDormId)
            ->whereNull('returned_at')
            ->first();

        if ($open) {
            $open->expected_return_at = $expected;
            $open->save();
        } else {
            DormOffMarketHold::query()->create([
                'portal_dorm_id' => $portalDormId,
                'returned_at' => null,
                'expected_return_at' => $expected,
            ]);
        }

        return redirect()->route('room-inventory')->with('toast', 'Dorm marked off market.');
    }

    public function returnDormToMarket(int $id): RedirectResponse
    {
        $row = DormOffMarketHold::query()->findOrFail($id);
        $row->returned_at = now();
        $row->save();

        return redirect()->route('room-inventory')->with('toast', 'Dorm returned to market.');
    }

    /**
     * JSON for a location: summary plus active out-of-service rows tied to this location.
     * Used by the React page when the OOS form selects a location.
     */
    public function roomsForLocation(Request $request, int $id): JsonResponse
    {
        $this->campId($request);

        $location = RoomInventoryLocation::query()->findOrFail($id);

        $outOfService = RoomInventoryOutOfService::query()
            ->where('room_inventory_location_id', $location->id)
            ->where('is_active', true)
            ->orderBy('room_identifier')
            ->get(['id', 'room_identifier', 'room_category', 'reason', 'created_at']);

        return response()->json([
            'location' => $location->only([
                'id', 'name', 'location_type', 'total_rooms',
                'rooms_executive', 'rooms_senior_executive', 'rooms_wellsite',
            ]),
            'out_of_service' => $outOfService,
        ]);
    }

    /**
     * Resolve the logged-in user's camp. Inventory is partitioned by camp_id
     * (same as camp-reservations).
     *
     * Uses abort() (not ValidationException) so a GET to /room-inventory does
     * not silently redirect()->back() to the previous page (e.g. room-utilization).
     */
    private function campId(Request $request): int
    {
        $campId = (int) ($request->user()?->getAttribute('camp_id') ?? 0);

        if ($campId < 1) {
            abort(403, 'Your account is not assigned to a camp.');
        }

        // FK: room_inventory_locations.camp_id → camps.id
        if (Schema::hasTable('camps')
            && ! DB::table('camps')->where('id', $campId)->exists()) {
            abort(
                403,
                "Camp #{$campId} is missing from the camps table. Update users.camp_id to a valid camp, or import that camp."
            );
        }

        return $campId;
    }

    private function validateLocation(Request $request): array
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'location_type' => 'required|in:'.implode(',', self::LOCATION_TYPES),
            'total_rooms' => 'required|integer|min:0|max:50000',
            'rooms_executive' => 'required|integer|min:0|max:50000',
            'rooms_senior_executive' => 'required|integer|min:0|max:50000',
            'rooms_wellsite' => 'required|integer|min:0|max:50000',
        ]);

        $sum = (int) $validated['rooms_executive']
            + (int) $validated['rooms_senior_executive']
            + (int) $validated['rooms_wellsite'];

        if ($sum > (int) $validated['total_rooms']) {
            throw ValidationException::withMessages([
                'rooms_executive' => 'Executive + Senior Executive + Wellsites cannot exceed total rooms.',
            ]);
        }

        return $validated;
    }
}
