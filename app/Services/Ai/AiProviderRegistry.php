<?php

namespace App\Services\Ai;

use App\Services\Ai\Contracts\AiProvider;
use App\Services\Ai\Providers\MockProvider;
use App\Services\Ai\Providers\XaiProvider;
use InvalidArgumentException;

class AiProviderRegistry
{
    /**
     * @var array<string, class-string<AiProvider>>
     */
    private array $drivers = [
        'mock' => MockProvider::class,
        'xai' => XaiProvider::class,
    ];

    public function driver(?string $name = null): AiProvider
    {
        $name = $name ?? $this->defaultDriver();

        if (! isset($this->drivers[$name])) {
            throw new InvalidArgumentException("Unknown AI provider [{$name}].");
        }

        return app($this->drivers[$name]);
    }

    public function defaultDriver(): string
    {
        if (app()->environment('testing')) {
            return 'mock';
        }

        $configured = (string) config('ai.provider', 'xai');

        if ($configured === 'xai' && blank(config('ai.xai.api_key'))) {
            return 'mock';
        }

        return $configured;
    }

    /**
     * @return list<string>
     */
    public function names(): array
    {
        return array_keys($this->drivers);
    }
}
