<?php

namespace Tests\Unit\Ai;

use App\Services\Ai\CapabilityResolver;
use InvalidArgumentException;
use Tests\TestCase;

class CapabilityResolverTest extends TestCase
{
    public function test_registers_official_ids_only(): void
    {
        $resolver = app(CapabilityResolver::class);

        $this->assertTrue($resolver->exists('CH-03'));
        $this->assertTrue($resolver->exists('SL-01'));
        $this->assertTrue($resolver->exists('MP-09'));
        $this->assertFalse($resolver->exists('MP-10'));
        $this->assertFalse($resolver->exists('CH-12'));
        $this->assertFalse($resolver->exists('SL-00'));
    }

    public function test_products_are_standalone(): void
    {
        $resolver = app(CapabilityResolver::class);

        $this->assertSame(['crew_hub', 'smart_lodge', 'major_projects'], $resolver->products());
        $this->assertSame('smart_lodge', $resolver->productFor('SL-01'));
        $this->assertTrue($resolver->isAvailable('SL-01'));
        $this->assertTrue($resolver->isAvailable('CH-03'));
        $this->assertTrue($resolver->isAvailable('MP-09'));
        $this->assertContains('SL-02', $resolver->optionalConnections('SL-01'));
        $this->assertFalse($resolver->hasOptionalConnection('SL-01', 'MP-09'));
    }

    public function test_rejects_unknown_ids(): void
    {
        $this->expectException(InvalidArgumentException::class);
        app(CapabilityResolver::class)->assertKnown('MP-10');
    }
}
