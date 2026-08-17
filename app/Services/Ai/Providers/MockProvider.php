<?php

namespace App\Services\Ai\Providers;

use App\Services\Ai\Contracts\AiProvider;
use App\Services\Ai\Support\AiCompletionRequest;
use App\Services\Ai\Support\AiCompletionResult;

class MockProvider implements AiProvider
{
    public function name(): string
    {
        return 'mock';
    }

    public function complete(AiCompletionRequest $request): AiCompletionResult
    {
        $model = $request->model ?? (string) config('ai.default_model', 'grok-4.6');
        $lastUser = '';

        foreach (array_reverse($request->input()) as $message) {
            if (($message['role'] ?? '') === 'user') {
                $lastUser = (string) ($message['content'] ?? '');
                break;
            }
        }

        $text = $this->cannedText($lastUser, $request);

        return new AiCompletionResult(
            text: $text,
            provider: $this->name(),
            model: $model,
            providerResponseId: 'mock-response',
            raw: ['mock' => true, 'echo' => $lastUser],
        );
    }

    private function cannedText(string $userPrompt, AiCompletionRequest $request): string
    {
        if ($request->agent === 'room_inventory_intelligence') {
            return 'Shadow recommendation only. Confirm the suggested Vacant Clean room against RoomAvailabilityService, then a person must approve before RoomAssignmentService::assign runs.';
        }

        if ($userPrompt !== '') {
            return 'Mock provider (no network): '.$userPrompt;
        }

        return 'Mock provider (no network): no user prompt.';
    }
}
