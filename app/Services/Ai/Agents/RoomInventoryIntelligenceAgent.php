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
use App\Services\Ai\ReservationTrainingStandard;
use App\Services\Ai\RoomInventoryAvailabilityInspector;
use App\Services\Ai\RoomInventoryConflictScanner;
use App\Services\Ai\Support\AiCompletionRequest;
use App\Services\RoomUtilization\RoomAiMatchingService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
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
     * Recommend a room after ledger + fitness. Never assigns. Wave 1 auto-assign is OFF.
     */
    public function proposeForReservation(Reservation $reservation, ?User $user = null): AiProposal
    {
        $this->assertGenerationEnabled();
        $this->capabilities->assertKnownMany(self::CAPABILITIES);

        return DB::transaction(function () use ($reservation, $user) {
            $reservation->loadMissing('worker', 'room');

            if ($reservation->room_id) {
                throw ValidationException::withMessages([
                    'reservation' => 'This reservation already has a room.',
                ]);
            }

            if (! $reservation->arrival_date || ! $reservation->departure_date) {
                throw ValidationException::withMessages([
                    'reservation' => 'Arrival and departure dates are required. AI will not invent dates.',
                ]);
            }

            $ranked = $this->rankCandidates($reservation);
            $selected = $ranked->first();
            $room = $selected['room'] ?? null;

            if (! $room instanceof Room) {
                throw ValidationException::withMessages([
                    'room' => 'No room passed the stay ledger and check-in fitness gate for this reservation.',
                ]);
            }

            Room::query()->whereKey($room->id)->lockForUpdate()->first();
            $room->refresh();
            $room->load(['activeHold', 'activeMaintenanceHold', 'reservations']);

            if (! $this->inspector->isAvailable($room, $reservation)) {
                throw ValidationException::withMessages([
                    'room' => 'No room passed the stay ledger and check-in fitness gate for this reservation.',
                ]);
            }

            $score = (int) $selected['score'];
            $payload = $this->validator->validateProposalPayload(
                $this->recommendPayload($reservation, $room, $ranked, $score),
            );

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
                    'issue' => "Unassigned reservation needs a recommended room for {$reservation->worker?->name}.",
                    'risk_level' => 'medium',
                    'data_used' => $this->dataUsed($reservation, $room, $score),
                    'recommendation' => "Propose room {$room->number} ({$room->dorm}) — do not assign until a person approves.",
                    'approval_required' => 'Human approval via RoomAssignmentService::assign. Wave 1 auto-assign is OFF.',
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
        });
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

        foreach ($reservations as $reservation) {
            if ($reservation->room_id || ! $reservation->worker_id) {
                continue;
            }

            if (in_array($reservation->status, RoomInventoryAvailabilityInspector::RELEASED_STATUSES, true)) {
                continue;
            }

            if ($reservation->status === 'No-Show' && $reservation->room_id === null) {
                continue;
            }

            $ranked = $this->rankCandidates($reservation);
            $selected = $ranked->first();
            $room = $selected['room'] ?? null;
            if (! $room instanceof Room) {
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
            'reservationId' => $proposal->payload['reservation_id'] ?? $proposal->payload['target']['reservation_id'] ?? null,
            'roomId' => $proposal->payload['room_id'] ?? $proposal->payload['target']['room_id'] ?? null,
            'score' => $proposal->payload['score'] ?? null,
            'conflictCode' => $proposal->payload['code'] ?? null,
            'decision' => $proposal->payload['decision'] ?? null,
            'currentState' => $proposal->payload['current_state'] ?? null,
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
     * Snapshot counts. Not the transactional stay-ledger check.
     *
     * @return array<string, mixed>
     */
    public function occupancySummary(): array
    {
        $rooms = Room::query()->fromInventory()->active()->with(['activeHold', 'activeMaintenanceHold', 'reservations'])->get();
        $reservations = Reservation::query()->with(['room', 'worker'])->get();
        $fitAndUncommitted = $rooms->filter(fn (Room $room) => $this->inspector->isAvailable($room))->count();

        return [
            'rooms' => $rooms->count(),
            'physical_rooms' => $this->inspector->physicalRooms()->count(),
            'assignable_rooms' => $this->inspector->assignableRooms()->count(),
            'occupying' => $reservations->filter(
                fn (Reservation $reservation) => $this->inspector->occupiesInventory($reservation),
            )->count(),
            'physically_occupied' => $reservations->filter(
                fn (Reservation $reservation) => $this->inspector->occupiesPhysically($reservation),
            )->count(),
            'retained_committed' => $reservations->filter(
                fn (Reservation $reservation) => $this->inspector->isRetained($reservation),
            )->count(),
            'confirmed_committed' => $reservations->filter(
                fn (Reservation $reservation) => $this->inspector->deductsInventory($reservation),
            )->count(),
            'fit_for_check_in' => $rooms->filter(
                fn (Room $room) => $this->inspector->isFitForCheckIn($room),
            )->count(),
            'vacant_clean_available' => $fitAndUncommitted,
            'availability_note' => 'Dashboard totals are not the transactional check. Availability is a full-stay room-night ledger. Vacant Clean is fitness only.',
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
        $ledger = $this->inspector->ledgerReasons($room, $for);
        $fitness = $this->inspector->fitnessReasons($room);

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
            'ledger_available' => $ledger === [],
            'ledger_reasons' => $ledger,
            'fit_for_check_in' => $fitness === [],
            'fitness_reasons' => $fitness,
            'hold_kind' => $this->inspector->holdKind($room, $for),
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
            'deducts_inventory' => $this->inspector->deductsInventory($reservation),
            'physically_occupied' => $this->inspector->occupiesPhysically($reservation),
            'current_state' => $this->inspector->sevenState($reservation),
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
        $payload = $this->validator->validateProposalPayload($this->flagPayload($flag));

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
        $fallback = "Deterministic match score {$score} using room type, company, gender/dorm, stay-night ledger, then Vacant Clean fitness. AI recommends; people approve.";

        try {
            $result = $this->runner->complete(new AiCompletionRequest(
                input: [
                    [
                        'role' => 'system',
                        'content' => ReservationTrainingStandard::SYSTEM_INSTRUCTION_16_1,
                    ],
                    [
                        'role' => 'user',
                        'content' => "Explain why room {$room->number} ({$room->dorm}, {$room->room_type}, housekeeping {$room->status}) is a class P recommendation for {$reservation->worker?->name} ({$reservation->company}, {$reservation->room_type}, stay {$reservation->arrival_date?->toDateString()}–{$reservation->departure_date?->toDateString()}, approval {$reservation->approval_status}). Score {$score}. Decision must be approval required. Do not assign.",
                    ],
                ],
                capabilityId: self::CAPABILITY,
                agent: self::AGENT,
                metadata: [
                    'rule_version' => ReservationTrainingStandard::ruleVersion(),
                    'langsmith_project' => 'lodgex-room-inventory-intelligence',
                ],
            ), $user);

            return $result->text !== '' ? $result->text : $fallback;
        } catch (\Throwable) {
            return $fallback;
        }
    }

    private function dataUsed(Reservation $reservation, Room $room, int $score): string
    {
        return implode('; ', [
            'RoomAiMatchingService + RoomInventoryAvailabilityInspector ledger then fitness',
            ReservationTrainingStandard::citation(),
            'SL-02 + SL-03',
            "reservation #{$reservation->id}",
            "requested type {$reservation->room_type}",
            "company {$reservation->company}",
            "room {$room->number} {$room->dorm} housekeeping {$room->status}",
            "score {$score}",
            'rule '.ReservationTrainingStandard::ruleVersion(),
        ]);
    }

    /**
     * @return Collection<int, array{room: Room, score: int, ledger_reasons: list<string>, fitness_reasons: list<string>}>
     */
    private function rankCandidates(Reservation $reservation): Collection
    {
        $pool = $this->matching->inventoryAssignableRooms();

        return $pool
            ->map(function (Room $room) use ($reservation) {
                $room->loadMissing(['activeHold', 'activeMaintenanceHold', 'reservations']);

                return [
                    'room' => $room,
                    'score' => $this->matching->score($reservation, $room),
                    'ledger_reasons' => $this->inspector->ledgerReasons($room, $reservation),
                    'fitness_reasons' => $this->inspector->fitnessReasons($room),
                ];
            })
            ->filter(fn (array $row) => $row['ledger_reasons'] === [] && $row['fitness_reasons'] === [])
            ->sort(function (array $a, array $b) {
                $score = $b['score'] <=> $a['score'];
                if ($score !== 0) {
                    return $score;
                }

                return strcmp((string) $a['room']->number, (string) $b['room']->number);
            })
            ->values();
    }

    /**
     * @param  Collection<int, array{room: Room, score: int, ledger_reasons: list<string>, fitness_reasons: list<string>}>  $ranked
     * @return array<string, mixed>
     */
    private function recommendPayload(Reservation $reservation, Room $room, Collection $ranked, int $score): array
    {
        $candidates = $ranked->take(8)->map(fn (array $row) => [
            'room_id' => $row['room']->id,
            'number' => $row['room']->number,
            'dorm' => $row['room']->dorm,
            'room_type' => $row['room']->room_type,
            'score' => $row['score'],
            'housekeeping' => $row['room']->status,
        ])->values()->all();

        return $this->standardPayload(
            action: 'recommend_room',
            intent: 'recommend_room_assignment',
            target: [
                'reservation_id' => $reservation->id,
                'room_id' => $room->id,
            ],
            reservation: $reservation,
            room: $room,
            requestedChange: [
                'assign_room_id' => $room->id,
                'execute' => false,
            ],
            validation: [
                'ledger' => $this->inspector->ledgerReasons($room, $reservation),
                'fitness' => $this->inspector->fitnessReasons($room),
                'hard_stops' => [],
            ],
            decision: 'approval required',
            extra: [
                'reservation_id' => $reservation->id,
                'room_id' => $room->id,
                'score' => $score,
                'candidates' => $candidates,
                'constraints' => [
                    'auto_assign' => ReservationTrainingStandard::autoAssignAuthorized(),
                    'positive_overbooking' => ReservationTrainingStandard::positiveOverbookingEnabled(),
                    'pending_option_holds_deduct' => ReservationTrainingStandard::pendingOptionHoldsDeduct(),
                    'time_out_retention_nights' => ReservationTrainingStandard::timeOutRetentionNights(),
                    'accessibility_inferred' => false,
                ],
                'ranking' => array_column($candidates, 'room_id'),
                'selected_room' => [
                    'room_id' => $room->id,
                    'number' => $room->number,
                    'reason' => "Highest deterministic score {$score} among rooms that passed every stay night and Vacant Clean fitness.",
                ],
                'execute_via' => 'RoomAssignmentService::assign',
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $flag
     * @return array<string, mixed>
     */
    private function flagPayload(array $flag): array
    {
        $reservation = isset($flag['reservation_id'])
            ? Reservation::query()->find($flag['reservation_id'])
            : null;
        $room = isset($flag['room_id'])
            ? Room::query()->find($flag['room_id'])
            : null;

        $decision = $flag['decision'] ?? 'approval required';

        return $this->standardPayload(
            action: 'flag_risk',
            intent: 'flag_'.$flag['code'],
            target: [
                'reservation_id' => $flag['reservation_id'] ?? null,
                'room_id' => $flag['room_id'] ?? null,
            ],
            reservation: $reservation,
            room: $room,
            requestedChange: [
                'acknowledge_conflict' => $flag['code'],
                'execute' => false,
            ],
            validation: [
                'code' => $flag['code'],
                'hard_stops' => $decision === 'prohibited' ? [$flag['code']] : [],
            ],
            decision: $decision,
            extra: [
                'code' => $flag['code'],
                'reservation_id' => $flag['reservation_id'] ?? null,
                'room_id' => $flag['room_id'] ?? null,
                'execute_via' => null,
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $target
     * @param  array<string, mixed>  $requestedChange
     * @param  array<string, mixed>  $validation
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    private function standardPayload(
        string $action,
        string $intent,
        array $target,
        ?Reservation $reservation,
        ?Room $room,
        array $requestedChange,
        array $validation,
        string $decision,
        array $extra = [],
    ): array {
        return array_merge([
            'action' => $action,
            'intent' => $intent,
            'target' => $target,
            'current_state' => $this->inspector->sevenState($reservation, $room),
            'requested_change' => $requestedChange,
            'validation' => $validation,
            'authority' => [
                'class' => self::CLASS_MODE,
                'auto_assign' => ReservationTrainingStandard::autoAssignAuthorized(),
                'human_approval_required' => true,
                'controlling_rule' => ReservationTrainingStandard::citation(),
            ],
            'inventory_impact' => [
                'deducts' => $reservation ? $this->inspector->deductsInventory($reservation) : null,
                'physically_occupied' => $reservation ? $this->inspector->occupiesPhysically($reservation) : false,
                'hold_kind' => $room ? $this->inspector->holdKind($room, $reservation) : null,
                'sell_limit' => 0,
            ],
            'decision' => $decision,
            'explanation' => null,
            'next_actions' => $decision === 'prohibited'
                ? ['Escalate to a person. AI will not execute.']
                : ['Person reviews, then Approve or Dismiss. AI will not execute.'],
            'notifications' => [
                'describe_only' => true,
                'send' => false,
                'recipients' => [],
            ],
            'audit' => [
                'policy' => ReservationTrainingStandard::citation(),
                'model' => (string) config('ai.default_model'),
                'rule_version' => ReservationTrainingStandard::ruleVersion(),
                'bound_capabilities' => self::CAPABILITIES,
            ],
            'bound_capabilities' => self::CAPABILITIES,
        ], $extra);
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
