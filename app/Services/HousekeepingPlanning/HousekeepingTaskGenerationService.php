<?php

namespace App\Services\HousekeepingPlanning;

use App\Enums\HkTaskType;
use App\Enums\RoomStatus;
use App\Models\HkWorkTask;
use App\Models\Reservation;
use App\Models\Room;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class HousekeepingTaskGenerationService
{
    public function __construct(
        private readonly HousekeepingStandardsService $standards,
    ) {}

    public function sync(Carbon $date): Collection
    {
        $generated = collect();
        $today = $date->toDateString();

        $rooms = Room::active()->with('currentWorker')->get();

        foreach ($rooms as $room) {
            $status = RoomStatus::tryFrom($room->status);
            if (! $status) {
                continue;
            }

            $taskType = match ($status) {
                RoomStatus::VacantDirty => HkTaskType::CheckoutClean,
                RoomStatus::OnHoldDirty => HkTaskType::OnHoldDirtyClean,
                RoomStatus::AssignedArrival => HkTaskType::ArrivalPrep,
                default => null,
            };

            if (! $taskType) {
                continue;
            }

            $generated->push($this->upsertTask($room, $taskType, $today, $this->priorityFor($taskType, $room)));
        }

        $arrivals = Reservation::query()
            ->whereDate('arrival_date', $today)
            ->whereIn('status', ['Arrival', 'Check-In', 'Confirmed'])
            ->with('room')
            ->get();

        foreach ($arrivals as $reservation) {
            if (! $reservation->room) {
                continue;
            }

            $generated->push($this->upsertTask(
                $reservation->room,
                HkTaskType::ArrivalPrep,
                $today,
                'Critical',
                $reservation->id,
                true,
            ));
        }

        $departures = Reservation::query()
            ->whereDate('departure_date', $today)
            ->with('room')
            ->get();

        foreach ($departures as $reservation) {
            if (! $reservation->room) {
                continue;
            }

            $generated->push($this->upsertTask(
                $reservation->room,
                HkTaskType::CheckoutClean,
                $today,
                'High',
                $reservation->id,
            ));
        }

        return $generated->filter();
    }

    private function upsertTask(
        Room $room,
        HkTaskType $type,
        string $date,
        string $priority,
        ?int $reservationId = null,
        bool $arrivalToday = false,
    ): ?HkWorkTask {
        $fingerprint = "{$date}:{$room->id}:{$type->value}";
        $standard = $this->standards->standardFor($type);
        $requiredBy = Carbon::parse($date)->setTime($priority === 'Critical' ? 14 : 16, 0);

        $existing = HkWorkTask::query()->where('fingerprint', $fingerprint)->first();
        if ($existing && in_array($existing->status, ['Completed', 'Passed Inspection'], true)) {
            return $existing;
        }

        return HkWorkTask::updateOrCreate(
            ['fingerprint' => $fingerprint],
            [
                'room_id' => $room->id,
                'reservation_id' => $reservationId,
                'work_date' => $date,
                'task_type' => $type->value,
                'priority' => $priority,
                'points' => $standard['points'],
                'estimated_minutes' => $standard['minutes'],
                'required_by' => $requiredBy,
                'status' => $existing?->status ?? 'Pending',
                'inspection_required' => $standard['inspection_required'],
                'arrival_today' => $arrivalToday || $type === HkTaskType::ArrivalPrep,
                'readiness_risk' => $this->readinessRisk($priority),
                'notes' => "Auto-generated from {$room->status}",
            ],
        );
    }

    private function priorityFor(HkTaskType $type, Room $room): string
    {
        return match ($type) {
            HkTaskType::ArrivalPrep => 'Critical',
            HkTaskType::CheckoutClean => 'High',
            HkTaskType::OnHoldDirtyClean => 'Medium',
            default => 'Low',
        };
    }

    private function readinessRisk(string $priority): string
    {
        return match ($priority) {
            'Critical' => 'high',
            'High' => 'medium',
            default => 'low',
        };
    }
}
