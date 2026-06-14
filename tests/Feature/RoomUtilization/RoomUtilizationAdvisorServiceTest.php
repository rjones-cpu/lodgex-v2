<?php

namespace Tests\Feature\RoomUtilization;

use App\Models\AiRecommendation;
use App\Models\AiRecommendationAuditLog;
use App\Services\RoomUtilization\CapacityForecastService;
use App\Services\RoomUtilization\RoomStatusEngine;
use App\Services\RoomUtilization\RoomUtilizationAdvisorService;
use Carbon\Carbon;
use Database\Seeders\RoomUtilizationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoomUtilizationAdvisorServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2025-05-20');
    }

    public function test_sync_generates_recommendations_with_fingerprints(): void
    {
        $this->seed(RoomUtilizationSeeder::class);

        $pending = AiRecommendation::query()->where('status', 'Pending')->count();

        $this->assertGreaterThan(0, $pending);
        $this->assertSame(
            $pending,
            AiRecommendation::query()->whereNotNull('fingerprint')->count()
        );
        $this->assertGreaterThan(0, AiRecommendationAuditLog::query()->count());
    }

    public function test_sync_preserves_approved_recommendations(): void
    {
        $this->seed(RoomUtilizationSeeder::class);

        $recommendation = AiRecommendation::query()->where('status', 'Pending')->first();
        $this->assertNotNull($recommendation);

        $recommendation->update([
            'status' => 'Approved',
            'approved_at' => now(),
        ]);

        $summary = app(RoomStatusEngine::class)->summarize();
        $forecast = app(CapacityForecastService::class)->build($summary);
        app(RoomUtilizationAdvisorService::class)->sync($summary, $forecast);

        $recommendation->refresh();
        $this->assertSame('Approved', $recommendation->status);
    }

    public function test_approve_and_dismiss_write_audit_logs(): void
    {
        $this->seed(RoomUtilizationSeeder::class);
        $user = \App\Models\User::factory()->create();

        $pending = AiRecommendation::query()->where('status', 'Pending')->get();
        $this->assertGreaterThanOrEqual(2, $pending->count());

        $this->actingAs($user)
            ->post(route('room-utilization.recommendations.approve', $pending[0]))
            ->assertRedirect();

        $this->actingAs($user)
            ->post(route('room-utilization.recommendations.dismiss', $pending[1]))
            ->assertRedirect();

        $this->assertDatabaseHas('ai_recommendation_audit_logs', [
            'ai_recommendation_id' => $pending[0]->id,
            'action' => 'approved',
        ]);
        $this->assertDatabaseHas('ai_recommendation_audit_logs', [
            'ai_recommendation_id' => $pending[1]->id,
            'action' => 'dismissed',
        ]);
    }

    public function test_room_utilization_page_includes_advisor_payload(): void
    {
        $this->seed(RoomUtilizationSeeder::class);
        $user = \App\Models\User::factory()->create();

        $response = $this->actingAs($user)->get(route('room-utilization'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('RoomUtilizationManager')
            ->has('aiRecommendations.0.category')
            ->has('recentAudit')
        );
    }
}
