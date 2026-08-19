<?php

namespace Tests\Feature\Workforce;

use App\Models\User;
use App\Services\AccommodationWorkforce\CampWorkforceInventoryService;
use App\Services\AccommodationWorkforce\WorkforceReservationSyncService;
use App\Services\AccommodationWorkforce\WorkforceScheduleService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class WorkforceScheduleTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('camp_id')->nullable();
            $table->unsignedBigInteger('project_id')->nullable();
        });

        $this->createSharedScheduleSchema();
        $this->seedScheduleLookups();

        $this->user = User::factory()->create();
        $this->user->forceFill(['camp_id' => 28, 'project_id' => 14])->save();

        $this->mock(WorkforceReservationSyncService::class)
            ->shouldReceive('syncForUser')
            ->andReturn(1);

        $inventory = $this->mock(CampWorkforceInventoryService::class);
        $inventory->shouldReceive('options')->byDefault()->andReturn([
            'location' => ['id' => 28, 'name' => 'Mt Bracey Lodge'],
            'shifts' => [['id' => 1, 'name' => 'Night']],
            'roomTypes' => [['id' => 2, 'name' => 'Executive']],
            'dorms' => [['id' => 10, 'name' => 'A', 'availableCount' => 1]],
        ]);
        $inventory->shouldReceive('rooms')->byDefault()->andReturn([
            ['id' => 101, 'label' => '101'],
        ]);
        $inventory->shouldReceive('assertRoomAvailable')->byDefault()->andReturn('A');
    }

    public function test_schedule_requires_authentication(): void
    {
        $this->get(route('workforce.schedule'))->assertRedirect(route('login'));
        $this->post(route('workforce.schedule.store'))->assertRedirect(route('login'));
    }

    public function test_schedule_page_renders_dashboard_and_local_form_options(): void
    {
        $this->actingAs($this->user)
            ->get(route('workforce.schedule'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Workforce/Schedule')
                ->has('lastUpdated')
                ->where('availability.available', true)
                ->has('scheduleOptions.companies', 1)
                ->where('scheduleOptions.companies.0.name', 'North Horizon')
                ->has('scheduleOptions.positions', 1)
                ->has('scheduleOptions.provinces', 1)
                ->has('scheduleOptions.roomTypes', 1)
                ->has('scheduleOptions.shifts', 1)
                ->where('scheduleOptions.location.name', 'Mt Bracey Lodge')
                ->where('scheduleOptions.dorms.0.availableCount', 1)
                ->has('schedules', 0)
            );
    }

    public function test_schedule_rooms_endpoint_returns_available_rooms(): void
    {
        $this->actingAs($this->user)
            ->getJson(route('workforce.schedule.rooms', ['dorm_id' => 10]))
            ->assertOk()
            ->assertJsonPath('rooms.0.id', 101)
            ->assertJsonPath('rooms.0.label', '101');
    }

    public function test_schedule_creation_validates_required_fields(): void
    {
        $this->actingAs($this->user)
            ->post(route('workforce.schedule.store'), [])
            ->assertSessionHasErrors([
                'first_name',
                'last_name',
                'company_id',
                'dorm_id',
                'room_id',
                'arrival_date',
                'departure_date',
                'project_departure_date',
                'workdays',
            ]);
    }

    public function test_schedule_creation_rejects_an_unavailable_company(): void
    {
        DB::table('user_companies')->insert([
            'id' => 999,
            'user_id' => 999,
            'camp_id' => 29,
            'archive' => 0,
            'is_client' => 'false',
            'name' => 'Other Camp',
        ]);

        $this->actingAs($this->user)
            ->post(route('workforce.schedule.store'), [
                ...$this->validPayload(),
                'company_id' => 999,
            ])
            ->assertSessionHasErrors('schedule');

        $this->assertDatabaseMissing('bookings', ['company_id' => 999]);
    }

    public function test_schedule_creation_rejects_a_non_catering_company(): void
    {
        DB::table('user_companies')->insert([
            'id' => 101,
            'user_id' => $this->user->id,
            'camp_id' => 28,
            'archive' => 0,
            'is_client' => 'false',
            'name' => 'General Contractor',
        ]);

        $this->actingAs($this->user)
            ->post(route('workforce.schedule.store'), [
                ...$this->validPayload(),
                'company_id' => 101,
            ])
            ->assertSessionHasErrors('schedule');

        $this->assertDatabaseMissing('bookings', ['company_id' => 101]);
    }

    public function test_schedule_creation_writes_booking_rotation_and_dates(): void
    {
        $this->actingAs($this->user)
            ->post(route('workforce.schedule.store'), $this->validPayload())
            ->assertRedirect(route('workforce.schedule'))
            ->assertSessionHas('toast');

        $bookingId = (int) DB::table('bookings')->value('id');
        $scheduleId = (int) DB::table('site_schedules')->value('id');

        $this->assertDatabaseHas('bookings', [
            'id' => $bookingId,
            'camp_id' => 28,
            'company_id' => 100,
            'first_name' => 'Alex',
            'last_name' => 'Morgan',
            'position_id' => 6,
            'shift' => 1,
            'dorm_id' => 10,
            'dorm_room' => 'A',
            'room_id' => 101,
            'reservation_status' => 'pending',
        ]);
        $this->assertDatabaseHas('site_schedules', [
            'id' => $scheduleId,
            'reservation_id' => $bookingId,
            'camp_id' => 28,
            'draft_status' => '0',
        ]);
        $this->assertDatabaseHas('site_schedule_dates', [
            'booking_id' => $bookingId,
            'site_schedule_id' => $scheduleId,
            'date' => '2026-08-17',
            'site_schedule_type_id' => 5,
        ]);
        $this->assertDatabaseHas('site_schedule_dates', [
            'booking_id' => $bookingId,
            'site_schedule_id' => $scheduleId,
            'date' => '2026-08-18',
            'site_schedule_type_id' => 11,
        ]);
    }

    public function test_schedule_service_list_is_scoped_to_the_users_camp_and_companies(): void
    {
        $this->actingAs($this->user)
            ->post(route('workforce.schedule.store'), $this->validPayload())
            ->assertRedirect();

        DB::table('bookings')->insert([
            'id' => 500,
            'user_id' => 500,
            'company_id' => 999,
            'camp_id' => 29,
            'booking_code' => 'OTHER-CAMP',
            'first_name' => 'Hidden',
            'last_name' => 'Worker',
            'arrival_date' => '2026-08-17',
            'check_out' => '2026-08-20',
            'reservation_status' => 'pending',
        ]);
        DB::table('site_schedules')->insert([
            'id' => 500,
            'reservation_id' => 500,
            'camp_id' => 29,
            'working_days' => '2',
            'days_off' => '0',
            'first_day_off' => '1969-12-31',
            'work_start_date' => '2026-08-18',
            'work_end_date' => '2026-08-20',
            'status' => '0',
            'archive_it' => 0,
            'draft_status' => '0',
        ]);

        $schedules = app(WorkforceScheduleService::class)->list($this->user);

        $this->assertCount(1, $schedules);
        $this->assertSame('Alex Morgan', $schedules[0]['worker']);
        $this->assertSame(5, $schedules[0]['scheduleData']['2026-08-17']['typeId']);
        $this->assertSame('Travel Day', $schedules[0]['scheduleData']['2026-08-17']['typeName']);
        $this->assertSame(11, $schedules[0]['scheduleData']['2026-08-18']['typeId']);

        DB::table('bookings')
            ->where('id', $schedules[0]['id'])
            ->update(['reservation_status' => 'cancelled']);

        $this->assertSame([], app(WorkforceScheduleService::class)->list($this->user));
    }

    public function test_schedule_page_includes_rows_for_the_list_view(): void
    {
        $this->actingAs($this->user)
            ->post(route('workforce.schedule.store'), $this->validPayload())
            ->assertRedirect();

        $this->get(route('workforce.schedule'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('schedules', 1)
                ->where('schedules.0.worker', 'Alex Morgan')
                ->where('schedules.0.department', 'Kitchen')
                ->where('schedules.0.shift', 'Night')
                ->where('schedules.0.scheduleData.2026-08-17.typeId', 5)
                ->where('schedules.0.scheduleData.2026-08-18.typeName', 'Work Day')
            );
    }

    /**
     * @return array<string, mixed>
     */
    private function validPayload(): array
    {
        return [
            'first_name' => 'Alex',
            'last_name' => 'Morgan',
            'company_id' => 100,
            'province_id' => 1,
            'department' => 'Kitchen',
            'position_id' => 6,
            'shift_id' => 1,
            'room_type_id' => 2,
            'dorm_id' => 10,
            'room_id' => 101,
            'arrival_date' => '2026-08-17',
            'departure_date' => '2026-08-24',
            'project_departure_date' => '2026-08-31',
            'workdays' => [1, 2, 3, 4, 5],
            'notes' => 'Day kitchen rotation.',
        ];
    }

    private function createSharedScheduleSchema(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
        });
        Schema::create('user_companies', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('camp_id')->nullable();
            $table->unsignedTinyInteger('archive')->default(0);
            $table->string('is_client')->nullable();
            $table->string('name');
            $table->string('hierarchy')->nullable();
        });
        Schema::create('positions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('status')->default('0');
        });
        Schema::create('provinces', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('camp_id');
            $table->string('name');
            $table->string('code')->nullable();
            $table->boolean('is_active')->default(true);
        });
        Schema::create('room_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->integer('status')->default(0);
        });
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('camp_id');
            $table->string('shift_name');
            $table->boolean('status')->default(true);
        });
        Schema::create('worker_shifts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
        });
        Schema::create('site_schedule_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('color')->nullable();
        });
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('project_id')->nullable();
            $table->unsignedBigInteger('company_id')->nullable();
            $table->string('is_client_reservation')->nullable();
            $table->unsignedBigInteger('camp_id')->nullable();
            $table->unsignedBigInteger('hotel_id')->nullable();
            $table->string('booking_code');
            $table->unsignedBigInteger('dorm_id')->nullable();
            $table->unsignedBigInteger('room_id')->nullable();
            $table->string('dorm_room')->nullable();
            $table->unsignedBigInteger('position_id')->nullable();
            $table->string('province_id')->nullable();
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->date('arrival_date')->nullable();
            $table->date('check_in')->nullable();
            $table->date('check_out')->nullable();
            $table->unsignedBigInteger('shift')->nullable();
            $table->unsignedBigInteger('room_type')->nullable();
            $table->integer('status')->default(6);
            $table->integer('is_no_show')->default(0);
            $table->text('notes')->nullable();
            $table->string('reservation_status')->nullable();
            $table->string('is_walkin')->nullable();
            $table->boolean('is_onboarded')->default(false);
            $table->boolean('is_changed')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });
        Schema::create('site_schedules', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('reservation_id');
            $table->unsignedBigInteger('camp_id');
            $table->string('working_days');
            $table->unsignedInteger('days_on')->nullable();
            $table->string('days_off');
            $table->string('first_day_off');
            $table->string('work_start_date');
            $table->string('status');
            $table->integer('archive_it')->default(0);
            $table->string('draft_status')->default('0');
            $table->string('travel_day_start_shift')->nullable();
            $table->string('travel_day_back_shift')->nullable();
            $table->string('travel_to_work')->nullable();
            $table->string('travel_out')->nullable();
            $table->string('schedule_type')->nullable();
            $table->boolean('on_hold')->nullable();
            $table->date('work_end_date')->nullable();
            $table->timestamps();
        });
        Schema::create('site_schedule_dates', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('booking_id');
            $table->unsignedBigInteger('camp_id')->nullable();
            $table->unsignedBigInteger('site_schedule_id');
            $table->unsignedBigInteger('site_schedule_type_id');
            $table->boolean('needs_room')->default(false);
            $table->string('previous_type_id')->default('0');
            $table->date('date')->nullable();
            $table->string('status')->nullable();
            $table->integer('archive_it')->default(0);
            $table->string('is_sub_user')->default('0');
            $table->string('is_open_request')->nullable();
            $table->unsignedBigInteger('is_approved')->default(0);
            $table->timestamps();
        });
    }

    private function seedScheduleLookups(): void
    {
        DB::table('roles')->insert(['id' => 1, 'name' => 'Reservation Manager']);
        DB::table('user_companies')->insert([
            'id' => 100,
            'user_id' => 1,
            'camp_id' => 28,
            'archive' => 0,
            'is_client' => 'catering',
            'name' => 'North Horizon',
        ]);
        DB::table('positions')->insert(['id' => 6, 'name' => 'chef', 'status' => '0']);
        DB::table('provinces')->insert([
            'id' => 1,
            'camp_id' => 28,
            'name' => 'Alberta',
            'code' => 'AB',
            'is_active' => 1,
        ]);
        DB::table('room_types')->insert(['id' => 2, 'name' => 'Executive', 'status' => 0]);
        DB::table('shifts')->insert([
            'id' => 1,
            'camp_id' => 28,
            'shift_name' => 'A Shift',
            'status' => 1,
        ]);
        DB::table('worker_shifts')->insert(['id' => 1, 'name' => 'Night']);
        DB::table('site_schedule_types')->insert([
            ['id' => 2, 'name' => 'LOA', 'color' => '#A7CBFF'],
            ['id' => 5, 'name' => 'Travel Day', 'color' => '#FFD600'],
            ['id' => 11, 'name' => 'Work Day', 'color' => '#3C84ED'],
        ]);
    }
}
