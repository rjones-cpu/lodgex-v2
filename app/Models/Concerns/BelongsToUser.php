<?php

namespace App\Models\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

/**
 * Scopes a model's rows to the authenticated user so each operator only ever
 * sees — and writes — their own data.
 *
 * Implemented as a global scope so every existing controller/service query is
 * filtered automatically, without per-query changes. The scope is a deliberate
 * no-op when there is no authenticated user (console commands, seeders, queue
 * workers, guests), which preserves CLI/seed behavior.
 */
trait BelongsToUser
{
    public static function bootBelongsToUser(): void
    {
        static::addGlobalScope('owned_by_user', function (Builder $builder): void {
            if (! Auth::check()) {
                return;
            }

            $model = $builder->getModel();
            $builder->where($model->qualifyColumn('user_id'), Auth::id());
        });

        static::creating(function (Model $model): void {
            if ($model->getAttribute('user_id') === null && Auth::check()) {
                $model->setAttribute('user_id', Auth::id());
            }
        });
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
