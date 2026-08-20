<?php

namespace Tests\Unit\Ai;

use App\Services\Ai\AiOutputValidator;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class AiOutputValidatorTest extends TestCase
{
    public function test_allows_recommend_room(): void
    {
        $payload = app(AiOutputValidator::class)->validateProposalPayload([
            'action' => 'recommend_room',
            'reservation_id' => 1,
            'room_id' => 2,
        ]);

        $this->assertSame('recommend_room', $payload['action']);
    }

    public function test_blocks_assign_room(): void
    {
        $this->expectException(ValidationException::class);

        app(AiOutputValidator::class)->validateProposalPayload([
            'action' => 'assign_room',
            'room_id' => 2,
        ]);
    }

    public function test_blocks_scorecard_and_payroll_actions(): void
    {
        $validator = app(AiOutputValidator::class);

        foreach (['set_scorecard_grade', 'calculate_payroll', 'send_formal_notice', 'publish_schedule', 'hold_room', 'check_in', 'write_occupancy', 'overbook', 'release_on_no_sleep', 'displace_confirmed_resident', 'bypass_life_safety', 'mark_no_show', 'in_house_move', 'auto_assign'] as $action) {
            try {
                $validator->validateProposalPayload(['action' => $action]);
                $this->fail("Expected {$action} to be blocked.");
            } catch (ValidationException) {
                $this->assertTrue(true);
            }
        }
    }

    public function test_blocks_auto_execute_flag(): void
    {
        $this->expectException(ValidationException::class);

        app(AiOutputValidator::class)->validateProposalPayload([
            'action' => 'recommend_room',
            'auto_execute' => true,
        ]);
    }

    public function test_allows_official_models_only(): void
    {
        $validator = app(AiOutputValidator::class);
        $validator->assertModelAllowed('grok-4.6');
        $validator->assertModelAllowed('grok-4.20-multi-agent');

        $this->expectException(ValidationException::class);
        $validator->assertModelAllowed('gpt-5');
    }

    public function test_blocks_execute_decision(): void
    {
        $this->expectException(ValidationException::class);

        app(AiOutputValidator::class)->validateProposalPayload([
            'action' => 'recommend_room',
            'decision' => 'execute',
        ]);
    }

    public function test_allows_wave_one_read_actions(): void
    {
        $validator = app(AiOutputValidator::class);

        foreach (['explain', 'validate', 'draft_for_review', 'monitor', 'flag_risk'] as $action) {
            $payload = $validator->validateProposalPayload(['action' => $action]);
            $this->assertSame($action, $payload['action']);
        }
    }
}
