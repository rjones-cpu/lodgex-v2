<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * Scopes rows to the authenticated user's camp (`users.camp_id`) so LodgeX
 * shares the same inventory partition as camp-reservations.
 *
 * No-op when there is no authenticated user (CLI, seeders, queues) or when
 * the user has no camp assigned — callers that need a hard guarantee should
 * still resolve/validate camp_id explicitly.
 */
trait BelongsToCamp
{
    public static function bootBelongsToCamp(): void
    {
        static::addGlobalScope('owned_by_camp', function (Builder $builder): void {
            if (! Auth::check()) {
                return;
            }

            $campId = Auth::user()?->getAttribute('camp_id');
            if ($campId === null || $campId === '') {
                $builder->whereRaw('0 = 1');

                return;
            }

            $model = $builder->getModel();
            $builder->where($model->qualifyColumn('camp_id'), (int) $campId);
        });

        static::creating(function (Model $model): void {
            if (! Auth::check()) {
                return;
            }

            $current = $model->getAttribute('camp_id');
            if ($current === null || $current === '' || (int) $current < 1) {
                $campId = Auth::user()?->getAttribute('camp_id');
                if ($campId !== null && $campId !== '' && (int) $campId > 0) {
                    $model->setAttribute('camp_id', (int) $campId);
                }
            }

            // Keep LodgeX owner column populated when present (audit / sync),
            // but do not scope queries by it — inventory is camp-owned.
            if ($model->getAttribute('user_id') === null
                && in_array('user_id', $model->getFillable(), true)) {
                $model->setAttribute('user_id', Auth::id());
            }
        });
    }
}
