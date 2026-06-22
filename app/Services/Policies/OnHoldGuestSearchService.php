<?php

namespace App\Services\Policies;

use App\Models\Reservation;
use App\Models\User;
use App\Models\Worker;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Search guest/worker names for on-hold exemption pickers — local reservations
 * plus the Accommodation Workforce schedule API feed.
 */
class OnHoldGuestSearchService
{
    /**
     * @return list<array{name: string, source: string}>
     */
    public function search(User $user, string $query, int $limit = 20): array
    {
        $needle = mb_strtolower(trim($query));
        if (mb_strlen($needle) < 2) {
            return [];
        }

        $matches = collect();

        Worker::query()
            ->where('name', 'like', '%'.$query.'%')
            ->orderBy('name')
            ->limit($limit)
            ->pluck('name')
            ->each(fn (string $name) => $matches->push([
                'name' => $name,
                'source' => 'reservations',
            ]));

        Reservation::query()
            ->with('worker')
            ->whereHas('worker', fn ($q) => $q->where('name', 'like', '%'.$query.'%'))
            ->limit($limit)
            ->get()
            ->each(function (Reservation $reservation) use ($matches) {
                $name = $reservation->worker?->name;
                if ($name) {
                    $matches->push(['name' => $name, 'source' => 'reservations']);
                }
            });

        foreach ($this->fetchScheduleNames($user) as $name) {
            if (str_contains(mb_strtolower($name), $needle)) {
                $matches->push(['name' => $name, 'source' => 'schedule']);
            }
        }

        return $matches
            ->unique(fn (array $row) => mb_strtolower($row['name']))
            ->sortBy(fn (array $row) => mb_strtolower($row['name']))
            ->take($limit)
            ->values()
            ->all();
    }

    /**
     * @return list<string>
     */
    private function fetchScheduleNames(User $user): array
    {
        if (empty($user->email)) {
            return [];
        }

        $key = config('accommodation_workforce.integration_key');
        if (empty($key)) {
            return [];
        }

        $apiBase = rtrim((string) config(
            'accommodation_workforce.scheduling_api_base',
            config('accommodation_workforce.scheduling_base'),
        ), '/');
        $path = config('accommodation_workforce.reservations_path', '/api/integrations/lodgex/reservations');

        $headers = ['X-Lodgex-Key' => (string) $key];
        $hostHeader = config('accommodation_workforce.scheduling_host_header');
        if (! empty($hostHeader)) {
            $headers['Host'] = (string) $hostHeader;
        }

        try {
            $response = Http::timeout(5)
                ->withHeaders($headers)
                ->acceptJson()
                ->get($apiBase.$path, ['email' => $user->email]);

            if ($response->failed()) {
                return [];
            }

            $rows = $response->json('reservations');
            if (! is_array($rows)) {
                return [];
            }

            return collect($rows)
                ->map(fn (array $row) => trim((string) ($row['name'] ?? '')))
                ->filter()
                ->unique()
                ->values()
                ->all();
        } catch (\Throwable $e) {
            Log::warning('OnHoldGuestSearch: schedule feed fetch failed', [
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }
}
