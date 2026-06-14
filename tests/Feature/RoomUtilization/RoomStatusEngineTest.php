<?php

namespace Tests\Feature\RoomUtilization;

use App\Enums\RoomStatus;
use App\Models\Room;
use App\Models\Worker;
use App\Services\RoomUtilization\RoomAvailabilityService;
use App\Services\RoomUtilization\RoomStatusEngine;
use Database\Seeders\RoomUtilizationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoomStatusEngineTest extends TestCase
{
    use RefreshDatabase;

    public function test_summarize_returns_capacity_counts(): void
    {
        $this->seed(RoomUtilizationSeeder::class);

        $summary = app(RoomStatusEngine::class)->summarize();

        $this->assertGreaterThan(0, $summary->totalActiveRooms);
        $this->assertGreaterThanOrEqual(0, $summary->assignableNow);
        $this->assertGreaterThanOrEqual(0, $summary->usableCapacityTonight);
        $this->assertIsFloat($summary->occupancyPercentage());
    }

    public function test_only_vacant_clean_without_holds_is_assignable(): void
    {
        $worker = Worker::create(['name' => 'Test Worker', 'company' => 'Test Co']);

        $assignable = Room::create([
            'number' => '9991',
            'dorm' => 'Dorm Test',
            'room_type' => 'Single',
            'status' => RoomStatus::VacantClean->value,
            'is_active' => true,
            'status_updated_at' => now(),
        ]);

        $occupied = Room::create([
            'number' => '9992',
            'dorm' => 'Dorm Test',
            'room_type' => 'Single',
            'status' => RoomStatus::Occupied->value,
            'current_worker_id' => $worker->id,
            'is_active' => true,
            'status_updated_at' => now(),
        ]);

        $availability = app(RoomAvailabilityService::class);

        $assignable->load('activeHold', 'activeMaintenanceHold');
        $occupied->load('activeHold', 'activeMaintenanceHold');

        $this->assertTrue($availability->isAvailableForAssignment($assignable));
        $this->assertFalse($availability->isAvailableForAssignment($occupied));
    }

    public function test_vacant_clean_with_worker_fails_validation(): void
    {
        $worker = Worker::create(['name' => 'Conflict Worker', 'company' => 'Test Co']);

        Room::create([
            'number' => '8881',
            'dorm' => 'Dorm X',
            'room_type' => 'Single',
            'status' => RoomStatus::VacantClean->value,
            'current_worker_id' => $worker->id,
            'is_active' => true,
            'status_updated_at' => now(),
        ]);

        $summary = app(RoomStatusEngine::class)->summarize();

        $this->assertTrue(
            $summary->validationIssues->contains(
                fn (array $issue) => $issue['code'] === 'assignable_with_worker' && $issue['room'] === '8881'
            )
        );
    }

    public function test_room_utilization_page_receives_status_engine_payload(): void
    {
        $this->seed(RoomUtilizationSeeder::class);

        $user = \App\Models\User::factory()->create();

        $response = $this->actingAs($user)->get(route('room-utilization'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('RoomUtilizationManager')
            ->has('statusEngine.totalActiveRooms')
            ->has('statusEngine.assignableNow')
            ->has('statusEngine.conflicts')
        );
    }
}
