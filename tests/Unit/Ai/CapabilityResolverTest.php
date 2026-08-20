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
        $this->assertTrue($resolver->exists('SL-02'));
        $this->assertTrue($resolver->exists('SL-04'));
        $this->assertTrue($resolver->exists('SL-11'));
        $this->assertFalse($resolver->exists('SL-HK-LAB-FORECAST'));
        $this->assertSame('Housekeeping', $resolver->catalog()['SL-04']['title']);
        $this->assertSame('Labour Forecasting', $resolver->catalog()['SL-11']['title']);
        $this->assertFalse($resolver->exists('MP-10'));
        $this->assertFalse($resolver->exists('CH-12'));
        $this->assertFalse($resolver->exists('SL-00'));
        $this->assertSame('Executive dashboard', $resolver->catalog()['SL-01']['title']);
        $this->assertSame('Reservations and Occupancy', $resolver->catalog()['SL-02']['title']);
        $this->assertSame('Front Desk', $resolver->catalog()['SL-03']['title']);
    }

    public function test_products_are_standalone(): void
    {
        $resolver = app(CapabilityResolver::class);

        $this->assertSame(['crew_hub', 'smart_lodge', 'major_projects'], $resolver->products());
        $this->assertSame('smart_lodge', $resolver->productFor('SL-01'));
        $this->assertTrue($resolver->isAvailable('SL-01'));
        $this->assertTrue($resolver->isAvailable('CH-03'));
        $this->assertTrue($resolver->isAvailable('MP-09'));
        $this->assertSame(['SL-02', 'SL-03'], $resolver->capabilitiesForAgent('room_inventory_intelligence'));
        $this->assertSame(['SL-04'], $resolver->capabilitiesForAgent('housekeeping_workload'));
        $this->assertSame(['SL-11'], $resolver->capabilitiesForAgent('labour_forecast'));
        $this->assertSame('SL-02', $resolver->primaryCapabilityForAgent('room_inventory_intelligence'));
        $this->assertContains('SL-03', $resolver->optionalConnections('SL-02'));
        $this->assertFalse($resolver->hasOptionalConnection('SL-02', 'CH-03'));
        $this->assertFalse($resolver->hasOptionalConnection('SL-01', 'MP-09'));
    }

    public function test_rejects_unknown_ids(): void
    {
        $this->expectException(InvalidArgumentException::class);
        app(CapabilityResolver::class)->assertKnown('MP-10');
    }
}
