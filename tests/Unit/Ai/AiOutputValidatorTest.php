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

        foreach (['set_scorecard_grade', 'calculate_payroll', 'send_formal_notice', 'publish_schedule'] as $action) {
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
}
