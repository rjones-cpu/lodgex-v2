<?php

namespace Tests\Feature\Reports;

use App\Models\Reservation;
use App\Models\User;
use App\Models\Worker;
use Database\Seeders\RoomUtilizationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportsTest extends TestCase
{
    use RefreshDatabase;

    public function test_reports_requires_auth(): void
    {
        $this->get(route('reports'))->assertRedirect(route('login'));
    }

    public function test_reports_index_renders_with_report_types(): void
    {
        $this->seed(RoomUtilizationSeeder::class);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('reports'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Reports')
                ->has('reportTypes', 6)
                ->where('selectedReport', 'charge-sheets')
                ->has('report')
            );
    }

    public function test_reports_can_load_in_house_report(): void
    {
        $this->seed(RoomUtilizationSeeder::class);
        $user = User::factory()->create();

        $worker = Worker::create(['name' => 'Checked In Worker', 'company' => 'Test Co']);
        Reservation::create([
            'worker_id' => $worker->id,
            'company' => 'Test Co',
            'arrival_date' => now()->subDay(),
            'departure_date' => now()->addDays(5),
            'status' => 'Check-In',
            'approval_status' => 'Approved',
            'allotment_status' => 'Allotted',
            'room_type' => 'Single Room',
        ]);

        $this->actingAs($user)
            ->get(route('reports', ['report' => 'in-house']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('selectedReport', 'in-house')
                ->where('report.key', 'in-house')
            );
    }

    public function test_create_report_redirects_to_selected_report(): void
    {
        $this->seed(RoomUtilizationSeeder::class);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('reports.create'), [
                'name' => 'Weekly Arrivals',
                'report' => 'arrivals',
                'date' => '2025-05-22',
            ])
            ->assertRedirect(route('reports', ['report' => 'arrivals', 'date' => '2025-05-22']))
            ->assertSessionHas('toast');
    }
}
