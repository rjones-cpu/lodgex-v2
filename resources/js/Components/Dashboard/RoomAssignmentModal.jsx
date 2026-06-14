import { useEffect, useMemo, useRef, useState } from 'react';

function dormFromRoomLabel(label) {
    if (!label || typeof label !== 'string') return '';
    const match = label.match(/\(([^)]+)\)/);
    return match ? match[1].trim() : '';
}

// Canonical room-type tiers exposed in the All Types dropdown. The backend
// stores 'Senior Executive' on Room::type; we normalize that to the
// abbreviated 'Sr. Executive' label at the display + filter boundary so the
// dropdown always offers all three tiers regardless of which rooms happen to
// be currently assignable. The DB value itself is left untouched.
const ROOM_TYPES = ['Executive', 'Sr. Executive', 'Wellsite'];
function normalizeRoomType(raw) {
    if (!raw || typeof raw !== 'string') return raw;
    const trimmed = raw.trim();
    if (trimmed === 'Senior Executive') return 'Sr. Executive';
    return trimmed;
}

function statusTone(status) {
    if (status === 'Vacant Clean') return 'bg-green-100 text-green-700';
    if (/hold/i.test(status)) return 'bg-amber-100 text-amber-700';
    if (/dirty|maintenance|service|blocked/i.test(status)) return 'bg-red-100 text-red-600';
    return 'bg-slate-100 text-slate-600';
}

/**
 * Modal for assigning a specific room to a reservation / worker.
 */
