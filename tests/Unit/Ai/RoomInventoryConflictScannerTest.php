<?php

namespace Tests\Unit\Ai;

use App\Enums\RoomStatus;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\RoomHold;
use App\Models\RoomInventoryLocation;
use App\Models\User;
use App\Models\Worker;
use App\Services\Ai\RoomInventoryConflictScanner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoomInventoryConflictScannerTest extends TestCase
{
    use RefreshDatabase;

    private function inventoryRoom(User $user, array $attributes = []): Room
    {
        $location = $attributes['location'] ?? RoomInventoryLocation::query()->create([
            'camp_id' => 1,
            'user_id' => $user->id,
            'name' => $attributes['dorm'] ?? 'Dorm A',
            'location_type' => 'dorm',
            'total_rooms' => 10,
            'rooms_executive' => 5,
            'rooms_senior_executive' => 5,
            'rooms_wellsite' => 0,
            'sort_order' => 1,
        ]);
        unset($attributes['location']);

        return Room::create(array_merge([
            'number' => '101',
            'dorm' => $location->name,
            'room_inventory_location_id' => $location->id,
            'room_type' => 'Executive',
            'status' => RoomStatus::VacantClean->value,
            'current_worker_id' => null,
            'is_active' => true,
            'status_updated_at' => now(),
            'user_id' => $user->id,
        ], $attributes));
    }

    public function test_flags_double_book_held_vs_vacant_assigned_vs_dirty_and_inventory_mismatch(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $this->actingAs($user);

        $doubleRoom = $this->inventoryRoom($user, ['number' => '201', 'status' => RoomStatus::AssignedArrival->value]);
        $workerA = Worker::create(['name' => 'A', 'company' => 'Acme']);
        $workerB = Worker::create(['name' => 'B', 'company' => 'Acme']);
        Reservation::create([
            'worker_id' => $workerA->id,
            'room_id' => $doubleRoom->id,
            'company' => 'Acme',
            'arrival_date' => '2026-08-20',
            'departure_date' => '2026-08-28',
            'status' => 'Arrival',
            'approval_status' => 'Approved',
            'allotment_status' => 'Allotted',
            'room_type' => 'Executive',
        ]);
        Reservation::create([
            'worker_id' => $workerB->id,
            'room_id' => $doubleRoom->id,
            'company' => 'Acme',
            'arrival_date' => '2026-08-22',
            'departure_date' => '2026-08-26',
            'status' => 'Check-In',
            'approval_status' => 'Approved',
            'allotment_status' => 'Allotted',
            'room_type' => 'Executive',
        ]);

        $held = $this->inventoryRoom($user, ['number' => '202']);
        RoomHold::create([
            'room_id' => $held->id,
            'reason' => 'Hold',
            'is_active' => true,
        ]);

        $dirtyAssigned = $this->inventoryRoom($user, [
            'number' => '203',
            'status' => RoomStatus::VacantDirty->value,
            'current_worker_id' => $workerA->id,
        ]);

        $orphan = Room::create([
            'number' => '204',
            'dorm' => 'Orphan',
            'room_inventory_location_id' => null,
            'room_type' => 'Executive',
            'status' => RoomStatus::Occupied->value,
            'current_worker_id' => $workerB->id,
            'is_active' => true,
            'user_id' => $user->id,
        ]);
        Reservation::create([
            'worker_id' => $workerB->id,
            'room_id' => $orphan->id,
            'company' => 'Acme',
            'arrival_date' => '2026-08-20',
            'departure_date' => '2026-08-24',
            'status' => 'Check-In',
            'approval_status' => 'Approved',
            'allotment_status' => 'Allotted',
            'room_type' => 'Executive',
        ]);

        $codes = app(RoomInventoryConflictScanner::class)->detect()->pluck('code');

        $this->assertContains('double_book', $codes);
        $this->assertContains('held_vs_vacant', $codes);
        $this->assertContains('assigned_vs_dirty', $codes);
        $this->assertContains('reservation_vs_inventory', $codes);
        $this->assertContains('not_actually_available', $codes);
        $this->assertTrue($dirtyAssigned->is_active);
    }
}
