<?php

// Target scheduling app host. Defaults are environment-aware: local dev points
// at the local camp-reservations vhost; everything else points at production.
$schedulingBase = env('ACCOMMODATION_WORKFORCE_SCHEDULING_BASE');
if (empty($schedulingBase)) {
    $schedulingBase = env('APP_ENV') === 'local'
        ? 'http://camp.site'
        : 'https://reservations1.lodgex.ca';
}

return [
    /*
    |--------------------------------------------------------------------------
    | Accounts source
    |--------------------------------------------------------------------------
    | Optional JSON endpoint that returns the selectable accounts (Reservation
    | Manager, Prime Reservation Manager, Client Admin, ...). When empty, the
    | controller falls back to the static `accounts` list below.
    |
    | Expected JSON shape: [{ "id": "...", "label": "...", "role": "...",
    |   "scheduling_url": "https://camp.site/scheduling/dashboard" }, ...]
    */
    'accounts_url' => env('ACCOMMODATION_WORKFORCE_ACCOUNTS_URL'),

    // Seconds to wait on the accounts endpoint before falling back.
    'accounts_timeout' => (int) env('ACCOMMODATION_WORKFORCE_ACCOUNTS_TIMEOUT', 5),

    /*
    |--------------------------------------------------------------------------
    | Scheduling dashboard target
    |--------------------------------------------------------------------------
    | Base origin + path used to build the embedded scheduling dashboard URL
    | when an account does not provide its own `scheduling_url`.
    */
    'scheduling_base' => rtrim($schedulingBase, '/'),
    'scheduling_path' => env('ACCOMMODATION_WORKFORCE_SCHEDULING_PATH', '/scheduling/dashboard'),
    // Land the embedded Add Reservation iframe on the Catering Staff flow by default.
    // Override with ACCOMMODATION_WORKFORCE_RESERVATION_ADD_PATH=/reservations/add/walkin
    // (or any other camp-reservations path) when needed.
    'reservation_add_path' => env('ACCOMMODATION_WORKFORCE_RESERVATION_ADD_PATH', '/reservations/add/catering'),

    // Add Single Worker iframe (Scheduling Coordinator) — mirrors reservation_add_path.
    // Same login-handoff flow; the camp-reservations route accepts an optional /{tab?} segment.
    'single_worker_add_path' => env('ACCOMMODATION_WORKFORCE_SINGLE_WORKER_ADD_PATH', '/scheduling/coordinator/add-single-worker'),

    // Local server-to-server calls: use loopback + Host header so PHP can reach
    // Apache even when camp.site DNS is unavailable to the PHP process.
    'scheduling_api_base' => rtrim(
        env('ACCOMMODATION_WORKFORCE_SCHEDULING_API_BASE', env('APP_ENV') === 'local' ? 'http://127.0.0.1' : $schedulingBase),
        '/'
    ),
    'scheduling_host_header' => env('ACCOMMODATION_WORKFORCE_SCHEDULING_HOST', env('APP_ENV') === 'local' ? 'camp.site' : null),

    /*
    |--------------------------------------------------------------------------
    | Server-to-server login handoff
    |--------------------------------------------------------------------------
    | Shared secret sent as X-Lodgex-Key to the scheduling app's
    | /api/integrations/lodgex/issue-login-url endpoint, which returns a
    | one-time first-time-login URL that auto-logs the user in. Must match
    | LODGEX_INTEGRATION_KEY on the scheduling app.
    */
    'integration_key' => env('LODGEX_INTEGRATION_KEY'),
    'issue_login_path' => '/api/integrations/lodgex/issue-login-url',

    // Read-only endpoint on the scheduling app reporting how many housekeepers the Accommodation
    // Workforce has scheduled. Feeds Housekeeping Planning's "Housekeeping Schedule" feed.
    'housekeeping_schedule_path' => '/api/integrations/lodgex/housekeeping-schedule',

    // Read-only endpoint on the scheduling app returning the Accommodation Workforce bookings
    // ("Workforce Accommodations" company) that are mirrored into Reservation Operations.
    'reservations_path' => '/api/integrations/lodgex/reservations',

    // Endpoint that reflects a Reservation Operations status change back onto the matching
    // Workforce Accommodations booking on the scheduling app.
    'reservation_status_path' => '/api/integrations/lodgex/reservation-status',

    // Seconds the synced reservations feed is considered fresh before the Reservation Operations
    // dashboard re-pulls it from the scheduling app.
    'reservations_sync_ttl' => (int) env('ACCOMMODATION_WORKFORCE_RESERVATIONS_SYNC_TTL', 90),

    // When true, Housekeeping Planning uses the live position-based housekeeper count from the
    // Accommodation Workforce schedule (camp-reservations) as the available headcount instead of
    // the local housekeepers table. Set false to revert to the local-only count.
    'use_live_housekeeper_count' => (bool) env('ACCOMMODATION_WORKFORCE_USE_LIVE_HOUSEKEEPER_COUNT', true),

    /*
    |--------------------------------------------------------------------------
    | Static fallback accounts
    |--------------------------------------------------------------------------
    | Used when `accounts_url` is not configured or the request fails. Leave
    | `scheduling_url` null to inherit `scheduling_base` + `scheduling_path`.
    */
    'accounts' => [
        [
            'id' => 'reservation-manager',
            'label' => 'Reservation Manager',
            'role' => 'Reservation Manager',
            'scheduling_url' => null,
        ],
        [
            'id' => 'prime-reservation-manager',
            'label' => 'Prime Reservation Manager',
            'role' => 'Prime Reservation Manager',
            'scheduling_url' => null,
        ],
        [
            'id' => 'client-admin',
            'label' => 'Client Admin',
            'role' => 'Client Admin',
            'scheduling_url' => null,
        ],
    ],
];
