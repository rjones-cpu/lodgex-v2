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
     * shadow      — generate + display proposals; AI never writes ops state
     * supervised  — same write policy as shadow; a person still approves
     * propose     — alias of supervised (Wave 0 env compatibility)
     * off         — no generation
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

    /*
     | LangSmith is optional tracing. Missing key = skip. Never required at runtime.
     | Documented env vars: LANGSMITH_API_KEY (or LANGCHAIN_API_KEY),
     | LANGSMITH_PROJECT / LANGCHAIN_PROJECT, LANGSMITH_ENDPOINT / LANGCHAIN_ENDPOINT,
     | LANGSMITH_TRACING / LANGCHAIN_TRACING_V2.
     */
    'langsmith' => [
        'enabled' => filter_var(env('LANGSMITH_TRACING', env('LANGCHAIN_TRACING_V2', true)), FILTER_VALIDATE_BOOLEAN),
        'api_key' => env('LANGSMITH_API_KEY', env('LANGCHAIN_API_KEY')),
        'endpoint' => env('LANGSMITH_ENDPOINT', env('LANGCHAIN_ENDPOINT', 'https://api.smith.langchain.com')),
        'project' => env('LANGSMITH_PROJECT', env('LANGCHAIN_PROJECT', 'lodgex-room-inventory-intelligence')),
        'timeout' => (int) env('LANGSMITH_TIMEOUT', 5),
    ],

    /*
     | Cloudflare Worker lodgex-mcp calls these read-only APIs.
     | LODGEX_API_BASE is a Worker env (never hard-code a staging host).
     */
    'mcp' => [
        'token' => env('LODGEX_MCP_TOKEN'),
    ],

    'agents' => [
        'room_inventory_intelligence' => [
            'enabled' => env('AI_ROOM_INVENTORY_AGENT', true),
            // Primary locked module. Shared with SL-03 (Front Desk).
            'capability' => 'SL-02',
            'capabilities' => ['SL-02', 'SL-03'],
            'class' => 'P',
            'mode' => env('AI_ROOM_INVENTORY_MODE', null),
            'langsmith_project' => 'lodgex-room-inventory-intelligence',
            // 11.3: auto-assign only when config authorizes it. Wave 1 OFF.
            'auto_assign' => false,
            // 6.2: positive overbooking disabled; never create or increase a limit.
            'positive_overbooking' => false,
            // Pending/option holds do not deduct unless this is explicitly on.
            'pending_option_holds_deduct' => false,
            // Time-Out / Room Retained default; beyond this is human-only.
            'time_out_retention_nights' => 7,
            'rule_version' => 'reservation-rules-1.0',
        ],
    ],

    /*
     | Official capability IDs only. Titles come from the Master Agent locked map
     | (Linear: LodgeX AI Agent Map). Do not invent IDs. Unwired IDs stay
     | registered so products can run standalone.
     */
    'capabilities' => [
        'CH-01' => ['product' => 'crew_hub', 'title' => 'Company Dashboard', 'repo_surface' => null],
        'CH-02' => ['product' => 'crew_hub', 'title' => 'Worker / Crew', 'repo_surface' => null],
        'CH-03' => ['product' => 'crew_hub', 'title' => 'Scheduling', 'repo_surface' => null],
        'CH-04' => ['product' => 'crew_hub', 'title' => 'Timesheets', 'repo_surface' => null],
        'CH-05' => ['product' => 'crew_hub', 'title' => 'Readiness', 'repo_surface' => null],
        'CH-06' => ['product' => 'crew_hub', 'title' => 'Accommodations', 'repo_surface' => null],
        'CH-07' => ['product' => 'crew_hub', 'title' => 'Journey Management', 'repo_surface' => null],
        'CH-08' => ['product' => 'crew_hub', 'title' => 'LMS', 'repo_surface' => null],
        'CH-09' => ['product' => 'crew_hub', 'title' => 'Hierarchy', 'repo_surface' => null],
        'CH-10' => ['product' => 'crew_hub', 'title' => 'Worker App', 'repo_surface' => null],
        'CH-11' => ['product' => 'crew_hub', 'title' => 'Service Rating', 'repo_surface' => 'App\\Services\\Scorecard\\ScorecardGradeCalculator'],
        'SL-01' => ['product' => 'smart_lodge', 'title' => 'Executive dashboard', 'repo_surface' => null],
        'SL-02' => ['product' => 'smart_lodge', 'title' => 'Reservations and Occupancy', 'repo_surface' => 'DashboardController, ReservationManagerController'],
        'SL-03' => ['product' => 'smart_lodge', 'title' => 'Front Desk', 'repo_surface' => 'Dashboard room assignment'],
        'SL-04' => ['product' => 'smart_lodge', 'title' => 'Housekeeping', 'repo_surface' => 'HousekeepingPlanningController'],
        'SL-05' => ['product' => 'smart_lodge', 'title' => 'Guest Services', 'repo_surface' => null],
        'SL-06' => ['product' => 'smart_lodge', 'title' => 'Food Services', 'repo_surface' => null],
        'SL-07' => ['product' => 'smart_lodge', 'title' => 'Maintenance', 'repo_surface' => null],
        'SL-08' => ['product' => 'smart_lodge', 'title' => 'Inventory / Purchasing', 'repo_surface' => null],
        'SL-09' => ['product' => 'smart_lodge', 'title' => 'Utilities', 'repo_surface' => null],
        'SL-10' => ['product' => 'smart_lodge', 'title' => 'Safety / Incidents', 'repo_surface' => null],
        'SL-11' => ['product' => 'smart_lodge', 'title' => 'Labour Forecasting', 'repo_surface' => null],
        'MP-01' => ['product' => 'major_projects', 'title' => 'Project Setup', 'repo_surface' => null],
        'MP-02' => ['product' => 'major_projects', 'title' => 'Demand', 'repo_surface' => null],
        'MP-03' => ['product' => 'major_projects', 'title' => 'Planning', 'repo_surface' => null],
        'MP-04' => ['product' => 'major_projects', 'title' => 'Movement', 'repo_surface' => null],
        'MP-05' => ['product' => 'major_projects', 'title' => 'Requirements', 'repo_surface' => null],
        'MP-06' => ['product' => 'major_projects', 'title' => 'Lodging and Travel', 'repo_surface' => null],
        'MP-07' => ['product' => 'major_projects', 'title' => 'Time', 'repo_surface' => null],
        'MP-08' => ['product' => 'major_projects', 'title' => 'Performance', 'repo_surface' => null],
        'MP-09' => ['product' => 'major_projects', 'title' => 'Hierarchy / Governance', 'repo_surface' => null],
    ],

    /*
     | Optional wiring only. Empty means the capability can run standalone.
     | Do not treat these as hard product dependencies. Do not hard-code Crew Hub
     | or Major Projects into Smart Lodge agents.
     */
    'optional_connections' => [
        'SL-02' => ['SL-03'],
        'SL-03' => ['SL-02'],
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
