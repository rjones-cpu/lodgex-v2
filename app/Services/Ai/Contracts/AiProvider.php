<?php

namespace App\Services\Ai\Contracts;

use App\Services\Ai\Support\AiCompletionRequest;
use App\Services\Ai\Support\AiCompletionResult;

interface AiProvider
{
    public function name(): string;

    public function complete(AiCompletionRequest $request): AiCompletionResult;
}
