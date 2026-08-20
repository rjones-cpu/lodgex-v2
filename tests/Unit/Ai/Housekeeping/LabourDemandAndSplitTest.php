<?php

namespace Tests\Unit\Ai\Housekeeping;

use App\Enums\RoomStatus;
use App\Models\HkWorkloadRule;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\RoomInventoryLocation;
use App\Models\User;
use App\Models\Worker;
use App\Services\Ai\Housekeeping\ForecastExecutableSplitter;
use App\Services\Ai\Housekeeping\LabourDemandCalculator;
use App\Services\Ai\HousekeepingLabourTrainingStandard;
use App\Services\HousekeepingPlanning\HousekeepingStandardsService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LabourDemandAndSplitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-08-20');
    }

    public function test_required_workers_is_max_of_six_constraints_not_daily_average(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $this->actingAs($user);
        $rules = app(HousekeepingStandardsService::class)->rules();
        $rules->update([
            'max_rooms_per_day' => 10,
            'max_checkouts_per_day' => 2,
            'max_points_per_day' => 5,
            'productive_minutes' => 480,
        ]);
        $rules->refresh();

        $totals = [
            'rooms' => 8,
            'check_outs' => 8,
            'points' => 16.0,
            'minutes' => 240,
        ];

        $rows = collect(array_fill(0, 8, [
            'dorm' => 'A',
            'pool' => 'attendant',
            'task_type' => 'checkout_clean',
            'priority' => 'High',
            'points' => 2.0,
            'estimated_minutes' => 30,
        ]));

        $result = app(LabourDemandCalculator::class)->requiredWorkers(
            $totals,
            $rows,
            $rules,
            ['attendant' => 10, 'inspection' => 1, 'laundry' => 0, 'public_area' => 0, 'special_work' => 0],
        );

        $this->assertSame(4, $result['constraints']['check_outs']);
        $this->assertSame(4, $result['constraints']['points']);
        $this->assertSame(1, $result['constraints']['minutes']);
        $this->assertSame(1, $result['constraints']['rooms']);
        $this->assertSame(4, $result['required']);
        $this->assertContains($result['binding'], ['check_outs', 'points']);
        $this->assertNotEquals(
            (int) round(array_sum($result['constraints']) / 6),
            $result['required'],
            'Required workers must not be a daily average of the six constraints.',
        );
    }

    public function test_checkout_to_ready_windows_are_not_a_daily_average(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $this->actingAs($user);
        $rules = app(HousekeepingStandardsService::class)->rules();
        $rules->update([
            'max_checkouts_per_day' => 2,
            'max_points_per_day' => 36,
            'max_rooms_per_day' => 29,
            'productive_minutes' => 480,
        ]);
        $rules->refresh();

        $rows = collect([
            $this->checkoutRow('08:30'),
            $this->checkoutRow('09:00'),
            $this->checkoutRow('12:00'),
            $this->checkoutRow('15:00'),
        ]);

        $windows = app(LabourDemandCalculator::class)->windowDemand(
            $rows,
            $rules,
            ['attendant' => 10, 'inspection' => 0, 'laundry' => 0, 'public_area' => 0, 'special_work' => 0],
        );

        $this->assertCount(3, $windows);
        $windowRequired = array_column($windows, 'required_workers');
        $this->assertSame(0, min($windowRequired));
        $this->assertGreaterThan(0, max($windowRequired));
    }

    public function test_due_out_not_vacant_is_forecast_only_and_executable_blocked(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $this->actingAs($user);
        $room = $this->makeRoom($user, ['status' => RoomStatus::Occupied->value, 'number' => '201']);
        $worker = Worker::create(['name' => 'Due Out Guest', 'company' => 'Acme']);
        $reservation = Reservation::create([
            'user_id' => $user->id,
            'worker_id' => $worker->id,
            'room_id' => $room->id,
            'company' => 'Acme',
            'arrival_date' => '2026-08-18',
            'departure_date' => '2026-08-20',
            'status' => 'Check-In',
            'approval_status' => 'Approved',
        ]);
        $room->update(['current_worker_id' => $worker->id]);
        $room->refresh()->load('reservations');

        $row = app(ForecastExecutableSplitter::class)->classify($room, Carbon::today(), $reservation);

        $this->assertTrue($row['forecast_turnover']);
        $this->assertFalse($row['executable']);
        $this->assertFalse($row['vacant']);
        $this->assertFalse($row['ready']);
        $this->assertStringContainsString('Due Out is not vacant', (string) $row['blocked_reason']);
        $this->assertSame(RoomStatus::Occupied->value, $room->fresh()->status);
    }

    public function test_no_sleep_and_unused_walk_down_do_not_invent_ready(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $this->actingAs($user);
        $room = $this->makeRoom($user, ['status' => RoomStatus::Occupied->value, 'number' => '202']);
        $worker = Worker::create(['name' => 'No Sleep Guest', 'company' => 'Acme']);
        $reservation = Reservation::create([
            'user_id' => $user->id,
            'worker_id' => $worker->id,
            'room_id' => $room->id,
            'company' => 'Acme',
            'arrival_date' => '2026-08-18',
            'departure_date' => '2026-08-22',
            'status' => 'No-Sleep',
            'approval_status' => 'Approved',
        ]);
        $room->refresh()->load('reservations');

        $splitter = app(ForecastExecutableSplitter::class);
        $row = $splitter->classify($room, Carbon::today(), null, null);
        $this->assertTrue($row['no_sleep']);
        $this->assertFalse($row['executable']);
        $this->assertFalse($row['ready']);
        $this->assertSame(RoomStatus::Occupied->value, $room->fresh()->status);

        $walked = $splitter->applyUnusedWalkDown($row);
        $this->assertFalse($walked['ready']);
        $this->assertFalse($walked['invented_ready']);
        $this->assertFalse($walked['executable']);
        $this->assertStringContainsString('walk-down', strtolower($walked['blocked_reason']));
    }

    public function test_training_child_agent_is_not_a_module_id(): void
    {
        $this->assertSame('SL-HK-LAB-FORECAST', HousekeepingLabourTrainingStandard::TRAINING_CHILD_AGENT);
        $this->assertArrayNotHasKey('SL-HK-LAB-FORECAST', config('ai.capabilities'));
        $this->assertArrayHasKey('SL-04', config('ai.capabilities'));
        $this->assertArrayHasKey('SL-11', config('ai.capabilities'));
        $this->assertFalse(HousekeepingLabourTrainingStandard::autoPublishAuthorized('housekeeping_workload'));
        $this->assertFalse(HousekeepingLabourTrainingStandard::autoPublishAuthorized('labour_forecast'));
    }

    public function test_limits_come_from_active_rule_profile_not_hardcoded_only_truth(): void
    {
        $user = User::factory()->create(['camp_id' => 1]);
        $this->actingAs($user);

        $default = app(HousekeepingStandardsService::class)->rules();
        $this->assertSame(29, (int) $default->max_rooms_per_day);

        HkWorkloadRule::query()->update(['is_active' => false]);
        $custom = HkWorkloadRule::create([
            'name' => 'Site B',
            'max_shift_hours' => 8,
            'max_rooms_per_day' => 12,
            'max_checkouts_per_day' => 4,
            'max_points_per_day' => 18,
            'productive_minutes' => 420,
            'is_active' => true,
        ]);

        $active = app(HousekeepingStandardsService::class)->rules();
        $this->assertSame($custom->id, $active->id);
        $this->assertSame(12, (int) $active->max_rooms_per_day);
        $this->assertNotSame(
            HousekeepingLabourTrainingStandard::baselineExamples()['max_rooms_per_day'],
            (int) $active->max_rooms_per_day,
        );
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function makeRoom(User $user, array $attributes = []): Room
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

        return Room::create(array_merge([
            'number' => '100',
            'dorm' => $location->name,
            'room_inventory_location_id' => $location->id,
            'room_type' => 'Executive',
            'status' => RoomStatus::VacantDirty->value,
            'is_active' => true,
            'user_id' => $user->id,
        ], $attributes));
    }

    /**
     * @return array<string, mixed>
     */
    private function checkoutRow(string $ignoredTime): array
    {
        return [
            'dorm' => 'A',
            'pool' => 'attendant',
            'task_type' => 'checkout_clean',
            'priority' => 'High',
            'points' => 2.0,
            'estimated_minutes' => 30,
            'required_by' => $ignoredTime,
        ];
    }
}
