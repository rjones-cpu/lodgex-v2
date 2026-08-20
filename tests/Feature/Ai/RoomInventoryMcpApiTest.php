<?php

namespace Tests\Feature\Ai;

use App\Enums\RoomStatus;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\RoomInventoryLocation;
use App\Models\User;
use App\Models\Worker;
use App\Services\Ai\Agents\RoomInventoryIntelligenceAgent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoomInventoryMcpApiTest extends TestCase
{
    use RefreshDatabase;

    private function inventoryRoom(User $user): Room
    {
        $location = RoomInventoryLocation::query()->create([
            'camp_id' => 1,
            'user_id' => $user->id,
            'name' => 'Dorm A',
            'location_type' => 'dorm',
            'total_rooms' => 10,
            'rooms_executive' => 5,
            'rooms_senior_executive' => 5,
            'rooms_wellsite' => 0,
            'sort_order' => 1,
        ]);

        return Room::create([
            'number' => '110',
            'dorm' => $location->name,
            'room_inventory_location_id' => $location->id,
            'room_type' => 'Executive',
            'status' => RoomStatus::VacantClean->value,
            'current_worker_id' => null,
            'is_active' => true,
            'user_id' => $user->id,
        ]);
    }

    public function test_mcp_reads_require_token(): void
    {
        $this->getJson('/api/ai/room-inventory/rooms')->assertStatus(401);
    }

    public function test_list_rooms_and_availability_are_read_only(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $this->inventoryRoom($user);

        $this->withToken('test-mcp-token')
            ->getJson('/api/ai/room-inventory/rooms')
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('capabilities', RoomInventoryIntelligenceAgent::CAPABILITIES)
            ->assertJsonPath('rooms.0.status', RoomStatus::VacantClean->value);

        $this->withToken('test-mcp-token')
            ->getJson('/api/ai/room-inventory/availability')
            ->assertOk()
            ->assertJsonPath('rooms.0.available', true);
    }

    public function test_create_proposal_does_not_write_occupancy(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $this->inventoryRoom($user);
        $worker = Worker::create(['name' => 'MCP Guest', 'company' => 'Acme']);
        $reservation = Reservation::create([
            'user_id' => $user->id,
            'worker_id' => $worker->id,
            'company' => 'Acme',
            'arrival_date' => now()->toDateString(),
            'departure_date' => now()->addDays(3)->toDateString(),
            'status' => 'Arrival',
            'approval_status' => 'Approved',
            'allotment_status' => 'Pending',
            'room_type' => 'Executive',
        ]);

        $this->withToken('test-mcp-token')
            ->postJson('/api/ai/room-inventory/proposals', [
                'reservation_id' => $reservation->id,
            ])
            ->assertCreated()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('occupancy_written', false)
            ->assertJsonPath('proposal.action', 'recommend_room')
            ->assertJsonPath('proposal.capabilityId', 'SL-02');

        $this->assertNull($reservation->fresh()->room_id);
        $this->assertDatabaseHas('ai_proposals', [
            'agent' => RoomInventoryIntelligenceAgent::AGENT,
            'status' => 'Pending',
        ]);
    }

    public function test_assign_hold_release_and_check_in_are_refused(): void
    {
        foreach (['assign', 'hold', 'release', 'check-in'] as $action) {
            $this->withToken('test-mcp-token')
                ->postJson('/api/ai/room-inventory/'.$action)
                ->assertForbidden()
                ->assertJsonPath('ok', false);
        }
    }
}
