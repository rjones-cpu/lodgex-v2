<?php

namespace Tests\Feature\RoomUtilization;

use App\Models\UtilizationApprovalRequest;
use App\Models\UtilizationAuditLog;
use Carbon\Carbon;
use Database\Seeders\RoomUtilizationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UtilizationApprovalWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2025-05-20');
    }

    public function test_index_seeds_pending_approvals_when_empty(): void
    {
        $this->seed(RoomUtilizationSeeder::class);
        $user = \App\Models\User::factory()->create();

        $this->actingAs($user)->get(route('room-utilization'))->assertOk();

        $this->assertGreaterThan(0, UtilizationApprovalRequest::pending()->count());
    }

    public function test_submit_release_list_creates_approval_and_audit(): void
    {
        $this->seed(RoomUtilizationSeeder::class);
        $user = \App\Models\User::factory()->create();

        $this->actingAs($user)
            ->post(route('room-utilization.approvals.release-list'))
            ->assertRedirect();

        $this->assertDatabaseHas('utilization_approval_requests', [
            'type' => 'room_release',
            'status' => 'Pending',
        ]);
        $this->assertDatabaseHas('utilization_audit_logs', [
            'subject_type' => 'approval_request',
            'action' => 'submitted',
        ]);
    }

    public function test_approve_and_reject_update_status_and_audit(): void
    {
        $this->seed(RoomUtilizationSeeder::class);
        $user = \App\Models\User::factory()->create();

        $this->actingAs($user)->get(route('room-utilization'));

        $pending = UtilizationApprovalRequest::pending()->get();
        $this->assertGreaterThanOrEqual(2, $pending->count());

        $this->actingAs($user)
            ->post(route('room-utilization.approvals.approve', $pending[0]))
            ->assertRedirect();

        $this->actingAs($user)
            ->post(route('room-utilization.approvals.reject', $pending[1]))
            ->assertRedirect();

        $this->assertSame('Approved', $pending[0]->fresh()->status);
        $this->assertSame('Rejected', $pending[1]->fresh()->status);
        $this->assertGreaterThan(0, UtilizationAuditLog::where('action', 'approved')->count());
        $this->assertGreaterThan(0, UtilizationAuditLog::where('action', 'rejected')->count());
    }

    public function test_daily_report_returns_flash_payload(): void
    {
        $this->seed(RoomUtilizationSeeder::class);
        $user = \App\Models\User::factory()->create();

        $response = $this->actingAs($user)
            ->post(route('room-utilization.report.daily'));

        $response->assertRedirect();
        $response->assertSessionHas('dailyReport.title');
        $this->assertDatabaseHas('utilization_audit_logs', [
            'subject_type' => 'daily_report',
            'action' => 'generated',
        ]);
    }

    public function test_room_utilization_page_includes_pending_approvals(): void
    {
        $this->seed(RoomUtilizationSeeder::class);
        $user = \App\Models\User::factory()->create();

        $this->actingAs($user)
            ->get(route('room-utilization'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('RoomUtilizationManager')
                ->has('pendingApprovals.0.id')
                ->has('pendingApprovals.0.type')
            );
    }

    public function test_index_does_not_duplicate_approval_after_prior_decisions(): void
    {
        $this->seed(RoomUtilizationSeeder::class);
        $user = \App\Models\User::factory()->create();

        $this->actingAs($user)->get(route('room-utilization'))->assertOk();

        $pending = UtilizationApprovalRequest::pending()->get();
        $this->assertGreaterThan(0, $pending->count());

        foreach ($pending as $approval) {
            $this->actingAs($user)
                ->post(route('room-utilization.approvals.approve', $approval))
                ->assertRedirect();
        }

        $this->assertSame(0, UtilizationApprovalRequest::pending()->count());

        $this->actingAs($user)->get(route('room-utilization'))->assertOk();

        $this->assertSame(0, UtilizationApprovalRequest::pending()->count());
    }
}
