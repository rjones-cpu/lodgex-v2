<?php

namespace App\Services\Ai;

use App\Services\Ai\Support\AiCompletionRequest;
use App\Services\Ai\Support\AiCompletionResult;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Throwable;

/**
 * Optional LangSmith HTTP tracer. Provider-neutral — wraps AiRunner, not xAI.
 * If LANGSMITH_API_KEY (or LANGCHAIN_API_KEY) is missing, tracing is skipped.
 */
class LangSmithTracer
{
    public function enabled(): bool
    {
        if (! (bool) config('ai.langsmith.enabled', true)) {
            return false;
        }

        return $this->apiKey() !== '';
    }

    public function projectFor(?string $agent): string
    {
        if ($agent !== null) {
            $override = config("ai.agents.{$agent}.langsmith_project");
            if (is_string($override) && $override !== '') {
                return $override;
            }
        }

        return (string) config('ai.langsmith.project', 'lodgex-room-inventory-intelligence');
    }

    /**
     * @param  callable(): AiCompletionResult  $run
     */
    public function trace(AiCompletionRequest $request, callable $run): AiCompletionResult
    {
        if (! $this->enabled()) {
            return $run();
        }

        $id = (string) Str::uuid();
        $started = now()->utc()->toIso8601String();
        $this->safe(fn () => $this->createRun($id, $request, $started));

        try {
            $result = $run();
            $this->safe(fn () => $this->completeRun($id, $result, null));

            return $result;
        } catch (Throwable $exception) {
            $this->safe(fn () => $this->completeRun($id, null, $exception));

            throw $exception;
        }
    }

    private function createRun(string $id, AiCompletionRequest $request, string $startedAt): void
    {
        $payload = [
            'id' => $id,
            'name' => $request->agent ? $request->agent.'.complete' : 'AiRunner.complete',
            'run_type' => 'llm',
            'inputs' => [
                'messages' => $this->redactMessages($request->input()),
                'capability_id' => $request->capabilityId,
                'agent' => $request->agent,
            ],
            'start_time' => $startedAt,
            'session_name' => $this->projectFor($request->agent),
            'extra' => [
                'metadata' => [
                    'ls_provider' => 'lodgex-ai-runner',
                    'ls_model_name' => $request->model ?? (string) config('ai.default_model', 'grok-4.6'),
                    'capability_id' => $request->capabilityId,
                    'agent' => $request->agent,
                ],
            ],
            'tags' => array_values(array_filter([
                $request->agent,
                $request->capabilityId,
                'wave-1',
            ])),
        ];

        $this->client()->post($this->endpoint().'/runs', $payload)->throw();
    }

    private function completeRun(string $id, ?AiCompletionResult $result, ?Throwable $error): void
    {
        $payload = [
            'end_time' => now()->utc()->toIso8601String(),
        ];

        if ($error !== null) {
            $payload['error'] = $error->getMessage();
        } else {
            $payload['outputs'] = [
                'text' => $result?->text,
                'provider' => $result?->provider,
                'model' => $result?->model,
                'provider_response_id' => $result?->providerResponseId,
            ];
        }

        $this->client()->patch($this->endpoint().'/runs/'.$id, $payload)->throw();
    }

    /**
     * @param  list<array{role: string, content: string}>  $messages
     * @return list<array{role: string, content: string}>
     */
    private function redactMessages(array $messages): array
    {
        return array_map(function (array $message) {
            $content = (string) ($message['content'] ?? '');
            $content = preg_replace('/Bearer\s+\S+/i', 'Bearer [redacted]', $content) ?? $content;
            $content = preg_replace('/(api[_-]?key|token|secret)\s*[:=]\s*\S+/i', '$1=[redacted]', $content) ?? $content;

            return [
                'role' => (string) ($message['role'] ?? ''),
                'content' => $content,
            ];
        }, $messages);
    }

    private function client(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::withHeaders([
            'x-api-key' => $this->apiKey(),
        ])
            ->acceptJson()
            ->asJson()
            ->timeout((int) config('ai.langsmith.timeout', 5));
    }

    private function endpoint(): string
    {
        return rtrim((string) config('ai.langsmith.endpoint', 'https://api.smith.langchain.com'), '/');
    }

    private function apiKey(): string
    {
        return trim((string) config('ai.langsmith.api_key'));
    }

    /**
     * @param  callable(): mixed  $callback
     */
    private function safe(callable $callback): void
    {
        try {
            $callback();
        } catch (Throwable) {
            // Tracing must never break lodge ops or tests.
        }
    }
}
