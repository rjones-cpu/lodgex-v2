<?php

namespace Tests\Unit\Ai;

use App\Models\User;
use App\Services\Authorization\OvertimeApprovalService;
use App\Services\Scorecard\ScorecardGradeCalculator;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScorecardAndOvertimeTest extends TestCase
{
    use RefreshDatabase;

    public function test_scorecard_grade_is_lowest_component_never_averaged(): void
    {
        $calculator = new ScorecardGradeCalculator;

        $this->assertSame('D', $calculator->grade([
            'safety' => 'B',
            'attendance' => 'D',
            'quality' => 'A',
        ]));

        $this->assertSame('C', $calculator->grade([
            'one' => 'A',
            'two' => 'C',
            'skipped' => null,
            'na' => 'N/A',
        ]));
    }

    public function test_overtime_is_denied_without_lodge_manager(): void
    {
        $user = User::factory()->create();

        $this->assertFalse(app(OvertimeApprovalService::class)->canApprove($user));
        $this->assertFalse($user->can('approve-overtime'));

        $this->expectException(AuthorizationException::class);
        app(OvertimeApprovalService::class)->approve($user, ['shift' => 'demo']);
    }

    public function test_overtime_allows_configured_lodge_manager(): void
    {
        $user = User::factory()->create(['email' => 'lodge.manager@example.test']);
        config()->set('ai.authorization.lodge_manager_emails', ['lodge.manager@example.test']);

        $this->assertTrue(app(OvertimeApprovalService::class)->canApprove($user));
        $this->assertTrue($user->can('approve-overtime'));

        app(OvertimeApprovalService::class)->approve($user, ['shift' => 'demo']);

        $this->assertDatabaseHas('ai_audit_logs', [
            'action' => 'overtime_approved',
            'user_id' => $user->id,
        ]);
    }
}
