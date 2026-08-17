<?php

namespace App\Services\Ai\Support;

class AiCompletionRequest
{
    /**
     * @param  list<array{role: string, content: string}>  $input
     * @param  array<string, mixed>  $metadata
     */
    public function __construct(
        public readonly array $input,
        public readonly ?string $model = null,
        public readonly ?int $maxOutputTokens = 1024,
        public readonly ?string $capabilityId = null,
        public readonly ?string $agent = null,
        public readonly array $metadata = [],
    ) {}

    /**
     * @return list<array{role: string, content: string}>
     */
    public function input(): array
    {
        return $this->input;
    }
}
