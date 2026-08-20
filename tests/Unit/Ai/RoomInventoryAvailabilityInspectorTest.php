<?php

namespace Tests\Unit\Ai;

use App\Enums\RoomStatus;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\RoomHold;
use App\Models\RoomInventoryLocation;
use App\Models\RoomInventoryOutOfService;
use App\Models\User;
use App\Models\Worker;
use App\Services\Ai\RoomInventoryAvailabilityInspector;
use App\Services\RoomUtilization\RoomAvailabilityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoomInventoryAvailabilityInspectorTest extends TestCase
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

    public function test_vacant_clean_without_holds_or_assignment_is_available(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $room = $this->inventoryRoom($user);

        $this->assertTrue(app(RoomInventoryAvailabilityInspector::class)->isAvailable($room));
        $this->assertTrue(app(RoomAvailabilityService::class)->isAvailableForAssignment($room));
    }

    public function test_vacant_dirty_is_not_available(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $room = $this->inventoryRoom($user, ['status' => RoomStatus::VacantDirty->value]);

        $this->assertContains('not_vacant_clean', app(RoomInventoryAvailabilityInspector::class)->unavailableReasons($room));
    }

    public function test_assigned_worker_is_not_available(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $worker = Worker::create(['name' => 'Assigned', 'company' => 'Acme']);
        $room = $this->inventoryRoom($user, ['current_worker_id' => $worker->id]);

        $inspector = app(RoomInventoryAvailabilityInspector::class);
        $this->assertContains('assigned', $inspector->unavailableReasons($room));
        $this->assertFalse(app(RoomAvailabilityService::class)->isAvailableForAssignment($room));
    }

    public function test_active_hold_blocks_vacant_clean(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $room = $this->inventoryRoom($user);
        RoomHold::create([
            'room_id' => $room->id,
            'user_id' => $user->id,
            'reason' => 'Company hold',
            'is_active' => true,
        ]);

        $room->load('activeHold');
        $this->assertContains('held', app(RoomInventoryAvailabilityInspector::class)->unavailableReasons($room));
    }

    public function test_inventory_oos_is_restricted(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $room = $this->inventoryRoom($user, ['number' => '7']);
        RoomInventoryOutOfService::create([
            'camp_id' => 1,
            'user_id' => $user->id,
            'room_inventory_location_id' => $room->room_inventory_location_id,
            'room_identifier' => '7',
            'room_category' => 'executive',
            'reason' => 'maintenance',
            'is_active' => true,
        ]);

        $this->assertContains('restricted', app(RoomInventoryAvailabilityInspector::class)->unavailableReasons($room->fresh()));
    }

    public function test_overlapping_reservation_blocks_availability_for_candidate(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $room = $this->inventoryRoom($user);
        $workerA = Worker::create(['name' => 'A', 'company' => 'Acme']);
        $workerB = Worker::create(['name' => 'B', 'company' => 'Acme']);

        Reservation::create([
            'user_id' => $user->id,
            'worker_id' => $workerA->id,
            'room_id' => $room->id,
            'company' => 'Acme',
            'arrival_date' => '2026-08-20',
            'departure_date' => '2026-08-27',
            'status' => 'Arrival',
            'approval_status' => 'Approved',
            'allotment_status' => 'Allotted',
            'room_type' => 'Executive',
        ]);

        $candidate = Reservation::create([
            'user_id' => $user->id,
            'worker_id' => $workerB->id,
            'room_id' => null,
            'company' => 'Acme',
            'arrival_date' => '2026-08-22',
            'departure_date' => '2026-08-25',
            'status' => 'Arrival',
            'approval_status' => 'Approved',
            'allotment_status' => 'Pending',
            'room_type' => 'Executive',
        ]);

        $room->load('reservations');
        $this->assertContains(
            'reservation_overlap',
            app(RoomInventoryAvailabilityInspector::class)->unavailableReasons($room, $candidate),
        );
    }

    public function test_retained_but_clean_is_unavailable_and_still_fit(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $room = $this->inventoryRoom($user);
        $worker = Worker::create(['name' => 'Offsite', 'company' => 'Acme']);
        Reservation::create([
            'user_id' => $user->id,
            'worker_id' => $worker->id,
            'room_id' => $room->id,
            'company' => 'Acme',
            'arrival_date' => now()->subDays(2)->toDateString(),
            'departure_date' => now()->addDays(5)->toDateString(),
            'status' => 'On-Hold',
            'approval_status' => 'Approved',
            'allotment_status' => 'Allotted',
            'room_type' => 'Executive',
        ]);
        $room->load('reservations');

        $inspector = app(RoomInventoryAvailabilityInspector::class);
        $this->assertContains('time_out_retained', $inspector->unavailableReasons($room));
        $this->assertTrue($inspector->isFitForCheckIn($room));
        $this->assertFalse($inspector->isAvailable($room));
    }

    public function test_unassigned_confirmed_deducts_from_category(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $room = $this->inventoryRoom($user);
        $workerA = Worker::create(['name' => 'Confirmed A', 'company' => 'Acme']);
        $workerB = Worker::create(['name' => 'Confirmed B', 'company' => 'Acme']);

        $committed = Reservation::create([
            'user_id' => $user->id,
            'worker_id' => $workerA->id,
            'room_id' => null,
            'company' => 'Acme',
            'arrival_date' => '2026-08-20',
            'departure_date' => '2026-08-27',
            'status' => 'Arrival',
            'approval_status' => 'Approved',
            'allotment_status' => 'Allotted',
            'room_type' => 'Executive',
        ]);
        $other = Reservation::create([
            'user_id' => $user->id,
            'worker_id' => $workerB->id,
            'room_id' => null,
            'company' => 'Acme',
            'arrival_date' => '2026-08-20',
            'departure_date' => '2026-08-27',
            'status' => 'Arrival',
            'approval_status' => 'Approved',
            'allotment_status' => 'Allotted',
            'room_type' => 'Executive',
        ]);

        $inspector = app(RoomInventoryAvailabilityInspector::class);
        $this->assertTrue($inspector->deductsInventory($committed));
        $this->assertTrue($inspector->isAvailable($room, $committed));
        $this->assertContains('category_committed', $inspector->unavailableReasons($room, $other));
    }

    public function test_dirty_confirmed_still_committed(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $dirty = $this->inventoryRoom($user, [
            'number' => '102',
            'status' => RoomStatus::VacantDirty->value,
        ]);
        $worker = Worker::create(['name' => 'Dirty Stay', 'company' => 'Acme']);
        $occupying = Reservation::create([
            'user_id' => $user->id,
            'worker_id' => $worker->id,
            'room_id' => $dirty->id,
            'company' => 'Acme',
            'arrival_date' => '2026-08-20',
            'departure_date' => '2026-08-27',
            'status' => 'Arrival',
            'approval_status' => 'Approved',
            'allotment_status' => 'Allotted',
            'room_type' => 'Executive',
        ]);
        $dirty->load('reservations');

        $inspector = app(RoomInventoryAvailabilityInspector::class);
        $this->assertFalse($inspector->isFitForCheckIn($dirty));
        $this->assertTrue($inspector->deductsInventory($occupying));
        $other = Reservation::create([
            'user_id' => $user->id,
            'worker_id' => Worker::create(['name' => 'Other', 'company' => 'Acme'])->id,
            'room_id' => null,
            'company' => 'Acme',
            'arrival_date' => '2026-08-22',
            'departure_date' => '2026-08-25',
            'status' => 'Arrival',
            'approval_status' => 'Approved',
            'allotment_status' => 'Pending',
            'room_type' => 'Executive',
        ]);
        $this->assertContains('reservation_overlap', $inspector->ledgerReasons($dirty, $other));
    }

    public function test_fitness_gate_is_after_inventory_for_uncommitted_dirty(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $room = $this->inventoryRoom($user, ['status' => RoomStatus::VacantDirty->value]);

        $inspector = app(RoomInventoryAvailabilityInspector::class);
        $this->assertTrue($inspector->isAssignableOnLedger($room));
        $this->assertFalse($inspector->isFitForCheckIn($room));
        $this->assertContains('not_fit_for_check_in', $inspector->fitnessReasons($room));
        $this->assertFalse($inspector->isAvailable($room));
    }

    public function test_no_sleep_does_not_release_inventory(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $room = $this->inventoryRoom($user);
        $worker = Worker::create(['name' => 'No Sleep', 'company' => 'Acme']);
        $reservation = Reservation::create([
            'user_id' => $user->id,
            'worker_id' => $worker->id,
            'room_id' => $room->id,
            'company' => 'Acme',
            'arrival_date' => now()->toDateString(),
            'departure_date' => now()->addDays(4)->toDateString(),
            'status' => 'No-Sleep',
            'approval_status' => 'Approved',
            'allotment_status' => 'Allotted',
            'room_type' => 'Executive',
        ]);
        $room->load('reservations');

        $inspector = app(RoomInventoryAvailabilityInspector::class);
        $this->assertTrue($inspector->deductsInventory($reservation));
        $this->assertTrue($inspector->occupiesInventory($reservation));
        $this->assertContains('no_sleep_must_not_release', $inspector->unavailableReasons($room));
    }

    public function test_time_out_over_seven_nights_is_human_only(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $room = $this->inventoryRoom($user);
        $worker = Worker::create(['name' => 'Long Hold', 'company' => 'Acme']);
        $stay = Reservation::create([
            'user_id' => $user->id,
            'worker_id' => $worker->id,
            'room_id' => $room->id,
            'company' => 'Acme',
            'arrival_date' => now()->subDays(10)->toDateString(),
            'departure_date' => now()->addDays(2)->toDateString(),
            'status' => 'On-Hold',
            'approval_status' => 'Approved',
            'allotment_status' => 'Allotted',
            'room_type' => 'Executive',
        ]);
        RoomHold::create([
            'room_id' => $room->id,
            'user_id' => $user->id,
            'reason' => 'Time-Out',
            'hold_started_at' => now()->subDays(8),
            'policy_days' => 7,
            'over_policy' => true,
            'is_active' => true,
        ]);
        $room->load(['activeHold', 'reservations']);

        $inspector = app(RoomInventoryAvailabilityInspector::class);
        $this->assertTrue($inspector->timeOutExceedsRetention($room, $stay));
        $this->assertContains('time_out_over_seven_nights', $inspector->unavailableReasons($room, $stay));
    }

    public function test_pending_and_waitlisted_do_not_deduct(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $worker = Worker::create(['name' => 'Pending', 'company' => 'Acme']);
        $pending = Reservation::create([
            'user_id' => $user->id,
            'worker_id' => $worker->id,
            'company' => 'Acme',
            'arrival_date' => '2026-08-20',
            'departure_date' => '2026-08-27',
            'status' => 'Arrival',
            'approval_status' => 'Pending',
            'allotment_status' => 'Pending',
            'room_type' => 'Executive',
        ]);
        $waitlisted = Reservation::create([
            'user_id' => $user->id,
            'worker_id' => $worker->id,
            'company' => 'Acme',
            'arrival_date' => '2026-08-20',
            'departure_date' => '2026-08-27',
            'status' => 'Waitlisted',
            'approval_status' => 'Approved',
            'allotment_status' => 'Pending',
            'room_type' => 'Executive',
        ]);

        $inspector = app(RoomInventoryAvailabilityInspector::class);
        $this->assertFalse($inspector->deductsInventory($pending));
        $this->assertFalse($inspector->deductsInventory($waitlisted));
    }
}
