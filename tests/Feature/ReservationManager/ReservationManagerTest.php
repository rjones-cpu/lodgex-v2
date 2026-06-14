<?php

namespace Tests\Feature\ReservationManager;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReservationManagerTest extends TestCase
{
    use RefreshDatabase;

    public function test_reservations_requires_auth(): void
    {
        $this->get(route('reservations'))->assertRedirect(route('login'));
    }

    public function test_reservations_index_renders(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('reservations'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('ReservationManager'));
    }
}
