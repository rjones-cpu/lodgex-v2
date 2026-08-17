<?php

namespace Tests;

use App\Models\User;
use Database\Seeders\RoomInventorySeeder;
use Database\Seeders\RoomUtilizationSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->disableSqliteForeignKeys();
    }

    protected function afterRefreshingDatabase()
    {
        $this->disableSqliteForeignKeys();
    }

    /**
     * Authenticate as an operator with a camp so inventory seeders run and
     * BelongsToUser / BelongsToCamp stamp and expose the seeded rows.
     */
    protected function actingAsCampOperator(array $attributes = []): User
    {
        $user = User::factory()->create(array_merge([
            'camp_id' => 1,
        ], $attributes));

        $this->actingAs($user);

        return $user;
    }

    /**
     * RoomUtilizationSeeder never creates rooms; it layers demo activity on
     * inventory. Seed both so sqlite tests match migrate:fresh --seed.
     */
    protected function seedRoomUtilizationDemo(): void
    {
        $this->seed(RoomInventorySeeder::class);
        $this->seed(RoomUtilizationSeeder::class);
    }

    private function disableSqliteForeignKeys(): void
    {
        // Live MySQL retargets FKs onto workers_old / rooms_old. SQLite cannot
        // drop those FKs by name, so disable enforcement in tests.
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF');
        }
    }
}
