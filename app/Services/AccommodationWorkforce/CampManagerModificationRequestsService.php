<?php

namespace App\Services\AccommodationWorkforce;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Mirrors camp-reservations Manager `/dashboard` modification-requests table
 * (DashboardController::renderLodgeManagerDashboard + manager-modification-rows).
 */
class CampManagerModificationRequestsService
{
    private const LIMIT = 25;

    /**
     * Pending modification-request rows for the Manager dashboard tab.
     *
     * @return list<array<string, mixed>>
     */
    public function forUser(User $user): array
    {
        if (! Schema::hasTable('request_reservations') || empty($user->getAttribute('camp_id'))) {
            return [];
        }

        $campId = (int) $user->getAttribute('camp_id');
        $roleName = $this->roleNameForUser($user) ?: 'Manager';

        $rows = DB::table('request_reservations')
            ->leftJoin('user_companies', 'user_companies.id', '=', 'request_reservations.company_id')
            ->where('request_reservations.camp_id', $campId)
            ->where('request_reservations.request_by', '!=', $roleName)
            ->where('request_reservations.request_status', 'pending')
            ->orderByDesc('request_reservations.id')
            ->limit(self::LIMIT)
            ->get([
                'request_reservations.*',
                'user_companies.name as company_name',
            ]);

        if ($rows->isEmpty()) {
            return [];
        }

        $lookups = $this->buildLookups($rows);

        return $rows->map(fn ($row) => $this->presentRow($row, $lookups))->values()->all();
    }

    /**
     * @param  Collection<int, object>  $items
     * @return array{
     *   users: Collection<int|string, object>,
     *   activityTypes: Collection<int|string, object>,
     *   histories: Collection<int|string, object>,
     *   bookings: Collection<int|string, object>,
     *   latestNotes: Collection<int|string, object>,
     *   unreadByReservationId: Collection<int|string, int>,
     *   modScheduleIdsByDraftId: Collection<int|string, int|string>
     * }
     */
    private function buildLookups(Collection $items): array
    {
        $userIds = $items->pluck('user_id')->filter()->unique()->values();
        $activityTypeIds = $items->pluck('activity_type')->filter()->unique()->values();
        $requestIds = $items->pluck('request')->filter()->unique()->values();
        $reservationIds = $items->pluck('id')->filter()->unique()->values();

        $histories = collect();
        if (Schema::hasTable('request_reservation_history') && $requestIds->isNotEmpty()) {
            $histories = DB::table('request_reservation_history')
                ->whereIn('id', $requestIds)
                ->orderByDesc('id')
                ->get()
                ->unique('id')
                ->keyBy('id');
        }

        $bookingIds = $histories->pluck('request')->filter()->unique()->values();
        $bookings = collect();
        if (Schema::hasTable('bookings') && $bookingIds->isNotEmpty()) {
            $bookings = DB::table('bookings')->whereIn('id', $bookingIds)->get()->keyBy('id');
        }

        $noteReservationIds = $bookingIds->merge($reservationIds)->unique()->values();
        $latestNotes = collect();
        $unreadByReservationId = collect();
        if (Schema::hasTable('reservation_notes') && $noteReservationIds->isNotEmpty()) {
            $latestNotes = DB::table('reservation_notes')
                ->whereIn('reservation_id', $noteReservationIds)
                ->orderByDesc('created_at')
                ->get()
                ->unique('reservation_id')
                ->keyBy('reservation_id');

            $unreadByReservationId = DB::table('reservation_notes')
                ->whereIn('reservation_id', $reservationIds)
                ->where('is_read', 0)
                ->pluck('reservation_id')
                ->unique()
                ->flip();
        }

        $publishedDraftIds = $items
            ->where('request_type', 'schedule_modification_published')
            ->pluck('request')
            ->filter()
            ->unique()
            ->values();

        $modScheduleIdsByDraftId = collect();
        if (
            $publishedDraftIds->isNotEmpty()
            && Schema::hasTable('site_schedules_drafts')
            && Schema::hasTable('site_schedules')
        ) {
            $draftReservationIds = DB::table('site_schedules_drafts')
                ->whereIn('id', $publishedDraftIds)
                ->pluck('reservation_id', 'id');

            $scheduleIdsByReservationId = DB::table('site_schedules')
                ->whereIn('reservation_id', $draftReservationIds->values()->unique())
                ->pluck('id', 'reservation_id');

            foreach ($publishedDraftIds as $draftId) {
                $bookingId = $draftReservationIds[$draftId] ?? null;
                $modScheduleIdsByDraftId[$draftId] = $bookingId
                    ? ($scheduleIdsByReservationId[$bookingId] ?? '')
                    : '';
            }
        }

        $users = collect();
        if (Schema::hasTable('users') && $userIds->isNotEmpty()) {
            $users = DB::table('users')->whereIn('id', $userIds)->get()->keyBy('id');
        }

        $activityTypes = collect();
        if (Schema::hasTable('activity_types') && $activityTypeIds->isNotEmpty()) {
            $activityTypes = DB::table('activity_types')->whereIn('id', $activityTypeIds)->get()->keyBy('id');
        }

        return [
            'users' => $users,
            'activityTypes' => $activityTypes,
            'histories' => $histories,
            'bookings' => $bookings,
            'latestNotes' => $latestNotes,
            'unreadByReservationId' => $unreadByReservationId,
            'modScheduleIdsByDraftId' => $modScheduleIdsByDraftId,
        ];
    }

