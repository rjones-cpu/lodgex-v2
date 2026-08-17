<?php

namespace Tests\Unit\Ai;

use App\Services\Ai\Providers\XaiProvider;
use App\Services\Ai\Support\AiCompletionRequest;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class XaiProviderTest extends TestCase
{
    public function test_posts_to_responses_api_and_parses_output_text(): void
    {
        config()->set('ai.xai.api_key', 'test-key-not-real');
        config()->set('ai.xai.base_url', 'https://api.x.ai/v1');

        Http::fake([
            'https://api.x.ai/v1/responses' => Http::response([
                'id' => 'resp_test',
                'model' => 'grok-4.6',
                'output_text' => 'Proposed room only.',
            ], 200),
        ]);

        $result = app(XaiProvider::class)->complete(new AiCompletionRequest(
            input: [
                ['role' => 'system', 'content' => 'Recommend only.'],
                ['role' => 'user', 'content' => 'Suggest a room.'],
            ],
            model: 'grok-4.6',
        ));

        $this->assertSame('Proposed room only.', $result->text);
        $this->assertSame('xai', $result->provider);
        $this->assertSame('resp_test', $result->providerResponseId);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://api.x.ai/v1/responses'
                && $request->hasHeader('Authorization', 'Bearer test-key-not-real')
                && $request['model'] === 'grok-4.6'
                && $request['store'] === false
                && $request['input'][1]['content'] === 'Suggest a room.';
        });
    }
}
