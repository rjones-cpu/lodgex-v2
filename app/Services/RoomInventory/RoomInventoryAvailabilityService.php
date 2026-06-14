<?php

namespace App\Services\RoomInventory;

use App\Models\Room;
use App\Models\RoomInventoryLocation;
use App\Models\RoomInventoryOutOfService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

/**
 * Room Inventory availability — out-of-service rooms are not assignable.
 *
 * Ported from camp-reservations. Differences:
 *   - No `camp_id` scoping (lodgex-v2 is single-tenant).
 *   - No portal API / `Dorm` model dependency; we match locations to
 *     lodgex-v2's `rooms.dorm` string column instead.
 */
class RoomInventoryAvailabilityService
{
    /**
     * @return array<string, int>
     */
    public function availableCountsByCategoryForLocation(RoomInventoryLocation $location, Collection $oosAtLocation): array
    {
        $blocked = $this->blockedIdentifiersList($oosAtLocation);
        $available = [
            'executive' => 0,
            'senior_executive' => 0,
            'wellsite' => 0,
            'total' => 0,
        ];

        $totalRooms = (int) $location->total_rooms;
        for ($roomNumber = 1; $roomNumber <= $totalRooms; $roomNumber++) {
            if ($this->isRoomNumberBlocked($roomNumber, $blocked)) {
                continue;
            }
            $category = $this->inferCategoryForLocationRoom($location, $roomNumber);
            $available[$category] = ($available[$category] ?? 0) + 1;
            $available['total']++;
        }

        return $available;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, RoomInventoryLocation>  $locations
     * @param  \Illuminate\Support\Collection<int, RoomInventoryOutOfService>  $outOfService
     * @return array<string, int>
     */
    public function buildStats($locations, $outOfService): array
    {
        $totalRooms = (int) $locations->sum('total_rooms');
        $sumExecutive = 0;
        $sumSenior = 0;
        $sumWellsite = 0;
        $availableExecutive = 0;
        $availableSenior = 0;
        $availableWellsite = 0;
        $totalAvailable = 0;
        $totalOos = (int) $outOfService->count();

        foreach ($locations as $loc) {
            $sumExecutive += (int) $loc->rooms_executive;
            $sumSenior += (int) $loc->rooms_senior_executive;
            $sumWellsite += (int) $loc->rooms_wellsite;

            $counts = $this->availableCountsByCategoryForLocation(
                $loc,
                $outOfService->where('room_inventory_location_id', $loc->id)
            );
            $availableExecutive += (int) $counts['executive'];
            $availableSenior += (int) $counts['senior_executive'];
            $availableWellsite += (int) $counts['wellsite'];
            $totalAvailable += (int) $counts['total'];
        }

        return [
            'total_rooms' => $totalRooms,
            'sum_executive' => $sumExecutive,
            'sum_senior_executive' => $sumSenior,
            'sum_wellsite' => $sumWellsite,
            'available_executive' => $availableExecutive,
            'available_senior_executive' => $availableSenior,
            'available_wellsite' => $availableWellsite,
            'total_available' => $totalAvailable,
            'total_out_of_service' => $totalOos,
        ];
    }

    public function inferCategoryForLocationRoom(RoomInventoryLocation $location, int $roomNumber): string
    {
        $exec = (int) $location->rooms_executive;
        $senior = (int) $location->rooms_senior_executive;

        if ($roomNumber > 0) {
            if ($roomNumber <= $exec) {
                return 'executive';
            }
            if ($roomNumber <= $exec + $senior) {
                return 'senior_executive';
            }

            return 'wellsite';
        }

        $well = (int) $location->rooms_wellsite;
        if ($well > 0 && $exec === 0 && $senior === 0) {
            return 'wellsite';
        }
        if ($exec > 0 && $senior === 0 && $well === 0) {
            return 'executive';
        }
        if ($senior > 0 && $exec === 0 && $well === 0) {
            return 'senior_executive';
        }
        if ($location->location_type === 'wellsite' && $well > 0) {
            return 'wellsite';
        }

        return 'executive';
    }

    /**
     * Whether a lodgex-v2 Room cannot be assigned (active Room Inventory OOS).
     *
     * Matches by dorm name (Room::dorm) to RoomInventoryLocation::name, then
     * by room number/identifier (Room::number).
     */
    public function isRoomBlockedForAssignment(Room $room): bool
    {
        if (! Schema::hasTable('room_inventory_out_of_service')) {
            return false;
        }

        $location = $this->findLocationForDormName((string) $room->dorm);
        if (! $location) {
            return false;
        }

        $oosRows = RoomInventoryOutOfService::query()
            ->where('room_inventory_location_id', $location->id)
            ->where('is_active', true)
            ->get();

        $roomIdentifier = trim((string) $room->number);
        $roomName = 'Room '.$roomIdentifier;

        foreach ($oosRows as $row) {
            if ($this->roomIdentifierMatches((string) $row->room_identifier, $roomIdentifier, $roomName)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array<int, int>
     */
    public function assignableRoomNumbersForCategory(
        RoomInventoryLocation $location,
        Collection $oosAtLocation,
        string $category,
        int $limit = 3
    ): array {
        $blocked = $this->blockedIdentifiersList($oosAtLocation);
        $picked = [];

        for ($roomNumber = 1; $roomNumber <= (int) $location->total_rooms; $roomNumber++) {
            if ($this->isRoomNumberBlocked($roomNumber, $blocked)) {
                continue;
            }
            if ($this->inferCategoryForLocationRoom($location, $roomNumber) !== $category) {
                continue;
            }
            $picked[] = $roomNumber;
            if (count($picked) >= $limit) {
                break;
            }
        }

        return $picked;
    }

    public function findLocationForDormName(string $dormName): ?RoomInventoryLocation
    {
        $name = trim($dormName);
        if ($name === '' || ! Schema::hasTable('room_inventory_locations')) {
            return null;
        }

        $lower = strtolower($name);

        return RoomInventoryLocation::query()
            ->get()
            ->first(fn (RoomInventoryLocation $loc) => strtolower(trim($loc->name)) === $lower);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, RoomInventoryOutOfService>  $oosAtLocation
     * @return array<int, string>
     */
    private function blockedIdentifiersList(Collection $oosAtLocation): array
    {
        return $oosAtLocation
            ->pluck('room_identifier')
            ->map(fn ($id) => trim((string) $id))
            ->filter(fn ($id) => $id !== '')
            ->values()
            ->all();
    }

    /**
     * @param  array<int, string>  $blockedIdentifiers
     */
    private function isRoomNumberBlocked(int $roomNumber, array $blockedIdentifiers): bool
    {
        return in_array((string) $roomNumber, $blockedIdentifiers, true);
    }

    private function roomIdentifierMatches(string $oosIdentifier, string $roomIdentifier, string $roomName): bool
    {
        $oos = trim($oosIdentifier);
        if ($oos === '') {
            return false;
        }

        if ($oos === $roomIdentifier) {
            return true;
        }
        if ($roomName !== '' && $oos === $roomName) {
            return true;
        }
        if ($roomName !== '' && strcasecmp($roomName, 'room '.$oos) === 0) {
            return true;
        }
        if ($roomName !== '' && preg_match('/\b'.preg_quote($oos, '/').'\b/i', $roomName)) {
            return true;
        }

        return false;
    }
}
