<?php

namespace App\Services\Ai\Agents;

use App\Models\AiProposal;
use App\Models\AiProposalAuditLog;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\User;
use App\Services\Ai\AiFeatureFlags;
use App\Services\Ai\AiOutputValidator;
use App\Services\Ai\AiRunner;
use App\Services\Ai\CapabilityResolver;
use App\Services\Ai\Support\AiCompletionRequest;
use App\Services\RoomUtilization\RoomAiMatchingService;
use App\Services\RoomUtilization\RoomAvailabilityService;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class RoomInventoryIntelligenceAgent
{
    public const AGENT = 'room_inventory_intelligence';

    public const CAPABILITY = 'SL-01';

    public function __construct(
        private readonly RoomAiMatchingService $matching,
        private readonly RoomAvailabilityService $availability,
        private readonly CapabilityResolver $capabilities,
        private readonly AiFeatureFlags $flags,
        private readonly AiOutputValidator $validator,
        private readonly AiRunner $runner,
    ) {}

    /**
     * Propose a Vacant Clean room. Never assigns.
     */
    public function proposeForReservation(Reservation $reservation, ?User $user = null): AiProposal
    {
        if (! $this->flags->generationEnabled(self::AGENT)) {
            throw ValidationException::withMessages([
                'ai' => 'Room Inventory Intelligence is turned off.',
            ]);
        }

        $this->capabilities->assertKnown(self::CAPABILITY);

        $reservation->loadMissing('worker', 'room');

        if ($reservation->room_id) {
            throw ValidationException::withMessages([
                'reservation' => 'This reservation already has a room.',
            ]);
        }

        $room = $this->matching->bestRoomFor($reservation);
        if (! $room || ! $this->availability->isAvailableForAssignment($room)) {
            throw ValidationException::withMessages([
                'room' => 'No assignable Vacant Clean room matched this reservation.',
            ]);
        }

        $score = $this->matching->score($reservation, $room);
        $payload = $this->validator->validateProposalPayload([
            'action' => 'recommend_room',
            'reservation_id' => $reservation->id,
            'room_id' => $room->id,
            'score' => $score,
            'execute_via' => 'RoomAssignmentService::assign',
        ]);

        $fingerprint = sha1(self::AGENT.'|'.$reservation->id.'|'.$room->id);
        $explanation = $this->explain($reservation, $room, $score, $user);

        $existing = AiProposal::query()->where('fingerprint', $fingerprint)->first();
        $proposal = AiProposal::query()->updateOrCreate(
            ['fingerprint' => $fingerprint],
            [
                'user_id' => $user?->id ?? $existing?->user_id,
                'capability_id' => self::CAPABILITY,
                'agent' => self::AGENT,
                'action' => 'recommend_room',
                'issue' => "Unassigned reservation needs a Vacant Clean room for {$reservation->worker?->name}.",
                'risk_level' => 'medium',
                'data_used' => $this->dataUsed($reservation, $room, $score),
                'recommendation' => "Propose room {$room->number} ({$room->dorm}) — do not assign until a person approves.",
                'approval_required' => 'Human approval via RoomAssignmentService::assign',
                'next_action' => 'Review match, then Approve to assign or Dismiss.',
                'status' => $existing?->status === 'Approved' ? 'Approved' : 'Pending',
                'payload' => $payload,
                'explanation' => $explanation,
            ],
        );

        if ($proposal->wasRecentlyCreated) {
            $this->logProposal($proposal, 'generated', $user, 'Room Inventory Intelligence created a shadow proposal.');
        }

        return $proposal;
    }

    /**
     * @param  Collection<int, Reservation>  $reservations
     * @return Collection<int, AiProposal>
     */
    public function syncUnassigned(Collection $reservations, ?User $user = null): Collection
    {
        if (! $this->flags->generationEnabled(self::AGENT)) {
            return collect();
        }

        $created = collect();
        $pool = $this->matching->inventoryAssignableRooms();

        foreach ($reservations as $reservation) {
            if ($reservation->room_id || ! $reservation->worker_id) {
                continue;
            }

            if (in_array($reservation->status, ['No-Show', 'Check-Out', 'No-Sleep'], true)) {
                continue;
            }

            $room = $this->matching->bestRoomFromPool($reservation, $pool);
            if (! $room) {
                continue;
            }

            try {
                $created->push($this->proposeForReservation($reservation, $user));
            } catch (ValidationException) {
                continue;
            }
        }

        return $created;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function presentPending(?int $limit = 20): array
    {
        return AiProposal::query()
            ->where('agent', self::AGENT)
            ->where('status', 'Pending')
            ->latest()
            ->limit($limit ?? 20)
            ->get()
            ->map(fn (AiProposal $proposal) => $this->present($proposal))
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function present(AiProposal $proposal): array
    {
        return [
            'id' => $proposal->id,
            'capabilityId' => $proposal->capability_id,
            'agent' => $proposal->agent,
            'action' => $proposal->action,
            'issue' => $proposal->issue,
            'risk' => $proposal->risk_level,
            'dataUsed' => $proposal->data_used,
            'recommendation' => $proposal->recommendation,
            'approvalRequired' => $proposal->approval_required,
            'nextAction' => $proposal->next_action,
            'status' => $proposal->status,
            'explanation' => $proposal->explanation,
            'reservationId' => $proposal->payload['reservation_id'] ?? null,
            'roomId' => $proposal->payload['room_id'] ?? null,
            'score' => $proposal->payload['score'] ?? null,
        ];
    }

    private function explain(Reservation $reservation, Room $room, int $score, ?User $user): string
    {
        $fallback = "Deterministic match score {$score} using room type, company, gender/dorm, and Vacant Clean availability.";

        try {
            $result = $this->runner->complete(new AiCompletionRequest(
                input: [
                    [
                        'role' => 'system',
                        'content' => 'You explain LodgeX room-match proposals. Never assign a room. Never instruct anyone to write the database. AI recommends; people approve.',
                    ],
                    [
                        'role' => 'user',
                        'content' => "Explain why room {$room->number} ({$room->dorm}, {$room->room_type}, status {$room->status}) is a shadow proposal for {$reservation->worker?->name} ({$reservation->company}, {$reservation->room_type}). Score {$score}.",
                    ],
                ],
                capabilityId: self::CAPABILITY,
                agent: self::AGENT,
            ), $user);

            return $result->text !== '' ? $result->text : $fallback;
        } catch (\Throwable) {
            return $fallback;
        }
    }

    private function dataUsed(Reservation $reservation, Room $room, int $score): string
    {
        return implode('; ', [
            'RoomAiMatchingService + RoomAvailabilityService',
            "reservation #{$reservation->id}",
            "requested type {$reservation->room_type}",
            "company {$reservation->company}",
            "room {$room->number} {$room->dorm} {$room->status}",
            "score {$score}",
            'Vacant Clean and not held/blocked/assigned/restricted/maintenance',
        ]);
    }

    private function logProposal(AiProposal $proposal, string $action, ?User $user, string $notes): void
    {
        AiProposalAuditLog::query()->create([
            'ai_proposal_id' => $proposal->id,
            'user_id' => $user?->id,
            'action' => $action,
            'notes' => $notes,
            'context' => [
                'capability_id' => $proposal->capability_id,
                'reservation_id' => $proposal->payload['reservation_id'] ?? null,
                'room_id' => $proposal->payload['room_id'] ?? null,
            ],
        ]);
    }
}
