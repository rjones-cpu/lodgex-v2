import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import RoomAssignmentModal from '../Components/Dashboard/RoomAssignmentModal';
import ExtendStayModal from '../Components/Dashboard/ExtendStayModal';
import ReservationInfoCardModal from '../Components/Dashboard/ReservationInfoCardModal';
import ScheduleModificationRequestModal from '../Components/Dashboard/ScheduleModificationRequestModal';
import DateConfirmModal from '../Components/Dashboard/DateConfirmModal';
import ReservationNotesModal from '../Components/Dashboard/ReservationNotesModal';
import { AppPageBody, AppPageHeader, AppPageShell } from '../Components/AppPageShell';
import AppLayout from '../Layouts/AppLayout';

// Each metric carries its own palette: the border ring, the gradient accent
// bar (left edge of the card), and the icon bubble fill/foreground. The
// rendering layer reads `m.palette.*` directly so adding a new metric just
// means appending an entry here.
const METRICS = [
    {
        label: 'Pending Approvals',
        icon: '✓',
        value: '37',
        change: '↑ 15.5%',
        direction: 'down',
        palette: {
            border: 'border-orange-100',
            bar: 'from-orange-500 to-amber-500',
            iconBg: 'bg-orange-50',
            iconText: 'text-orange-600',
        },
    },
    {
        label: 'Rooms to Allocate',
        icon: '🛏',
        value: '42',
        change: '↑ 11.2%',
        direction: 'down',
        palette: {
            border: 'border-sky-100',
            bar: 'from-sky-500 to-cyan-500',
            iconBg: 'bg-sky-50',
            iconText: 'text-sky-600',
        },
    },
    {
        label: 'Rooms Allotted Tonight',
        icon: '▦',
        value: '1,426',
        change: '↑ 6.2%',
        direction: 'up',
        palette: {
            border: 'border-emerald-100',
            bar: 'from-emerald-500 to-teal-500',
            iconBg: 'bg-emerald-50',
            iconText: 'text-emerald-600',
        },
    },
    {
        label: 'Check-Ins',
        icon: '→',
        value: '156',
        change: '↑ 12.4%',
        direction: 'up',
        palette: {
            border: 'border-emerald-100',
            bar: 'from-emerald-500 to-teal-500',
            iconBg: 'bg-emerald-50',
            iconText: 'text-emerald-600',
        },
    },
    {
        label: 'Check-Outs',
        icon: '←',
        value: '102',
        change: '↓ 3.1%',
        direction: 'up',
        palette: {
            border: 'border-violet-100',
            bar: 'from-violet-500 to-purple-500',
            iconBg: 'bg-violet-50',
            iconText: 'text-violet-600',
        },
    },
    {
        label: 'Active Extensions',
        icon: '↻',
        value: '28',
        change: '↑ 10.7%',
        direction: 'down',
        palette: {
            border: 'border-rose-100',
            bar: 'from-rose-500 to-pink-500',
            iconBg: 'bg-rose-50',
            iconText: 'text-rose-600',
        },
    },
    {
        label: 'Walk-Ins',
        icon: '+',
        value: '24',
        change: '↑ 14.9%',
        direction: 'up',
        palette: {
            border: 'border-blue-100',
            bar: 'from-blue-500 to-indigo-500',
            iconBg: 'bg-blue-50',
            iconText: 'text-blue-600',
        },
    },
    {
        label: 'No-Shows',
        icon: '!',
        value: '12',
        change: '↑ 9.1%',
        direction: 'down',
        palette: {
            border: 'border-red-100',
            bar: 'from-red-500 to-orange-500',
            iconBg: 'bg-red-50',
            iconText: 'text-red-600',
        },
    },
];

const TABS = [
    { key: 'All', label: 'Approvals', icon: '☑️' },
    { key: 'Room Allocation', label: 'Room Allocation', icon: '🛏️' },
    { key: 'Room Allotment', label: 'Room Allotment', icon: '🏢' },
    { key: 'Check-In', label: 'Check-In', icon: '🧳' },
    { key: 'Check-Out', label: 'Check-Out', icon: '☑️' },
    { key: 'On-Hold', label: 'On-Hold', icon: '⏸️' },
    {
        key: 'Modification Request',
        label: 'Modification Requests',
        icon: '📝',
        title:
            'Extensions: stays past original departure · Walk-Ins: walk-up requests · No-Shows: did not arrive by 07:00 next day · Schedule Discrepancy: schedule and reservation mismatch · Schedule Changes: requested date changes',
    },
    {
        key: 'Discrepancy',
        label: 'Discrepancy',
        icon: '⚠️',
        title:
            'Reservations whose status doesn’t match their schedule color · Yellow (Travel) → Pending / Arrival / Check-In · Blue (Working) → Check-In · Green (Vacation) → On-Hold / Check-Out / Pending / Arrival · Red (Sick) → any · Light Blue (Local) → no reservation required',
    },
];

// Sub-statuses that surface under the combined Modification Requests tab.
const MODIFICATION_STATUSES = [
    'Extension',
    'Walk-In',
    'No-Show',
    'Schedule Discrepancy',
    'Schedule Change',
    'Hold for Review',
];

// Schedule colors mirrored from the company schedule system (Yellow, Blue,
// Green, Red, Light Blue). Each reservation carries a `scheduleStatus` field
// describing what the schedule says for that worker on the relevant shift,
// independent of the reservation's own lifecycle status.
const SCHEDULE_STATUS_OPTIONS = ['Yellow', 'Blue', 'Green', 'Red', 'Light Blue'];

// Reservation-status whitelist per schedule color. The Discrepancy queue
// surfaces any reservation whose `status` falls outside this whitelist for
// its `scheduleStatus`.
//
//   `allowed: 'any'`   — schedule is permissive (Red/Sick), never flagged
//   `allowed: 'none'`  — schedule says no reservation should exist at all
//                        (Light Blue/Local), so any reservation is flagged
//   `allowed: [...]`   — explicit list of acceptable reservation statuses
//
// Source of truth: the company's "Schedule vs Reservation" alignment table.
const SCHEDULE_RULES = {
    Yellow: {
        allowed: ['Pending', 'Arrival', 'Check-In'],
        note: 'Travel to / from site — must be Pending, Arrival, or Check-In',
    },
    Blue: {
        allowed: ['Check-In'],
        note: 'Working — must have a room (Check-In)',
    },
    Green: {
        allowed: ['On-Hold', 'Check-Out', 'Pending', 'Arrival'],
        note: 'On vacation — On-Hold, Check-Out, Pending, or Arrival',
    },
    Red: {
        allowed: 'any',
        note: 'Sick — any reservation status is acceptable',
    },
    'Light Blue': {
        allowed: 'none',
        note: 'Local worker — no reservation required',
    },
};

// Returns `null` when the reservation aligns with its schedule color, or an
// `{ schedule, status, expected }` object describing the mismatch when it
// does not. Reservations missing a `scheduleStatus` (or carrying one we don't
// know about) are treated as aligned to avoid noisy false positives.
function scheduleDiscrepancy(reservation) {
    const sched = reservation?.scheduleStatus;
    if (!sched) return null;
    const rule = SCHEDULE_RULES[sched];
    if (!rule || rule.allowed === 'any') return null;
    if (rule.allowed === 'none') {
        return { schedule: sched, status: reservation.status, expected: 'No reservation required' };
    }
    if (!rule.allowed.includes(reservation.status)) {
        return {
            schedule: sched,
            status: reservation.status,
            expected: rule.allowed.join(' / '),
        };
    }
    return null;
}

// Worker-shift options surfaced in the queue's Shift column.
const SHIFT_OPTIONS = ['Day', 'Night'];

// Canonical room-type tiers exposed across the dashboard. The backend
// (RoomInventorySyncService) stores 'Senior Executive', so we normalize that
// to the abbreviated 'Sr. Executive' label at the display boundary; the DB
// value is left untouched so existing rows keep working.
const ROOM_TYPES = ['Executive', 'Sr. Executive', 'Wellsite'];
function normalizeRoomType(raw) {
    if (!raw || typeof raw !== 'string') return raw;
    const trimmed = raw.trim();
    if (trimmed === 'Senior Executive') return 'Sr. Executive';
    return trimmed;
}

// Canadian provinces / territories + Out of Country, used for the Province
// column. Abbreviations are the stored value; labels are exposed on hover.
const PROVINCE_OPTIONS = [
    'AB',
    'BC',
    'MB',
    'NB',
    'NL',
    'NS',
    'NT',
    'NU',
    'ON',
    'PE',
    'QC',
    'SK',
    'YT',
    'OOC',
];
const PROVINCE_LABELS = {
    AB: 'Alberta',
    BC: 'British Columbia',
    MB: 'Manitoba',
    NB: 'New Brunswick',
    NL: 'Newfoundland and Labrador',
    NS: 'Nova Scotia',
    NT: 'Northwest Territories',
    NU: 'Nunavut',
    ON: 'Ontario',
    PE: 'Prince Edward Island',
    QC: 'Quebec',
    SK: 'Saskatchewan',
    YT: 'Yukon',
    OOC: 'Out of Country',
};

