<?php

namespace App\Http\Controllers;

use App\Services\AuditTrail\ReservationAuditTrailService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Audit Trail — native LodgeX view of camp-reservations activity_logs.
 * Uses the same camp + billing-company scope as camp.site Manager /audit/trail.
 */
class AuditTrailController extends Controller
{
    public function __construct(
        private readonly ReservationAuditTrailService $auditTrail,
    ) {}

    public function index(Request $request): Response
    {
        $payload = $this->auditTrail->paginate($request->user(), [
            'search' => $request->string('search')->toString(),
            'type' => $request->string('type')->toString(),
            'sort' => $request->string('sort')->toString(),
            'dir' => $request->string('dir')->toString(),
            'per_page' => $request->integer('per_page', 25),
        ]);

        return Inertia::render('AuditTrail', [
            ...$payload,
            'lastUpdated' => now()->format('M j, Y g:i A'),
        ]);
    }
}
