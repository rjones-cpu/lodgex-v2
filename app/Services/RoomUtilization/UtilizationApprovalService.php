<?php

namespace App\Services\RoomUtilization;

use App\Enums\UtilizationApprovalType;
use App\Models\ContractorAllotment;
use App\Models\OverflowScenario;
use App\Models\RoomHold;
use App\Models\User;
use App\Models\UtilizationApprovalRequest;
use Illuminate\Support\Collection;

class UtilizationApprovalService
{
    public function __construct(
        private readonly UtilizationAuditLogger $auditLogger,
    ) {}

    /**
     * @param  list<array<string, mixed>>  $candidates
     */
    public function submitReleaseList(array $candidates, User $user): UtilizationApprovalRequest
    {
        $rooms = collect($candidates)->pluck('room')->sort()->values()->all();
        $fingerprint = 'room_release:'.now()->toDateString().':'.hash('sha256', implode(',', $rooms));

        $highRisk = collect($candidates)->contains(fn (array $c) => in_array($c['risk'] ?? '', ['High', 'Critical'], true));

        return $this->queue(
            UtilizationApprovalType::RoomRelease,
            $fingerprint,
            'On-hold release list for approval',
            sprintf(
                'Request to review %d on-hold room(s) for release. Rooms: %s.',
                count($candidates),
                implode(', ', array_slice($rooms, 0, 12)).(count($rooms) > 12 ? '…' : ''),
            ),
            $highRisk ? 'High' : 'Medium',
            'WFA Coordinator + Lodge Manager',
            ['rooms' => $candidates],
            $user,
        );
    }

    public function submitOverflowEscalation(CapacityForecastResult $forecast, RoomStatusSummary $summary, User $user): UtilizationApprovalRequest
    {
        $scenario = OverflowScenario::query()->orderByDesc('shortage')->first();
        $shortage = $scenario?->shortage ?? $summary->projectedShortageTonight;
        $peakRisk = $forecast->outlook['7d']['peakRisk'] ?? 'medium';

        $fingerprint = 'hotel_overflow:'.now()->toDateString().':'.$shortage;

        return $this->queue(
            UtilizationApprovalType::HotelOverflow,
            $fingerprint,
            'Hotel overflow escalation packet',
            sprintf(
                'Escalate hotel overflow planning. Projected shortage tonight: %d. 7-day peak risk: %s. Internal recovery options should be exhausted first.',
                $summary->projectedShortageTonight,
                $peakRisk,
            ),
            in_array($peakRisk, ['high', 'critical'], true) ? 'High' : 'Medium',
            'Lodge Manager + Operations Director',
            [
                'shortageTonight' => $summary->projectedShortageTonight,
                'peakRisk7d' => $peakRisk,
                'scenario' => $scenario?->only(['scenario_date', 'shortage', 'hotel_rooms', 'cost_estimate', 'recommendation']),
            ],
            $user,
        );
    }

    public function submitWalkIn(string $workerName, string $roomNumber, string $dorm, User $user): UtilizationApprovalRequest
    {
        $fingerprint = 'walk_in:'.now()->toDateString().":{$roomNumber}|{$dorm}";

        return $this->queue(
            UtilizationApprovalType::WalkIn,
            $fingerprint,
            "Walk-in placement — {$workerName}",
            "Request approval to place walk-in {$workerName} in room {$roomNumber} ({$dorm}).",
            'Medium',
            'Lodge Manager',
            ['worker' => $workerName, 'room' => $roomNumber, 'dorm' => $dorm],
            $user,
        );
    }

    public function submitAllotmentReview(ContractorAllotment $allotment, User $user): UtilizationApprovalRequest
    {
        $fingerprint = 'allotment:'.$allotment->id.':'.now()->toDateString();

        return $this->queue(
            UtilizationApprovalType::AllotmentChange,
            $fingerprint,
            "Contractor allotment review — {$allotment->contractor}",
            sprintf(
                '%s is %d rooms over allotment (allotted %d, used %d). Review before accepting additional arrivals.',
                $allotment->contractor,
                max(0, $allotment->variance),
                $allotment->allotted,
                $allotment->used,
            ),
            $allotment->variance > 20 ? 'High' : 'Medium',
            'Lodge Manager',
            $allotment->only(['contractor', 'allotted', 'used', 'variance', 'no_shows', 'trend']),
            $user,
        );
    }

    public function approve(UtilizationApprovalRequest $request, User $user, ?string $notes = null): UtilizationApprovalRequest
    {
        $request->update([
            'status' => 'Approved',
            'decided_by' => $user->id,
            'decided_at' => now(),
        ]);

        $this->auditLogger->logApproval(
            $request,
            'approved',
            $user,
            $notes ?? 'Operational approval granted. Execution still requires front-desk action.',
        );

        return $request;
    }

    public function reject(UtilizationApprovalRequest $request, User $user, ?string $notes = null): UtilizationApprovalRequest
    {
        $request->update([
            'status' => 'Rejected',
            'decided_by' => $user->id,
            'decided_at' => now(),
        ]);

        $this->auditLogger->logApproval(
            $request,
            'rejected',
            $user,
            $notes ?? 'Operational approval rejected.',
        );

        return $request;
    }

    /**
     * @return Collection<int, UtilizationApprovalRequest>
     */
    public function seedEscalationsIfEmpty(RoomStatusSummary $summary, CapacityForecastResult $forecast): Collection
    {
        if (UtilizationApprovalRequest::pending()->exists()) {
            return UtilizationApprovalRequest::pending()->get();
        }

        $created = collect();

        $overAllotment = ContractorAllotment::query()
            ->whereColumn('used', '>', 'allotted')
            ->orderByDesc('variance')
            ->first();
        if ($overAllotment) {
            $created->push($this->submitAllotmentReview($overAllotment, $this->systemUser()));
        }

        $walkInHold = RoomHold::query()->active()->with('room', 'worker')->latest()->first();
        if ($walkInHold?->room) {
            $created->push($this->submitWalkIn(
                $walkInHold->worker?->name ?? 'Walk-in worker',
                $walkInHold->room->number,
                $walkInHold->room->dorm,
                $this->systemUser(),
            ));
        }

        return $created;
    }

    private function queue(
        UtilizationApprovalType $type,
        string $fingerprint,
        string $title,
        string $summary,
        string $riskLevel,
        string $approvalRequired,
        array $payload,
        User $user,
    ): UtilizationApprovalRequest {
        $request = UtilizationApprovalRequest::firstOrCreate(
            ['fingerprint' => $fingerprint],
            [
                'type' => $type->value,
                'title' => $title,
                'summary' => $summary,
                'risk_level' => $riskLevel,
                'status' => 'Pending',
                'approval_required' => $approvalRequired,
                'payload' => $payload,
                'requested_by' => $user->id,
            ],
        );

        if ($request->wasRecentlyCreated) {
            $this->auditLogger->logApproval(
                $request,
                'submitted',
                $user,
                'Approval request queued for manager review.',
            );
        }

        return $request;
    }

    private function systemUser(): User
    {
        return User::query()->first() ?? User::factory()->create();
    }
}
