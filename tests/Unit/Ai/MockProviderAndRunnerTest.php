<?php

namespace Tests\Unit\Ai;

use App\Services\Ai\AiProviderRegistry;
use App\Services\Ai\AiRunner;
use App\Services\Ai\Contracts\AiProvider;
use App\Services\Ai\Providers\MockProvider;
use App\Services\Ai\Support\AiCompletionRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MockProviderAndRunnerTest extends TestCase
{
    use RefreshDatabase;

    public function test_testing_environment_uses_mock_provider(): void
    {
        $registry = app(AiProviderRegistry::class);

        $this->assertSame('mock', $registry->defaultDriver());
        $this->assertInstanceOf(MockProvider::class, $registry->driver());
        $this->assertInstanceOf(MockProvider::class, app(AiProvider::class));
    }

    public function test_mock_provider_does_not_need_network(): void
    {
        $result = app(MockProvider::class)->complete(new AiCompletionRequest(
            input: [['role' => 'user', 'content' => 'hello']],
            agent: 'room_inventory_intelligence',
        ));

        $this->assertSame('mock', $result->provider);
        $this->assertSame('grok-4.6', $result->model);
        $this->assertStringContainsString('Shadow recommendation', $result->text);
    }

    public function test_runner_audits_mock_completion(): void
    {
        $result = app(AiRunner::class)->complete(new AiCompletionRequest(
            input: [['role' => 'user', 'content' => 'explain']],
            capabilityId: 'SL-01',
            agent: 'room_inventory_intelligence',
        ));

        $this->assertNotSame('', $result->text);
        $this->assertDatabaseHas('ai_audit_logs', [
            'action' => 'provider_complete',
            'provider' => 'mock',
            'capability_id' => 'SL-01',
        ]);
    }
}
