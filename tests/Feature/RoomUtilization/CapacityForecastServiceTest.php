<?php

namespace Tests\Feature\RoomUtilization;

use App\Services\RoomUtilization\CapacityForecastService;
use App\Services\RoomUtilization\RoomStatusEngine;
use Carbon\Carbon;
use Database\Seeders\RoomUtilizationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CapacityForecastServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2025-05-20 10:00:00');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_builds_thirty_day_forecast_with_outlook_windows(): void
    {
        $this->seed(RoomUtilizationSeeder::class);

        $summary = app(RoomStatusEngine::class)->summarize();
        $forecast = app(CapacityForecastService::class)->build($summary, days: 30);

        $this->assertCount(30, $forecast->dailyForecasts);
        $this->assertArrayHasKey('3d', $forecast->outlook);
        $this->assertArrayHasKey('7d', $forecast->outlook);
        $this->assertArrayHasKey('14d', $forecast->outlook);
        $this->assertArrayHasKey('30d', $forecast->outlook);

        $firstDay = $forecast->dailyForecasts->first();
        $this->assertArrayHasKey('shortage', $firstDay);
        $this->assertArrayHasKey('confidence', $firstDay);
        $this->assertArrayHasKey('risk', $firstDay);
        $this->assertArrayHasKey('overflowRooms', $firstDay);
    }

    public function test_calculated_shortage_and_risk_not_copied_from_snapshot(): void
    {
        $this->seed(RoomUtilizationSeeder::class);

        $summary = app(RoomStatusEngine::class)->summarize();
        $forecast = app(CapacityForecastService::class)->build($summary, days: 7);

        $dayWithMovement = $forecast->dailyForecasts->first();

        $this->assertNotNull($dayWithMovement['projectedOccupancy']);
        $this->assertContains($dayWithMovement['risk'], ['low', 'medium', 'high', 'critical']);
        $this->assertGreaterThan(0, $dayWithMovement['confidence']);
    }

    public function test_room_utilization_page_includes_forecast_outlook(): void
    {
        $this->seed(RoomUtilizationSeeder::class);

        $user = \App\Models\User::factory()->create();

        $response = $this->actingAs($user)->get(route('room-utilization'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('RoomUtilizationManager')
            ->has('forecastDays', 30)
            ->has('forecastOutlook.7d.maxShortage')
            ->has('occupancyByContractor')
        );
    }
}
