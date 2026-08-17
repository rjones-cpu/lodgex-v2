<?php

namespace App\Services\Authorization;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class LodgeManagerAuthorizer
{
    public function isLodgeManager(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        $ids = config('ai.authorization.lodge_manager_user_ids', []);
        if (in_array((int) $user->id, array_map('intval', $ids), true)) {
            return true;
        }

        $emails = array_map('strtolower', config('ai.authorization.lodge_manager_emails', []));
        if ($user->email && in_array(strtolower((string) $user->email), $emails, true)) {
            return true;
        }

        return $this->hasSpatieLodgeManagerRole($user);
    }

    private function hasSpatieLodgeManagerRole(User $user): bool
    {
        if (! Schema::hasTable('model_has_roles') || ! Schema::hasTable('roles')) {
            return false;
        }

        $names = config('ai.authorization.lodge_manager_role_names', []);

        return DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $user->id)
            ->where('model_has_roles.model_type', $user::class)
            ->whereIn('roles.name', $names)
            ->exists();
    }
}
