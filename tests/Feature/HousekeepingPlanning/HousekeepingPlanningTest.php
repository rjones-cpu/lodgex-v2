<?php

namespace Tests\Feature\HousekeepingPlanning;

use App\Models\HkDailyAssignment;
use App\Models\HkWorkTask;
use App\Models\Housekeeper;
use App\Services\HousekeepingPlanning\HousekeepingAssignmentService;
use Carbon\Carbon;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HousekeepingPlanningTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2025-05-20');
    }

    public function test_seeder_creates_housekeepers_and_tasks(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertGreaterThan(0, Housekeeper::active()->count());
        $this->assertGreaterThan(0, HkWorkTask::query()->count());
    }

    public function test_housekeeping_planning_page_loads(): void
    {
        $this->seed(DatabaseSeeder::class);
        $user = \App\Models\User::factory()->create();

        $response = $this->actingAs($user)->get(route('housekeeping-planning'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('HousekeepingPlanningManager')
            ->has('metrics')
            ->has('planningSummary.totalTasks')
            ->has('tasks')
            ->has('assignments')
            ->has('housekeepers')
            ->has('aiRecommendations')
        );
    }

    public function test_publish_assignments_redirects_with_toast(): void
    {
        $this->seed(DatabaseSeeder::class);
        $user = \App\Models\User::factory()->create();

        $this->actingAs($user)
            ->post(route('housekeeping-planning.assignments.publish'))
            ->assertRedirect()
            ->assertSessionHas('toast');
    }

    /**
     * Regression: calling recalculate twice in a row must update the same
     * HkDailyAssignment row, not attempt a second INSERT and trip the
     * UNIQUE (assignment_date, housekeeper_id) constraint.
     */
    public function test_recalculate_can_run_twice_without_unique_violation(): void
    {
        $this->seed(DatabaseSeeder::class);
        $svc = app(HousekeepingAssignmentService::class);
        $hk = Housekeeper::active()->firstOrFail();

        $first = $svc->recalculateForHousekeeper($hk, Carbon::today());
        $second = $svc->recalculateForHousekeeper($hk, Carbon::today());

        $this->assertSame($first->id, $second->id, 'Recalculate should update the same row, not insert a duplicate.');
        $this->assertSame(
            1,
            HkDailyAssignment::query()
                ->whereDate('assignment_date', Carbon::today())
                ->where('housekeeper_id', $hk->id)
                ->count(),
            'Only one assignment row should exist for this (date, housekeeper).',
        );
    }

    public function test_reassign_tasks_moves_room_and_recomputes_totals(): void
    {
        $this->seed(DatabaseSeeder::class);
        $user = \App\Models\User::factory()->create();

        // Publish first so tasks have housekeepers assigned.
        $this->actingAs($user)->post(route('housekeeping-planning.assignments.publish'));

        $task = HkWorkTask::query()
            ->forDate(Carbon::today()->toDateString())
            ->whereNotNull('housekeeper_id')
            ->whereNotIn('status', ['Completed', 'Passed Inspection'])
            ->first();

        $this->assertNotNull($task, 'Seeded data should produce at least one assigned task today.');

        $previousHkId = $task->housekeeper_id;
        $newHk = Housekeeper::active()->where('id', '!=', $previousHkId)->firstOrFail();

        $this->actingAs($user)
            ->post(route('housekeeping-planning.assignments.reassign'), [
                'changes' => [
                    ['taskId' => $task->id, 'housekeeperId' => $newHk->id],
                ],
            ])
            ->assertRedirect()
            ->assertSessionHas('toast');

        $task->refresh();
        $this->assertSame($newHk->id, $task->housekeeper_id);
        $this->assertSame('Assigned', $task->status);

        // Both housekeepers should still have exactly one HkDailyAssignment row
        // for today (recompute updated the existing rows, no duplicates).
        foreach ([$previousHkId, $newHk->id] as $hkId) {
            $this->assertSame(
                1,
                HkDailyAssignment::query()
                    ->whereDate('assignment_date', Carbon::today())
                    ->where('housekeeper_id', $hkId)
                    ->count(),
            );
        }

        // One audit log entry per change.
        $this->assertDatabaseHas('hk_audit_logs', [
            'subject_type' => 'hk_work_task',
            'subject_id' => $task->id,
            'action' => 'reassigned',
            'user_id' => $user->id,
        ]);
    }

    public function test_reassign_skips_completed_tasks(): void
    {
        $this->seed(DatabaseSeeder::class);
        $user = \App\Models\User::factory()->create();
        $this->actingAs($user)->post(route('housekeeping-planning.assignments.publish'));

        $task = HkWorkTask::query()
            ->forDate(Carbon::today()->toDateString())
            ->whereNotNull('housekeeper_id')
            ->first();

        $this->assertNotNull($task);
        $task->update(['status' => 'Completed']);
        $originalHkId = $task->housekeeper_id;
        $otherHk = Housekeeper::active()->where('id', '!=', $originalHkId)->firstOrFail();

        $this->actingAs($user)
            ->post(route('housekeeping-planning.assignments.reassign'), [
                'changes' => [
                    ['taskId' => $task->id, 'housekeeperId' => $otherHk->id],
                ],
            ])
            ->assertRedirect();

        $task->refresh();
        $this->assertSame($originalHkId, $task->housekeeper_id, 'Completed task must not be moved.');
        $this->assertSame('Completed', $task->status);
    }
}
