<?php

namespace App\Services\Ai;

class AiFeatureFlags
{
    public const MODES = ['off', 'shadow', 'supervised'];

    public function enabled(): bool
    {
        return (bool) config('ai.enabled', true);
    }

    public function mode(?string $agent = null): string
    {
        if ($agent !== null) {
            $override = config("ai.agents.{$agent}.mode");
            if (is_string($override) && $override !== '') {
                return $this->normalizeMode($override);
            }
        }

        return $this->normalizeMode((string) config('ai.mode', 'shadow'));
    }

    public function generationEnabled(?string $agent = null): bool
    {
        if (! $this->enabled() || $this->mode($agent) === 'off') {
            return false;
        }

        if ($agent !== null && config("ai.agents.{$agent}.enabled") === false) {
            return false;
        }

        return true;
    }

    public function isShadow(?string $agent = null): bool
    {
        return $this->mode($agent) === 'shadow';
    }

    /**
     * @return array{enabled: bool, mode: string, provider: string, defaultModel: string, shadow: bool, class: string|null, capabilities: list<string>}
     */
    public function publicState(?string $agent = null): array
    {
        $class = $agent !== null ? config("ai.agents.{$agent}.class") : null;

        return [
            'enabled' => $this->enabled(),
            'mode' => $this->mode($agent),
            'provider' => (string) config('ai.provider', 'xai'),
            'defaultModel' => (string) config('ai.default_model', 'grok-4.6'),
            'shadow' => $this->isShadow($agent),
            'class' => is_string($class) ? $class : null,
            'capabilities' => $agent !== null
                ? app(CapabilityResolver::class)->capabilitiesForAgent($agent)
                : [],
        ];
    }

    private function normalizeMode(string $mode): string
    {
        if ($mode === 'propose') {
            return 'supervised';
        }

        return in_array($mode, self::MODES, true) ? $mode : 'shadow';
    }
}
