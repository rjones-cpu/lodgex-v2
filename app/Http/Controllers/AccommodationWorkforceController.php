<?php

namespace App\Http\Controllers;

use App\Services\AccommodationWorkforce\WorkforceReservationSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AccommodationWorkforceController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('AccommodationWorkforce', [
            'accounts' => $this->resolveAccounts(),
            'lastUpdated' => now()->format('M j, Y g:i A'),
            'schedulingBase' => rtrim((string) config('accommodation_workforce.scheduling_base'), '/'),
            'reservationAddPath' => config('accommodation_workforce.reservation_add_path', '/reservations/add'),
            'singleWorkerAddPath' => config('accommodation_workforce.single_worker_add_path', '/scheduling/coordinator/add-single-worker'),
        ]);
    }

    /**
     * Standalone Add Single Worker page. Uses the same iframe + login-handoff
     * pattern as the Accommodation Workforce dashboard; only the embedded
     * target path differs (Scheduling Coordinator → Add Single Worker).
     */
    public function addSingleWorker(): Response
    {
        return Inertia::render('AddSingleWorker', [
            'lastUpdated' => now()->format('M j, Y g:i A'),
            'schedulingBase' => rtrim((string) config('accommodation_workforce.scheduling_base'), '/'),
            'singleWorkerAddPath' => config('accommodation_workforce.single_worker_add_path', '/scheduling/coordinator/add-single-worker'),
        ]);
    }

    /**
     * Force a pull of the Accommodation Workforce bookings into the local
     * Reservation Operations queue. Called right after a worker is added so the
     * new reservation is available without waiting for the next dashboard load.
     */
    public function syncReservations(Request $request, WorkforceReservationSyncService $sync): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Not authenticated.'], 401);
        }

        $synced = $sync->syncForUser($user, force: true);

        return response()->json(['synced' => $synced]);
    }

    /**
     * Mint an auto-login URL for the chosen account by asking the scheduling
     * app (server-to-server, shared secret) for a one-time first-time-login
     * link tied to the currently authenticated user's email.
     */
    public function loginUrl(Request $request): JsonResponse
    {
        $request->validate([
            'account' => ['nullable', 'string', 'max:100'],
            'redirect' => ['nullable', 'string', 'max:255'],
            'embed' => ['nullable', 'boolean'],
            'scheduling' => ['nullable', 'boolean'],
        ]);

        $user = $request->user();
        if (! $user || empty($user->email)) {
            return response()->json(['message' => 'Not authenticated.'], 401);
        }

        $base = rtrim((string) config('accommodation_workforce.scheduling_base'), '/');
        $apiBase = rtrim((string) config('accommodation_workforce.scheduling_api_base', $base), '/');
        $hostHeader = config('accommodation_workforce.scheduling_host_header');
        $key = config('accommodation_workforce.integration_key');

        if (empty($key)) {
            return response()->json([
                'message' => 'Scheduling integration is not configured (missing LODGEX_INTEGRATION_KEY).',
                'error' => 'integration_not_configured',
            ], 503);
        }

        try {
            $payload = [
                'email' => $user->email,
                // Skip Auth0 ROPG locally where it is typically unavailable.
                'no_saml' => app()->environment('local'),
            ];

            if ($request->filled('redirect')) {
                $payload['redirect'] = $request->string('redirect')->toString();
                $payload['scheduling'] = false;
            } elseif ($request->has('scheduling')) {
                $payload['scheduling'] = $request->boolean('scheduling');
            }

            if ($request->boolean('embed')) {
                $payload['embed'] = true;
            }

            $headers = ['X-Lodgex-Key' => (string) $key];
            if (! empty($hostHeader)) {
                $headers['Host'] = (string) $hostHeader;
            }

            $response = Http::timeout(8)
                ->withHeaders($headers)
                ->acceptJson()
                ->post($apiBase.config('accommodation_workforce.issue_login_path'), $payload);

            if ($response->successful() && $response->json('login_url')) {
                return response()->json(['url' => $response->json('login_url')]);
            }

            if ($response->status() === 404) {
                return response()->json([
                    'message' => 'No scheduling account exists for '.$user->email.'. Use a camp.site login email.',
                    'error' => 'account_not_found',
                ], 422);
            }

            Log::warning('AccommodationWorkforce: issue-login-url rejected', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return response()->json([
                'message' => 'Could not sign in to the scheduling app. Please try again.',
                'error' => 'issue_login_failed',
            ], 502);
        } catch (\Throwable $e) {
            Log::warning('AccommodationWorkforce: issue-login-url failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Could not reach the scheduling app at '.$base.'.',
                'error' => 'connection_failed',
            ], 502);
        }
    }

    /**
     * Build the list of selectable accounts, preferring the remote source and
     * falling back to the static config list when it is missing or fails.
     *
     * @return array<int, array{id: string, label: string, role: string, schedulingUrl: string}>
     */
    private function resolveAccounts(): array
    {
        $raw = $this->fetchRemoteAccounts() ?? config('accommodation_workforce.accounts', []);

        return collect($raw)
            ->map(fn (array $account) => $this->normalizeAccount($account))
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>|null
     */
    private function fetchRemoteAccounts(): ?array
    {
        $url = config('accommodation_workforce.accounts_url');

        if (empty($url)) {
            return null;
        }

        try {
            $response = Http::timeout((int) config('accommodation_workforce.accounts_timeout', 5))
                ->acceptJson()
                ->get($url);

            if ($response->failed()) {
                return null;
            }

            $data = $response->json();

            // Accept either a bare array or a { data: [...] } envelope.
            return is_array($data['data'] ?? null) ? $data['data'] : (is_array($data) ? $data : null);
        } catch (\Throwable $e) {
            Log::warning('AccommodationWorkforce: failed to fetch remote accounts', [
                'url' => $url,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * @param  array<string, mixed>  $account
     * @return array{id: string, label: string, role: string, schedulingUrl: string}|null
     */
    private function normalizeAccount(array $account): ?array
    {
        $label = $account['label'] ?? $account['name'] ?? $account['role'] ?? null;

        if (empty($label)) {
            return null;
        }

        $id = (string) ($account['id'] ?? Str::slug($label));

        return [
            'id' => $id,
            'label' => (string) $label,
            'role' => (string) ($account['role'] ?? $label),
            'schedulingUrl' => $this->resolveSchedulingUrl($account, $id),
        ];
    }

    /**
     * @param  array<string, mixed>  $account
     */
    private function resolveSchedulingUrl(array $account, string $id): string
    {
        $explicit = $account['scheduling_url'] ?? $account['schedulingUrl'] ?? null;

        if (! empty($explicit)) {
            return (string) $explicit;
        }

        $base = config('accommodation_workforce.scheduling_base');
        $path = config('accommodation_workforce.scheduling_path');

        return $base.$path;
    }
}
