<?php

namespace Database\Seeders;

use App\Enums\RoomStatus;
use App\Models\ContractorAllotment;
use App\Models\ForecastSnapshot;
use App\Models\HousekeepingTask;
use App\Models\MaintenanceHold;
use App\Models\OverflowScenario;
use App\Models\ReleaseCandidate;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\RoomHold;
use App\Models\Worker;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

/**
 * Layers Room Utilization demo activity (statuses, holds, maintenance,
 * housekeeping tasks, reservations, release candidates) on top of the rooms
 * materialized by RoomInventorySeeder.
 *
 * It NEVER creates its own rooms. RoomInventorySeeder runs first and is the
 * single source of truth for the room set, so a fresh `migrate:fresh --seed`
 * always lands at the inventory room count with demo data running on those
 * rooms — no legacy rooms are reintroduced.
 */
class RoomUtilizationSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::today()->setTime(9, 45);

        $workers = $this->seedWorkers();

        $rooms = Room::query()
            ->fromInventory()
            ->orderBy('room_inventory_location_id')
            ->orderByRaw('CAST(number AS INTEGER)')
            ->get()
            ->values();

        if ($rooms->isEmpty()) {
            $this->command?->warn('RoomUtilizationSeeder: no inventory rooms found — run RoomInventorySeeder first. Skipping demo activity.');
        } else {
            $this->decorateRooms($workers, $rooms, $now);
        }

        $this->seedContractorAllotments();
        $this->seedForecastSnapshots();
        $this->seedOverflowScenarios();
        $this->seedAdvisorRecommendations();
    }

    /**
     * Apply a realistic spread of statuses across inventory rooms and wire up
     * the dependent demo records (holds, maintenance, housekeeping, etc.).
     *
     * @param  array<string, Worker>  $workers
     * @param  Collection<int, Room>  $rooms
     */
    private function decorateRooms(array $workers, Collection $rooms, Carbon $now): void
    {
        $workerList = array_values($workers);
        $cursor = 0;
        $take = function (int $count) use ($rooms, &$cursor): Collection {
            $slice = $rooms->slice($cursor, $count)->values();
            $cursor += $count;

            return $slice;
        };

        // Distribution is capped at the available room count by slice().
        $occupied = $take(60);
        $onHoldClean = $take(30);
        $onHoldDirty = $take(14);
        $vacantDirty = $take(34);
        $maintenance = $take(16);
        $blocked = $take(6);
        $arrivals = $take(10);
        // Everything past the cursor stays Vacant Clean (from the inventory sync).

        foreach ($occupied as $i => $room) {
            $worker = $workerList[$i % count($workerList)];
            $room->update([
                'status' => RoomStatus::Occupied->value,
                'current_worker_id' => $worker->id,
                'company' => $worker->company,
                'status_updated_at' => $now->copy()->subDays(($i % 10) + 1),
            ]);
        }

        foreach ($onHoldClean as $i => $room) {
            $worker = $workerList[$i % count($workerList)];
            $days = ($i % 14) + 1;
            $room->update([
                'status' => RoomStatus::OnHoldClean->value,
                'current_worker_id' => $worker->id,
                'company' => $worker->company,
                'hold_days' => $days,
                'status_updated_at' => $now->copy()->subDays($days),
            ]);
        }

        foreach ($onHoldDirty as $i => $room) {
            $worker = $workerList[$i % count($workerList)];
            $days = ($i % 14) + 3;
            $room->update([
                'status' => RoomStatus::OnHoldDirty->value,
                'current_worker_id' => $worker->id,
                'company' => $worker->company,
                'hold_days' => $days,
                'status_updated_at' => $now->copy()->subDays($days),
            ]);
        }

        foreach ($vacantDirty as $i => $room) {
            $room->update([
                'status' => RoomStatus::VacantDirty->value,
                'status_updated_at' => $now->copy()->subHours(($i % 12) + 1),
            ]);
        }

        foreach ($maintenance as $i => $room) {
            $room->update([
                'status' => RoomStatus::MaintenanceHold->value,
                'status_updated_at' => $now->copy()->subDays(($i % 6) + 1),
            ]);
        }

        $blockedCompanies = ['Fluor Enterprises', 'Bechtel Corp', 'Turner Industrial'];
        foreach ($blocked as $i => $room) {
            $room->update([
                'status' => RoomStatus::BlockedReserved->value,
                'company' => $blockedCompanies[$i % count($blockedCompanies)],
                'status_updated_at' => $now->copy()->subDays(($i % 4) + 1),
            ]);
        }

        foreach ($arrivals as $i => $room) {
            $worker = $workerList[$i % count($workerList)];
            $room->update([
                'status' => RoomStatus::AssignedArrival->value,
                'current_worker_id' => $worker->id,
                'company' => $worker->company,
                'status_updated_at' => $now->copy()->subHours(($i % 6) + 1),
            ]);
        }

        $this->seedRoomHolds($onHoldClean->merge($onHoldDirty), $now);
        $this->seedMaintenanceHolds($maintenance);
        $this->seedHousekeepingTasks($vacantDirty, $onHoldDirty);
        $this->seedOperationalReservations($workers, $occupied->merge($arrivals));
        $this->seedForecastMovementReservations($workers, $rooms);
        $this->seedReleaseCandidates($onHoldClean->merge($onHoldDirty));
    }

    private function seedAdvisorRecommendations(): void
    {
        $summary = app(\App\Services\RoomUtilization\RoomStatusEngine::class)->summarize();
        $forecast = app(\App\Services\RoomUtilization\CapacityForecastService::class)->build($summary);
        app(\App\Services\RoomUtilization\RoomUtilizationAdvisorService::class)->sync($summary, $forecast);
    }

    /**
     * @return array<string, Worker>
     */
    private function seedWorkers(): array
    {
        $names = [
            'Carlos Ramirez' => ['company' => 'Bechtel Corp', 'project' => 'Rio Grande Midstream Expansion'],
            'Ethan Brown' => ['company' => 'Turner Industrial', 'project' => 'Glen Grade Midstream Expansion'],
            'Mason Taylor' => ['company' => 'Turner Industrial', 'project' => 'Glen Grade Midstream Expansion'],
            'Nora Fields' => ['company' => 'Vertex Services', 'project' => null],
            'Sophie Chen' => ['company' => 'Bechtel Corp', 'project' => 'Coastal LNG Phase 2'],
            'Alek Patel' => ['company' => 'Fluor Enterprises', 'project' => 'Solar Field Alpha'],
            'Debbie Marie' => ['company' => 'DMS', 'project' => null],
            'Mark Davis' => ['company' => 'Fluor Enterprises', 'project' => 'Solar Field Alpha'],
        ];

        $workers = [];
        foreach ($names as $name => $meta) {
            $workers[$name] = Worker::create([
                'name' => $name,
                'company' => $meta['company'],
                'project' => $meta['project'],
            ]);
        }

        return $workers;
    }

    /**
     * @param  Collection<int, Room>  $rooms  On-hold rooms (already carry a worker).
     */
    private function seedRoomHolds(Collection $rooms, Carbon $now): void
    {
        foreach ($rooms as $i => $room) {
            if (! $room->current_worker_id) {
                continue;
            }

            $days = $room->hold_days ?: (($i % 14) + 1);

            RoomHold::create([
                'room_id' => $room->id,
                'worker_id' => $room->current_worker_id,
                'company' => $room->company,
                'return_date' => $i % 3 === 0 ? null : $now->copy()->addDays(($i % 10) + 3),
                'hold_started_at' => $now->copy()->subDays($days),
                'policy_days' => 7,
                'over_policy' => $days > 7,
                'release_eligible' => $days > 10,
                'risk_level' => $days > 10 ? 'High' : ($days > 7 ? 'Medium' : 'Low'),
                'is_active' => true,
            ]);
        }
    }

    /**
     * @param  Collection<int, Room>  $rooms  Rooms already set to Maintenance Hold.
     */
    private function seedMaintenanceHolds(Collection $rooms): void
    {
        $issues = [
            'HVAC failure',
            'Plumbing — extended repair',
            'Electrical inspection',
            'Window seal / moisture',
            'Flooring repair',
        ];

        $today = Carbon::today();
        foreach ($rooms as $i => $room) {
            MaintenanceHold::create([
                'room_id' => $room->id,
                'issue' => $issues[$i % count($issues)],
                'eta_return' => $today->copy()->addDays(($i % 7) + 2),
                'overdue' => $i % 3 === 0,
                'is_active' => true,
            ]);
        }
    }

    /**
     * @param  Collection<int, Room>  $vacantDirty
     * @param  Collection<int, Room>  $onHoldDirty
     */
    private function seedHousekeepingTasks(Collection $vacantDirty, Collection $onHoldDirty): void
    {
        $priorities = ['Critical', 'High', 'Medium'];
        $etas = ['10:45 AM', '11:30 AM', '12:15 PM', '2:00 PM', '3:30 PM'];

        foreach ($vacantDirty as $i => $room) {
            HousekeepingTask::create([
                'room_id' => $room->id,
                'status' => RoomStatus::VacantDirty->value,
                'arrival_today' => $i % 2 === 0,
                'priority' => $priorities[$i % count($priorities)],
                'eta_clean' => $etas[$i % count($etas)],
            ]);
        }

        foreach ($onHoldDirty as $i => $room) {
            HousekeepingTask::create([
                'room_id' => $room->id,
                'status' => RoomStatus::OnHoldDirty->value,
                'arrival_today' => false,
                'priority' => $priorities[$i % count($priorities)],
                'eta_clean' => $etas[$i % count($etas)],
            ]);
        }
    }

    /**
     * Seeds the day-to-day reservations that populate the Reservation
     * Operations Queue: a realistic mix of statuses and approval states so the
     * queue contains genuinely actionable items (pending approvals, unassigned
     * arrivals, walk-ins, extensions, on-holds, no-shows) — not just the
     * forecast-volume "Arrival / Approved" rows seeded for the capacity charts.
     *
     * @param  array<string, Worker>  $workers
     * @param  Collection<int, Room>  $assignedPool  Rooms to attach assigned reservations to.
     */
    private function seedOperationalReservations(array $workers, Collection $assignedPool): void
    {
        $today = Carbon::today();
        $workerList = array_values($workers);
        $pool = $assignedPool->values();

        // status, approval, allotment, assigned?, arrivalOffset, stayLength, score
        $scenarios = [
            ['Walk-In', 'High', 'Pending', false, 0, 7, 72],
            ['Walk-In', 'Pending', 'Pending', false, 0, 6, 61],
            ['Walk-In', 'High', 'Pending', false, 0, 9, 69],
            ['Extension', 'Medium', 'Pending', true, -3, 11, 58],
            ['Extension', 'High', 'Pending', true, -2, 12, 64],
            ['Extension', 'Low', 'Allotted', true, -1, 7, 88],
            ['Arrival', 'Pending', 'Pending', false, 0, 12, 70],
            ['Arrival', 'High', 'Pending', false, 1, 14, 75],
            ['Arrival', 'Medium', 'Pending', false, 1, 10, 81],
            ['Arrival', 'Pending', 'On-Hold', false, 2, 9, 66],
            ['On-Hold', 'Approved', 'On-Hold', true, -5, 17, 85],
            ['On-Hold', 'Medium', 'On-Hold', true, -4, 15, 73],
            ['No-Show', '—', '—', false, -1, 7, 30],
            ['No-Show', '—', '—', false, -1, 6, 28],
            ['Check-In', 'Approved', 'Allotted', true, 0, 7, 92],
            ['Check-Out', 'Approved', 'Allotted', true, -7, 0, 77],
        ];

        $poolIndex = 0;
        foreach ($scenarios as $i => [$status, $approval, $allotment, $assigned, $arrivalOffset, $stay, $score]) {
            $worker = $workerList[$i % count($workerList)];

            $room = null;
            if ($assigned && $pool->isNotEmpty()) {
                $room = $pool[$poolIndex % $pool->count()];
                $poolIndex++;
            }

            $arrival = $today->copy()->addDays($arrivalOffset);

            Reservation::create([
                'worker_id' => $worker->id,
                'room_id' => $room?->id,
                'company' => $worker->company,
                'arrival_date' => $arrival->toDateString(),
                'departure_date' => $arrival->copy()->addDays($stay)->toDateString(),
                'status' => $status,
                'approval_status' => $approval,
                'allotment_status' => $allotment,
                'room_type' => $room?->room_type ?? 'Single Room',
                'ai_match_score' => $score,
            ]);
        }
    }

    /**
     * @param  array<string, Worker>  $workers
     * @param  Collection<int, Room>  $rooms
     */
    private function seedForecastMovementReservations(array $workers, Collection $rooms): void
    {
        $today = Carbon::today();
        $companies = ['Bechtel Corp', 'Turner Industrial', 'Fluor Enterprises', 'AECOM', 'Vertex Services'];
        $workerList = array_values($workers);
        $roomList = $rooms->all();

        for ($day = 0; $day < 14; $day++) {
            $arrivalDate = $today->copy()->addDays($day);
            $departureDate = $arrivalDate->copy()->addDays(rand(5, 14));

            for ($i = 0; $i < 12; $i++) {
                $worker = $workerList[array_rand($workerList)];
                $room = $roomList[array_rand($roomList)];

                Reservation::create([
                    'worker_id' => $worker->id,
                    'room_id' => $room->id,
                    'company' => $companies[$i % count($companies)],
                    'arrival_date' => $arrivalDate,
                    'departure_date' => $departureDate,
                    'status' => 'Arrival',
                    'approval_status' => 'Approved',
                    'allotment_status' => 'Allotted',
                    'room_type' => $room->room_type,
                    'ai_match_score' => rand(55, 95),
                ]);
            }
        }
    }

    private function seedContractorAllotments(): void
    {
        $rows = [
            ['Bechtel Corp', 420, 398, -22, 8, 'under'],
            ['Turner Industrial', 380, 412, 32, 4, 'over'],
            ['Fluor Enterprises', 290, 245, -45, 12, 'under'],
            ['AECOM', 180, 176, -4, 6, 'on-track'],
            ['Vertex Services', 120, 98, -22, 3, 'under'],
        ];

        foreach ($rows as [$name, $allotted, $used, $variance, $noShows, $trend]) {
            ContractorAllotment::create([
                'contractor' => $name,
                'allotted' => $allotted,
                'used' => $used,
                'variance' => $variance,
                'no_shows' => $noShows,
                'trend' => $trend,
                'period_start' => '2025-05-01',
                'period_end' => '2025-05-31',
            ]);
        }
    }

    private function seedForecastSnapshots(): void
    {
        $today = Carbon::today();
        $patterns = [
            [156, 102],
            [178, 118],
            [192, 134],
            [165, 141],
            [148, 129],
            [201, 112],
            [214, 98],
        ];

        foreach ($patterns as $offset => [$arr, $dep]) {
            ForecastSnapshot::create([
                'forecast_date' => $today->copy()->addDays($offset),
                'arrivals' => $arr,
                'departures' => $dep,
                'net' => $arr - $dep,
                'available' => 0,
                'shortage' => 0,
                'risk_level' => 'low',
            ]);
        }
    }

    /**
     * @param  Collection<int, Room>  $rooms  On-hold rooms eligible for release review.
     */
    private function seedReleaseCandidates(Collection $rooms): void
    {
        $rows = [
            ['On-hold 14 days, no return date confirmed', 'WFA Coordinator + Lodge Manager', 'High'],
            ['Worker departed; hold not released', 'Lodge Manager', 'Medium'],
            ['Return date passed; contractor no-show pattern', 'WFA Coordinator', 'Medium'],
            ['Duplicate hold — same worker on multiple rooms', 'Lodge Manager', 'Low'],
        ];

        $candidates = $rooms->take(count($rows))->values();

        foreach ($candidates as $i => $room) {
            [$reason, $approval, $risk] = $rows[$i];
            ReleaseCandidate::create([
                'room_id' => $room->id,
                'room_number' => $room->number,
                'dorm' => $room->dorm,
                'reason' => $reason,
                'approval_required' => $approval,
                'risk_level' => $risk,
            ]);
        }
    }

    private function seedOverflowScenarios(): void
    {
        $today = Carbon::today();
        $rows = [
            [2, 8, 6, 2, '$340/night', 'Release 6 on-holds before hotel overflow', 'High'],
            [5, 22, 14, 8, '$2,720/night', 'Escalate to Lodge Manager — multi-day pressure', 'Critical'],
            [6, 31, 18, 13, '$4,420/night', 'Trigger overflow planning meeting', 'Critical'],
        ];

        foreach ($rows as $row) {
            OverflowScenario::create([
                'scenario_date' => $today->copy()->addDays($row[0]),
                'shortage' => $row[1],
                'internal_recovery' => $row[2],
                'hotel_rooms' => $row[3],
                'cost_estimate' => $row[4],
                'recommendation' => $row[5],
                'risk_level' => $row[6],
            ]);
        }
    }
}
