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
use App\Services\Ai\RoomInventoryAvailabilityInspector;
use App\Services\Ai\RoomInventoryConflictScanner;
use App\Services\Ai\Support\AiCompletionRequest;
use App\Services\RoomUtilization\RoomAiMatchingService;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class RoomInventoryIntelligenceAgent
{
    public const AGENT = 'room_inventory_intelligence';

    /** Primary locked module (Reservations & Occupancy). */
    public const CAPABILITY = 'SL-02';

    /** Shared with Front Desk. Official IDs only. */
    public const CAPABILITIES = ['SL-02', 'SL-03'];

    /** Proposal / shadow only. */
    public const CLASS_MODE = 'P';

    public function __construct(
        private readonly RoomAiMatchingService $matching,
        private readonly RoomInventoryAvailabilityInspector $inspector,
        private readonly RoomInventoryConflictScanner $conflicts,
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
        $this->assertGenerationEnabled();
        $this->capabilities->assertKnownMany(self::CAPABILITIES);

        $reservation->loadMissing('worker', 'room');

        if ($reservation->room_id) {
            throw ValidationException::withMessages([
                'reservation' => 'This reservation already has a room.',
            ]);
        }

        $room = $this->matching->bestRoomFor($reservation);
        if (! $room || ! $this->inspector->isAvailable($room, $reservation)) {
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
            'bound_capabilities' => self::CAPABILITIES,
            'execute_via' => 'RoomAssignmentService::assign',
        ]);

        $fingerprint = sha1(self::AGENT.'|recommend_room|'.$reservation->id.'|'.$room->id);
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
     * Persist conflict flags as flag_risk proposals. Never writes occupancy.
     *
     * @return Collection<int, AiProposal>
     */
    public function scanConflicts(?User $user = null, int $limit = 40): Collection
    {
        if (! $this->flags->generationEnabled(self::AGENT)) {
            return collect();
        }

        $this->capabilities->assertKnownMany(self::CAPABILITIES);

        $created = collect();

        foreach ($this->conflicts->detect() as $flag) {
            if ($created->count() >= $limit) {
                break;
            }

            try {
                $created->push($this->persistConflictFlag($flag, $user));
            } catch (ValidationException) {
                continue;
            }
        }

        return $created->filter()->values();
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
        $pool = $this->matching->inventoryAssignableRooms()
            ->filter(fn (Room $room) => $this->inspector->isAvailable($room));

        foreach ($reservations as $reservation) {
            if ($reservation->room_id || ! $reservation->worker_id) {
                continue;
            }

            if (in_array($reservation->status, RoomInventoryAvailabilityInspector::TERMINAL_STATUSES, true)) {
                continue;
            }

            $room = $this->matching->bestRoomFromPool($reservation, $pool);
            if (! $room) {
                continue;
            }

            try {
                $created->push($this->proposeForReservation($reservation, $user));
                $pool = $pool->reject(fn (Room $r) => $r->id === $room->id)->values();
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
        $bound = $proposal->payload['bound_capabilities'] ?? self::CAPABILITIES;

        return [
            'id' => $proposal->id,
            'capabilityId' => $proposal->capability_id,
            'capabilityIds' => $bound,
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
            'conflictCode' => $proposal->payload['code'] ?? null,
        ];
    }

    /**
     * Read models for the Cloudflare MCP surface. No occupancy writes.
     *
     * @return list<array<string, mixed>>
     */
    public function listRooms(int $limit = 200): array
    {
        return Room::query()
            ->fromInventory()
            ->active()
            ->with(['activeHold', 'activeMaintenanceHold', 'currentWorker'])
            ->orderBy('dorm')
            ->orderByRaw('CAST(number AS UNSIGNED)')
            ->limit($limit)
            ->get()
            ->map(fn (Room $room) => $this->presentRoom($room))
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listReservations(int $limit = 200): array
    {
        return Reservation::query()
            ->with(['worker', 'room'])
            ->orderByDesc('arrival_date')
            ->limit($limit)
            ->get()
            ->map(fn (Reservation $reservation) => $this->presentReservation($reservation))
            ->all();
    }

    /**
     * @return array{rooms: int, occupying: int, vacant_clean_available: int, conflicts: int}
     */
    public function occupancySummary(): array
    {
        $rooms = Room::query()->fromInventory()->active()->with(['activeHold', 'activeMaintenanceHold'])->get();
        $reservations = Reservation::query()->with(['room', 'worker'])->get();
        $available = $rooms->filter(fn (Room $room) => $this->inspector->isAvailable($room))->count();

        return [
            'rooms' => $rooms->count(),
            'occupying' => $reservations->filter(
                fn (Reservation $reservation) => $this->inspector->occupiesInventory($reservation),
            )->count(),
            'vacant_clean_available' => $available,
            'conflicts' => $this->conflicts->detect($rooms, $reservations)->count(),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listAvailability(?int $reservationId = null, int $limit = 200): array
    {
        $for = $reservationId ? Reservation::query()->find($reservationId) : null;
        $rooms = $for
            ? $this->inspector->availableRooms($for)
            : $this->inspector->availableRooms();

        return $rooms
            ->take($limit)
            ->map(fn (Room $room) => $this->presentRoom($room, $for))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function presentRoom(Room $room, ?Reservation $for = null): array
    {
        $reasons = $this->inspector->unavailableReasons($room, $for);

        return [
            'id' => $room->id,
            'number' => $room->number,
            'dorm' => $room->dorm,
            'room_type' => $room->room_type,
            'status' => $room->status,
            'current_worker_id' => $room->current_worker_id,
            'from_inventory' => $room->room_inventory_location_id !== null,
            'available' => $reasons === [],
            'unavailable_reasons' => $reasons,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function presentReservation(Reservation $reservation): array
    {
        return [
            'id' => $reservation->id,
            'worker' => $reservation->worker?->name,
            'company' => $reservation->company,
            'status' => $reservation->status,
            'room_id' => $reservation->room_id,
            'room_number' => $reservation->room?->number,
            'dorm' => $reservation->room?->dorm,
            'arrival_date' => $reservation->arrival_date?->toDateString(),
            'departure_date' => $reservation->departure_date?->toDateString(),
            'room_type' => $reservation->room_type,
            'occupies_inventory' => $this->inspector->occupiesInventory($reservation),
        ];
    }

    private function assertGenerationEnabled(): void
    {
        if (! $this->flags->generationEnabled(self::AGENT)) {
            throw ValidationException::withMessages([
                'ai' => 'Room Inventory Intelligence is turned off.',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $flag
     */
    private function persistConflictFlag(array $flag, ?User $user): ?AiProposal
    {
        $payload = $this->validator->validateProposalPayload([
            'action' => 'flag_risk',
            'code' => $flag['code'],
            'room_id' => $flag['room_id'] ?? null,
            'reservation_id' => $flag['reservation_id'] ?? null,
            'bound_capabilities' => self::CAPABILITIES,
            'execute_via' => null,
        ]);

        $fingerprint = sha1(self::AGENT.'|flag_risk|'.$flag['code'].'|'.($flag['room_id'] ?? '').'|'.($flag['reservation_id'] ?? ''));
        $existing = AiProposal::query()->where('fingerprint', $fingerprint)->first();

        if ($existing && in_array($existing->status, ['Approved', 'Dismissed'], true)) {
            return null;
        }

        $proposal = AiProposal::query()->updateOrCreate(
            ['fingerprint' => $fingerprint],
            [
                'user_id' => $user?->id ?? $existing?->user_id,
                'capability_id' => self::CAPABILITY,
                'agent' => self::AGENT,
                'action' => 'flag_risk',
                'issue' => $flag['issue'],
                'risk_level' => $flag['risk'],
                'data_used' => implode('; ', array_filter([
                    'RoomInventoryConflictScanner',
                    $flag['code'],
                    isset($flag['room_number']) ? "room {$flag['room_number']} {$flag['dorm']} {$flag['status']}" : null,
                    isset($flag['reservation_id']) ? "reservation #{$flag['reservation_id']}" : null,
                    'SL-02 + SL-03',
                ])),
                'recommendation' => $flag['recommendation'],
                'approval_required' => 'Human acknowledgement. AI will not write occupancy.',
                'next_action' => 'Review the conflict, then Approve to acknowledge or Dismiss.',
                'status' => 'Pending',
                'payload' => $payload,
                'explanation' => null,
            ],
        );

        if ($proposal->wasRecentlyCreated) {
            $this->logProposal($proposal, 'generated', $user, 'Room Inventory Intelligence flagged a conflict.');
        }

        return $proposal;
    }

    private function explain(Reservation $reservation, Room $room, int $score, ?User $user): string
    {
        $fallback = "Deterministic match score {$score} using room type, company, gender/dorm, and Vacant Clean availability.";

        try {
            $result = $this->runner->complete(new AiCompletionRequest(
                input: [
                    [
                        'role' => 'system',
                        'content' => 'You explain LodgeX room-match proposals for SL-02 and SL-03. Never assign a room. Never instruct anyone to write occupancy. AI recommends; people approve.',
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
            'RoomAiMatchingService + RoomInventoryAvailabilityInspector',
            'SL-02 + SL-03',
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
                'bound_capabilities' => self::CAPABILITIES,
                'reservation_id' => $proposal->payload['reservation_id'] ?? null,
                'room_id' => $proposal->payload['room_id'] ?? null,
            ],
        ]);
    }
}
