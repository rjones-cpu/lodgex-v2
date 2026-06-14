<?php

namespace App\Services\Reports;

use App\Models\Reservation;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class OperationalReportsService
{
    /**
     * @return list<array{key: string, label: string}>
     */
    public function reportTypes(): array
    {
        return [
            ['key' => 'charge-sheets', 'label' => 'Charge Sheets'],
            ['key' => 'in-house', 'label' => 'In house'],
            ['key' => 'arrivals', 'label' => 'Arrivals'],
            ['key' => 'departures', 'label' => 'departures'],
            ['key' => 'by-company', 'label' => 'by company'],
            ['key' => 'create-report', 'label' => 'Create report'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function build(string $reportKey, ?Carbon $asOf = null): array
    {
        $asOf ??= Carbon::today();

        return match ($reportKey) {
            'charge-sheets' => $this->chargeSheetsReport($asOf),
            'in-house' => $this->inHouseReport($asOf),
            'arrivals' => $this->arrivalsReport($asOf),
            'departures' => $this->departuresReport($asOf),
            'by-company' => $this->byCompanyReport($asOf),
            'create-report' => $this->createReportTemplate(),
            default => $this->chargeSheetsReport($asOf),
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function chargeSheetsReport(Carbon $asOf): array
    {
        $rows = $this->activeReservations($asOf)
            ->map(function (Reservation $reservation) use ($asOf) {
                $nights = max(1, $reservation->arrival_date->diffInDays($reservation->departure_date));
                $dailyRate = $this->dailyRateFor($reservation->room_type);

                return [
                    'worker' => $reservation->worker?->name ?? '—',
                    'company' => $reservation->company ?? $reservation->worker?->company ?? '—',
                    'room' => $this->roomLabel($reservation),
                    'arrival' => $reservation->arrival_date->format('M j, Y'),
                    'departure' => $reservation->departure_date->format('M j, Y'),
                    'roomType' => $reservation->room_type ?? '—',
                    'dailyRate' => '$'.number_format($dailyRate, 2),
                    'nights' => $nights,
                    'total' => '$'.number_format($dailyRate * $nights, 2),
                ];
            })
            ->values()
            ->all();

        return [
            'key' => 'charge-sheets',
            'title' => 'Charge Sheets',
            'description' => 'Billing summary for active and upcoming stays.',
            'asOf' => $asOf->format('M j, Y'),
            'columns' => [
                ['key' => 'worker', 'label' => 'Worker'],
                ['key' => 'company', 'label' => 'Company'],
                ['key' => 'room', 'label' => 'Room'],
                ['key' => 'arrival', 'label' => 'Arrival'],
                ['key' => 'departure', 'label' => 'Departure'],
                ['key' => 'roomType', 'label' => 'Room Type'],
                ['key' => 'dailyRate', 'label' => 'Daily Rate'],
                ['key' => 'nights', 'label' => 'Nights'],
                ['key' => 'total', 'label' => 'Total'],
            ],
            'rows' => $rows,
            'summary' => count($rows).' charge sheet'.(count($rows) === 1 ? '' : 's'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function inHouseReport(Carbon $asOf): array
    {
        $rows = Reservation::query()
            ->with(['worker', 'room'])
            ->where('status', 'Check-In')
            ->whereDate('arrival_date', '<=', $asOf)
            ->whereDate('departure_date', '>=', $asOf)
            ->orderBy('company')
            ->orderBy('worker_id')
            ->limit(100)
            ->get()
            ->map(fn (Reservation $reservation) => [
                'worker' => $reservation->worker?->name ?? '—',
                'company' => $reservation->company ?? '—',
                'room' => $this->roomLabel($reservation),
                'arrival' => $reservation->arrival_date->format('M j, Y'),
                'departure' => $reservation->departure_date->format('M j, Y'),
                'status' => $reservation->status,
            ])
            ->values()
            ->all();

        return [
            'key' => 'in-house',
            'title' => 'In house',
            'description' => 'Workers currently checked in and occupying rooms.',
            'asOf' => $asOf->format('M j, Y'),
            'columns' => [
                ['key' => 'worker', 'label' => 'Worker'],
                ['key' => 'company', 'label' => 'Company'],
                ['key' => 'room', 'label' => 'Room'],
                ['key' => 'arrival', 'label' => 'Arrival'],
                ['key' => 'departure', 'label' => 'Departure'],
                ['key' => 'status', 'label' => 'Status'],
            ],
            'rows' => $rows,
            'summary' => count($rows).' in-house guest'.(count($rows) === 1 ? '' : 's'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function arrivalsReport(Carbon $asOf): array
    {
        $rows = Reservation::query()
            ->with(['worker', 'room'])
            ->whereDate('arrival_date', $asOf)
            ->orderBy('company')
            ->limit(100)
            ->get()
            ->map(fn (Reservation $reservation) => [
                'worker' => $reservation->worker?->name ?? '—',
                'company' => $reservation->company ?? '—',
                'room' => $this->roomLabel($reservation),
                'arrival' => $reservation->arrival_date->format('M j, Y'),
                'roomType' => $reservation->room_type ?? '—',
                'status' => $reservation->status,
            ])
            ->values()
            ->all();

        return [
            'key' => 'arrivals',
            'title' => 'Arrivals',
            'description' => 'Expected and scheduled arrivals for the selected date.',
            'asOf' => $asOf->format('M j, Y'),
            'columns' => [
                ['key' => 'worker', 'label' => 'Worker'],
                ['key' => 'company', 'label' => 'Company'],
                ['key' => 'room', 'label' => 'Room'],
                ['key' => 'arrival', 'label' => 'Arrival'],
                ['key' => 'roomType', 'label' => 'Room Type'],
                ['key' => 'status', 'label' => 'Status'],
            ],
            'rows' => $rows,
            'summary' => count($rows).' arrival'.(count($rows) === 1 ? '' : 's').' today',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function departuresReport(Carbon $asOf): array
    {
        $rows = Reservation::query()
            ->with(['worker', 'room'])
            ->whereDate('departure_date', $asOf)
            ->orderBy('company')
            ->limit(100)
            ->get()
            ->map(fn (Reservation $reservation) => [
                'worker' => $reservation->worker?->name ?? '—',
                'company' => $reservation->company ?? '—',
                'room' => $this->roomLabel($reservation),
                'departure' => $reservation->departure_date->format('M j, Y'),
                'roomType' => $reservation->room_type ?? '—',
                'status' => $reservation->status,
            ])
            ->values()
            ->all();

        return [
            'key' => 'departures',
            'title' => 'departures',
            'description' => 'Scheduled check-outs and departures for the selected date.',
            'asOf' => $asOf->format('M j, Y'),
            'columns' => [
                ['key' => 'worker', 'label' => 'Worker'],
                ['key' => 'company', 'label' => 'Company'],
                ['key' => 'room', 'label' => 'Room'],
                ['key' => 'departure', 'label' => 'Departure'],
                ['key' => 'roomType', 'label' => 'Room Type'],
                ['key' => 'status', 'label' => 'Status'],
            ],
            'rows' => $rows,
            'summary' => count($rows).' departure'.(count($rows) === 1 ? '' : 's').' today',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function byCompanyReport(Carbon $asOf): array
    {
        $reservations = Reservation::query()
            ->whereDate('arrival_date', '<=', $asOf)
            ->whereDate('departure_date', '>=', $asOf)
            ->get();

        $rows = $reservations
            ->groupBy(fn (Reservation $reservation) => $reservation->company ?? 'Unassigned')
            ->map(function (Collection $group, string $company) use ($asOf) {
                $inHouse = $group->where('status', 'Check-In')->count();
                $arrivalsToday = $group->filter(
                    fn (Reservation $reservation) => $reservation->arrival_date->isSameDay($asOf)
                )->count();
                $departuresToday = $group->filter(
                    fn (Reservation $reservation) => $reservation->departure_date->isSameDay($asOf)
                )->count();

                return [
                    'company' => $company,
                    'inHouse' => $inHouse,
                    'arrivalsToday' => $arrivalsToday,
                    'departuresToday' => $departuresToday,
                    'totalActive' => $group->count(),
                ];
            })
            ->sortByDesc('totalActive')
            ->values()
            ->all();

        return [
            'key' => 'by-company',
            'title' => 'by company',
            'description' => 'Occupancy and movement totals grouped by contractor company.',
            'asOf' => $asOf->format('M j, Y'),
            'columns' => [
                ['key' => 'company', 'label' => 'Company'],
                ['key' => 'inHouse', 'label' => 'In House'],
                ['key' => 'arrivalsToday', 'label' => 'Arrivals Today'],
                ['key' => 'departuresToday', 'label' => 'Departures Today'],
                ['key' => 'totalActive', 'label' => 'Total Active'],
            ],
            'rows' => $rows,
            'summary' => count($rows).' compan'.(count($rows) === 1 ? 'y' : 'ies'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function createReportTemplate(): array
    {
        return [
            'key' => 'create-report',
            'title' => 'Create report',
            'description' => 'Configure and generate a custom operational report.',
            'asOf' => Carbon::today()->format('M j, Y'),
            'columns' => [],
            'rows' => [],
            'summary' => 'Select a report type and date, then click Create Report.',
            'isCreateForm' => true,
        ];
    }

    /**
     * @return Collection<int, Reservation>
     */
    private function activeReservations(Carbon $asOf): Collection
    {
        return Reservation::query()
            ->with(['worker', 'room'])
            ->whereDate('departure_date', '>=', $asOf)
            ->orderBy('company')
            ->orderBy('arrival_date')
            ->limit(100)
            ->get();
    }

    private function roomLabel(Reservation $reservation): string
    {
        $room = $reservation->room;

        if (! $room) {
            return 'Unassigned';
        }

        return "{$room->number} ({$room->dorm})";
    }

    private function dailyRateFor(?string $roomType): float
    {
        return match (true) {
            str_contains(strtolower($roomType ?? ''), 'double') => 118.00,
            str_contains(strtolower($roomType ?? ''), 'single') => 92.00,
            default => 105.00,
        };
    }
}
