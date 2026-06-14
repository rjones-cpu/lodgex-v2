<?php

namespace App\Http\Controllers;

use App\Services\Reports\OperationalReportsService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportsController extends Controller
{
    public function __construct(
        private readonly OperationalReportsService $reports,
    ) {}

    public function index(Request $request): Response
    {
        $reportKey = $request->string('report')->toString() ?: 'charge-sheets';
        $reportDate = $this->parseReportDate($request->string('date')->toString());

        $types = $this->reports->reportTypes();
        $validKeys = collect($types)->pluck('key')->all();

        if (! in_array($reportKey, $validKeys, true)) {
            $reportKey = 'charge-sheets';
        }

        return Inertia::render('Reports', [
            'reportTypes' => $types,
            'selectedReport' => $reportKey,
            'reportDate' => $reportDate->format('Y-m-d'),
            'report' => $this->reports->build($reportKey, $reportDate),
            'lastUpdated' => now()->format('M j, Y g:i A'),
        ]);
    }

    public function create(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'report' => ['required', 'string', 'in:charge-sheets,in-house,arrivals,departures,by-company'],
            'date' => ['nullable', 'date'],
        ]);

        $label = collect($this->reports->reportTypes())
            ->firstWhere('key', $validated['report'])['label'] ?? $validated['report'];

        return redirect()
            ->route('reports', [
                'report' => $validated['report'],
                'date' => $validated['date'] ?? now()->toDateString(),
            ])
            ->with('toast', "Report \"{$validated['name']}\" created from {$label}.");
    }

    private function parseReportDate(string $date): Carbon
    {
        if ($date === '') {
            return Carbon::today();
        }

        try {
            return Carbon::parse($date)->startOfDay();
        } catch (\Throwable) {
            return Carbon::today();
        }
    }
}