export default function RoomAssignmentModal({
    open,
    onClose,
    reservation,
    assignableRooms = [],
    onAssign,
    isSaving = false,
    error = '',
}) {
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [dormFilter, setDormFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [search, setSearch] = useState('');
    const selectedRoomRef = useRef(null);

    useEffect(() => {
        if (!open) {
            setSelectedRoomId('');
            setDormFilter('All');
            setTypeFilter('All');
            setSearch('');
            return;
        }

        // Pre-select the currently assigned room (if any) so the user lands on it.
        if (reservation?.roomId) {
            setSelectedRoomId(String(reservation.roomId));
        }

        // Pre-filter the dorm list to whichever dorm the worker is already in,
        // preferring the assignableRooms record but falling back to parsing
        // the "1506 (Dorm E)" display label when the current room isn't in the
        // assignable pool (e.g. it's occupied / dirty).
        const currentRoom = reservation?.roomId
            ? assignableRooms.find((room) => room.id === reservation.roomId)
            : null;
        const dormFromLookup = currentRoom?.dorm;
        const dormFromLabel = dormFromRoomLabel(reservation?.room);
        const initialDorm = dormFromLookup || dormFromLabel;
        const dormHasRooms =
            initialDorm && assignableRooms.some((room) => room.dorm === initialDorm);
        setDormFilter(dormHasRooms ? initialDorm : 'All');
    }, [open, reservation?.id, reservation?.roomId, reservation?.room, assignableRooms]);

    // After the list paints, scroll the pre-selected room into view.
    useEffect(() => {
        if (!open || !selectedRoomId) return;
        const id = window.requestAnimationFrame(() => {
            selectedRoomRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
        });
        return () => window.cancelAnimationFrame(id);
    }, [open, selectedRoomId, dormFilter, typeFilter, search]);

    useEffect(() => {
        if (!open) return;
        function onKey(e) {
            if (e.key === 'Escape') onClose?.();
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    const dormOptions = useMemo(() => {
        const dorms = [...new Set(assignableRooms.map((room) => room.dorm).filter(Boolean))].sort();
        return ['All', ...dorms];
    }, [assignableRooms]);

    // Always expose the three canonical tiers (Executive · Sr. Executive ·
    // Wellsite) so the manager can filter to a tier even when none are
    // currently vacant clean. Any extra type the backend ships is appended
    // after the canonical three to keep custom inventories visible.
    const typeOptions = useMemo(() => {
        const fromData = new Set(
            assignableRooms.map((room) => normalizeRoomType(room.type)).filter(Boolean),
        );
        const extras = [...fromData].filter((t) => !ROOM_TYPES.includes(t)).sort();
        return ['All', ...ROOM_TYPES, ...extras];
    }, [assignableRooms]);

    const filteredRooms = useMemo(() => {
        let rows = assignableRooms;
        if (dormFilter !== 'All') rows = rows.filter((room) => room.dorm === dormFilter);
        if (typeFilter !== 'All') {
            rows = rows.filter((room) => normalizeRoomType(room.type) === typeFilter);
        }
        if (search.trim()) {
            const term = search.trim().toLowerCase();
            rows = rows.filter((room) =>
                `${room.room} ${room.dorm} ${normalizeRoomType(room.type) || ''}`
                    .toLowerCase()
                    .includes(term),
            );
        }
        return rows;
    }, [assignableRooms, dormFilter, typeFilter, search]);

    const selectedRoom = assignableRooms.find((room) => String(room.id) === selectedRoomId);

    if (!open || !reservation) return null;

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/45 p-4">
            <div
                className="flex max-h-[90vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl border border-lx-border bg-white shadow-lx-pop"
                role="dialog"
                aria-modal="true"
                aria-labelledby="room-assignment-title"
            >
                <div className="flex items-start justify-between gap-4 border-b border-lx-border px-6 py-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.04em] text-lx-blue">
                            Room Assignment
                        </p>
                        <h2 id="room-assignment-title" className="mt-1 text-xl font-black text-lx-navy">
                            Assign room to {reservation.worker}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            {reservation.company} · {normalizeRoomType(reservation.roomType) || reservation.roomType} · {reservation.arrival} – {reservation.departure}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-lx-border text-lg text-slate-500 hover:bg-[#f6faff]"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="border-b border-lx-border px-6 py-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_160px_160px]">
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search room number or dorm..."
                            className="h-[42px] rounded-[10px] border border-lx-border px-3 text-sm font-bold text-lx-ink"
                        />
                        <select
                            value={dormFilter}
                            onChange={(e) => setDormFilter(e.target.value)}
                            className="h-[42px] rounded-[10px] border border-lx-border px-3 text-sm font-bold text-lx-ink"
                        >
                            {dormOptions.map((dorm) => (
                                <option key={dorm} value={dorm}>
                                    {dorm === 'All' ? 'All Dorms' : dorm}
                                </option>
                            ))}
                        </select>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="h-[42px] rounded-[10px] border border-lx-border px-3 text-sm font-bold text-lx-ink"
                        >
                            {typeOptions.map((type) => (
                                <option key={type} value={type}>
                                    {type === 'All' ? 'All Types' : type}
                                </option>
                            ))}
                        </select>
                    </div>
                    <p className="mt-3 text-xs font-bold text-slate-500">
                        {filteredRooms.filter((room) => room.isAvailable !== false).length} of{' '}
                        {filteredRooms.length} room{filteredRooms.length === 1 ? '' : 's'} available
                        {reservation.room !== 'Unassigned' ? ` · Current: ${reservation.room}` : ''}
                    </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                    {filteredRooms.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-lx-border bg-[#fbfdff] px-4 py-10 text-center">
                            <p className="text-sm font-black text-lx-navy">No assignable rooms match your filters</p>
                            <p className="mt-1 text-xs text-slate-500">
                                Try another dorm or check Room Utilization for rooms pending cleaning.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            {filteredRooms.map((room) => {
                                const isSelected = String(room.id) === selectedRoomId;
                                const isCurrent = reservation.roomId === room.id;
                                // Unavailable rooms still appear in the list (so the
                                // manager sees the full inventory), but selection is
                                // disabled so they can't be picked. The current room
                                // is always selectable so the user can reconfirm or
                                // navigate around it.
                                const isAvailable = room.isAvailable !== false || isCurrent;
                                const occupant = room.worker
                                    ? `${room.worker}${room.company ? ` · ${room.company}` : ''}`
                                    : room.company || '';
                                return (
                                    <button
                                        key={room.id}
                                        ref={isSelected ? selectedRoomRef : null}
                                        type="button"
                                        disabled={!isAvailable}
                                        onClick={() =>
                                            isAvailable && setSelectedRoomId(String(room.id))
                                        }
                                        className={`flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition-colors ${
                                            isAvailable
                                                ? 'cursor-pointer ' +
                                                  (isSelected
                                                      ? 'border-lx-blue bg-[#eef6ff] outline outline-1 outline-[#bcd7ff]'
                                                      : 'border-lx-border bg-white hover:bg-[#f8fbff]')
                                                : 'cursor-not-allowed border-lx-border bg-[#f8fafc] opacity-60'
                                        }`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-black text-lx-navy">
                                                    {room.room}
                                                </span>
                                                <span className="text-xs font-bold text-slate-500">{room.dorm}</span>
                                                {isCurrent && (
                                                    <span className="rounded-lg bg-blue-100 px-2 py-0.5 text-[11px] font-black text-lx-blue">
                                                        Current
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 text-xs font-bold text-slate-500">
                                                {normalizeRoomType(room.type) || room.type}
                                                {occupant ? ` · ${occupant}` : ''}
                                            </p>
                                        </div>
                                        <span className={`rounded-lg px-2.5 py-1 text-[11px] font-black ${statusTone(room.status)}`}>
                                            {room.status}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mx-6 mb-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                        {error}
                    </div>
                )}

                <div className="flex items-center justify-between gap-3 border-t border-lx-border px-6 py-4">
                    <div className="text-xs font-bold text-slate-500">
                        {selectedRoom
                            ? `Selected: ${selectedRoom.room} (${selectedRoom.dorm})`
                            : 'Select a room to continue'}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="cursor-pointer rounded-[10px] border border-lx-border bg-white px-4 py-2.5 text-sm font-black text-lx-ink"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={!selectedRoomId || isSaving}
                            onClick={() => onAssign?.(Number(selectedRoomId))}
                            className="cursor-pointer rounded-[10px] border-0 bg-lx-blue px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSaving ? 'Assigning…' : 'Assign Room'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
