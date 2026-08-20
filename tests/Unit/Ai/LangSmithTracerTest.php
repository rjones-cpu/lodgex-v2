<?php

namespace Tests\Unit\Ai;

use App\Services\Ai\AiRunner;
use App\Services\Ai\LangSmithTracer;
use App\Services\Ai\Support\AiCompletionRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class LangSmithTracerTest extends TestCase
{
    use RefreshDatabase;

    public function test_skips_tracing_when_api_key_missing(): void
    {
        config()->set('ai.langsmith.api_key', '');
        Http::fake();

        $result = app(AiRunner::class)->complete(new AiCompletionRequest(
            input: [['role' => 'user', 'content' => 'trace me']],
            capabilityId: 'SL-02',
            agent: 'room_inventory_intelligence',
        ));

        $this->assertNotSame('', $result->text);
        Http::assertNothingSent();
        $this->assertFalse(app(LangSmithTracer::class)->enabled());
        $this->assertSame(
            'lodgex-room-inventory-intelligence',
            app(LangSmithTracer::class)->projectFor('room_inventory_intelligence'),
        );
    }

    public function test_posts_provider_neutral_run_when_key_is_set(): void
    {
        config()->set('ai.langsmith.api_key', 'ls-test-key');
        config()->set('ai.langsmith.endpoint', 'https://api.smith.langchain.com');
        config()->set('ai.langsmith.enabled', true);

        Http::fake([
            'https://api.smith.langchain.com/runs' => Http::response(['ok' => true], 200),
            'https://api.smith.langchain.com/runs/*' => Http::response(['ok' => true], 200),
        ]);

        $result = app(AiRunner::class)->complete(new AiCompletionRequest(
            input: [['role' => 'user', 'content' => 'explain a room']],
            capabilityId: 'SL-02',
            agent: 'room_inventory_intelligence',
        ));

        $this->assertSame('mock', $result->provider);
        Http::assertSent(function ($request) {
            return $request->url() === 'https://api.smith.langchain.com/runs'
                && $request->method() === 'POST'
                && $request->hasHeader('x-api-key', 'ls-test-key')
                && $request['session_name'] === 'lodgex-room-inventory-intelligence'
                && $request['run_type'] === 'llm'
                && $request['name'] === 'room_inventory_intelligence.complete';
        });
    }
}
