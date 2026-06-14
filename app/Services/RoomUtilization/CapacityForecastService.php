<?php

namespace App\Services\RoomUtilization;

use App\Enums\RoomStatus;
use App\Models\ForecastSnapshot;
use App\Models\Reservation;
use App\Models\Room;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CapacityForecastService
{
    private const OUTLOOK_WINDOWS = [3, 7, 14, 30];

    public function build(RoomStatusSummary $summary, ?Carbon $startDate = null, int $days = 30): CapacityForecastResult
    {
        $start = ($startDate ?? Carbon::today())->startOfDay();
        $usableInventory = $this->usableInventory($summary);
        $startingOccupancy = $this->startingOccupancy($summary);

        $movements = $this->loadMovementInputs($start, $days);
        $daily = collect();
        $occupancy = $startingOccupancy;

        foreach (CarbonPeriod::create($start, $start->copy()->addDays($days - 1)) as $date) {
            $key = $date->toDateString();
            $input = $movements[$key] ?? ['arrivals' => 0, 'departures' => 0, 'source' => 'estimated'];

            $arrivals = $input['arrivals'];
            $departures = $input['departures'];
            $net = $arrivals - $departures;

            $slackBeforeArrivals = max(0, $usableInventory - max(0, $occupancy - $departures));
            $shortage = max(0, $arrivals - $slackBeforeArrivals);
            $overflowRooms = $shortage > 0 ? (int) ceil($shortage * 0.85) : 0;

            $occupancy = max(0, min($usableInventory, $occupancy - $departures + $arrivals));
            $available = $slackBeforeArrivals - $arrivals + $shortage;

            $confidence = $this->confidenceScore($input['source'], $date, $start);
            $risk = $this->riskLevel($shortage, $usableInventory);

            $daily->push([
                'date' => $date->format('M j'),
                'dateIso' => $key,
                'arrivals' => $arrivals,
                'departures' => $departures,
                'net' => $net,
                'projectedOccupancy' => $occupancy,
                'available' => $available,
                'shortage' => $shortage,
                'overflowRooms' => $overflowRooms,
                'risk' => $risk,
                'confidence' => $confidence,
                'confidenceLabel' => $this->confidenceLabel($confidence),
                'source' => $input['source'],
            ]);
        }

        $peakDay = $daily->sortByDesc('shortage')->first();

        return new CapacityForecastResult(
            dailyForecasts: $daily,
            outlook: $this->buildOutlook($daily),
            occupancyByDorm: $this->buildOccupancyByDorm($start),
            occupancyByContractor: $this->buildOccupancyByContractor($start),
            peakShortage: (int) ($peakDay['shortage'] ?? 0),
            peakShortageDate: $peakDay['date'] ?? null,
            peakOverflowRooms: (int) $daily->max('overflowRooms'),
        );
    }

    public function arrivalsOn(Carbon $date): int
    {
        $count = Reservation::query()
            ->whereDate('arrival_date', $date)
            ->count();

        if ($count > 0) {
            return $count;
        }

        return (int) (ForecastSnapshot::query()
            ->whereDate('forecast_date', $date)
            ->value('arrivals') ?? 0);
    }

    private function usableInventory(RoomStatusSummary $summary): int
    {
        return max(
            0,
            $summary->totalActiveRooms
            - $summary->maintenanceHold
            - $summary->outOfService
            - $summary->blocked,
        );
    }

    private function startingOccupancy(RoomStatusSummary $summary): int
    {
        $assignedArrivals = Room::active()
            ->where('status', RoomStatus::AssignedArrival->value)
            ->count();

        return $summary->inHouse + $assignedArrivals;
    }

    /**
     * @return array<string, array{arrivals: int, departures: int, source: string}>
     */
    private function loadMovementInputs(Carbon $start, int $days): array
    {
        $end = $start->copy()->addDays($days - 1);

        $arrivalsByDate = Reservation::query()
            ->whereBetween('arrival_date', [$start, $end])
            ->selectRaw('date(arrival_date) as movement_date, count(*) as total')
            ->groupBy('movement_date')
            ->pluck('total', 'movement_date');

        $departuresByDate = Reservation::query()
            ->whereBetween('departure_date', [$start, $end])
            ->selectRaw('date(departure_date) as movement_date, count(*) as total')
            ->groupBy('movement_date')
            ->pluck('total', 'movement_date');

        $snapshots = ForecastSnapshot::query()
            ->whereBetween('forecast_date', [$start, $end])
            ->get()
            ->keyBy(fn (ForecastSnapshot $s) => $s->forecast_date->toDateString());

        $inputs = [];
        $period = CarbonPeriod::create($start, $end);

        foreach ($period as $date) {
            $key = $date->toDateString();
            $arrivals = (int) ($arrivalsByDate[$key] ?? 0);
            $departures = (int) ($departuresByDate[$key] ?? 0);

            if ($arrivals > 0 || $departures > 0) {
                $inputs[$key] = [
                    'arrivals' => $arrivals,
                    'departures' => $departures,
                    'source' => 'reservations',
                ];

                continue;
            }

            if ($snapshots->has($key)) {
                $snapshot = $snapshots[$key];
                $inputs[$key] = [
                    'arrivals' => $snapshot->arrivals,
                    'departures' => $snapshot->departures,
                    'source' => 'snapshot',
                ];

                continue;
            }

            $inputs[$key] = [
                'arrivals' => (int) round($this->averageMovement($snapshots, 'arrivals')),
                'departures' => (int) round($this->averageMovement($snapshots, 'departures')),
                'source' => 'estimated',
            ];
        }

        return $inputs;
    }

    /**
     * @param  Collection<string, ForecastSnapshot>  $snapshots
     */
    private function averageMovement(Collection $snapshots, string $field): float
    {
        if ($snapshots->isEmpty()) {
            return 0;
        }

        return $snapshots->avg($field) ?? 0;
    }

    private function riskLevel(int $shortage, int $usableInventory): string
    {
        if ($shortage <= 0) {
            return 'low';
        }

        if ($usableInventory <= 0) {
            return 'critical';
        }

        $pressure = ($shortage / $usableInventory) * 100;

        return match (true) {
            $pressure >= 25 => 'critical',
            $pressure >= 15 => 'high',
            $pressure >= 5 => 'medium',
            default => 'low',
        };
    }

    private function confidenceScore(string $source, Carbon $date, Carbon $start): int
    {
        $base = match ($source) {
            'reservations' => 92,
            'snapshot' => 78,
            default => 55,
        };

        $daysOut = $start->diffInDays($date);
        $decay = (int) floor($daysOut / 7) * 8;

        return max(35, $base - $decay);
    }

    private function confidenceLabel(int $score): string
    {
        return match (true) {
            $score >= 85 => 'High',
            $score >= 65 => 'Medium',
            default => 'Low',
        };
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $daily
     * @return array<string, array<string, mixed>>
     */
    private function buildOutlook(Collection $daily): array
    {
        $outlook = [];

        foreach (self::OUTLOOK_WINDOWS as $window) {
            $slice = $daily->take($window);
            $maxShortage = (int) $slice->max('shortage');
            $peak = $slice->firstWhere('shortage', $maxShortage);
            $criticalDays = $slice->whereIn('risk', ['high', 'critical'])->count();
            $avgConfidence = (int) round($slice->avg('confidence'));

            $outlook["{$window}d"] = [
                'days' => $window,
                'maxShortage' => $maxShortage,
                'peakDate' => $peak['date'] ?? null,
                'peakRisk' => $peak['risk'] ?? 'low',
                'criticalDays' => $criticalDays,
                'overflowRooms' => (int) $slice->sum('overflowRooms'),
                'avgConfidence' => $avgConfidence,
            ];
        }

        return $outlook;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildOccupancyByDorm(Carbon $start): array
    {
        $rows = Room::active()
            ->select([
                'dorm',
                DB::raw('count(*) as total'),
                DB::raw("sum(case when status = '".RoomStatus::Occupied->value."' then 1 else 0 end) as occupied"),
                DB::raw("sum(case when status in ('".RoomStatus::OnHoldClean->value."', '".RoomStatus::OnHoldDirty->value."') then 1 else 0 end) as on_hold"),
            ])
            ->groupBy('dorm')
            ->orderBy('dorm')
            ->get();

        return $rows->map(function ($row) use ($start) {
            $pct = $row->total > 0 ? (int) round(($row->occupied / $row->total) * 100) : 0;

            $arrivals = Reservation::query()
                ->whereDate('arrival_date', $start)
                ->whereHas('room', fn ($q) => $q->where('dorm', $row->dorm))
                ->count();

            return [
                'dorm' => $row->dorm,
                'occupied' => (int) $row->occupied,
                'onHold' => (int) $row->on_hold,
                'total' => (int) $row->total,
                'occupancyPct' => $pct,
                'arrivalsToday' => $arrivals,
            ];
        })->values()->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildOccupancyByContractor(Carbon $start): array
    {
        return Reservation::query()
            ->where('arrival_date', '<=', $start)
            ->where('departure_date', '>', $start)
            ->selectRaw('coalesce(company, ?) as contractor', ['Unassigned'])
            ->selectRaw('count(*) as in_house')
            ->groupBy('company')
            ->orderByDesc('in_house')
            ->get()
            ->map(fn ($row) => [
                'contractor' => $row->contractor,
                'inHouse' => (int) $row->in_house,
            ])
            ->values()
            ->all();
    }
}
