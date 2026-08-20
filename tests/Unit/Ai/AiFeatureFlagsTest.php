<?php

namespace Tests\Unit\Ai;

use App\Services\Ai\AiFeatureFlags;
use Tests\TestCase;

class AiFeatureFlagsTest extends TestCase
{
    public function test_default_mode_is_shadow(): void
    {
        $flags = app(AiFeatureFlags::class);

        $this->assertSame('shadow', $flags->mode());
        $this->assertTrue($flags->isShadow());
        $this->assertTrue($flags->generationEnabled('room_inventory_intelligence'));
        $this->assertTrue($flags->generationEnabled('housekeeping_workload'));
        $this->assertTrue($flags->generationEnabled('labour_forecast'));
    }

    public function test_propose_alias_normalizes_to_supervised(): void
    {
        config()->set('ai.mode', 'propose');

        $this->assertSame('supervised', app(AiFeatureFlags::class)->mode());
        $this->assertFalse(app(AiFeatureFlags::class)->isShadow());
        $this->assertTrue(app(AiFeatureFlags::class)->generationEnabled());
    }

    public function test_off_disables_generation(): void
    {
        config()->set('ai.mode', 'off');

        $this->assertFalse(app(AiFeatureFlags::class)->generationEnabled('room_inventory_intelligence'));
    }

    public function test_public_state_includes_class_p_and_sl_ids(): void
    {
        $state = app(AiFeatureFlags::class)->publicState('room_inventory_intelligence');

        $this->assertSame('P', $state['class']);
        $this->assertSame(['SL-02', 'SL-03'], $state['capabilities']);
        $this->assertSame('shadow', $state['mode']);
    }
}
