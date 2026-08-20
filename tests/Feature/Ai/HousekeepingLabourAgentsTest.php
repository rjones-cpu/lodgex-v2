<?php

namespace Tests\Feature\Ai;

use App\Enums\RoomStatus;
use App\Models\HkDailyAssignment;
use App\Models\Housekeeper;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\RoomInventoryLocation;
use App\Models\User;
use App\Models\Worker;
use App\Services\Ai\Agents\HousekeepingLabourProposalApprovalService;
use App\Services\Ai\Agents\HousekeepingWorkloadAgent;
use App\Services\Ai\Agents\LabourForecastAgent;
use App\Services\Ai\AiOutputValidator;
use App\Services\Ai\ForbiddenActions;
use App\Services\Ai\HousekeepingLabourTrainingStandard;
use App\Services\Ai\LangSmithTracer;
use App\Services\HousekeepingPlanning\HousekeepingStandardsService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class HousekeepingLabourAgentsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-08-20');
    }

    public function test_workload_draft_does_not_publish_board_or_invent_ready(): void
    {
        $user = $this->actingAsCampOperator();
        $this->seedHousekeepers($user);
        $occupied = $this->makeRoom($user, ['number' => '301', 'status' => RoomStatus::Occupied->value]);
        $dirty = $this->makeRoom($user, ['number' => '302', 'status' => RoomStatus::VacantDirty->value]);
        $worker = Worker::create(['name' => 'Pat Due', 'company' => 'Acme']);
        Reservation::create([
            'user_id' => $user->id,
            'worker_id' => $worker->id,
            'room_id' => $occupied->id,
            'company' => 'Acme',
            'arrival_date' => '2026-08-18',
            'departure_date' => '2026-08-20',
            'status' => 'Check-In',
            'approval_status' => 'Approved',
        ]);
        $occupied->update(['current_worker_id' => $worker->id]);

        $beforeAssignments = HkDailyAssignment::query()->count();
        $result = app(HousekeepingWorkloadAgent::class)->draftForDate(Carbon::today(), $user);
        $draft = $result['draft'];

        $this->assertSame(HousekeepingWorkloadAgent::AGENT, $result['proposal']->agent);
        $this->assertSame('SL-04', $result['proposal']->capability_id);
        $this->assertSame('draft_clean_list', $result['proposal']->action);
        $this->assertSame('approval required', $result['proposal']->payload['decision']);
        $this->assertFalse($draft['auto_publish']);
        $this->assertFalse($draft['published_board']);
        $this->assertSame($beforeAssignments, HkDailyAssignment::query()->count());
        $this->assertSame(RoomStatus::Occupied->value, $occupied->fresh()->status);
        $this->assertSame(RoomStatus::VacantDirty->value, $dirty->fresh()->status);

        $forecastIds = collect($draft['forecast_tasks'])->pluck('room_id');
        $executableIds = collect($draft['executable_tasks'])->pluck('room_id');
        $this->assertTrue($forecastIds->contains($occupied->id));
        $this->assertFalse($executableIds->contains($occupied->id));
        $this->assertTrue($executableIds->contains($dirty->id));
    }

    public function test_limits_on_draft_follow_rule_profile(): void
    {
        $user = $this->actingAsCampOperator();
        $rules = app(HousekeepingStandardsService::class)->rules();
        $rules->update(['max_rooms_per_day' => 3, 'max_checkouts_per_day' => 1, 'max_points_per_day' => 4]);

        $this->makeRoom($user, ['number' => '401', 'status' => RoomStatus::VacantDirty->value]);
        $this->makeRoom($user, ['number' => '402', 'status' => RoomStatus::VacantDirty->value]);

        $draft = app(HousekeepingWorkloadAgent::class)->draftForDate(Carbon::today(), $user)['draft'];

        $this->assertSame(3, $draft['versus_limits']['rooms']['limit']);
        $this->assertSame(1, $draft['versus_limits']['check_outs']['limit']);
        $this->assertSame(4.0, (float) $draft['versus_limits']['points']['limit']);
        $this->assertNotSame(29, $draft['versus_limits']['rooms']['limit']);
    }

    public function test_labour_forecast_has_horizons_pools_and_windows(): void
    {
        $user = $this->actingAsCampOperator();
        $this->seedHousekeepers($user);
        $this->makeRoom($user, ['number' => '501', 'status' => RoomStatus::VacantDirty->value]);

        $result = app(LabourForecastAgent::class)->forecastFrom(Carbon::today(), $user);
        $forecast = $result['forecast'];

        $this->assertSame(LabourForecastAgent::AGENT, $result['proposal']->agent);
        $this->assertSame('SL-11', $result['proposal']->capability_id);
        $this->assertSame('labour_forecast', $result['proposal']->action);
        foreach (HousekeepingLabourTrainingStandard::HORIZONS as $horizon) {
            $this->assertArrayHasKey($horizon, $forecast['horizons']);
        }
        foreach (HousekeepingLabourTrainingStandard::STAFFING_POOLS as $pool) {
            $this->assertArrayHasKey($pool, $forecast['today']['pools']);
        }
        $this->assertNotEmpty($forecast['today']['windows']);
        $this->assertTrue($forecast['today']['daily_average_insufficient']);
        $this->assertFalse($forecast['overtime_authorized']);
        $this->assertFalse($forecast['roster_published']);
        $this->assertContains($forecast['today']['binding_constraint'], HousekeepingLabourTrainingStandard::REQUIRED_WORKER_CONSTRAINTS);
    }

    public function test_human_approve_does_not_publish_or_write_status(): void
    {
        $user = $this->actingAsCampOperator();
        $room = $this->makeRoom($user, ['number' => '601', 'status' => RoomStatus::VacantDirty->value]);
        $result = app(HousekeepingWorkloadAgent::class)->draftForDate(Carbon::today(), $user);

        $this->post(route('ai.proposals.approve', $result['proposal']))
            ->assertRedirect()
            ->assertSessionHas('toast');

        $this->assertSame('Approved', $result['proposal']->fresh()->status);
        $this->assertSame(RoomStatus::VacantDirty->value, $room->fresh()->status);
        $this->assertSame(0, HkDailyAssignment::query()->count());
    }

    public function test_overtime_and_publish_board_are_refused(): void
    {
        $user = $this->actingAsCampOperator();
        $workload = app(HousekeepingWorkloadAgent::class);
        $labour = app(LabourForecastAgent::class);
        $approvals = app(HousekeepingLabourProposalApprovalService::class);

        try {
            $workload->refusePublishBoard();
            $this->fail('Expected publish board to be refused.');
        } catch (ValidationException) {
            $this->assertTrue(true);
        }

        try {
            $workload->refuseOvertime();
            $this->fail('Expected overtime to be refused.');
        } catch (ValidationException) {
            $this->assertTrue(true);
        }

        try {
            $labour->refuseOvertime($user);
            $this->fail('Expected labour overtime to be refused.');
        } catch (ValidationException) {
            $this->assertTrue(true);
        }

        $this->makeRoom($user, ['number' => '701', 'status' => RoomStatus::VacantDirty->value]);
        $proposal = $workload->draftForDate(Carbon::today(), $user)['proposal'];

        try {
            $approvals->refusePublishBoard($proposal);
            $this->fail('Expected approval service to refuse publish.');
        } catch (ValidationException) {
            $this->assertTrue(true);
        }

        try {
            $approvals->refuseOvertime($proposal);
            $this->fail('Expected approval service to refuse overtime.');
        } catch (ValidationException) {
            $this->assertTrue(true);
        }

        $this->assertTrue(ForbiddenActions::isBlocked('publish_hk_board'));
        $this->assertTrue(ForbiddenActions::isBlocked('approve_overtime'));
        $this->assertTrue(ForbiddenActions::isBlocked('mark_ready'));
        $this->assertTrue(ForbiddenActions::isAllowedProposal('draft_clean_list'));
        $this->assertTrue(ForbiddenActions::isAllowedProposal('labour_forecast'));

        $this->expectException(ValidationException::class);
        app(AiOutputValidator::class)->validateProposalPayload([
            'action' => 'publish_hk_board',
        ]);
    }

    public function test_feature_flag_off_skips_generation(): void
    {
        config()->set('ai.mode', 'off');
        $user = $this->actingAsCampOperator();

        $this->expectException(ValidationException::class);
        app(HousekeepingWorkloadAgent::class)->draftForDate(Carbon::today(), $user);
    }

    public function test_langsmith_projects_are_named_per_agent(): void
    {
        $tracer = app(LangSmithTracer::class);

        $this->assertSame('lodgex-housekeeping-workload', $tracer->projectFor('housekeeping_workload'));
        $this->assertSame('lodgex-labour-forecast', $tracer->projectFor('labour_forecast'));
        $this->assertSame('lodgex-room-inventory-intelligence', $tracer->projectFor('room_inventory_intelligence'));
        $this->assertFalse($tracer->enabled());
    }

    public function test_planning_page_includes_shadow_panel_payload(): void
    {
        $this->actingAsCampOperator();
        $this->seedHousekeepingPlanningDemo();

        $this->get(route('housekeeping-planning'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('HousekeepingPlanningManager')
                ->has('housekeepingWorkloadAi.flags')
                ->has('labourForecastAi.flags')
                ->where('housekeepingWorkloadAi.flags.capabilities.0', 'SL-04')
                ->where('labourForecastAi.flags.capabilities.0', 'SL-11')
                ->where('housekeepingWorkloadAi.flags.class', 'P')
            );
    }

    public function test_system_instruction_32_1_is_bound(): void
    {
        $this->assertStringContainsString('SL-04', HousekeepingLabourTrainingStandard::SYSTEM_INSTRUCTION_32_1);
        $this->assertStringContainsString('SL-11', HousekeepingLabourTrainingStandard::SYSTEM_INSTRUCTION_32_1);
        $this->assertStringContainsString('SL-HK-LAB-FORECAST', HousekeepingLabourTrainingStandard::SYSTEM_INSTRUCTION_32_1);
        $this->assertStringContainsString('not a LodgeX module ID', HousekeepingLabourTrainingStandard::SYSTEM_INSTRUCTION_32_1);
        $this->assertStringContainsString('Level 1A', HousekeepingLabourTrainingStandard::SYSTEM_INSTRUCTION_32_1);
    }

    private function seedHousekeepers(User $user): void
    {
        Housekeeper::create([
            'user_id' => $user->id,
            'first_name' => 'Ada',
            'last_name' => 'Attendant',
            'role' => 'Housekeeper',
            'skill_level' => 'Standard',
            'is_active' => true,
        ]);
        Housekeeper::create([
            'user_id' => $user->id,
            'first_name' => 'Ian',
            'last_name' => 'Inspector',
            'role' => 'Inspector',
            'skill_level' => 'Senior',
            'is_active' => true,
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function makeRoom(User $user, array $attributes = []): Room
    {
        $location = RoomInventoryLocation::query()->first() ?? RoomInventoryLocation::query()->create([
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
}
