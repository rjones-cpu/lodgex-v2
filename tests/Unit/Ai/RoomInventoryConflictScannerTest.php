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

    public function test_flags_no_sleep_seven_night_retention_ooo_unassigned_and_dirty_confirmed(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $this->actingAs($user);

        $noSleepRoom = $this->inventoryRoom($user, ['number' => '301']);
        $noSleepWorker = Worker::create(['name' => 'NS', 'company' => 'Acme']);
        Reservation::create([
            'worker_id' => $noSleepWorker->id,
            'room_id' => $noSleepRoom->id,
            'company' => 'Acme',
            'arrival_date' => now()->toDateString(),
            'departure_date' => now()->addDays(3)->toDateString(),
            'status' => 'No-Sleep',
            'approval_status' => 'Approved',
            'allotment_status' => 'Allotted',
            'room_type' => 'Executive',
        ]);

        $retained = $this->inventoryRoom($user, ['number' => '302']);
        $retainedWorker = Worker::create(['name' => 'TO', 'company' => 'Acme']);
        Reservation::create([
            'worker_id' => $retainedWorker->id,
            'room_id' => $retained->id,
            'company' => 'Acme',
            'arrival_date' => now()->subDays(10)->toDateString(),
            'departure_date' => now()->addDays(2)->toDateString(),
            'status' => 'On-Hold',
            'approval_status' => 'Approved',
            'allotment_status' => 'Allotted',
            'room_type' => 'Executive',
        ]);
        RoomHold::create([
            'room_id' => $retained->id,
            'reason' => 'Time-Out',
            'hold_started_at' => now()->subDays(8),
            'policy_days' => 7,
            'over_policy' => true,
            'is_active' => true,
        ]);

        $ooo = $this->inventoryRoom($user, [
            'number' => '303',
            'status' => RoomStatus::OutOfService->value,
        ]);
        $oooWorker = Worker::create(['name' => 'OOO', 'company' => 'Acme']);
        Reservation::create([
            'worker_id' => $oooWorker->id,
            'room_id' => $ooo->id,
            'company' => 'Acme',
            'arrival_date' => now()->toDateString(),
            'departure_date' => now()->addDays(4)->toDateString(),
            'status' => 'Check-In',
            'approval_status' => 'Approved',
            'allotment_status' => 'Allotted',
            'room_type' => 'Executive',
        ]);

        $unassignedWorker = Worker::create(['name' => 'UA', 'company' => 'Acme']);
        Reservation::create([
            'worker_id' => $unassignedWorker->id,
            'room_id' => null,
            'company' => 'Acme',
            'arrival_date' => now()->toDateString(),
            'departure_date' => now()->addDays(4)->toDateString(),
            'status' => 'Arrival',
            'approval_status' => 'Approved',
            'allotment_status' => 'Allotted',
            'room_type' => 'Executive',
        ]);

        $dirty = $this->inventoryRoom($user, [
            'number' => '304',
            'status' => RoomStatus::VacantDirty->value,
        ]);
        $dirtyWorker = Worker::create(['name' => 'DC', 'company' => 'Acme']);
        Reservation::create([
            'worker_id' => $dirtyWorker->id,
            'room_id' => $dirty->id,
            'company' => 'Acme',
            'arrival_date' => now()->toDateString(),
            'departure_date' => now()->addDays(4)->toDateString(),
            'status' => 'Arrival',
            'approval_status' => 'Approved',
            'allotment_status' => 'Allotted',
            'room_type' => 'Executive',
        ]);

        $codes = app(RoomInventoryConflictScanner::class)->detect()->pluck('code');

        $this->assertContains('no_sleep_must_not_release', $codes);
        $this->assertContains('time_out_over_seven_nights', $codes);
        $this->assertContains('ooo_committed', $codes);
        $this->assertContains('unassigned_confirmed', $codes);
        $this->assertContains('dirty_confirmed_committed', $codes);
    }
}