    /**
     * @param  array{
     *   users: Collection,
     *   activityTypes: Collection,
     *   histories: Collection,
     *   bookings: Collection,
     *   latestNotes: Collection,
     *   unreadByReservationId: Collection,
     *   modScheduleIdsByDraftId: Collection
     * }  $lookups
     * @return array<string, mixed>
     */
    private function presentRow(object $row, array $lookups): array
    {
        $history = $lookups['histories'][$row->request] ?? null;
        $booking = null;
        $note = null;
        if ($history) {
            $booking = $lookups['bookings'][$history->request] ?? null;
            if ($booking) {
                $note = $lookups['latestNotes'][$booking->id] ?? null;
            }
        }

        $requester = $lookups['users'][$row->user_id] ?? null;
        $requestedBy = $requester
            ? trim(implode(' ', array_filter([
                (string) ($requester->first_name ?? ''),
                (string) ($requester->last_name ?? ''),
            ])))
            : (string) ($row->request_by ?? '');
        if ($requestedBy === '' && isset($requester->name)) {
            $requestedBy = (string) $requester->name;
        }
        if ($requestedBy === '') {
            $requestedBy = '—';
        }

        $activity = $lookups['activityTypes'][$row->activity_type] ?? null;
        $requestLabel = $activity && ! empty($activity->name)
            ? (string) $activity->name
            : (string) ($row->message ?? '');
        if ($requestLabel === '') {
            $requestLabel = ucwords(str_replace('_', ' ', (string) ($row->status ?? 'Request')));
        }

        $firstName = ucwords(strtolower(trim((string) ($row->first_name ?? ''))));
        $lastName = ucwords(strtolower(trim((string) ($row->last_name ?? ''))));
        $worker = trim($firstName.' '.$lastName);
        if ($worker === '') {
            $worker = 'Worker';
        }

        $initials = collect(preg_split('/\s+/', $worker) ?: [])
            ->filter()
            ->take(2)
            ->map(fn ($part) => mb_strtoupper(mb_substr((string) $part, 0, 1)))
            ->implode('');
        if ($initials === '') {
            $initials = 'WR';
        }

        $notes = [];
        if ($note && ! empty($note->notes)) {
            $notes[] = [
                'author' => 'Note',
                'text' => (string) $note->notes,
                'createdAt' => $note->created_at
                    ? Carbon::parse($note->created_at)->toIso8601String()
                    : '',
            ];
        }

        $canOpen = $this->canOpen($row);
        $openKind = $this->openKind($row);

        return [
            // Prefix so these never collide with local reservation ids in React keys.
            'id' => 'mod-'.(int) $row->id,
            'modificationRequestId' => (int) $row->id,
            'isModificationRequest' => true,
            'firstName' => $firstName,
            'lastName' => $lastName,
            'worker' => $worker,
            'initials' => $initials,
            'color' => '#0b66e4',
            'company' => (string) ($row->company_name ?: '—'),
            'requestedAt' => $row->created_at
                ? Carbon::parse($row->created_at)->format('M j, Y')
                : '—',
            // Request column (activity type / message) — tab renders this as `status`.
            'status' => $requestLabel,
            'requestStatus' => 'Pending',
            'requestedBy' => $requestedBy,
            'notes' => $notes,
            'hasUnreadNotes' => isset($lookups['unreadByReservationId'][$row->id]),
            'campStatus' => (string) ($row->status ?? ''),
            'requestType' => $row->request_type,
            'requestRef' => $row->request,
            'modScheduleId' => $lookups['modScheduleIdsByDraftId'][$row->request] ?? '',
            'bookingId' => $booking->id ?? null,
            'canOpen' => $canOpen,
            'openKind' => $openKind,
            // Unused by mod columns but keep enrichReservation happy.
            'arrival' => '—',
            'departure' => '—',
            'room' => '—',
            'approval' => '—',
            'allotment' => '—',
            'shift' => '',
            'province' => '',
            'scheduleStatus' => 'Red',
            'pinned' => false,
        ];
    }

    private function canOpen(object $row): bool
    {
        if (($row->request_status ?? '') !== 'pending') {
            return false;
        }

        if ($row->request_type === null || $row->request_type === '') {
            return in_array($row->status, [
                'no_show', 'departure', 'bill_out', 'on_hold', 'cancel', 'pending',
                'declined_walkin', 'modify_walkin', 'pending_walkin', 'automated',
            ], true);
        }

        return in_array($row->request_type, [
            'search_modification',
            'schedule_modification_published',
        ], true);
    }

    private function openKind(object $row): ?string
    {
        if (! $this->canOpen($row)) {
            return null;
        }

        if (in_array($row->request_type, ['search_modification', 'schedule_modification_published'], true)) {
            return (string) $row->request_type;
        }

        if (in_array($row->status, ['no_show', 'departure'], true)) {
            return 'resolve';
        }
        if (in_array($row->status, ['bill_out', 'on_hold', 'cancel', 'pending', 'declined_walkin', 'modify_walkin'], true)) {
            return 'bill_out';
        }
        if (in_array($row->status, ['pending_walkin', 'modify_walkin'], true)) {
            return 'walk_in';
        }
        if ($row->status === 'automated') {
            return 'automated';
        }

        return null;
    }

    private function roleNameForUser(User $user): ?string
    {
        if (! Schema::hasTable('model_has_roles') || ! Schema::hasTable('roles')) {
            return null;
        }

        return DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $user->id)
            ->where('model_has_roles.model_type', 'App\\Models\\User')
            ->value('roles.name');
    }
}
