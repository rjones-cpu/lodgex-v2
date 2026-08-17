<?php

namespace App\Services\Ai\Providers;

use App\Services\Ai\Contracts\AiProvider;
use App\Services\Ai\Support\AiCompletionRequest;
use App\Services\Ai\Support\AiCompletionResult;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class XaiProvider implements AiProvider
{
    public function name(): string
    {
        return 'xai';
    }

    public function complete(AiCompletionRequest $request): AiCompletionResult
    {
        $apiKey = (string) config('ai.xai.api_key');
        if ($apiKey === '') {
            throw new RuntimeException('XAI_API_KEY is not configured.');
        }

        $model = $request->model ?? (string) config('ai.default_model', 'grok-4.6');
        $base = rtrim((string) config('ai.xai.base_url', 'https://api.x.ai/v1'), '/');
        $timeout = (int) config('ai.xai.timeout', 120);

        $payload = [
            'model' => $model,
            'input' => $request->input(),
            'store' => (bool) config('ai.xai.store', false),
        ];

        if ($request->maxOutputTokens !== null) {
            $payload['max_output_tokens'] = $request->maxOutputTokens;
        }

        try {
            $response = Http::withToken($apiKey)
                ->acceptJson()
                ->timeout($timeout)
                ->asJson()
                ->post($base.'/responses', $payload)
                ->throw();
        } catch (RequestException $exception) {
            throw new RuntimeException('xAI Responses API request failed: '.$exception->getMessage(), 0, $exception);
        }

        /** @var array<string, mixed> $json */
        $json = $response->json() ?? [];
        $text = $this->extractText($json);

        return new AiCompletionResult(
            text: $text,
            provider: $this->name(),
            model: (string) ($json['model'] ?? $model),
            providerResponseId: isset($json['id']) ? (string) $json['id'] : null,
            raw: [
                'id' => $json['id'] ?? null,
                'status' => $json['status'] ?? null,
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $json
     */
    private function extractText(array $json): string
    {
        if (isset($json['output_text']) && is_string($json['output_text']) && $json['output_text'] !== '') {
            return $json['output_text'];
        }

        $chunks = [];
        foreach ($json['output'] ?? [] as $item) {
            if (! is_array($item)) {
                continue;
            }

            foreach ($item['content'] ?? [] as $content) {
                if (! is_array($content)) {
                    continue;
                }

                $type = $content['type'] ?? '';
                if (in_array($type, ['output_text', 'text'], true) && isset($content['text'])) {
                    $chunks[] = (string) $content['text'];
                }
            }
        }

        return trim(implode("\n", $chunks));
    }
}
