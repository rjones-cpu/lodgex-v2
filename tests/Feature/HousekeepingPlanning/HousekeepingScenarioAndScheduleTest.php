<?php

namespace Tests\Feature\HousekeepingPlanning;

use App\Models\HkScheduleFeed;
use App\Models\User;
use App\Services\HousekeepingPlanning\HousekeepingPlanningEngine;
use App\Services\HousekeepingPlanning\HousekeepingScenarioService;
use Carbon\Carbon;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HousekeepingScenarioAndScheduleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2025-05-20');
    }

    private function seedPlanningDemo(): User
    {
        $user = $this->actingAsCampOperator();
        $this->seed(DatabaseSeeder::class);

        return $user;
    }

    public function test_scenario_run_returns_result(): void
    {
        $this->seedPlanningDemo();
        $summary = app(HousekeepingPlanningEngine::class)->summarize(Carbon::today());

        $result = app(HousekeepingScenarioService::class)->run('housekeeper_sick', $summary);
        $this->assertSame('Housekeeper calls in sick', $result['title']);

        $this->post(route('housekeeping-planning.scenarios.run'), ['scenario' => 'extra_checkouts'])
            ->assertRedirect()
            ->assertSessionHas('scenarioResult.title');
    }

    public function test_schedule_feeds_exist_after_seed(): void
    {
        $this->seedPlanningDemo();

        $this->assertGreaterThan(0, HkScheduleFeed::query()->count());
    }

    public function test_page_includes_utilization_and_schedule_props(): void
    {
        $this->seedPlanningDemo();

        $this->get(route('housekeeping-planning'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('roomUtilization.assignableNow')
                ->has('scheduleFeeds.0.title')
                ->has('scenarioPresets.0.key')
            );
    }
}
