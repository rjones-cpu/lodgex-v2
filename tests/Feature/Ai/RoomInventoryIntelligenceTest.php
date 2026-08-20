<?php

namespace Tests\Feature\Ai;

use App\Enums\RoomStatus;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\RoomHold;
use App\Models\RoomInventoryLocation;
use App\Models\User;
use App\Models\UtilizationAuditLog;
use App\Models\Worker;
use App\Services\Ai\Agents\RoomInventoryIntelligenceAgent;
use App\Services\Ai\AiOutputValidator;
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
        $this->actingAs($user);

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

        $this->post(route('dashboard.ai-assign-room'), [
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
            'capability_id' => 'SL-02',
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

    public function test_approve_still_requires_a_person(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $this->actingAs($user);
        $worker = Worker::create(['name' => 'Needs Human', 'company' => 'Acme']);
        $reservation = Reservation::create([
            'worker_id' => $worker->id,
            'company' => 'Acme',
            'arrival_date' => now()->toDateString(),
            'departure_date' => now()->addDays(2)->toDateString(),
            'status' => 'Arrival',
            'approval_status' => 'Approved',
            'allotment_status' => 'Pending',
            'room_type' => 'Executive',
        ]);
        $this->makeInventoryRoom($user, ['number' => '501', 'room_type' => 'Executive']);
        $proposal = app(RoomInventoryIntelligenceAgent::class)->proposeForReservation($reservation, $user);

        auth()->logout();

        $this->post(route('ai.proposals.approve', $proposal))
            ->assertRedirect(route('login'));

        $this->assertNull($reservation->fresh()->room_id);
        $this->assertSame('Pending', $proposal->fresh()->status);
    }

    public function test_recommend_payload_has_seven_state_and_never_execute(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $this->actingAs($user);
        $worker = Worker::create(['name' => 'Ledger Guest', 'company' => 'Acme']);
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
        $this->makeInventoryRoom($user, ['number' => '601', 'room_type' => 'Executive']);

        $proposal = app(RoomInventoryIntelligenceAgent::class)->proposeForReservation($reservation, $user);
        $payload = $proposal->payload;

        $this->assertSame('approval required', $payload['decision']);
        $this->assertFalse($payload['requested_change']['execute']);
        $this->assertSame(
            ['approval', 'stay', 'assignment', 'inventory_commitment', 'housekeeping', 'modification_workflow', 'exception_alerts'],
            array_keys($payload['current_state']),
        );
        $this->assertSame('unassigned', $payload['current_state']['assignment']);
        $this->assertSame('unassigned_confirmed_committed', $payload['current_state']['inventory_commitment']);
        $this->assertNotEmpty($payload['candidates']);
        $this->assertSame('reservation-rules-1.0', $payload['audit']['rule_version']);
        $this->assertFalse($payload['authority']['auto_assign']);
        $this->assertFalse($payload['constraints']['accessibility_inferred']);
    }

    public function test_retained_clean_room_is_not_proposed(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $this->actingAs($user);
        $room = $this->makeInventoryRoom($user, ['number' => '701', 'room_type' => 'Executive']);
        $heldWorker = Worker::create(['name' => 'Retained', 'company' => 'Acme']);
        Reservation::create([
            'worker_id' => $heldWorker->id,
            'room_id' => $room->id,
            'company' => 'Acme',
            'arrival_date' => now()->toDateString(),
            'departure_date' => now()->addDays(5)->toDateString(),
            'status' => 'On-Hold',
            'approval_status' => 'Approved',
            'allotment_status' => 'Allotted',
            'room_type' => 'Executive',
        ]);
        $guest = Worker::create(['name' => 'New Guest', 'company' => 'Acme']);
        $reservation = Reservation::create([
            'worker_id' => $guest->id,
            'company' => 'Acme',
            'arrival_date' => now()->toDateString(),
            'departure_date' => now()->addDays(3)->toDateString(),
            'status' => 'Arrival',
            'approval_status' => 'Approved',
            'allotment_status' => 'Pending',
            'room_type' => 'Executive',
        ]);

        $this->expectException(ValidationException::class);
        app(RoomInventoryIntelligenceAgent::class)->proposeForReservation($reservation, $user);
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
        $worker = Worker::create(['name' => 'No Write', 'company' => 'Acme']);
        $reservation = Reservation::create([
            'worker_id' => $worker->id,
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
                ->where('aiFlags.capabilities', ['SL-02', 'SL-03'])
            );
    }

    public function test_vacant_dirty_room_is_not_proposed(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $this->actingAs($user);

        $worker = Worker::create(['name' => 'Dirty Guest', 'company' => 'Acme']);
        $reservation = Reservation::create([
            'worker_id' => $worker->id,
            'company' => 'Acme',
            'arrival_date' => now()->toDateString(),
            'departure_date' => now()->addDays(2)->toDateString(),
            'status' => 'Arrival',
            'approval_status' => 'Approved',
            'allotment_status' => 'Pending',
            'room_type' => 'Executive',
        ]);
        $this->makeInventoryRoom($user, [
            'number' => '301',
            'room_type' => 'Executive',
            'status' => RoomStatus::VacantDirty->value,
        ]);

        $this->expectException(ValidationException::class);
        app(RoomInventoryIntelligenceAgent::class)->proposeForReservation($reservation, $user);
    }

    public function test_scan_persists_conflict_flags_without_occupancy_write(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $this->actingAs($user);

        $room = $this->makeInventoryRoom($user, ['number' => '401']);
        RoomHold::create([
            'room_id' => $room->id,
            'reason' => 'Hold vs vacant',
            'is_active' => true,
        ]);

        $flags = app(RoomInventoryIntelligenceAgent::class)->scanConflicts($user);

        $this->assertTrue($flags->contains(fn ($proposal) => $proposal->action === 'flag_risk'));
        $this->assertNull($room->fresh()->current_worker_id);
        $this->assertSame(RoomStatus::VacantClean->value, $room->fresh()->status);
        $this->assertDatabaseHas('ai_proposals', [
            'agent' => RoomInventoryIntelligenceAgent::AGENT,
            'action' => 'flag_risk',
            'capability_id' => 'SL-02',
            'status' => 'Pending',
        ]);
    }

    public function test_approving_a_conflict_flag_does_not_assign(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $this->actingAs($user);

        $room = $this->makeInventoryRoom($user, ['number' => '402']);
        RoomHold::create([
            'room_id' => $room->id,
            'reason' => 'Hold',
            'is_active' => true,
        ]);

        $proposal = app(RoomInventoryIntelligenceAgent::class)->scanConflicts($user)->first();
        $this->assertNotNull($proposal);

        $this->post(route('ai.proposals.approve', $proposal))
            ->assertRedirect()
            ->assertSessionHas('toast');

        $this->assertSame('Approved', $proposal->fresh()->status);
        $this->assertNull($room->fresh()->current_worker_id);
        $this->assertSame(0, UtilizationAuditLog::query()->where('action', 'room_assigned')->count());
    }

    public function test_forbidden_actions_cannot_be_emitted_as_proposals(): void
    {
        $validator = app(AiOutputValidator::class);

        foreach (['assign_room', 'hold_room', 'check_in', 'write_occupancy', 'release_room'] as $action) {
            try {
                $validator->validateProposalPayload(['action' => $action]);
                $this->fail("Expected {$action} to be blocked.");
            } catch (ValidationException) {
                $this->assertTrue(true);
            }
        }
    }
}
