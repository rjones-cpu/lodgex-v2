<?php

namespace Database\Seeders;

use App\Models\HkInspection;
use App\Models\HkWorkTask;
use App\Models\Housekeeper;
use App\Services\HousekeepingPlanning\HousekeepingAdvisorService;
use App\Services\HousekeepingPlanning\HousekeepingAssignmentService;
use App\Services\HousekeepingPlanning\HousekeepingScheduleIntegrationService;
use App\Services\HousekeepingPlanning\HousekeepingForecastService;
use App\Services\HousekeepingPlanning\HousekeepingPlanningEngine;
use App\Services\HousekeepingPlanning\HousekeepingStandardsService;
use App\Services\HousekeepingPlanning\HousekeepingTaskGenerationService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class HousekeepingPlanningSeeder extends Seeder
{
    public function run(): void
    {
        app(HousekeepingStandardsService::class)->seedDefaults();

        // Primary dorms map to real Room Inventory location names so that the
        // single-dorm assignment preference lines up with the seeded rooms.
        $keepers = [
            ['Maria', 'Santos', 'A', 'Senior'],
            ['James', 'Wilson', 'B', 'Standard'],
            ['Priya', 'Nair', 'E', 'Standard'],
            ['Elena', 'Vasquez', 'F', 'Standard'],
            ['Tom', 'Nguyen', 'G', 'Standard'],
            ['Sarah', 'Kim', 'H', 'Senior'],
        ];

        foreach ($keepers as [$first, $last, $dorm, $skill]) {
            Housekeeper::create([
                'first_name' => $first,
                'last_name' => $last,
                'primary_dorm' => $dorm,
                'skill_level' => $skill,
                'shift' => 'Day',
                'available_start' => '07:00',
                'available_end' => '18:00',
            ]);
        }

        $today = Carbon::today();
        app(HousekeepingTaskGenerationService::class)->sync($today);
        app(HousekeepingAssignmentService::class)->assignForDate($today);

        HkWorkTask::query()->forDate($today->toDateString())->limit(3)->get()->each(function (HkWorkTask $task) {
            $task->update(['status' => 'Completed', 'completed_at' => now()]);
            if ($task->inspection_required) {
                HkInspection::create([
                    'hk_work_task_id' => $task->id,
                    'room_id' => $task->room_id,
                    'inspector_name' => 'Supervisor',
                    'result' => 'Passed',
                    'score' => 92,
                    'reclean_required' => false,
                    'inspected_at' => now(),
                ]);
            }
        });

        $schedule = app(HousekeepingScheduleIntegrationService::class);
        $schedule->seedDemoFeeds();
        app(HousekeepingForecastService::class)->build($today, 7);
        $schedule->applyToForecasts($today, 7);
        $summary = app(HousekeepingPlanningEngine::class)->summarize($today);
        app(HousekeepingAdvisorService::class)->sync($summary);
    }
}
