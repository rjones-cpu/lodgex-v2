<?php

namespace App\Services\Ai\Support;

class AiCompletionResult
{
    /**
     * @param  array<string, mixed>  $raw
     */
    public function __construct(
        public readonly string $text,
        public readonly string $provider,
        public readonly string $model,
        public readonly ?string $providerResponseId = null,
        public readonly array $raw = [],
    ) {}
}
