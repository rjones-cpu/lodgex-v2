<?php

return [

    /*
    |--------------------------------------------------------------------------
    | LodgeX AI foundation
    |--------------------------------------------------------------------------
    |
    | Default mode is shadow: generate and display proposals, never auto-execute
    | high-impact ops. xAI is the first adapter. Tests force the mock provider.
    | Secrets stay in env — never commit real keys.
    |
    */

    'enabled' => env('AI_ENABLED', true),

    /*
     * shadow  — generate + display proposals; AI never writes ops state
     * propose — same as shadow; human approve may call existing services
     * off     — no generation
     */
    'mode' => env('AI_MODE', 'shadow'),

    'provider' => env('AI_PROVIDER', 'xai'),

    'default_model' => env('AI_DEFAULT_MODEL', 'grok-4.6'),

    /*
     * Official slugs only. grok-4.20-* is allowed by prefix. Do not invent names.
     */
    'allowed_models' => [
        'grok-4.6',
        'grok-4.5',
        'grok-4.3',
        'grok-build-0.1',
    ],

    'allowed_model_prefixes' => [
        'grok-4.20-',
    ],

    'xai' => [
        'api_key' => env('XAI_API_KEY'),
        'base_url' => env('XAI_BASE_URL', 'https://api.x.ai/v1'),
        'timeout' => (int) env('XAI_TIMEOUT', 120),
        // Do not persist lodge prompts on xAI servers by default.
        'store' => false,
    ],

    'agents' => [
        'room_inventory_intelligence' => [
            'enabled' => env('AI_ROOM_INVENTORY_AGENT', true),
            'capability' => 'SL-01',
            'mode' => env('AI_ROOM_INVENTORY_MODE', null),
        ],
    ],

    /*
     | Official capability IDs only. Titles are observational (this repo had no
     | official catalog). Unwired IDs stay registered so products can run
     | standalone without inventing extra IDs.
     */
    'capabilities' => [
        'CH-01' => ['product' => 'crew_hub', 'title' => null, 'repo_surface' => null],
        'CH-02' => ['product' => 'crew_hub', 'title' => null, 'repo_surface' => null],
        'CH-03' => ['product' => 'crew_hub', 'title' => 'Scheduling', 'repo_surface' => 'camp-reservations handoff (AccommodationWorkforce)'],
        'CH-04' => ['product' => 'crew_hub', 'title' => 'Timesheets', 'repo_surface' => null],
        'CH-05' => ['product' => 'crew_hub', 'title' => 'LMS', 'repo_surface' => null],
        'CH-06' => ['product' => 'crew_hub', 'title' => 'Journey Management', 'repo_surface' => null],
        'CH-07' => ['product' => 'crew_hub', 'title' => 'Readiness', 'repo_surface' => null],
        'CH-08' => ['product' => 'crew_hub', 'title' => 'Scorecard', 'repo_surface' => 'App\\Services\\Scorecard\\ScorecardGradeCalculator'],
        'CH-09' => ['product' => 'crew_hub', 'title' => null, 'repo_surface' => null],
        'CH-10' => ['product' => 'crew_hub', 'title' => null, 'repo_surface' => null],
        'CH-11' => ['product' => 'crew_hub', 'title' => null, 'repo_surface' => null],
        'SL-01' => ['product' => 'smart_lodge', 'title' => 'Room Inventory', 'repo_surface' => 'RoomInventoryController'],
        'SL-02' => ['product' => 'smart_lodge', 'title' => 'Reservations / online schedule', 'repo_surface' => 'Dashboard + AccommodationWorkforce hook'],
        'SL-03' => ['product' => 'smart_lodge', 'title' => 'Housekeeping Planning', 'repo_surface' => 'HousekeepingPlanningController'],
        'SL-04' => ['product' => 'smart_lodge', 'title' => 'Room Utilization', 'repo_surface' => 'RoomUtilizationController'],
        'SL-05' => ['product' => 'smart_lodge', 'title' => 'Command Center', 'repo_surface' => 'CommandCenterController (many widgets demo)'],
        'SL-06' => ['product' => 'smart_lodge', 'title' => 'Labour Forecaster', 'repo_surface' => 'command-center labour-forecaster view'],
        'SL-07' => ['product' => 'smart_lodge', 'title' => 'Consumables Intelligence', 'repo_surface' => 'command-center consumables-intelligence view'],
        'SL-08' => ['product' => 'smart_lodge', 'title' => 'Guest Intelligence', 'repo_surface' => 'command-center guest views'],
        'SL-09' => ['product' => 'smart_lodge', 'title' => 'Activity Director', 'repo_surface' => 'command-center events-director view'],
        'SL-10' => ['product' => 'smart_lodge', 'title' => 'Chef', 'repo_surface' => 'command-center food-preferences view'],
        'SL-11' => ['product' => 'smart_lodge', 'title' => 'Lodge Policy', 'repo_surface' => 'PolicyController'],
        'MP-01' => ['product' => 'major_projects', 'title' => null, 'repo_surface' => null],
        'MP-02' => ['product' => 'major_projects', 'title' => null, 'repo_surface' => null],
        'MP-03' => ['product' => 'major_projects', 'title' => null, 'repo_surface' => null],
        'MP-04' => ['product' => 'major_projects', 'title' => null, 'repo_surface' => null],
        'MP-05' => ['product' => 'major_projects', 'title' => null, 'repo_surface' => null],
        'MP-06' => ['product' => 'major_projects', 'title' => null, 'repo_surface' => null],
        'MP-07' => ['product' => 'major_projects', 'title' => null, 'repo_surface' => null],
        'MP-08' => ['product' => 'major_projects', 'title' => null, 'repo_surface' => null],
        'MP-09' => ['product' => 'major_projects', 'title' => 'Hierarchy', 'repo_surface' => null],
    ],

    /*
     | Optional connections only. Empty means the capability can run standalone.
     | Do not treat these as hard product dependencies.
     */
    'optional_connections' => [
        'SL-01' => ['SL-02', 'SL-04'],
        'SL-02' => ['CH-03', 'SL-01'],
        'SL-03' => ['SL-01', 'SL-04'],
        'SL-04' => ['SL-01', 'SL-02'],
        'CH-03' => ['SL-02'],
    ],

    'authorization' => [
        'lodge_manager_role_names' => [
            'Lodge Manager',
            'lodge_manager',
            'lodge-manager',
        ],
        'lodge_manager_emails' => array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('AI_LODGE_MANAGER_EMAILS', '')),
        ))),
        'lodge_manager_user_ids' => array_values(array_filter(array_map(
            'intval',
            explode(',', (string) env('AI_LODGE_MANAGER_USER_IDS', '')),
        ))),
    ],

];
