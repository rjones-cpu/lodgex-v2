<?php

namespace Tests\Feature\CommandCenter;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommandCenterTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_center_requires_auth(): void
    {
        $this->get(route('command-center'))->assertRedirect(route('login'));
    }

    public function test_command_center_index_renders(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('command-center'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('CommandCenter/Index')
                ->has('commandSummary', 8)
                ->has('commandFunctions', 5)
                ->has('occupancyEngine')
                ->has('guestEngine')
                ->has('intelligenceOutputs')
                ->has('systemStatus'));
    }

    public function test_command_center_detail_renders(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('command-center.show', ['view' => 'alerts']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('CommandCenter/Detail')
                ->where('view', 'alerts')
                ->has('detail.alerts')
                ->has('detail.stats'));
    }

    public function test_executive_dashboard_detail_payload(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('command-center.show', ['view' => 'executive-dashboards']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('CommandCenter/Detail')
                ->where('view', 'executive-dashboards')
                ->has('detail.kpis', 8)
                ->has('detail.summaryColumns', 3)
                ->has('detail.executiveRecommendations', 5)
                ->has('detail.trends', 6)
                ->has('detail.moduleDrillDown', 6));
    }

    public function test_predictive_analytics_detail_payload(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('command-center.show', ['view' => 'predictive-analytics']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('CommandCenter/Detail')
                ->where('view', 'predictive-analytics')
                ->has('detail.forecastDays'));
    }

    public function test_module_dashboard_views_are_accessible(): void
    {
        $user = User::factory()->create();

        foreach ([
            'consumables-intelligence',
            'labour-forecaster',
            'guest-profile',
            'guest-experience',
        ] as $view) {
            $this->actingAs($user)
                ->get(route('command-center.show', ['view' => $view]))
                ->assertOk()
                ->assertInertia(fn ($page) => $page
                    ->component('CommandCenter/Detail')
                    ->where('view', $view)
                    ->has('detail.metrics'));
        }
    }
}
