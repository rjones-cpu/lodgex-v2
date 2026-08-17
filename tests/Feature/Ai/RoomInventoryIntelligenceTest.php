<?php

namespace Tests\Feature\Ai;

use App\Enums\RoomStatus;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\RoomInventoryLocation;
use App\Models\User;
use App\Models\UtilizationAuditLog;
use App\Models\Worker;
use App\Services\Ai\Agents\RoomInventoryIntelligenceAgent;
use App\Services\RoomUtilization\RoomAssignmentService;
use Database\Seeders\RoomUtilizationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class RoomInventoryIntelligenceTest extends TestCase
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

    public function test_ai_assign_route_creates_proposal_and_does_not_write_room(): void
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

        $this->actingAs($user)
            ->post(route('dashboard.ai-assign-room'), [
                'reservation_id' => $reservation->id,
            ])
            ->assertRedirect()
            ->assertSessionHas('toast');

        $reservation->refresh();
        $this->assertNull($reservation->room_id);
        $this->assertNull($womensRoom->fresh()->current_worker_id);

        $this->assertDatabaseHas('ai_proposals', [
            'agent' => RoomInventoryIntelligenceAgent::AGENT,
            'action' => 'recommend_room',
            'status' => 'Pending',
        ]);

        $this->assertSame(0, UtilizationAuditLog::query()->where('action', 'room_ai_assigned')->count());
        $this->assertSame(0, UtilizationAuditLog::query()->where('action', 'room_assigned')->count());
    }

    public function test_human_approve_assigns_through_room_assignment_service(): void
    {
        $this->seed(RoomUtilizationSeeder::class);
        $user = User::factory()->create(['camp_id' => 1]);
        $this->actingAs($user);

        $worker = Worker::create(['name' => 'James McKenzie', 'company' => 'Turner Industrial']);
        $reservation = Reservation::create([
            'worker_id' => $worker->id,
            'company' => 'Turner Industrial',
            'arrival_date' => '2025-05-22',
            'departure_date' => '2025-05-29',
            'status' => 'Arrival',
            'approval_status' => 'High',
            'allotment_status' => 'Pending',
            'room_type' => 'Single Room',
        ]);

        $room = $this->makeInventoryRoom($user, [
            'number' => '1102',
            'dorm' => 'Dorm B',
            'room_type' => 'Single Room',
        ]);

        $proposal = app(RoomInventoryIntelligenceAgent::class)->proposeForReservation($reservation, $user);

        $this->post(route('ai.proposals.approve', $proposal))
            ->assertRedirect()
            ->assertSessionHas('toast');

        $reservation->refresh();
        $room->refresh();

        $this->assertSame($room->id, $reservation->room_id);
        $this->assertSame($worker->id, $room->current_worker_id);
        $this->assertSame('Approved', $proposal->fresh()->status);
        $this->assertDatabaseHas('utilization_audit_logs', [
            'subject_type' => 'reservation',
            'subject_id' => $reservation->id,
            'action' => 'room_assigned',
        ]);
        $this->assertSame(0, UtilizationAuditLog::query()->where('action', 'room_ai_assigned')->count());
    }

    public function test_dismiss_does_not_assign(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $this->actingAs($user);

        $worker = Worker::create(['name' => 'Dismiss Worker', 'company' => 'Acme']);
        $reservation = Reservation::create([
            'worker_id' => $worker->id,
            'company' => 'Acme',
            'arrival_date' => now()->toDateString(),
            'departure_date' => now()->addDays(3)->toDateString(),
            'status' => 'Arrival',
            'approval_status' => 'Approved',
            'allotment_status' => 'Pending',
            'room_type' => 'Executive',
        ]);
        $this->makeInventoryRoom($user, ['number' => '201', 'room_type' => 'Executive']);

        $proposal = app(RoomInventoryIntelligenceAgent::class)->proposeForReservation($reservation, $user);

        $this->post(route('ai.proposals.dismiss', $proposal))->assertRedirect();

        $this->assertNull($reservation->fresh()->room_id);
        $this->assertSame('Dismissed', $proposal->fresh()->status);
    }

    public function test_assignment_service_ai_assign_refuses_to_write(): void
    {
        $user = User::factory()->create();
        $reservation = Reservation::create([
            'company' => 'Acme',
            'arrival_date' => now()->toDateString(),
            'departure_date' => now()->addDays(2)->toDateString(),
            'status' => 'Arrival',
            'approval_status' => 'Approved',
            'allotment_status' => 'Pending',
            'room_type' => 'Executive',
        ]);

        $this->expectException(ValidationException::class);
        app(RoomAssignmentService::class)->aiAssign($reservation, $user);
    }

    public function test_dashboard_includes_shadow_proposal_props(): void
    {
        $this->seed(RoomUtilizationSeeder::class);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->has('aiProposals')
                ->where('aiFlags.mode', 'shadow')
                ->where('aiFlags.shadow', true)
            );
    }
}
