<?php

namespace Tests\Feature\Ai;

use App\Enums\RoomStatus;
use App\Models\Room;
use App\Models\RoomInventoryLocation;
use App\Models\User;
use App\Services\Ai\Agents\HousekeepingWorkloadAgent;
use App\Services\Ai\Agents\LabourForecastAgent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HousekeepingLabourMcpApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_mcp_reads_require_token(): void
    {
        $this->getJson('/api/ai/housekeeping-workload')->assertStatus(401);
        $this->getJson('/api/ai/labour-forecast')->assertStatus(401);
    }

    public function test_read_stubs_do_not_publish_or_authorize_overtime(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $this->actingAs($user);
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
        Room::create([
            'number' => '110',
            'dorm' => $location->name,
            'room_inventory_location_id' => $location->id,
            'room_type' => 'Executive',
            'status' => RoomStatus::VacantDirty->value,
            'is_active' => true,
            'user_id' => $user->id,
        ]);

        $this->withToken('test-mcp-token')
            ->getJson('/api/ai/housekeeping-workload')
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('agent', HousekeepingWorkloadAgent::AGENT)
            ->assertJsonPath('capabilities', HousekeepingWorkloadAgent::CAPABILITIES)
            ->assertJsonPath('auto_publish', false)
            ->assertJsonPath('draft.publishedBoard', false);

        $this->withToken('test-mcp-token')
            ->getJson('/api/ai/labour-forecast')
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('agent', LabourForecastAgent::AGENT)
            ->assertJsonPath('auto_publish', false)
            ->assertJsonPath('forecast.overtimeAuthorized', false)
            ->assertJsonPath('forecast.rosterPublished', false);
    }

    public function test_publish_overtime_and_ready_are_refused(): void
    {
        $this->withToken('test-mcp-token')
            ->postJson('/api/ai/housekeeping-workload/publish-board')
            ->assertStatus(403)
            ->assertJsonPath('ok', false)
            ->assertJsonPath('blocked', true);

        $this->withToken('test-mcp-token')
            ->postJson('/api/ai/labour-forecast/approve-overtime')
            ->assertStatus(403)
            ->assertJsonPath('action', 'approve_overtime');

        $this->withToken('test-mcp-token')
            ->postJson('/api/ai/housekeeping-workload/mark-ready')
            ->assertStatus(403)
            ->assertJsonPath('action', 'mark_ready');
    }
}
