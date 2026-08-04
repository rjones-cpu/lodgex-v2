<?php

namespace Tests\Feature\Dashboard;

use App\Enums\RoomStatus;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\RoomInventoryLocation;
use App\Models\User;
use App\Models\UtilizationAuditLog;
use App\Models\Worker;
use Database\Seeders\RoomUtilizationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardRoomAssignmentTest extends TestCase
{
    use RefreshDatabase;

    private function makeInventoryLocation(User $user, string $name = 'Dorm A'): RoomInventoryLocation
    {
        return RoomInventoryLocation::query()->create([
            'camp_id' => max(1, (int) ($user->getAttribute('camp_id') ?? 1)),
            'user_id' => $user->id,
            'name' => $name,
            'location_type' => 'dorm',
            'total_rooms' => 10,
            'rooms_executive' => 5,
            'rooms_senior_executive' => 5,
            'rooms_wellsite' => 0,
            'sort_order' => 1,
        ]);
    }

    private function makeInventoryRoom(User $user, array $attributes = []): Room
    {
        $location = $attributes['location'] ?? $this->makeInventoryLocation($user, $attributes['dorm'] ?? 'Dorm A');
        unset($attributes['location']);

        return Room::create(array_merge([
            'number' => '100',
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

    public function test_dashboard_requires_auth(): void
    {
        $this->get(route('dashboard'))->assertRedirect(route('login'));
    }

    public function test_dashboard_index_renders_with_reservations_and_assignable_rooms(): void
    {
        $this->seed(RoomUtilizationSeeder::class);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->where('queueMode', 'operations')
                ->has('reservations')
                ->has('assignableRooms')
            );
    }

    public function test_discrepancies_modifications_module_renders(): void
    {
        $this->seed(RoomUtilizationSeeder::class);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('discrepancies-modifications'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->where('queueMode', 'exceptions')
                ->has('reservations')
                ->has('modificationRequests')
            );
    }

    public function test_discrepancies_modifications_requires_auth(): void
    {
        $this->get(route('discrepancies-modifications'))->assertRedirect(route('login'));
    }

    public function test_assign_room_links_reservation_worker_and_room(): void
    {
        $this->seed(RoomUtilizationSeeder::class);
        $user = User::factory()->create(['camp_id' => 1]);

        $worker = Worker::create([
            'name' => 'James McKenzie',
            'company' => 'Turner Industrial',
            'project' => 'Glen Grade Midstream Expansion',
        ]);

        $reservation = Reservation::create([
            'worker_id' => $worker->id,
            'room_id' => null,
            'company' => 'Turner Industrial',
            'arrival_date' => '2025-05-22',
            'departure_date' => '2025-05-29',
            'status' => 'Arrival',
            'approval_status' => 'High',
            'allotment_status' => 'Pending',
            'room_type' => 'Single Room',
            'ai_match_score' => 72,
        ]);

        $room = $this->makeInventoryRoom($user, [
            'number' => '9999',
            'dorm' => 'Dorm A',
            'room_type' => 'Single Room',
        ]);

        $this->actingAs($user)
            ->post(route('dashboard.assign-room'), [
                'reservation_id' => $reservation->id,
                'room_id' => $room->id,
            ])
            ->assertRedirect()
            ->assertSessionHas('toast');

        $reservation->refresh();
        $room->refresh();

        $this->assertSame($room->id, $reservation->room_id);
        $this->assertSame($worker->id, $room->current_worker_id);
        $this->assertSame(RoomStatus::AssignedArrival->value, $room->status);
        $this->assertSame('Allotted', $reservation->allotment_status);

        $this->assertDatabaseHas('utilization_audit_logs', [
            'subject_type' => 'reservation',
            'subject_id' => $reservation->id,
            'action' => 'room_assigned',
        ]);
    }

    public function test_assign_room_rejects_unavailable_room(): void
    {
        $this->seed(RoomUtilizationSeeder::class);
        $user = User::factory()->create(['camp_id' => 1]);

        $worker = Worker::create(['name' => 'Test Worker', 'company' => 'Test Co']);
        $reservation = Reservation::create([
            'worker_id' => $worker->id,
            'company' => 'Test Co',
            'arrival_date' => '2025-05-22',
            'departure_date' => '2025-05-29',
            'status' => 'Arrival',
            'approval_status' => 'High',
            'allotment_status' => 'Pending',
            'room_type' => 'Single Room',
        ]);

        $occupiedRoom = $this->makeInventoryRoom($user, [
            'number' => '8888',
            'dorm' => 'Dorm B',
            'room_type' => 'Single Room',
            'status' => RoomStatus::Occupied->value,
            'current_worker_id' => $worker->id,
        ]);

        $this->actingAs($user)
            ->post(route('dashboard.assign-room'), [
                'reservation_id' => $reservation->id,
                'room_id' => $occupiedRoom->id,
            ])
            ->assertSessionHasErrors('room');

        $this->assertNull($reservation->fresh()->room_id);
        $this->assertSame(0, UtilizationAuditLog::query()->where('action', 'room_assigned')->count());
    }

    public function test_ai_assign_room_picks_best_available_room(): void
    {
        $this->seed(RoomUtilizationSeeder::class);
        $user = User::factory()->create(['camp_id' => 1]);

        $worker = Worker::create([
            'name' => 'Sophie Chen',
            'company' => 'Bechtel Corp',
            'gender' => 'Female',
        ]);

        $reservation = Reservation::create([
            'worker_id' => $worker->id,
            'room_id' => null,
            'company' => 'Bechtel Corp',
            'arrival_date' => '2025-05-22',
            'departure_date' => '2025-05-29',
            'status' => 'Arrival',
            'approval_status' => 'Medium',
            'allotment_status' => 'Pending',
            'room_type' => 'Single Room',
            'ai_match_score' => 81,
        ]);

        $womensLocation = $this->makeInventoryLocation($user, "Women's Dorm");
        $womensRoom = $this->makeInventoryRoom($user, [
            'number' => '9997',
            'dorm' => "Women's Dorm",
            'room_type' => 'Single Room',
            'location' => $womensLocation,
        ]);

        $this->makeInventoryRoom($user, [
            'number' => '9996',
            'dorm' => 'Dorm A',
            'room_type' => 'Double Room',
        ]);

        $this->actingAs($user)
            ->post(route('dashboard.ai-assign-room'), [
                'reservation_id' => $reservation->id,
            ])
            ->assertRedirect()
            ->assertSessionHas('toast');

        $reservation->refresh();

        $this->assertSame($womensRoom->id, $reservation->room_id);

        $this->assertDatabaseHas('utilization_audit_logs', [
            'subject_type' => 'reservation',
            'subject_id' => $reservation->id,
            'action' => 'room_ai_assigned',
        ]);
    }

    public function test_bulk_assign_inventory_rooms_for_queue_tabs(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $this->actingAs($user);

        $location = $this->makeInventoryLocation($user, 'Dorm A');
        $roomOne = $this->makeInventoryRoom($user, [
            'number' => '101',
            'location' => $location,
            'room_type' => 'Executive',
        ]);
        $roomTwo = $this->makeInventoryRoom($user, [
            'number' => '102',
            'location' => $location,
            'room_type' => 'Executive',
        ]);

        $workerOne = Worker::create(['name' => 'Worker One', 'company' => 'Acme']);
        $workerTwo = Worker::create(['name' => 'Worker Two', 'company' => 'Acme']);

        $first = Reservation::create([
            'worker_id' => $workerOne->id,
            'company' => 'Acme',
            'arrival_date' => now()->toDateString(),
            'departure_date' => now()->addDays(5)->toDateString(),
            'status' => 'Arrival',
            'approval_status' => 'Approved',
            'allotment_status' => 'Pending',
            'room_type' => 'Executive',
        ]);
        $second = Reservation::create([
            'worker_id' => $workerTwo->id,
            'company' => 'Acme',
            'arrival_date' => now()->toDateString(),
            'departure_date' => now()->addDays(5)->toDateString(),
            'status' => 'Check-In',
            'approval_status' => 'Approved',
            'allotment_status' => 'Pending',
            'room_type' => 'Executive',
        ]);

        $this->post(route('dashboard.assign-inventory-rooms'))
            ->assertRedirect()
            ->assertSessionHas('toast');

        $first->refresh();
        $second->refresh();

        $this->assertNotNull($first->room_id);
        $this->assertNotNull($second->room_id);
        $this->assertNotSame($first->room_id, $second->room_id);
        $this->assertContains($first->room_id, [$roomOne->id, $roomTwo->id]);
        $this->assertContains($second->room_id, [$roomOne->id, $roomTwo->id]);
        $this->assertSame(RoomStatus::Occupied->value, $second->room->status);
    }

    public function test_check_in_worker_updates_reservation_and_room_status(): void
    {
        $this->seed(RoomUtilizationSeeder::class);
        $user = User::factory()->create(['camp_id' => 1]);

        $worker = Worker::create([
            'name' => 'Liam O’Connor',
            'company' => 'Turner Industrial',
        ]);

        $room = $this->makeInventoryRoom($user, [
            'number' => '9995',
            'dorm' => 'Dorm A',
            'room_type' => 'Double Room',
            'status' => RoomStatus::AssignedArrival->value,
            'current_worker_id' => $worker->id,
        ]);

        $reservation = Reservation::create([
            'worker_id' => $worker->id,
            'room_id' => $room->id,
            'company' => 'Turner Industrial',
            'arrival_date' => '2025-05-21',
            'departure_date' => '2025-05-28',
            'status' => 'Arrival',
            'approval_status' => 'Approved',
            'allotment_status' => 'Allotted',
            'room_type' => 'Double Room',
        ]);

        $this->actingAs($user)
            ->post(route('dashboard.check-in'), [
                'reservation_id' => $reservation->id,
            ])
            ->assertRedirect()
            ->assertSessionHas('toast');

        $reservation->refresh();
        $room->refresh();

        $this->assertSame('Check-In', $reservation->status);
        $this->assertSame(RoomStatus::Occupied->value, $room->status);
        $this->assertSame($worker->id, $room->current_worker_id);

        $this->assertDatabaseHas('utilization_audit_logs', [
            'subject_type' => 'reservation',
            'subject_id' => $reservation->id,
            'action' => 'checked_in',
        ]);
    }

    public function test_check_in_requires_assigned_room(): void
    {
        $this->seed(RoomUtilizationSeeder::class);
        $user = User::factory()->create();

        $worker = Worker::create(['name' => 'Unassigned Worker', 'company' => 'Test Co']);

        $reservation = Reservation::create([
            'worker_id' => $worker->id,
            'room_id' => null,
            'company' => 'Test Co',
            'arrival_date' => '2025-05-22',
            'departure_date' => '2025-05-29',
            'status' => 'Arrival',
            'approval_status' => 'High',
            'allotment_status' => 'Pending',
            'room_type' => 'Single Room',
        ]);

        $this->actingAs($user)
            ->post(route('dashboard.check-in'), [
                'reservation_id' => $reservation->id,
            ])
            ->assertSessionHasErrors('reservation');

        $this->assertSame('Arrival', $reservation->fresh()->status);
    }

    public function test_extend_stay_updates_departure_date_and_status(): void
    {
        $this->seed(RoomUtilizationSeeder::class);
        $user = User::factory()->create();

        $worker = Worker::create(['name' => 'Extend Test Worker', 'company' => 'Test Co']);

        $reservation = Reservation::create([
            'worker_id' => $worker->id,
            'company' => 'Test Co',
            'arrival_date' => '2025-05-20',
            'departure_date' => '2025-05-27',
            'status' => 'Check-In',
            'approval_status' => 'Approved',
            'allotment_status' => 'Allotted',
            'room_type' => 'Single Room',
        ]);

        $this->actingAs($user)
            ->post(route('dashboard.extend-stay'), [
                'reservation_id' => $reservation->id,
                'new_departure_date' => '2025-06-04',
            ])
            ->assertRedirect()
            ->assertSessionHas('toast');

        $reservation->refresh();

        $this->assertSame('Extension', $reservation->status);
        $this->assertSame('2025-06-04', $reservation->departure_date->toDateString());

        $this->assertDatabaseHas('utilization_audit_logs', [
            'subject_type' => 'reservation',
            'subject_id' => $reservation->id,
            'action' => 'stay_extended',
        ]);
    }

    public function test_extend_stay_rejects_departure_on_or_before_current_date(): void
    {
        $this->seed(RoomUtilizationSeeder::class);
        $user = User::factory()->create();

        $worker = Worker::create(['name' => 'Extend Invalid Worker', 'company' => 'Test Co']);

        $reservation = Reservation::create([
            'worker_id' => $worker->id,
            'company' => 'Test Co',
            'arrival_date' => '2025-05-20',
            'departure_date' => '2025-05-27',
            'status' => 'Check-In',
            'approval_status' => 'Approved',
            'allotment_status' => 'Allotted',
            'room_type' => 'Single Room',
        ]);

        $this->actingAs($user)
            ->post(route('dashboard.extend-stay'), [
                'reservation_id' => $reservation->id,
                'new_departure_date' => '2025-05-27',
            ])
            ->assertSessionHasErrors('new_departure_date');

        $this->assertSame('2025-05-27', $reservation->fresh()->departure_date->toDateString());
    }
}
