<?php

namespace App\Services\AccommodationWorkforce;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class CampWorkforceInventoryService
{
    /**
     * @return array{
     *     location: array{id: int, name: string}|null,
     *     shifts: list<array{id: int, name: string}>,
     *     roomTypes: list<array{id: int, name: string}>,
     *     dorms: list<array{id: int, name: string, availableCount: int}>
     * }
     */
    public function options(User $user): array
    {
        return $this->request(
            config('accommodation_workforce.workforce_inventory_options_path'),
            $this->context($user),
        );
    }

    /**
     * @return list<array{id: int, label: string}>
     */
    public function rooms(User $user, int $dormId): array
    {
        $response = $this->roomResponse($user, $dormId);
        return $response['rooms'] ?? [];
    }

    public function assertRoomAvailable(User $user, int $dormId, int $roomId): string
    {
        $response = $this->roomResponse($user, $dormId);
        if (! collect($response['rooms'] ?? [])->contains(
            fn (array $room) => (int) $room['id'] === $roomId,
        )) {
            throw new RuntimeException('The selected room is no longer available.');
        }

        $dormName = trim((string) data_get($response, 'dorm.name'));
        if ($dormName === '') {
            throw new RuntimeException('The selected dorm is no longer available.');
        }

        return $dormName;
    }

    /**
     * @return array<string, mixed>
     */
    private function roomResponse(User $user, int $dormId): array
    {
        return $this->request(
            config('accommodation_workforce.workforce_inventory_rooms_path'),
            [...$this->context($user), 'dorm_id' => $dormId],
        );
    }

    /**
     * @return array{role_id: int, project_id: int, camp_id: int}
     */
    private function context(User $user): array
    {
        $context = [
            'role_id' => (int) $user->getAttribute('role_id'),
            'project_id' => (int) $user->getAttribute('project_id'),
            'camp_id' => (int) $user->getAttribute('camp_id'),
        ];

        if (min($context) <= 0) {
            throw new RuntimeException('Your account is missing its camp scheduling context.');
        }

        return $context;
    }

    /**
     * @param  array<string, int>  $query
     * @return array<string, mixed>
     */
    private function request(?string $path, array $query): array
    {
        $base = rtrim((string) config(
            'accommodation_workforce.scheduling_api_base',
            config('accommodation_workforce.scheduling_base'),
        ), '/');
        $key = (string) config('accommodation_workforce.integration_key');

        if ($base === '' || empty($path) || $key === '') {
            throw new RuntimeException('Camp room inventory integration is not configured.');
        }

        $headers = ['X-Lodgex-Key' => $key];
        $hostHeader = config('accommodation_workforce.scheduling_host_header');
        if (! empty($hostHeader)) {
            $headers['Host'] = (string) $hostHeader;
        }

        try {
            $response = Http::timeout(20)
                ->withHeaders($headers)
                ->acceptJson()
                ->get($base.$path, $query);
        } catch (Throwable $exception) {
            throw new RuntimeException('Camp room inventory is currently unavailable.', previous: $exception);
        }

        if (! $response->successful()) {
            throw new RuntimeException('Camp room inventory is currently unavailable.');
        }

        return $response->json();
    }
}