// Deterministic hash → keeps the example shift/province stable for the same
// worker across renders so the queue does not flicker between values.
function exampleHash(seed) {
    let h = 0;
    const s = String(seed || '');
    for (let i = 0; i < s.length; i++) {
        h = ((h * 31) + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

function exampleShift(seed) {
    return SHIFT_OPTIONS[exampleHash(seed) % SHIFT_OPTIONS.length];
}

function exampleProvince(seed) {
    return PROVINCE_OPTIONS[exampleHash(`${seed}-p`) % PROVINCE_OPTIONS.length];
}

// Pool of plausible scheduling-manager usernames used as a deterministic
// fallback for the Modification Requests "Username" column when the backend
// payload doesn't yet ship `requestedBy`.
const REQUEST_USERS = [
    'Heather Sigurdson',
    'Sim Parmar',
    'Sarah Lee',
    'Alex Park',
    'John Doe',
    'Mt. Bracey',
];

function exampleRequestUser(seed) {
    return REQUEST_USERS[exampleHash(`${seed}-u`) % REQUEST_USERS.length];
}

// Deterministic recent date (within the last 7 days) so the Modification
// Requests "Request Date" column has a stable value per row across renders.
function exampleRequestDate(seed) {
    const days = exampleHash(`${seed}-d`) % 7;
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
    });
}

// Statuses that have their own dedicated queue and therefore never appear
// in the Approvals (All) tab — even if their approval is still Pending.
//   - Check-In / Check-Out / On-Hold: their own tabs.
//   - Walk-In / Extension / No-Show / Schedule Discrepancy / Schedule Change:
//     live under the Modification Requests tab.
const APPROVALS_HIDDEN_STATUSES = [
    'Check-In',
    'Check-Out',
    'On-Hold',
    ...MODIFICATION_STATUSES,
];

const SORTABLE_COLUMNS = [
    { key: 'company', label: 'Company' },
    { key: 'shift', label: 'Shift' },
    { key: 'province', label: 'Province' },
    { key: 'status', label: 'Status' },
    { key: 'arrival', label: 'Arrival', type: 'date' },
    { key: 'departure', label: 'Departure', type: 'date' },
    { key: 'room', label: 'Room Assignment' },
    {
        // Was 'Allotment'; the column now surfaces the On-Hold permission
        // (sourced from the reservation's onHoldAllowed flag, edited via the
        // Info Card modal). Yes sorts first when ascending so the lodge
        // manager can quickly find rooms eligible to be placed on hold.
        key: 'onHoldAllowed',
        label: 'On-hold',
        type: 'priority',
        order: { true: 1, false: 0 },
    },
    {
        // Replaces the previous 'Approval' column. Approval data still lives on
        // the reservation (and shows in the Selected Reservation panel and the
        // Priority filter); this column now surfaces whether the reservation
        // has manager notes attached.
        key: 'notes',
        label: 'Notes',
        type: 'has',
    },
];

// Header set used exclusively by the Modification Requests tab. The sortable
// keys are merged into the table's sort lookup so column-header clicks still
// work in this view. `requestStatus` is intentionally non-sortable — every
// row in this queue is implicitly Pending until a manager approves/rejects
// it, at which point the row leaves the queue entirely.
const MODIFICATION_COLUMNS = [
    { key: 'company', label: 'Company' },
    { key: 'requestedAt', label: 'Request Date', type: 'date' },
    { key: 'requestedBy', label: 'Username' },
    { key: 'status', label: 'Request' },
    { key: 'requestStatus', label: 'Status', sortable: false },
    { key: 'notes', label: 'Notes', type: 'has' },
];

const STATUS_FILTER_OPTIONS = [
    'All',
    'Walk-In',
    'Extension',
    'Pending',
    'Arrival',
    'Check-In',
    'Check-Out',
    'On-Hold',
    'No-Show',
    'Schedule Discrepancy',
    'Schedule Change',
    'Hold for Review',
];

const SEED_RESERVATIONS = [
    { initials: 'JM', color: '#2563eb', worker: 'James McKenzie', company: 'Turner Industrial', status: 'Walk-In', arrival: 'May 20, 2025', departure: 'May 27, 2025', room: 'Unassigned', approval: 'High', allotment: 'Pending', score: 72, roomType: 'Executive', gender: 'Male', project: 'Glen Grade Midstream Expansion', shift: 'Day', province: 'AB', scheduleStatus: 'Light Blue' },
    { initials: 'CR', color: '#16a34a', worker: 'Carlos Ramirez', company: 'Bechtel Corp', status: 'Extension', arrival: 'May 20, 2025', departure: 'May 30, 2025', room: '1107 (Dorm A)', approval: 'Medium', allotment: 'Pending', score: 58, roomType: 'Sr. Executive', gender: 'Male', project: 'Rio Grande Midstream Expansion', shift: 'Night', province: 'BC', scheduleStatus: 'Blue' },
    { initials: 'AP', color: '#7c3aed', worker: 'Alek Patel', company: 'Fluor Enterprises', status: 'Arrival', arrival: 'May 21, 2025', departure: 'Jun 04, 2025', room: 'Unassigned', aiRoom: '1102 (Dorm B)', approval: 'High', allotment: 'Pending', score: 64, roomType: 'Sr. Executive', gender: 'Male', project: 'Solar Field Alpha', onHoldAllowed: false, shift: 'Day', province: 'ON', scheduleStatus: 'Yellow' },
    { initials: 'LO', color: '#0b66e4', worker: "Liam O’Connor", company: 'Turner Industrial', status: 'Check-In', arrival: 'May 21, 2025', departure: 'May 28, 2025', room: '1205 (Dorm A)', approval: 'Approved', allotment: 'Allotted', score: 92, roomType: 'Sr. Executive', gender: 'Male', project: 'Glen Grade Midstream Expansion', shift: 'Night', province: 'NS', scheduleStatus: 'Blue', notes: [
        { author: 'Sarah Lee', text: 'Allergic to feather pillows — replaced before check-in.', createdAt: '2026-05-19T14:22:00Z' },
        { author: 'John Doe', text: 'Worker confirmed late arrival via phone — ETA 22:00.', createdAt: '2026-05-21T17:05:00Z' },
    ] },
    { initials: 'SC', color: '#f97316', worker: 'Sophie Chen', company: 'Bechtel Corp', status: 'Arrival', arrival: 'May 22, 2025', departure: 'May 29, 2025', room: 'Unassigned', aiRoom: '1103 (Dorm B)', approval: 'Medium', allotment: 'Pending', score: 81, roomType: 'Sr. Executive', gender: 'Female', project: 'Coastal LNG Phase 2', shift: 'Day', province: 'QC', scheduleStatus: 'Yellow' },
    { initials: 'MT', color: '#16a34a', worker: 'Mason Taylor', company: 'Turner Industrial', status: 'Extension', arrival: 'May 22, 2025', departure: 'Jun 01, 2025', room: '1310 (Dorm A)', approval: 'Low', allotment: 'Allotted', score: 88, roomType: 'Sr. Executive', gender: 'Male', project: 'Glen Grade Midstream Expansion', shift: 'Night', province: 'AB', scheduleStatus: 'Yellow' },
    { initials: 'EB', color: '#7c3aed', worker: 'Ethan Brown', company: 'Turner Industrial', status: 'Check-Out', arrival: 'May 20, 2025', departure: 'May 20, 2025', room: '1205 (Dorm A)', approval: 'Approved', allotment: 'Allotted', score: 77, roomType: 'Sr. Executive', gender: 'Male', project: 'Glen Grade Midstream Expansion', shift: 'Day', province: 'SK', scheduleStatus: 'Green' },
    { initials: 'NW', color: '#10b981', worker: 'Noah Wilson', company: 'Bechtel Corp', status: 'Extension', arrival: 'May 21, 2025', departure: 'May 30, 2025', room: '1107 (Dorm C)', approval: 'Medium', allotment: 'Pending', score: 75, roomType: 'Executive', gender: 'Male', project: 'Coastal LNG Phase 2', shift: 'Night', province: 'BC', scheduleStatus: 'Red' },
    { initials: 'MD', color: '#7c3aed', worker: 'Mark Davis', company: 'Fluor Enterprises', status: 'Walk-In', arrival: 'May 20, 2025', departure: 'May 27, 2025', room: 'Unassigned', approval: 'High', allotment: 'Pending', score: 69, roomType: 'Wellsite', gender: 'Male', project: 'Solar Field Alpha', shift: 'Day', province: 'OOC', scheduleStatus: 'Light Blue' },
    { initials: 'JT', color: '#f97316', worker: 'John Thompson', company: 'AECOM', status: 'No-Show', arrival: 'May 19, 2025', departure: 'May 26, 2025', room: '—', approval: '—', allotment: '—', score: 30, roomType: 'Executive', gender: 'Male', project: 'Highway 225 Upgrade', onHoldAllowed: false, shift: 'Night', province: 'MB', scheduleStatus: 'Yellow' },
    { initials: 'NF', color: '#0ea5e9', worker: 'Nora Fields', company: 'Vertex Services', status: 'On-Hold', arrival: 'May 18, 2025', departure: 'Jun 02, 2025', room: '1408 (Dorm D)', approval: 'Approved', allotment: 'On-Hold', score: 85, roomType: 'Executive', gender: 'Female', project: 'Pipeline Relay Station', shift: 'Day', province: 'YT', scheduleStatus: 'Green', notes: [
        { author: 'Sarah Lee', text: 'Returning every 2 weeks — keep room reserved for rotation.', createdAt: '2026-05-15T09:11:00Z' },
        { author: 'Alex Park', text: 'Cleared by scheduling manager for extended on-hold pattern.', createdAt: '2026-05-22T13:48:00Z' },
    ] },
    { initials: 'DM', color: '#f97316', worker: 'Debbie Marie', company: 'Fluor Enterprises', status: 'Schedule Discrepancy', arrival: 'May 19, 2026', departure: 'May 25, 2026', room: '1103 (Dorm B)', approval: 'Medium', allotment: 'Allotted', score: 71, roomType: 'Sr. Executive', gender: 'Female', project: 'Coastal LNG Phase 2', shift: 'Night', province: 'AB', scheduleStatus: 'Blue' },
    { initials: 'KP', color: '#0ea5e9', worker: 'Karim Peters', company: 'AECOM', status: 'Schedule Change', arrival: 'May 24, 2026', departure: 'Jun 03, 2026', room: '1207 (Dorm C)', approval: 'High', allotment: 'Pending', score: 79, roomType: 'Executive', gender: 'Male', project: 'Highway 225 Upgrade', shift: 'Day', province: 'OOC', scheduleStatus: 'Green' },
];

const APPROVAL_TREND = [
    { h: 45, tone: 'green' },
    { h: 52, tone: 'green' },
    { h: 68, tone: 'green' },
    { h: 42, tone: 'orange' },
    { h: 72, tone: 'green' },
    { h: 62, tone: 'green' },
    { h: 86, tone: 'green' },
];

const NOSHOW_TREND = [38, 55, 72, 48, 80, 44, 62];

const DORMS = [
    ['Dorm A', 92, 'green'],
    ['Dorm B', 88, 'green'],
    ['Dorm C', 76, 'green'],
    ['Dorm D', 74, 'orange'],
    ["Women’s Dorm", 66, 'orange'],
    ['Dorm E', 58, 'orange'],
    ['Dorm F', 51, 'red'],
];

const EXTENSION_QUEUE = [
    ['Carlos Ramirez', 'Bechtel Corp', 'High'],
    ['Noah Wilson', 'Bechtel Corp', 'Medium'],
    ['Mason Taylor', 'Turner Industrial', 'Medium'],
    ['Nora Fields', 'Vertex Services', 'Medium'],
    ['Debbie Marie Group', 'DMS', 'Low'],
];

// Canonical per-status palette. The same hue family is reused on the action
// button and KPI widget for that status so the manager sees one color per
// state across the whole Reservation Operations page.
//   Pending    → orange     Arrival   → blue
//   Check-In   → emerald    On-Hold   → amber
//   Check-Out  → violet     No-Show   → red
//   Extension  → rose
const STATUS_STYLES = {
    walkin: 'bg-violet-100 text-violet-600',
    extension: 'bg-rose-100 text-rose-700',
    arrival: 'bg-blue-100 text-lx-blue',
    checkin: 'bg-emerald-100 text-emerald-700',
    checkout: 'bg-violet-100 text-violet-600',
    noshow: 'bg-red-100 text-red-500',
    high: 'bg-red-100 text-red-500',
    medium: 'bg-orange-100 text-orange-500',
    low: 'bg-green-100 text-green-600',
    pending: 'bg-orange-100 text-orange-500',
    approved: 'bg-green-100 text-green-600',
    allotted: 'bg-green-100 text-green-600',
    onhold: 'bg-amber-100 text-amber-700',
    onholdallotment: 'bg-amber-100 text-amber-700',
    schedulediscrepancy: 'bg-yellow-100 text-yellow-700',
    schedulechange: 'bg-sky-100 text-sky-700',
    holdforreview: 'bg-rose-100 text-rose-700',
    yes: 'bg-green-100 text-green-600',
    no: 'bg-red-100 text-red-500',
};

const BAR_TONE = {
    green: 'bg-green-600',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
};

const PROGRESS_TONE = {
    green: 'bg-green-600',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
};

function statusKey(value) {
    return String(value).toLowerCase().replace(/[^a-z]/g, '');
}

const AVATAR_COLORS = ['#2563eb', '#16a34a', '#7c3aed', '#0b66e4', '#f97316', '#10b981', '#0ea5e9', '#dc2626'];

function workerColor(id, name) {
    const seed = Number(id) || String(name || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return AVATAR_COLORS[seed % AVATAR_COLORS.length];
}

function enrichReservation(row) {
    // Approval-driven status for the pre-check-in lifecycle:
    //   not approved → 'Pending'   (lives in the Approvals queue)
    //   approved     → 'Arrival'   (ready to be checked in)
    // Only flips when the row is currently in the Arrival/Pending lane;
    // post-check-in statuses (Check-In/Out/On-Hold) and modification
    // statuses keep their value regardless of approval.
    const isApproved = row.approval === 'Approved';
    let derivedStatus = row.status;
    if (derivedStatus === 'Arrival' && !isApproved) derivedStatus = 'Pending';
    else if (derivedStatus === 'Pending' && isApproved) derivedStatus = 'Arrival';

    return {
        ...row,
        status: derivedStatus,
        // Normalize room-type tiers to the canonical labels exposed in the UI:
        //   Executive · Sr. Executive · Wellsite
        // Older rows / backend payloads using 'Senior Executive' map to
        // 'Sr. Executive' so the queue and Selected Reservation panel match.
        roomType: normalizeRoomType(row.roomType) || row.roomType,
        initials: row.initials || getInitials(row.worker),
        color: row.color || workerColor(row.id, row.worker),
        // Predetermined permission: whether this reservation is authorized
        // to place their room On-Hold. Defaults to true when not provided.
        onHoldAllowed: row.onHoldAllowed ?? true,
        // Notes timeline for this reservation. Each entry is
        //   { author: string, text: string, createdAt: ISO-string }.
        // Strings from older payloads are migrated into a single legacy entry
        // so existing callers keep working.
        notes: Array.isArray(row.notes)
            ? row.notes
            : row.notes
                ? [{ author: 'System', text: String(row.notes), createdAt: '' }]
                : [],
        // Worker shift (Day / Night) and home province / territory abbreviation
        // (e.g. AB, BC, OOC). Seed rows set these explicitly; for backend rows
        // that don't yet ship the columns, fall back to a deterministic example
        // keyed off the worker name so the queue still demos cleanly. The real
        // value wins as soon as the backend starts populating these fields.
        shift: typeof row.shift === 'string' && row.shift.length > 0
            ? row.shift
            : exampleShift(row.worker || row.id || ''),
        province: typeof row.province === 'string' && row.province.length > 0
            ? row.province
            : exampleProvince(row.worker || row.id || ''),
        // Schedule color (Yellow / Blue / Green / Red / Light Blue) drives the
        // Discrepancy queue. Backend rows that don't yet ship this field
        // default to 'Red' (sick — allows any reservation status) so they are
        // not falsely flagged as discrepancies.
        scheduleStatus: typeof row.scheduleStatus === 'string' && row.scheduleStatus.length > 0
            ? row.scheduleStatus
            : 'Red',
        // Powers the Modification Requests tab columns. `requestedAt` is the
        // calendar date the modification was logged (formatted to match the
        // existing arrival/departure strings) and `requestedBy` is the manager
        // username who originated it. Both fall back to deterministic example
        // values for rows that haven't been wired through the backend yet.
        requestedAt: typeof row.requestedAt === 'string' && row.requestedAt.length > 0
            ? row.requestedAt
            : exampleRequestDate(row.worker || row.id || ''),
        requestedBy: typeof row.requestedBy === 'string' && row.requestedBy.length > 0
            ? row.requestedBy
            : exampleRequestUser(row.worker || row.id || ''),
    };
}

function getInitials(name) {
    if (!name) return 'JD';
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase() || '')
        .join('') || 'JD';
}

function Pill({ value, className = '' }) {
    const key = statusKey(value);
    const tone = STATUS_STYLES[key] || 'bg-slate-100 text-slate-500';
    return (
        <span className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-black ${tone} ${className}`}>
            {value}
        </span>
    );
}

function formatMetricValue(value) {
    return typeof value === 'number' ? value.toLocaleString() : value;
}

export default function Dashboard({
    reservations: serverReservations = [],
    assignableRooms = [],
    metricValues = {},
}) {
    const { auth, flash: sessionFlash, errors: pageErrors } = usePage().props;
    const userName = auth?.user?.name || 'John Doe';
    const userInitials = getInitials(userName);

    const initialRows = (serverReservations.length ? serverReservations : SEED_RESERVATIONS).map(
        enrichReservation,
    );

    const [reservations, setReservations] = useState(initialRows);
    const [activeTab, setActiveTab] = useState('All');
    const [selectedIndex, setSelectedIndex] = useState(Math.min(3, Math.max(initialRows.length - 1, 0)));
    const [statusFilter, setStatusFilter] = useState('All');
    const [priorityFilter, setPriorityFilter] = useState('All');
    const [sort, setSort] = useState({ key: null, dir: 'asc' });
    const [search, setSearch] = useState('');
    const [toast, setToast] = useState('');
    const [dropdown, setDropdown] = useState({ open: false, top: 0, left: 0 });
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [assignSaving, setAssignSaving] = useState(false);
    const [checkInSaving, setCheckInSaving] = useState(false);
    const [extendModalOpen, setExtendModalOpen] = useState(false);
    const [infoCardOpen, setInfoCardOpen] = useState(false);
    const [alertModal, setAlertModal] = useState({ open: false, title: '', message: '' });
    const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
    const [removeOnHoldModalOpen, setRemoveOnHoldModalOpen] = useState(false);
    const [notesModalOpen, setNotesModalOpen] = useState(false);
    const [scheduleModRequestOpen, setScheduleModRequestOpen] = useState(false);
    const [selectedOtherOpen, setSelectedOtherOpen] = useState(true);
    const [extendSaving, setExtendSaving] = useState(false);
    const [extendError, setExtendError] = useState('');
    const [assignError, setAssignError] = useState('');

    const dropdownRef = useRef(null);
    const toastTimeoutRef = useRef(null);
    const otherSectionRef = useRef(null);
    // Skip the first effect fire (the section starts open by default — we
    // only want to auto-scroll on subsequent user toggles).
    const otherInitialMountRef = useRef(true);

    const statusOptions = STATUS_FILTER_OPTIONS;

    const filtered = useMemo(() => {
        let rows = reservations;
        if (activeTab === 'Room Allocation') {
            rows = rows.filter((r) => r.room === 'Unassigned' || !r.roomId);
        } else if (activeTab === 'Room Allotment') {
            rows = rows.filter((r) => r.allotment === 'Pending');
        } else if (activeTab === 'Modification Request') {
            rows = rows.filter((r) => MODIFICATION_STATUSES.includes(r.status));
        } else if (activeTab === 'Discrepancy') {
            rows = rows.filter((r) => scheduleDiscrepancy(r) !== null);
        } else if (activeTab === 'All') {
            // Approvals queue: Pending (awaiting manager approval) + Arrival
            // (approved, awaiting check-in). Rows whose status has a dedicated
            // queue elsewhere never show up here.
            rows = rows.filter((r) => {
                if (APPROVALS_HIDDEN_STATUSES.includes(r.status)) return false;
                return (
                    r.status === 'Arrival' ||
                    r.status === 'Pending' ||
                    r.approval === 'Pending'
                );
            });
        } else {
            rows = rows.filter((r) => r.status === activeTab);
        }
        if (statusFilter !== 'All') rows = rows.filter((r) => r.status === statusFilter);
        if (priorityFilter !== 'All') rows = rows.filter((r) => r.approval === priorityFilter);
        if (search) {
            const s = search.toLowerCase();
            rows = rows.filter((r) => `${r.worker} ${r.company} ${r.room}`.toLowerCase().includes(s));
        }
        return rows;
    }, [reservations, activeTab, statusFilter, priorityFilter, search]);

    const sortedFiltered = useMemo(() => {
        if (!sort.key) return filtered;
        // Sort metadata can come from either the default queue's column set or
        // the Modification Requests column set; first-match wins so shared keys
        // like `company` / `status` / `notes` keep their existing behavior.
        const col =
            SORTABLE_COLUMNS.find((c) => c.key === sort.key) ||
            MODIFICATION_COLUMNS.find((c) => c.key === sort.key);
        if (!col) return filtered;
        const rows = [...filtered];
        const dir = sort.dir === 'asc' ? 1 : -1;
        rows.sort((a, b) => {
            const av = a[col.key];
            const bv = b[col.key];
            let cmp = 0;
            if (col.type === 'date') {
                cmp = (Date.parse(av) || 0) - (Date.parse(bv) || 0);
            } else if (col.type === 'has') {
                const aHas = Array.isArray(av) ? av.length > 0 : !!av;
                const bHas = Array.isArray(bv) ? bv.length > 0 : !!bv;
                cmp = (bHas ? 1 : 0) - (aHas ? 1 : 0); // ascending: rows with content first
            } else if (col.type === 'priority') {
                const ao = col.order[av] ?? -Infinity;
                const bo = col.order[bv] ?? -Infinity;
                cmp = bo - ao; // ascending shows highest urgency first
            } else {
                cmp = String(av ?? '').localeCompare(String(bv ?? ''));
            }
            return cmp * dir;
        });
        return rows;
    }, [filtered, sort]);

    function requestSort(key) {
        setSort((prev) => {
            if (prev.key !== key) return { key, dir: 'asc' };
            if (prev.dir === 'asc') return { key, dir: 'desc' };
            return { key: null, dir: 'asc' };
        });
    }

    const selected = reservations[selectedIndex];

    function flash(message) {
        setToast(message);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setToast(''), 2400);
    }

    function setTab(key) {
        setActiveTab(key);
        flash(`Showing ${key === 'All' ? 'Approvals' : key} queue`);
    }

    function toggleDropdown(event, index) {
        event.stopPropagation();
        setSelectedIndex(index);
        const rect = event.currentTarget.getBoundingClientRect();
        const width = 265;
        const margin = 12;
        const gap = 8;

        let left = rect.left - width + rect.width;
        if (left < margin) left = rect.right + 8;

        // Pick the side with more room and bound the menu to that space so the
        // last item is always reachable (with internal scroll if needed).
        const spaceBelow = window.innerHeight - rect.bottom - margin - gap;
        const spaceAbove = rect.top - margin - gap;
        let top;
        let maxHeight;
        if (spaceBelow >= spaceAbove) {
            top = rect.bottom + gap;
            maxHeight = spaceBelow;
        } else {
            maxHeight = spaceAbove;
            top = rect.top - maxHeight - gap;
        }
        // Defensive floors so the menu is still usable in tiny viewports.
        if (maxHeight < 200) maxHeight = 200;
        if (top < margin) top = margin;

        setDropdown((d) => ({
            open: !d.open || d._anchor !== index,
            top,
            left,
            maxHeight,
            _anchor: index,
        }));
    }

    function updateSelectedField(field, value) {
        setReservations((rows) => {
            const next = [...rows];
            if (next[selectedIndex]) {
                next[selectedIndex] = { ...next[selectedIndex], [field]: value };
            }
            return next;
        });
    }

    function runAction(action) {
        setDropdown((d) => ({ ...d, open: false }));
        if (action === 'Info Card') {
            setInfoCardOpen(true);
            return;
        }
        if (action === 'Add Notes') {
            setNotesModalOpen(true);
            return;
        }
        if (action === 'Reject / Hold for Review') {
            // Flip the row into the Modification Requests queue and immediately
            // surface the notes modal so the lodge manager can record the
            // reason. Notes append to the existing timeline; the status flip is
            // independent of whether they save a note.
            const target = reservations[selectedIndex];
            setReservations((rows) => {
                const next = [...rows];
                if (!next[selectedIndex]) return rows;
                next[selectedIndex] = { ...next[selectedIndex], status: 'Hold for Review' };
                return next;
            });
            setNotesModalOpen(true);
            flash(
                `Reject / Hold for Review: ${target?.worker || 'reservation'} — moved to Modification Requests`,
            );
            return;
        }

        // Predetermined permission: block On-Hold for unauthorized reservations.
        if (action === 'On-Hold' || action === 'Convert to On-Hold') {
            const target = reservations[selectedIndex];
            if (target && target.onHoldAllowed === false) {
                setAlertModal({
                    open: true,
                    title: 'On-Hold not authorized',
                    message:
                        'This Reservation is not authorized to place their room on hold. Please contact their scheduling manager to request a change.',
                });
                return;
            }
        }
        if (action === 'Manual Assign') {
            setAssignError('');
            setAssignModalOpen(true);
            return;
        }
        if (action === 'AI Assign') {
            submitAiAssignment();
            return;
        }
        if (action === 'Check In Worker') {
            submitCheckIn();
            return;
        }
        if (action === 'Extend Stay') {
            setExtendError('');
            setExtendModalOpen(true);
            return;
        }
        if (action === 'Check Out Worker' || action === 'Check-Out') {
            setCheckOutModalOpen(true);
            return;
        }
        if (action === 'Remove On-Hold') {
            setRemoveOnHoldModalOpen(true);
            return;
        }
        setReservations((rows) => {
            const next = [...rows];
            const r = { ...next[selectedIndex] };
            if (action === 'Approve Reservation') {
                r.approval = 'Approved';
                // Pending → Arrival on approval. Other statuses stay as-is.
                if (r.status === 'Pending') r.status = 'Arrival';
            }
            if (action === 'Arrival') {
                // Manual mark-as-arrival: status flips to Arrival and approval
                // is set so the row honors the Pending↔Arrival lifecycle rule
                // (Arrival implies approved).
                r.status = 'Arrival';
                r.approval = 'Approved';
            }
            if (action === 'On-Hold') {
                r.status = 'On-Hold';
                if (r.allotment === 'Allotted') r.allotment = 'On-Hold';
            }
            if (action === 'Mark No-Show') r.status = 'No-Show';
            next[selectedIndex] = r;
            flash(`${action}: ${r.worker}`);
            return next;
        });
    }

    function submitCheckOut(date) {
        setReservations((rows) => {
            const next = [...rows];
            const r = { ...next[selectedIndex], status: 'Check-Out', checkOutDate: date };
            next[selectedIndex] = r;
            return next;
        });
        setCheckOutModalOpen(false);
        const display = reservations[selectedIndex]?.worker || 'worker';
        flash(`Check-Out: ${display} on ${date}`);
    }

    function submitRemoveOnHold(date) {
        setReservations((rows) => {
            const next = [...rows];
            const r = { ...next[selectedIndex], status: 'Check-In', checkInDate: date };
            if (r.allotment === 'On-Hold') r.allotment = 'Allotted';
            next[selectedIndex] = r;
            return next;
        });
        setRemoveOnHoldModalOpen(false);
        const display = reservations[selectedIndex]?.worker || 'worker';
        flash(`Removed On-Hold: ${display} checked in ${date}`);
    }

    // YYYY-MM-DD → "Jun 20, 2026"; matches seed display format.
    function isoToDisplayDate(iso) {
        if (!iso) return iso;
        const [year, month, day] = String(iso).split('-').map(Number);
        if (!year || !month || !day) return iso;
        return new Date(year, month - 1, day).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    }

    // Optimistic local update: bump the departure and flip the row to
    // Check-In so it leaves the Modification Requests queue and lands in
    // the Check-In queue. Reused by both the local-only and server-backed
    // extend flows so the UI behaves the same regardless.
    function applyExtensionLocally(newDepartureDate) {
        setReservations((rows) => {
            const next = [...rows];
            const target = next[selectedIndex];
            if (!target) return rows;
            next[selectedIndex] = {
                ...target,
                departure: isoToDisplayDate(newDepartureDate),
                departureDate: newDepartureDate,
                status: 'Check-In',
            };
            return next;
        });
    }

    function submitExtendStay(newDepartureDate) {
        const reservation = reservations[selectedIndex];
        if (!reservation || !newDepartureDate) {
            flash('Choose a reservation and a new departure date.');
            return;
        }

        // Local-only reservation (seed data): update in-memory and exit.
        if (!reservation.id) {
            applyExtensionLocally(newDepartureDate);
            setExtendModalOpen(false);
            flash(`Extension approved for ${reservation.worker} — moved to Check-In`);
            return;
        }

        setExtendSaving(true);
        setExtendError('');

        router.post(
            route('dashboard.extend-stay'),
            {
                reservation_id: reservation.id,
                new_departure_date: newDepartureDate,
            },
            {
                preserveScroll: true,
                onFinish: () => setExtendSaving(false),
                onSuccess: () => {
                    // Optimistic flip — the serverReservations effect will
                    // overwrite if the backend returns a different status,
                    // but the UX matches the lodge-manager workflow today.
                    applyExtensionLocally(newDepartureDate);
                    setExtendModalOpen(false);
                    flash(`Extension approved for ${reservation.worker} — moved to Check-In`);
                },
                onError: (errors) => {
                    setExtendError(
                        errors.new_departure_date || errors.reservation || 'Unable to extend stay.',
                    );
                },
            },
        );
    }

    function submitCheckIn() {
        const reservation = reservations[selectedIndex];
        if (!reservation) return;

        // Local-only reservation (no persisted id, e.g. seed data): flip the
        // status directly so a No-Show row can still be moved to Check-In
        // without round-tripping to the server.
        if (!reservation.id) {
            setReservations((rows) => {
                const next = [...rows];
                next[selectedIndex] = { ...next[selectedIndex], status: 'Check-In' };
                return next;
            });
            flash(`Check In Worker: ${reservation.worker}`);
            return;
        }

        setCheckInSaving(true);

        router.post(
            route('dashboard.check-in'),
            { reservation_id: reservation.id },
            {
                preserveScroll: true,
                onFinish: () => setCheckInSaving(false),
                onError: (errors) => {
                    flash(errors.reservation || 'Unable to check in worker.');
                },
            },
        );
    }

    function submitAiAssignment() {
        const reservation = reservations[selectedIndex];
        if (!reservation?.id) {
            flash('Select a reservation with a saved record to assign a room.');
            return;
        }

        setAssignSaving(true);
        setAssignError('');

        router.post(
            route('dashboard.ai-assign-room'),
            { reservation_id: reservation.id },
            {
                preserveScroll: true,
                onFinish: () => setAssignSaving(false),
                onError: (errors) => {
                    flash(errors.room || errors.reservation || 'Unable to AI assign room.');
                },
            },
        );
    }

    function submitRoomAssignment(roomId) {
        const reservation = reservations[selectedIndex];
        if (!reservation?.id || !roomId) return;

        setAssignSaving(true);
        setAssignError('');

        router.post(
            route('dashboard.assign-room'),
            {
                reservation_id: reservation.id,
                room_id: roomId,
            },
            {
                preserveScroll: true,
                onFinish: () => setAssignSaving(false),
                onSuccess: () => {
                    setAssignModalOpen(false);
                },
                onError: (errors) => {
                    setAssignError(errors.room || errors.reservation || 'Unable to assign room.');
                },
            },
        );
    }

    useEffect(() => {
        if (serverReservations.length) {
            setReservations(serverReservations.map(enrichReservation));
        }
    }, [serverReservations]);

    useEffect(() => {
        if (sessionFlash?.toast) flash(sessionFlash.toast);
    }, [sessionFlash?.toast]);

    useEffect(() => {
        if (pageErrors?.room || pageErrors?.reservation) {
            setAssignError(pageErrors.room || pageErrors.reservation);
        }
        if (pageErrors?.new_departure_date || pageErrors?.reservation) {
            setExtendError(pageErrors.new_departure_date || pageErrors.reservation);
        }
    }, [pageErrors]);

    useEffect(() => {
        function onDocClick(e) {
            if (dropdownRef.current && dropdownRef.current.contains(e.target)) return;
            if (e.target.closest?.('[data-ellipsis]')) return;
            setDropdown((d) => (d.open ? { ...d, open: false } : d));
        }
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    useEffect(() => () => toastTimeoutRef.current && clearTimeout(toastTimeoutRef.current), []);

    // When the Other section is opened (toggled true), smoothly scroll so the
    // newly revealed action items are fully visible. The Selected Reservations
    // aside has its own internal scroll (max-h + overflow-y-auto on viewports
    // ≥1101px) and flips to a static document-flow block below 1100px — we
    // need to handle both so the items end up on-screen either way.
    useEffect(() => {
        if (otherInitialMountRef.current) {
            otherInitialMountRef.current = false;
            return;
        }
        if (!selectedOtherOpen) return;

        function attemptScroll() {
            const el = otherSectionRef.current;
            if (!el) return;

            // 1. Aside-internal scroll (sticky/scrollable layout). Only acts
            //    if the aside actually has overflow at this moment — otherwise
            //    we'd scroll a non-scrollable container and produce nothing.
            const aside = el.closest('aside');
            if (aside && aside.scrollHeight > aside.clientHeight) {
                const elBottom = el.getBoundingClientRect().bottom;
                const asideBottom = aside.getBoundingClientRect().bottom;
                const delta = elBottom - asideBottom + 16;
                if (delta > 0) {
                    aside.scrollTo({
                        top: aside.scrollTop + delta,
                        behavior: 'smooth',
                    });
                }
            }

            // 2. Document-level scroll (responsive static layout, or as a
            //    fallback for any ancestor that still clips the section).
            el.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }

        // Two passes: the first runs after React's commit + first layout, the
        // second catches any case where the items list was still mounting (the
        // aside's overflow flag flips this same render so the browser may not
        // have re-laid out yet on the first frame).
        const t1 = setTimeout(attemptScroll, 60);
        const t2 = setTimeout(attemptScroll, 200);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [selectedOtherOpen]);

    // Live metric counts — each widget mirrors the filter used by its
    // corresponding queue tab so the headline numbers stay in lockstep with
    // what the manager actually sees in the queue. The vs-yesterday change /
    // direction strings still come from METRICS since they require historical
    // data we don't compute locally.
    const metrics = useMemo(() => {
        // Today's display label, formatted to match the seed/backend `arrival`
        // string ("Jun 13, 2026"). Computed inside the memo so it stays in
        // sync with the rest of the metric pass.
        const todayLabel = new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
        const expectedInToday = reservations.filter((r) => r.arrival === todayLabel).length;
        const checkedInToday = reservations.filter(
            (r) => r.arrival === todayLabel && r.status === 'Check-In',
        ).length;
        const expectedOutToday = reservations.filter((r) => r.departure === todayLabel).length;
        const checkedOutToday = reservations.filter(
            (r) => r.departure === todayLabel && r.status === 'Check-Out',
        ).length;

        const counts = {
            'Pending Approvals': reservations.filter((r) => r.status === 'Pending').length,
            'Rooms to Allocate': reservations.filter(
                (r) => r.room === 'Unassigned' || !r.roomId,
            ).length,
            'Rooms Allotted Tonight': reservations.filter((r) => r.allotment === 'Allotted').length,
            // Split format: "<already checked in today> / <total expected today>".
            // String passes through formatMetricValue unchanged.
            'Check-Ins': `${checkedInToday} / ${expectedInToday}`,
            'Check-Outs': `${checkedOutToday} / ${expectedOutToday}`,
            'Active Extensions': reservations.filter((r) => r.status === 'Extension').length,
            'Walk-Ins': reservations.filter((r) => r.status === 'Walk-In').length,
            'No-Shows': reservations.filter((r) => r.status === 'No-Show').length,
        };
        return METRICS.map((m) => ({
            ...m,
            value: counts[m.label] != null ? formatMetricValue(counts[m.label]) : m.value,
        }));
    }, [reservations]);

    const queueTitle = activeTab === 'All' ? 'Reservation Operations Queue' : `${activeTab} Queue`;

    return (
        <>
            <Head title="Reservation Operations Center" />

            <AppLayout activeHref="dashboard">
                <AppPageShell>
                    <AppPageHeader className="sticky top-0 z-20 flex h-[78px] items-center justify-between border-b border-lx-border bg-white px-6 max-[1100px]:sticky min-[1101px]:static">
                        <div>
                            <h1 className="m-0 text-[26px] tracking-[-0.5px] text-lx-navy">
                                Reservation Operations Center
                            </h1>
                            <p className="mt-0.5 text-[13px] font-semibold text-slate-500">
                                Unified control for reservation approvals, room movement, arrivals, and exception handling.
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-extrabold text-slate-500">
                                Last updated: May 20, 2025 09:30 AM
                            </span>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search reservations, workers, company, or room..."
                                className="h-[42px] w-[420px] max-w-[35vw] rounded-xl border border-lx-border bg-white px-3.5 outline-none focus:border-lx-blue max-[1100px]:hidden"
                            />
                            <span aria-hidden>🔔</span>
                            <span aria-hidden>❔</span>
                            <div className="flex items-center gap-2.5">
                                <div className="grid h-[38px] w-[38px] place-items-center rounded-full bg-lx-blue font-black text-white">
                                    {userInitials}
                                </div>
                                <div className="text-xs">
                                    <strong>{userName}</strong>
                                    <br />
                                    <span className="text-slate-500">Operations Manager</span>
                                </div>
                            </div>
                        </div>
                    </AppPageHeader>

                    <AppPageBody>
                        <section className="grid grid-cols-[1fr_330px] items-start gap-[18px] max-[1100px]:grid-cols-1">
                            <div>
                                <section className="mb-[18px] rounded-[24px] border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-4 shadow-lg shadow-blue-100/50">
                                    <div className="grid grid-cols-8 gap-2.5 max-[1450px]:grid-cols-4 max-[900px]:grid-cols-2">
                                        {metrics.map((m) => (
                                            <div
                                                key={m.label}
                                                className={`relative h-[108px] min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md ${m.palette.border}`}
                                            >
                                                {/* Left accent bar — gradient unique per metric */}
                                                <div
                                                    aria-hidden
                                                    className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${m.palette.bar}`}
                                                />
                                                <div className="flex h-full flex-col justify-between py-3 pl-4 pr-3">
                                                    <div className="flex min-w-0 items-start gap-2">
                                                        <div
                                                            className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-xs font-black ${m.palette.iconBg} ${m.palette.iconText}`}
                                                        >
                                                            {m.icon}
                                                        </div>
                                                        <div className="line-clamp-2 break-words text-[12px] font-bold leading-tight text-slate-700">
                                                            {m.label}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-end justify-between gap-2">
                                                        <div className="text-3xl font-black leading-none tracking-tight text-slate-950">
                                                            {m.value}
                                                        </div>
                                                        <div
                                                            className={`whitespace-nowrap text-[10px] font-bold ${
                                                                m.direction === 'up' ? 'text-emerald-600' : 'text-red-600'
                                                            }`}
                                                        >
                                                            {m.change}
                                                        </div>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">vs yesterday</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                                <div className="overflow-hidden rounded-2xl border border-lx-border bg-white shadow-lx-card">
                                    <div className="flex overflow-x-auto border-b border-lx-border bg-white">
                                        {TABS.map((t) => (
                                            <button
                                                key={t.key}
                                                onClick={() => setTab(t.key)}
                                                title={t.title || ''}
                                                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 border-b-[3px] px-3 py-4 text-sm font-bold leading-tight transition-colors ${
                                                    activeTab === t.key
                                                        ? 'border-lx-blue bg-[#eaf2ff] text-lx-blue'
                                                        : 'border-transparent bg-white text-lx-ink hover:bg-[#f6faff]'
                                                }`}
                                            >
                                                <span>{t.icon}</span>
                                                <span className="whitespace-nowrap">{t.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center border-b border-lx-border px-[18px] py-4">
                                        <div className="text-base font-black text-lx-navy">
                                            {queueTitle}
                                            <span className="ml-1.5 inline-block rounded-full bg-[#eaf2ff] px-2.5 py-1 text-xs font-bold text-lx-blue">
                                                {filtered.length}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full table-fixed border-collapse min-w-[1080px]">
                                            <thead>
                                                <tr>
                                                    <th className="w-[42px] border-b border-lx-line bg-[#fbfdff] p-3 text-left text-xs font-black text-lx-ink-soft">
                                                        <input type="checkbox" />
                                                    </th>
                                                    <th className="w-[190px] border-b border-lx-line bg-[#fbfdff] p-3 text-left text-xs font-black text-lx-ink-soft">
                                                        {activeTab === 'Modification Request' ? 'Reservation Worker' : 'Worker'}
                                                    </th>
                                                    {(activeTab === 'Modification Request'
                                                        ? MODIFICATION_COLUMNS
                                                        : SORTABLE_COLUMNS
                                                    ).map((c) => {
                                                        const isActive = sort.key === c.key;
                                                        const arrow = isActive ? (sort.dir === 'asc' ? '▲' : '▼') : '↕';
                                                        const isSortable = c.sortable !== false;
                                                        return (
                                                            <th
                                                                key={c.key}
                                                                onClick={isSortable ? () => requestSort(c.key) : undefined}
                                                                title={isSortable ? `Sort by ${c.label}` : c.label}
                                                                aria-sort={
                                                                    isActive
                                                                        ? sort.dir === 'asc'
                                                                            ? 'ascending'
                                                                            : 'descending'
                                                                        : 'none'
                                                                }
                                                                className={`select-none border-b border-lx-line bg-[#fbfdff] p-3 text-left text-xs font-black text-lx-ink-soft ${
                                                                    isSortable
                                                                        ? 'cursor-pointer hover:bg-[#eef4ff]'
                                                                        : ''
                                                                }`}
                                                            >
                                                                <span className="inline-flex items-center gap-1">
                                                                    {c.label}
                                                                    {isSortable && (
                                                                        <span
                                                                            className={`text-[10px] leading-none ${
                                                                                isActive ? 'text-lx-blue' : 'text-slate-300'
                                                                            }`}
                                                                        >
                                                                            {arrow}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </th>
                                                        );
                                                    })}
                                                    <th className="w-[85px] border-b border-lx-line bg-[#fbfdff] p-3 text-center text-xs font-black text-lx-ink-soft">
                                                        {activeTab === 'Modification Request' ? 'Open' : 'Action'}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedFiltered.map((r) => {
                                                    const realIndex = reservations.indexOf(r);
                                                    const isSelected = realIndex === selectedIndex;
                                                    return (
                                                        <tr
                                                            key={r.id ?? `${r.worker}-${realIndex}`}
                                                            onClick={() => setSelectedIndex(realIndex)}
                                                            className={`cursor-pointer transition-colors hover:bg-[#f8fbff] ${
                                                                isSelected ? 'bg-[#eef6ff] outline outline-1 outline-[#bcd7ff]' : ''
                                                            }`}
                                                        >
                                                            <td className="border-b border-lx-line p-3 align-middle text-[13px] text-lx-ink">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => setSelectedIndex(realIndex)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </td>
                                                            <td className="border-b border-lx-line p-3 align-middle text-[13px] text-lx-ink">
                                                                <div className="flex items-center gap-2.5 font-extrabold">
                                                                    <span
                                                                        className="grid h-[30px] w-[30px] place-items-center rounded-full text-xs font-black text-white"
                                                                        style={{ background: r.color }}
                                                                    >
                                                                        {r.initials}
                                                                    </span>
                                                                    {r.worker}
                                                                </div>
                                                            </td>
                                                            {activeTab === 'Modification Request' ? (
                                                                <>
                                                                    <td className="border-b border-lx-line p-3 align-middle text-[13px] text-lx-ink">{r.company}</td>
                                                                    <td className="border-b border-lx-line p-3 align-middle text-[13px] text-lx-ink">{r.requestedAt}</td>
                                                                    <td className="border-b border-lx-line p-3 align-middle text-[13px] font-extrabold text-lx-ink">{r.requestedBy}</td>
                                                                    <td className="border-b border-lx-line p-3 align-middle text-[13px]"><Pill value={r.status} /></td>
                                                                    <td className="border-b border-lx-line p-3 align-middle text-[13px]">
                                                                        <Pill value="Pending" />
                                                                    </td>
                                                                    <td className="border-b border-lx-line p-3 align-middle text-[13px]">
                                                                        {Array.isArray(r.notes) && r.notes.length > 0 ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setSelectedIndex(realIndex);
                                                                                    setNotesModalOpen(true);
                                                                                }}
                                                                                className="cursor-pointer rounded-md border-0 bg-transparent p-0 text-[13px] font-black text-lx-blue underline-offset-2 hover:underline"
                                                                            >
                                                                                View
                                                                            </button>
                                                                        ) : (
                                                                            <span className="text-slate-400">—</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="border-b border-lx-line p-3 text-center align-middle">
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelectedIndex(realIndex);
                                                                                setScheduleModRequestOpen(true);
                                                                            }}
                                                                            className="inline-flex cursor-pointer items-center gap-1 rounded-md border-0 bg-transparent p-0 text-[13px] font-black text-lx-blue underline-offset-2 hover:underline"
                                                                            title="Open Schedule Modification Request"
                                                                        >
                                                                            Open
                                                                            <span className="text-[11px] leading-none">↗</span>
                                                                        </button>
                                                                    </td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td className="border-b border-lx-line p-3 align-middle text-[13px] text-lx-ink">{r.company}</td>
                                                                    <td className="border-b border-lx-line p-3 align-middle text-[13px] font-extrabold text-lx-ink">
                                                                        {r.shift || <span className="text-slate-400">—</span>}
                                                                    </td>
                                                                    <td
                                                                        className="border-b border-lx-line p-3 align-middle text-[13px] font-extrabold text-lx-ink"
                                                                        title={PROVINCE_LABELS[r.province] || ''}
                                                                    >
                                                                        {r.province || <span className="text-slate-400">—</span>}
                                                                    </td>
                                                                    <td className="border-b border-lx-line p-3 align-middle text-[13px]"><Pill value={r.status} /></td>
                                                                    <td className="border-b border-lx-line p-3 align-middle text-[13px] text-lx-ink">{r.arrival}</td>
                                                                    <td className="border-b border-lx-line p-3 align-middle text-[13px] text-lx-ink">{r.departure}</td>
                                                                    <td className="border-b border-lx-line p-3 align-middle text-[13px] text-lx-ink">{r.room}</td>
                                                                    <td className="border-b border-lx-line p-3 align-middle text-[13px]">
                                                                        <Pill value={r.onHoldAllowed === false ? 'No' : 'Yes'} />
                                                                    </td>
                                                                    <td className="border-b border-lx-line p-3 align-middle text-[13px]">
                                                                        {Array.isArray(r.notes) && r.notes.length > 0 ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setSelectedIndex(realIndex);
                                                                                    setNotesModalOpen(true);
                                                                                }}
                                                                                className="cursor-pointer rounded-md border-0 bg-transparent p-0 text-[13px] font-black text-lx-blue underline-offset-2 hover:underline"
                                                                            >
                                                                                View
                                                                            </button>
                                                                        ) : (
                                                                            <span className="text-slate-400">—</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="border-b border-lx-line p-3 text-center align-middle">
                                                                        <button
                                                                            data-ellipsis
                                                                            onClick={(e) => toggleDropdown(e, realIndex)}
                                                                            className="h-[30px] w-[34px] cursor-pointer rounded-lg border border-transparent bg-transparent text-xl leading-none text-lx-ink hover:border-lx-border hover:bg-[#eef6ff]"
                                                                        >
                                                                            •••
                                                                        </button>
                                                                    </td>
                                                                </>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex items-center justify-between p-[18px] text-[13px] text-slate-500">
                                        <span>Showing 1 to {filtered.length} of {reservations.length} entries</span>
                                        <div>
                                            {['‹', '1', '2', '3', '4', '›'].map((p, i) => (
                                                <button
                                                    key={`${p}-${i}`}
                                                    className={`mx-0.5 h-8 w-8 cursor-pointer rounded-lg border border-lx-border font-extrabold ${
                                                        p === '1' ? 'bg-lx-blue text-white' : 'bg-white text-lx-ink'
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-[18px] grid grid-cols-5 gap-3.5 max-[1450px]:grid-cols-2">
                                    <div className="min-h-[210px] rounded-2xl border border-lx-border bg-white p-4 shadow-lx-soft">
                                        <h4 className="mb-3 flex justify-between text-sm font-black text-lx-navy">
                                            Approval Trend (7 Days) <span>ⓘ</span>
                                        </h4>
                                        <div className="flex h-[125px] items-end gap-2.5 pt-3.5">
                                            {APPROVAL_TREND.map((b, i) => (
                                                <div
                                                    key={i}
                                                    className={`flex-1 rounded-t-md ${BAR_TONE[b.tone]}`}
                                                    style={{ height: `${b.h}%` }}
                                                />
                                            ))}
                                        </div>
                                        <a className="text-xs font-black text-lx-blue">View full report</a>
                                    </div>

                                    <div className="min-h-[210px] rounded-2xl border border-lx-border bg-white p-4 shadow-lx-soft">
                                        <h4 className="mb-3 flex justify-between text-sm font-black text-lx-navy">
                                            Room Utilization by Dorm / Zone <span>ⓘ</span>
                                        </h4>
                                        <div>
                                            {DORMS.map(([name, pct, tone]) => (
                                                <div key={name} className="my-3">
                                                    <div className="mb-1.5 flex justify-between text-xs font-extrabold text-lx-ink">
                                                        <span>{name}</span>
                                                        <span>{pct}%</span>
                                                    </div>
                                                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                                                        <div className={`h-full rounded-full ${PROGRESS_TONE[tone]}`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <Link href={route('room-utilization')} className="text-xs font-black text-lx-blue">
                                            View all utilization
                                        </Link>
                                    </div>

                                    <div className="min-h-[210px] rounded-2xl border border-lx-border bg-white p-4 shadow-lx-soft">
                                        <h4 className="mb-3 flex justify-between text-sm font-black text-lx-navy">
                                            Extension Queue
                                            <span className="rounded-full bg-[#eaf2ff] px-2.5 py-1 text-xs text-lx-blue">28</span>
                                        </h4>
                                        <div className="grid gap-2">
                                            {EXTENSION_QUEUE.map(([name, company, prio]) => (
                                                <div key={name} className="flex justify-between text-xs text-lx-ink">
                                                    <span>
                                                        {name}
                                                        <br />
                                                        <small>{company}</small>
                                                    </span>
                                                    <Pill value={prio} />
                                                </div>
                                            ))}
                                        </div>
                                        <a className="text-xs font-black text-lx-blue">View all extensions</a>
                                    </div>

                                    <div className="min-h-[210px] rounded-2xl border border-lx-border bg-white p-4 shadow-lx-soft">
                                        <h4 className="mb-3 flex justify-between text-sm font-black text-lx-navy">
                                            Walk-In Activity
                                            <span className="rounded-full bg-[#eaf2ff] px-2.5 py-1 text-xs text-lx-blue">24</span>
                                        </h4>
                                        <div
                                            className="mx-auto my-3 grid h-[112px] w-[112px] place-items-center rounded-full"
                                            style={{
                                                background:
                                                    'conic-gradient(#0b66e4 0 58%, #7c3aed 58% 83%, #f97316 83% 100%)',
                                            }}
                                        >
                                            <div className="grid h-[72px] w-[72px] place-items-center rounded-full bg-white text-center text-xs font-black text-lx-navy">
                                                24
                                                <br />
                                                <small>Today</small>
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-xs text-lx-ink">
                                            <span>vs Yesterday</span>
                                            <strong className="text-red-500">↑ 14.3%</strong>
                                        </div>
                                        <a className="text-xs font-black text-lx-blue">View walk-in list</a>
                                    </div>

                                    <div className="min-h-[210px] rounded-2xl border border-lx-border bg-white p-4 shadow-lx-soft">
                                        <h4 className="mb-3 flex justify-between text-sm font-black text-lx-navy">
                                            No-Show Trend (7 Days) <span>ⓘ</span>
                                        </h4>
                                        <div className="flex h-[125px] items-end gap-2.5 pt-3.5">
                                            {NOSHOW_TREND.map((h, i) => (
                                                <div key={i} className="flex-1 rounded-t-md bg-red-500" style={{ height: `${h}%` }} />
                                            ))}
                                        </div>
                                        <a className="text-xs font-black text-lx-blue">View no-shows report</a>
                                    </div>
                                </div>

                                <div className="mt-[18px] grid grid-cols-5 gap-3 rounded-2xl border border-lx-border bg-white px-4 py-3 text-xs font-extrabold text-lx-ink max-[1100px]:grid-cols-1">
                                    {[
                                        'System Health: Operational',
                                        'AI Engine: Operational',
                                        'Database: Operational',
                                        'Integrations: Operational',
                                        'Data Sync: Auto-refresh ON',
                                    ].map((label) => (
                                        <span key={label}>
                                            <span className="text-green-600">●</span>{' '}
                                            {label}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <aside
                                className={`sticky top-4 self-start max-h-[calc(100vh-150px)] ${
                                    selectedOtherOpen ? 'overflow-y-auto' : 'overflow-y-hidden'
                                } overflow-x-hidden rounded-2xl border border-lx-border bg-white shadow-lx-card max-[1100px]:static max-[1100px]:max-h-none max-[1100px]:overflow-visible`}
                            >
                                {selected ? (
                                    <div className="space-y-3 p-5">
                                        <div className="relative flex items-start gap-4">
                                            <div
                                                className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-xl font-black text-white shadow-sm"
                                                style={{ background: selected.color }}
                                            >
                                                {selected.initials}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="m-0 truncate text-2xl font-black leading-tight text-lx-navy">
                                                    {selected.worker}
                                                </h3>
                                                <p className="m-0 mt-0.5 text-base font-bold text-slate-500">
                                                    {selected.company}
                                                </p>
                                                <div className="mt-3">
                                                    <Pill value={selected.status} className="px-3 py-1.5 text-sm" />
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                title="Pin selected reservation"
                                                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-xl text-slate-500 hover:bg-[#f4f8ff]"
                                            >
                                                📌
                                            </button>
                                        </div>

                                        <div className="border-t border-lx-line" />

                                        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm text-lx-ink">
                                            {[
                                                ['Stay Dates', `${selected.arrival} – ${selected.departure}`],
                                                ['Room Type', selected.roomType],
                                                ['Assigned', selected.room],
                                                ['AI Suggested Room', selected.aiRoom || '—'],
                                                ['Approval', selected.approval],
                                            ].map(([k, v]) => (
                                                <div key={k} className="contents">
                                                    <span className="font-bold text-slate-500">{k}</span>
                                                    <span className="truncate text-right font-black text-lx-navy">{v}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="rounded-2xl border border-lx-border bg-white p-3 shadow-sm">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-3xl text-violet-600">✦</span>
                                                    <div>
                                                        <strong className="block text-base text-lx-navy">AI Recommendation</strong>
                                                        {selected.aiRoom ? (
                                                            <span className="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#eaf2ff] px-3 py-1 text-sm font-black text-lx-blue">
                                                                🛏️ {selected.aiRoom}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <div
                                                    className="grid h-[64px] w-[64px] shrink-0 place-items-center rounded-full"
                                                    style={{
                                                        background: `conic-gradient(#16a34a 0 ${selected.score}%, #e5e7eb ${selected.score}% 100%)`,
                                                    }}
                                                >
                                                    <div className="grid h-[50px] w-[50px] place-items-center rounded-full bg-white text-center text-xs font-black text-lx-navy">
                                                        <span>{selected.score}%</span>
                                                        <small className="-mt-2 text-[10px] font-bold text-slate-500">Match</small>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="mt-2 text-xs font-semibold text-lx-ink">
                                                {selected.aiRoom
                                                    ? '● Best match for location, preferences, and housekeeping flow.'
                                                    : '● No assignable room is currently available for this reservation.'}
                                            </p>
                                            {/* Assign control lives inside the AI Recommendation card so the
                                                AI/Manual choice sits right next to the suggested room. */}
                                            <div
                                                role="group"
                                                aria-label="Assign room"
                                                className="mt-3 grid h-12 w-full grid-cols-2 overflow-hidden rounded-[10px] border border-lx-blue bg-white text-base font-black"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => runAction('AI Assign')}
                                                    disabled={assignSaving}
                                                    title={selected.aiRoom ? `AI suggests room ${selected.aiRoom}` : undefined}
                                                    className="flex cursor-pointer flex-col items-center justify-center gap-0.5 border-0 border-r border-lx-blue bg-lx-blue px-3 leading-tight text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <span>🤖 AI Assign</span>
                                                    {selected.aiRoom ? (
                                                        <span className="text-[10px] font-bold text-blue-100">
                                                            → {selected.aiRoom}
                                                        </span>
                                                    ) : null}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => runAction('Manual Assign')}
                                                    disabled={assignSaving}
                                                    className="cursor-pointer border-0 bg-white px-3 text-lx-blue transition-colors hover:bg-[#eef6ff] disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    🛏️ Manual Assign
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <button onClick={() => runAction('Approve Reservation')} className="flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-[10px] border-0 bg-green-600 px-3 text-base font-black text-white shadow-sm">
                                                <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-white/80 text-xs">✓</span>
                                                Approve {selected.approval === 'Approved' ? '(Already Approved)' : ''}
                                            </button>
                                            <button
                                                onClick={() => runAction('Check In Worker')}
                                                disabled={checkInSaving}
                                                className="flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-[10px] border border-emerald-100 bg-emerald-50 px-3 text-base font-black text-emerald-600 shadow-sm hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {checkInSaving ? 'Checking in…' : '♙ Check In'}
                                            </button>
                                            <button onClick={() => runAction('On-Hold')} className="flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-[10px] border border-amber-100 bg-amber-50 px-3 text-base font-black text-amber-600 shadow-sm hover:bg-amber-100">
                                                ⏸️ On-Hold
                                            </button>
                                            <button onClick={() => runAction('Check Out Worker')} className="flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-[10px] border border-violet-100 bg-violet-50 px-3 text-base font-black text-violet-600 shadow-sm hover:bg-violet-100">
                                                ⎋ Check Out
                                            </button>
                                            <div
                                                ref={otherSectionRef}
                                                className="overflow-hidden rounded-[10px] border border-lx-border bg-white"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedOtherOpen((open) => !open)}
                                                    className="relative flex h-12 w-full cursor-pointer items-center justify-center gap-3 border-0 bg-slate-100 px-3 text-base font-black text-slate-600 hover:bg-slate-200"
                                                >
                                                    <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-sm text-slate-600">•••</span>
                                                    Other
                                                    <span
                                                        className={`absolute right-3 top-1/2 -translate-y-1/2 transition-transform ${selectedOtherOpen ? 'rotate-180' : ''}`}
                                                    >
                                                        ⌃
                                                    </span>
                                                </button>
                                                {selectedOtherOpen && (
                                                    <div className="divide-y divide-lx-line bg-white p-1.5">
                                                        {[
                                                            ['📍', 'Arrival', 'Arrival'],
                                                            ['⏸️', 'Remove On-Hold', 'Remove On-Hold'],
                                                            ['📅', 'Extend Stay', 'Extend Stay'],
                                                            ['🚫', 'No-Show', 'Mark No-Show'],
                                                            ['❌', 'Reject / Hold for Review', 'Reject / Hold for Review'],
                                                            ['➕', 'New Reservation', 'New Reservation'],
                                                            ['🧾', 'Add Notes', 'Add Notes'],
                                                        ].map(([icon, label, action]) => (
                                                            <button
                                                                key={label}
                                                                type="button"
                                                                onClick={() => runAction(action)}
                                                                className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-0 bg-white px-3 py-2.5 text-left text-sm font-bold text-lx-navy hover:bg-[#f4f8ff]"
                                                            >
                                                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#eef4ff] text-lg">
                                                                    {icon}
                                                                </span>
                                                                <span className="flex-1">{label}</span>
                                                                {['Remove On-Hold', 'Extend Stay', 'Add Notes'].includes(label) ? (
                                                                    <span className="text-lg text-slate-400">›</span>
                                                                ) : null}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="px-[18px] py-8 text-center text-sm font-bold text-slate-500">
                                        Select a reservation to view details and actions.
                                    </div>
                                )}
                            </aside>
                        </section>
                    </AppPageBody>
                </AppPageShell>
            </AppLayout>

            <div
                ref={dropdownRef}
                className={`fixed z-[1000] w-[265px] overflow-y-auto overscroll-contain rounded-[14px] border border-lx-border bg-white p-2 shadow-lx-pop ${
                    dropdown.open ? 'block' : 'hidden'
                }`}
                style={{ top: dropdown.top, left: dropdown.left, maxHeight: dropdown.maxHeight }}
            >
                <div className="px-2.5 py-2 text-xs font-black uppercase tracking-[0.04em] text-slate-500">
                    Available Actions
                </div>
                {[
                    { label: '📄 Info Card', tone: 'text-lx-ink' },
                ].map((b) => (
                    <button
                        key={b.label}
                        onClick={() => runAction(b.label.replace(/^\S+\s/, ''))}
                        className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] border-0 bg-transparent p-2.5 text-left font-extrabold hover:bg-[#f4f8ff] ${b.tone}`}
                    >
                        {b.label}
                    </button>
                ))}
                <div className="my-1.5 border-t border-lx-line" />
                <button
                    onClick={() => runAction('Escalate')}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] border-0 bg-transparent p-2.5 text-left font-extrabold text-lx-ink hover:bg-[#f4f8ff]"
                >
                    ⚠️ Escalate
                </button>
                <button
                    onClick={() => runAction('Notify Company')}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] border-0 bg-transparent p-2.5 text-left font-extrabold text-lx-ink hover:bg-[#f4f8ff]"
                >
                    ✉️ Notify Company
                </button>
            </div>

            {toast && (
                <div className="fixed bottom-6 right-6 z-[2000] rounded-xl bg-lx-navy px-[18px] py-3.5 font-extrabold text-white shadow-lx-toast">
                    {toast}
                </div>
            )}

            <RoomAssignmentModal
                open={assignModalOpen}
                onClose={() => {
                    setAssignModalOpen(false);
                    setAssignError('');
                }}
                reservation={selected}
                assignableRooms={assignableRooms}
                onAssign={submitRoomAssignment}
                isSaving={assignSaving}
                error={assignError}
            />

            <ExtendStayModal
                open={extendModalOpen}
                onClose={() => {
                    setExtendModalOpen(false);
                    setExtendError('');
                }}
                reservation={selected}
                onExtend={submitExtendStay}
                isSaving={extendSaving}
                error={extendError}
            />

            <ReservationInfoCardModal
                open={infoCardOpen}
                onClose={() => setInfoCardOpen(false)}
                reservation={selected}
                onUpdate={updateSelectedField}
            />

            <DateConfirmModal
                open={checkOutModalOpen}
                onClose={() => setCheckOutModalOpen(false)}
                onConfirm={submitCheckOut}
                reservation={selected}
                title="Check Out Worker"
                subtitleSuffix={selected?.room && selected.room !== 'Unassigned' ? `Room ${selected.room}` : ''}
                label="Check-out date"
                confirmLabel="Confirm Check-Out"
                confirmTone="bg-violet-600 hover:bg-violet-700"
            />

            <DateConfirmModal
                open={removeOnHoldModalOpen}
                onClose={() => setRemoveOnHoldModalOpen(false)}
                onConfirm={submitRemoveOnHold}
                reservation={selected}
                title="Remove On-Hold"
                subtitleSuffix="Worker will be set to Check-In"
                label="Check-in date"
                confirmLabel="Confirm Check-In"
                confirmTone="bg-green-600 hover:bg-green-700"
            />

            <ReservationNotesModal
                open={notesModalOpen}
                onClose={() => setNotesModalOpen(false)}
                reservation={selected}
                currentUser={userName}
                onSave={(updatedNotes) => {
                    updateSelectedField('notes', updatedNotes);
                    flash(`Note added for ${selected?.worker || 'reservation'}`);
                }}
            />

            <ScheduleModificationRequestModal
                open={scheduleModRequestOpen}
                onClose={() => setScheduleModRequestOpen(false)}
                reservation={selected}
                onAcknowledge={(r) =>
                    flash(`Acknowledged modification request for ${r?.worker || 'reservation'}`)
                }
            />

            {alertModal.open && (
                <div
                    className="fixed inset-0 z-[3100] flex items-center justify-center bg-slate-900/55 p-4"
                    onClick={() => setAlertModal((a) => ({ ...a, open: false }))}
                >
                    <div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="alert-title"
                        className="w-full max-w-[440px] overflow-hidden rounded-2xl border border-lx-border bg-white shadow-lx-pop"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-3 border-b border-lx-border px-5 py-4">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-lg text-amber-600">
                                ⚠️
                            </span>
                            <div>
                                <h3 id="alert-title" className="text-base font-black text-lx-navy">
                                    {alertModal.title}
                                </h3>
                                <p className="mt-1 text-sm font-bold text-slate-600">{alertModal.message}</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-3">
                            <button
                                type="button"
                                onClick={() => setAlertModal((a) => ({ ...a, open: false }))}
                                className="cursor-pointer rounded-[10px] border-0 bg-lx-blue px-4 py-2 text-sm font-black text-white hover:bg-blue-700"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
