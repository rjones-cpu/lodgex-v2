<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        // Primary operator login — persisted so reseeds never lock you out.
        User::updateOrCreate(
            ['email' => 'rjones@lodgex.ca'],
            [
                'name' => 'R Jones',
                'password' => Hash::make('Offshore2025!'),
                'email_verified_at' => now(),
            ],
        );

        // Inventory first: it materializes the concrete rooms every other
        // module (and the seeders below) build their demo activity on.
        $this->call(RoomInventorySeeder::class);
        $this->call(RoomUtilizationSeeder::class);
        $this->call(HousekeepingPlanningSeeder::class);
    }
}
