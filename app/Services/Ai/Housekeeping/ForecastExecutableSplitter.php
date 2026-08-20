<?php

namespace App\Services\Ai\Housekeeping;

use App\Enums\HkTaskType;
use App\Enums\RoomStatus;
use App\Models\Reservation;
use App\Models\Room;
use App\Services\Ai\HousekeepingLabourTrainingStandard;
use App\Services\HousekeepingPlanning\HousekeepingStandardsService;
use Carbon\Carbon;

/**
 * Split forecast turnover from executable cleans.
 *
 * Due Out that is not vacant keeps forecast turnover and blocks the executable
 * clean. No Sleep / unused walk-down never invent Vacant or Ready.
 */
class ForecastExecutableSplitter
{
    /**
     * Stay states that still occupy the room. No-Sleep is occupancy, not vacancy.
     *
     * @var list<string>
     */
    public const OCCUPYING_STATUSES = [
        'Arrival',
        'Check-In',
        'On-Hold',
        'No-Sleep',
        'Confirmed',
    ];

    public function __construct(
        private readonly HousekeepingStandardsService $standards,
    ) {}

    /**
     * Classify one room for a work date.
     *
     * @return array<string, mixed>
     */
    public function classify(Room $room, Carbon $date, ?Reservation $dueOut = null, ?Reservation $arrival = null): array
    {
        $status = (string) $room->status;
        $statusEnum = RoomStatus::tryFrom($status);
        $occupying = $this->occupyingStay($room, $date);
        $noSleep = $occupying?->status === 'No-Sleep'
            || ($dueOut?->status === 'No-Sleep')
            || ($arrival?->status === 'No-Sleep');

        $dueOutToday = $dueOut !== null;
        $vacant = in_array($status, [
            RoomStatus::VacantDirty->value,
            RoomStatus::VacantClean->value,
        ], true);
        $physicallyOccupied = $status === RoomStatus::Occupied->value
            || $occupying !== null
            || $room->current_worker_id !== null;
        $executableSurface = in_array($status, [
            RoomStatus::VacantDirty->value,
            RoomStatus::OnHoldDirty->value,
            RoomStatus::AssignedArrival->value,
        ], true);

        $forecastTurnover = $dueOutToday || $status === RoomStatus::VacantDirty->value
            || $status === RoomStatus::OnHoldDirty->value;

        $blockedReason = null;
        $executable = false;

        if ($noSleep) {
            $blockedReason = 'No Sleep does not make a room Ready and does not release occupancy.';
        } elseif ($dueOutToday && ! $vacant && $physicallyOccupied) {
            $blockedReason = 'Due Out is not vacant — forecast turnover remains; executable clean is blocked.';
        } elseif ($status === RoomStatus::VacantClean->value) {
            $blockedReason = 'Room is already Vacant Clean (source fact). Do not invent a new Ready.';
            $forecastTurnover = $dueOutToday;
        } elseif (in_array($status, [
            RoomStatus::MaintenanceHold->value,
            RoomStatus::OutOfService->value,
            RoomStatus::BlockedReserved->value,
        ], true)) {
            $blockedReason = 'Maintenance / OOS / blocked rooms are not HK-executable. AI cannot release maintenance.';
            $forecastTurnover = false;
        } elseif ($executableSurface && ! $noSleep) {
            $executable = true;
        } elseif ($forecastTurnover && ! $executableSurface) {
            $blockedReason = 'Forecast turnover only — room is not on an executable dirty/prep status.';
        }

        $taskType = $this->recommendedTaskType($statusEnum, $dueOutToday, $arrival !== null);
        $standard = $this->standards->standardFor($taskType);

        return [
            'room_id' => $room->id,
            'room_number' => $room->number,
            'dorm' => $room->dorm,
            'housekeeping_status' => $status,
            'housekeeping_status_class' => EvidenceClass::SOURCE_FACT,
            'stay_status' => $occupying?->status,
            'stay_status_class' => EvidenceClass::SOURCE_FACT,
            'due_out' => $dueOutToday,
            'due_out_class' => EvidenceClass::SOURCE_FACT,
            'arrival_today' => $arrival !== null,
            'no_sleep' => $noSleep,
            'vacant' => $vacant,
            'vacant_class' => EvidenceClass::SOURCE_FACT,
            'ready' => $status === RoomStatus::VacantClean->value,
            'ready_class' => EvidenceClass::SOURCE_FACT,
            'forecast_turnover' => $forecastTurnover,
            'forecast_turnover_class' => EvidenceClass::DETERMINISTIC_CALC,
            'executable' => $executable,
            'executable_class' => EvidenceClass::DETERMINISTIC_CALC,
            'blocked_reason' => $blockedReason,
            'task_type' => $taskType->value,
            'points' => $standard['points'],
            'estimated_minutes' => $standard['minutes'],
            'pool' => HousekeepingLabourTrainingStandard::poolForTaskType($taskType->value),
            'priority' => $this->priority($arrival !== null, $dueOutToday, $taskType),
            'notes_untrusted' => true,
        ];
    }

    /**
     * Unused walk-down never invents Ready / Vacant and never releases occupancy.
     *
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    public function applyUnusedWalkDown(array $row): array
    {
        $row['unused_walk_down'] = true;
        $row['ready'] = false;
        $row['ready_class'] = EvidenceClass::SOURCE_FACT;
        $row['invented_ready'] = false;
        $row['blocked_reason'] = trim(
            ($row['blocked_reason'] ?? '').' Unused walk-down does not make a room Ready and does not release occupancy.',
        );
        $row['executable'] = false;
        $row['recommendation'] = 'Do not mark Ready from an unused walk-down.';
        $row['recommendation_class'] = EvidenceClass::RECOMMENDATION;

        return $row;
    }

    private function occupyingStay(Room $room, Carbon $date): ?Reservation
    {
        $dateStr = $date->toDateString();

        return $room->reservations
            ->first(function (Reservation $reservation) use ($dateStr) {
                if (! $reservation->arrival_date || ! $reservation->departure_date) {
                    return false;
                }

                if (! in_array((string) $reservation->status, self::OCCUPYING_STATUSES, true)) {
                    return false;
                }

                return $reservation->arrival_date->toDateString() <= $dateStr
                    && $reservation->departure_date->toDateString() > $dateStr;
            });
    }

    private function recommendedTaskType(?RoomStatus $status, bool $dueOut, bool $arrival): HkTaskType
    {
        if ($arrival) {
            return HkTaskType::ArrivalPrep;
        }

        return match ($status) {
            RoomStatus::VacantDirty, RoomStatus::Occupied => HkTaskType::CheckoutClean,
            RoomStatus::OnHoldDirty => HkTaskType::OnHoldDirtyClean,
            RoomStatus::AssignedArrival => HkTaskType::ArrivalPrep,
            default => $dueOut ? HkTaskType::CheckoutClean : HkTaskType::RegularClean,
        };
    }

    private function priority(bool $arrival, bool $dueOut, HkTaskType $type): string
    {
        if ($arrival || $type === HkTaskType::ArrivalPrep) {
            return 'Critical';
        }

        if ($dueOut || $type === HkTaskType::CheckoutClean) {
            return 'High';
        }

        return 'Medium';
    }
}
