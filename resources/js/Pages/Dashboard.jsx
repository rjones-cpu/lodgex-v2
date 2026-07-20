import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReservationControlPanel from '../Components/Dashboard/ReservationControlPanel';
import RoomAssignmentModal from '../Components/Dashboard/RoomAssignmentModal';
import ExtendStayModal from '../Components/Dashboard/ExtendStayModal';
import PinReservationModal from '../Components/Dashboard/PinReservationModal';
import ReservationInfoCardModal from '../Components/Dashboard/ReservationInfoCardModal';
import ScheduleModificationRequestModal from '../Components/Dashboard/ScheduleModificationRequestModal';
import DateConfirmModal from '../Components/Dashboard/DateConfirmModal';
import OnHoldModal from '../Components/Dashboard/OnHoldModal';
import ReservationNotesModal from '../Components/Dashboard/ReservationNotesModal';
import { AppPageBody, AppPageHeader, AppPageShell } from '../Components/AppPageShell';
import AppLayout from '../Layouts/AppLayout';
import UserAccountMenu from '../Components/AccommodationWorkforce/UserAccountMenu';

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
            border: 'border-blue-100',
            bar: 'from-blue-600 to-blue-500',
            iconBg: 'bg-blue-50',
            iconText: 'text-blue-600',
        },
    },
    {
        label: 'Rooms to Allocate',
        icon: '🛏',
        value: '42',
        change: '↑ 11.2%',
        direction: 'down',
        palette: {
            border: 'border-blue-100',
            bar: 'from-blue-600 to-blue-500',
            iconBg: 'bg-blue-50',
            iconText: 'text-blue-600',
        },
    },
    {
        label: 'Rooms Allotted Tonight',
        icon: '▦',
        value: '1,426',
        change: '↑ 6.2%',
        direction: 'up',
        palette: {
            border: 'border-blue-100',
            bar: 'from-blue-600 to-blue-500',
            iconBg: 'bg-blue-50',
            iconText: 'text-blue-600',
        },
    },
    {
        label: 'Check-Ins',
        icon: '→',
        value: '156',
        change: '↑ 12.4%',
        direction: 'up',
        palette: {
            border: 'border-blue-100',
            bar: 'from-blue-600 to-blue-500',
            iconBg: 'bg-blue-50',
            iconText: 'text-blue-600',
        },
    },
    {
        label: 'Check-Outs',
        icon: '←',
        value: '102',
        change: '↓ 3.1%',
        direction: 'up',
        palette: {
            border: 'border-blue-100',
            bar: 'from-blue-600 to-blue-500',
            iconBg: 'bg-blue-50',
            iconText: 'text-blue-600',
        },
    },
    {
        label: 'Active Extensions',
        icon: '↻',
        value: '28',
        change: '↑ 10.7%',
        direction: 'down',
        palette: {
            border: 'border-blue-100',
            bar: 'from-blue-600 to-blue-500',
            iconBg: 'bg-blue-50',
            iconText: 'text-blue-600',
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
            bar: 'from-blue-600 to-blue-500',
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
            border: 'border-blue-100',
            bar: 'from-blue-600 to-blue-500',
            iconBg: 'bg-blue-50',
            iconText: 'text-blue-600',
        },
    },
];

// Shared stroke styling so every queue-tab icon matches the design mock.
const TAB_ICON_PROPS = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: 'h-[22px] w-[22px]',
};

const TABS = [
    {
        key: 'All',
        label: 'All',
        icon: (
            <svg {...TAB_ICON_PROPS}>
                <rect x="4" y="4" width="6" height="6" rx="1" />
                <rect x="14" y="4" width="6" height="6" rx="1" />
                <rect x="4" y="14" width="6" height="6" rx="1" />
                <rect x="14" y="14" width="6" height="6" rx="1" />
            </svg>
        ),
    },
    {
        key: 'Waitlisted',
        label: 'Waitlisted',
        icon: (
            <svg {...TAB_ICON_PROPS}>
                <circle cx="8" cy="8" r="2.5" />
                <circle cx="16" cy="7" r="2" />
                <circle cx="17" cy="16" r="2" />
                <path d="M3 18c1.2-2.7 3.3-4 5-4s3.8 1.3 5 4" />
                <path d="M13.5 11.5c.9-.9 1.7-1.3 2.5-1.3 1.7 0 3.1 1.3 4 3.8" />
            </svg>
        ),
    },
    {
        key: '24-Hr Arrival',
        label: '24-Hr Arrival',
        icon: (
            <svg {...TAB_ICON_PROPS}>
                <path d="M8 3v3" />
                <path d="M16 3v3" />
                <rect x="4" y="6" width="16" height="14" rx="2" />
                <path d="M4 10h16" />
                <path d="M13 14h4" />
                <path d="M15 12l2 2-2 2" />
            </svg>
        ),
    },
    {
        // Key kept as Checked-In for stable filter wiring; label matches camp
        // reservations "In House" tab (statuses in_house / checked_in → Check-In).
        key: 'Checked-In',
        label: 'In House',
        icon: (
            <svg {...TAB_ICON_PROPS}>
                <path d="M14 4h6v6" />
                <path d="M10 14L20 4" />
                <path d="M20 14v6h-6" />
                <path d="M4 4v16h10" />
            </svg>
        ),
    },
    {
        key: 'On-Hold',
        label: 'On-Hold',
        icon: (
            <svg {...TAB_ICON_PROPS}>
                <path d="M8 3v3" />
                <path d="M16 3v3" />
                <rect x="4" y="6" width="16" height="14" rx="2" />
                <path d="M4 10h16" />
                <path d="M9 13h6" />
            </svg>
        ),
    },
    {
        key: 'History',
        label: 'History',
        icon: (
            <svg {...TAB_ICON_PROPS}>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v6l4 2" />
            </svg>
        ),
    },
    {
        key: 'Discrepancies',
        label: 'Discrepancies',
        icon: (
            <svg {...TAB_ICON_PROPS}>
                <path d="M12 4l9 16H3L12 4z" />
                <path d="M12 10v4" />
                <path d="M12 17h.01" />
            </svg>
        ),
        title:
            'Reservations whose status doesn’t match their schedule color · Yellow (Travel) → Pending / Arrival / Check-In · Blue (Working) → Check-In · Green (Vacation) → On-Hold / Check-Out / Pending / Arrival · Red (Sick) → any · Light Blue (Local) → no reservation required',
    },
    {
        key: 'Modification Request',
        label: 'Modifications',
        icon: (
            <svg {...TAB_ICON_PROPS}>
                <path d="M14 4h6v6" />
                <path d="M20 4L10 14" />
                <path d="M8 6H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" />
                <path d="M8 16l4-.8L8.8 12 8 16z" />
            </svg>
        ),
        title:
            'Pending modification requests from Reservation Managers and others (same list as camp Manager dashboard)',
    },
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

// Camp Waitlisted (`pending` tab) = pending + arrivals → LodgeX Pending / Arrival.
const AWAITING_ARRIVAL_STATUSES = ['Pending', 'Arrival'];

// Camp History tab: no_sleep / check_out / no_show.
const HISTORY_STATUSES = ['Check-Out', 'No-Show', 'No-Sleep'];

function parseReservationDate(value) {
    if (!value) return null;
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : new Date(t);
}

function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Prefer ISO arrivalDate from the backend; fall back to the display arrival string.
 */
function reservationArrivalDate(reservation) {
    return parseReservationDate(reservation.arrivalDate || reservation.arrival);
}

// A reservation is overdue once it is still awaiting arrival and the clock has
// passed 12:00 PM on the day AFTER its expected arrival without it being marked
// in-house (Check-In). Overdue rows stay on Waitlisted when campTabs say so,
// and are also surfaced under Discrepancies.
function isArrivalOverdue(reservation, now = new Date()) {
    if (!AWAITING_ARRIVAL_STATUSES.includes(reservation.status)) return false;
    const arrival = reservationArrivalDate(reservation);
    if (!arrival) return false;
    const deadline = startOfDay(arrival);
    deadline.setDate(deadline.getDate() + 1);
    deadline.setHours(12, 0, 0, 0);
    return now.getTime() > deadline.getTime();
}

const CAMP_ALIGNED_TABS = ['Waitlisted', '24-Hr Arrival', 'Checked-In', 'On-Hold', 'History'];

// Maps a Reservation Operations queue tab to the reservations it surfaces.
// Camp-aligned tabs trust `campTabs` from the Manager /reservations query.
function reservationMatchesTab(tabKey, reservation) {
    if (CAMP_ALIGNED_TABS.includes(tabKey) && Array.isArray(reservation.campTabs)) {
        return reservation.campTabs.includes(tabKey);
    }

    switch (tabKey) {
        case 'All':
            return true;
        case 'Waitlisted':
            return AWAITING_ARRIVAL_STATUSES.includes(reservation.status);
        case '24-Hr Arrival':
            return reservation.in24HrArrival === true;
        case 'Checked-In':
            return reservation.status === 'Check-In';
        case 'On-Hold':
            return reservation.status === 'On-Hold';
        case 'History':
            return HISTORY_STATUSES.includes(reservation.status);
        case 'Discrepancies':
            return scheduleDiscrepancy(reservation) !== null || isArrivalOverdue(reservation);
        case 'Modification Request':
            // Served from `modificationRequests` prop (request_reservations), not
            // reservation status filters.
            return false;
        default:
            return reservation.status === tabKey;
    }
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

const SORTABLE_COLUMNS = [
    { key: 'company', label: 'Company' },
    { key: 'shift', label: 'Shift' },
    { key: 'province', label: 'Province' },
    { key: 'status', label: 'Status' },
    { key: 'arrival', label: 'Arrival', type: 'date' },
    { key: 'departure', label: 'Departure', type: 'date' },
    { key: 'room', label: 'Room Assignment' },
    {
        // Was 'Allotment'; mirrors camp `/reservations` ONHOLD column
        // (company onhold_policy → date when yes, else No / N/A).
        key: 'onHoldDisplay',
        label: 'On-hold',
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

// The split Worker name columns. Rendered as fixed leading columns (not via the
// SORTABLE_COLUMNS map) but registered here so the sort resolver recognises
// their keys and sorts them as plain strings.
const WORKER_NAME_COLUMNS = [
    { key: 'lastName', label: 'Last Name' },
    { key: 'firstName', label: 'First Name' },
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

function statusKey(value) {
    return String(value).toLowerCase().replace(/[^a-z]/g, '');
}

const AVATAR_COLORS = ['#2563eb', '#16a34a', '#7c3aed', '#0b66e4', '#f97316', '#10b981', '#0ea5e9', '#dc2626'];

function workerColor(id, name) {
    const seed = Number(id) || String(name || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return AVATAR_COLORS[seed % AVATAR_COLORS.length];
}

function isOnHoldExempt(reservation, policy) {
    if (!reservation || !policy?.onHold) return false;
    const name = String(reservation.worker || '').trim().toLowerCase();
    const dorm = String(reservation.dorm || '').trim();
    const exemptGuests = (policy.onHold.exemptGuests || []).map((g) => String(g).trim().toLowerCase());
    const exemptDorms = (policy.onHold.exemptDorms || []).map((d) => String(d).trim());
    if (name && exemptGuests.includes(name)) return true;
    if (dorm && exemptDorms.includes(dorm)) return true;
    return false;
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
        dorm:
            row.dorm ??
            (typeof row.room === 'string' && row.room.includes('(')
                ? row.room.replace(/^.*\(([^)]+)\)\s*$/, '$1').trim()
                : null),
        // Normalize room-type tiers to the canonical labels exposed in the UI:
        //   Executive · Sr. Executive · Wellsite
        // Older rows / backend payloads using 'Senior Executive' map to
        // 'Sr. Executive' so the queue and Selected Reservation panel match.
        roomType: normalizeRoomType(row.roomType) || row.roomType,
        initials: row.initials || getInitials(row.worker),
        color: row.color || workerColor(row.id, row.worker),
        // Split worker name so the queue can show — and sort by — Last Name and
        // First Name independently. The backend value (row.firstName/lastName)
        // wins when present; otherwise we derive from the full `worker` string.
        firstName: row.firstName || workerFirstName(row.worker),
        lastName: row.lastName || workerLastName(row.worker),
        // Predetermined permission: whether this reservation is authorized
        // to place their room On-Hold. Driven by company onhold_policy from
        // camp when present; defaults to false so we never invent a "Yes".
        onHoldAllowed: row.onHoldAllowed === true,
        // Camp ONHOLD column display (date / No / N/A / policy text).
        onHoldDisplay: typeof row.onHoldDisplay === 'string' && row.onHoldDisplay.length > 0
            ? row.onHoldDisplay
            : (row.onHoldAllowed === true ? 'Yes' : 'N/A'),
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
        // Manager-pinned flag — drives the dedicated Pinned tab. Defaults to
        // false; toggled from the pin icon on the Selected Reservation panel.
        pinned: row.pinned === true,
        // Manager-only pin note + optional "remind by" ISO date string. These
        // are stored on the pin (not the reservation's public `notes` array)
        // so they never leak into Info Card → Past Notes or any
        // worker-facing surface. Cleared when the row is unpinned.
        pinNote: typeof row.pinNote === 'string' ? row.pinNote : '',
        pinRemindBy: typeof row.pinRemindBy === 'string' ? row.pinRemindBy : '',
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

// First token of the worker name; the remainder is treated as the last name
// (so middle names / two-word surnames stay with the Last Name column).
function workerFirstName(name) {
    if (!name) return '';
    return String(name).trim().split(/\s+/)[0] || '';
}

function workerLastName(name) {
    if (!name) return '';
    const parts = String(name).trim().split(/\s+/);
    return parts.length > 1 ? parts.slice(1).join(' ') : '';
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

/**
 * Drop duplicate queue rows within a tab. Same booking id always collapses;
 * otherwise the same guest + stay window + status is treated as one entry
 * (camp occasionally has near-duplicate booking rows for one person).
 */
function dedupeQueueRows(rows) {
    const result = [];
    const seenIds = new Set();
    const seenBookings = new Set();
    const stayIndex = new Map();

    const score = (r) => {
        let s = 0;
        if (r.roomId) s += 100;
        if (r.in24HrArrival) s += 10;
        if (r.room && r.room !== 'Unassigned' && r.room !== '—') s += 5;
        s += Number(r.id) || 0;
        return s;
    };

    for (const r of rows) {
        if (r.id != null) {
            const idKey = String(r.id);
            if (seenIds.has(idKey)) continue;
            seenIds.add(idKey);
        }

        const bookingKey = r.externalBookingId != null && String(r.externalBookingId) !== ''
            ? String(r.externalBookingId)
            : null;
        if (bookingKey) {
            if (seenBookings.has(bookingKey)) continue;
            seenBookings.add(bookingKey);
        }

        const stayKey = [
            String(r.worker || '').trim().toLowerCase(),
            r.arrivalDate || r.arrival || '',
            r.departureDate || r.departure || '',
            r.status || '',
        ].join('|');

        if (stayIndex.has(stayKey)) {
            const idx = stayIndex.get(stayKey);
            if (score(r) > score(result[idx])) {
                result[idx] = r;
            }
            continue;
        }

        stayIndex.set(stayKey, result.length);
        result.push(r);
    }

    return result;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200, 500];

/** Compact page list: 1 … 4 5 6 … 20 */
function visiblePageNumbers(current, total) {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = new Set([1, total, current, current - 1, current + 1, current - 2, current + 2]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('…');
        out.push(sorted[i]);
    }
    return out;
}

function QueuePaginationBar({
    pageSize,
    onPageSizeChange,
    page,
    totalPages,
    onPageChange,
    pageStart,
    pageEnd,
    totalEntries,
}) {
    const pages = visiblePageNumbers(page, totalPages);

    return (
        <div className="flex flex-col gap-3 p-4 text-[13px] text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-3 sm:p-[18px]">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <label className="inline-flex shrink-0 items-center gap-2 font-semibold text-lx-ink">
                    <span className="whitespace-nowrap">Show</span>
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        aria-label="Rows per page"
                        className="box-border h-9 w-[5rem] min-w-[5rem] shrink-0 rounded-lg border border-lx-border bg-white py-1 pl-2.5 pr-7 text-[13px] font-bold leading-none text-lx-ink outline-none focus:border-lx-blue sm:h-8 sm:w-[5.5rem] sm:min-w-[5.5rem] sm:pr-8"
                    >
                        {PAGE_SIZE_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                                {n}
                            </option>
                        ))}
                    </select>
                    <span className="whitespace-nowrap">entries</span>
                </label>
                <span className="min-w-0 break-words">
                    {totalEntries === 0
                        ? 'Showing 0 entries'
                        : `Showing ${pageStart} to ${pageEnd} of ${totalEntries} entries`}
                </span>
            </div>
            <div className="flex max-w-full flex-wrap items-center gap-0.5">
                <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    aria-label="Previous page"
                    className="mx-0.5 h-8 min-w-8 cursor-pointer rounded-lg border border-lx-border bg-white px-2 font-extrabold text-lx-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                    ‹
                </button>
                {pages.map((p, i) =>
                    p === '…' ? (
                        <span
                            key={`ellipsis-${i}`}
                            className="mx-0.5 grid h-8 w-8 place-items-center text-slate-400"
                        >
                            …
                        </span>
                    ) : (
                        <button
                            key={p}
                            type="button"
                            onClick={() => onPageChange(p)}
                            aria-current={p === page ? 'page' : undefined}
                            className={`mx-0.5 h-8 min-w-8 cursor-pointer rounded-lg border border-lx-border px-2 font-extrabold ${
                                p === page ? 'bg-lx-blue text-white' : 'bg-white text-lx-ink'
                            }`}
                        >
                            {p}
                        </button>
                    ),
                )}
                <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                    aria-label="Next page"
                    className="mx-0.5 h-8 min-w-8 cursor-pointer rounded-lg border border-lx-border bg-white px-2 font-extrabold text-lx-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                    ›
                </button>
            </div>
        </div>
    );
}

export default function Dashboard({
    reservations: serverReservations = [],
    modificationRequests: serverModificationRequests = [],
    campDashboardUrl = null,
    assignableRooms = [],
    metricValues = {},
    lastUpdated = '',
    lodgePolicy = null,
    onHoldPolicy = { onHoldEnabled: true, maxHoldDays: 7 },
}) {
    const policy = lodgePolicy ?? {
        onHold: { enabled: onHoldPolicy.onHoldEnabled, maxHoldDays: onHoldPolicy.maxHoldDays },
        noShow: { cutoffTime: '07:00', releaseRequiresApproval: true },
        walkIn: { allowed: true, requireSupervisorApproval: true },
        onHoldEnabled: onHoldPolicy.onHoldEnabled,
        maxHoldDays: onHoldPolicy.maxHoldDays,
    };
    const { auth, flash: sessionFlash, errors: pageErrors } = usePage().props;
    const userName = auth?.user?.name || 'John Doe';
    const userInitials = getInitials(userName);

    const initialRows = dedupeQueueRows(
        (serverReservations.length ? serverReservations : SEED_RESERVATIONS).map(enrichReservation),
    );

    const [reservations, setReservations] = useState(initialRows);
    const [modificationRequests, setModificationRequests] = useState(() =>
        (Array.isArray(serverModificationRequests) ? serverModificationRequests : []).map(enrichReservation),
    );
    const [activeTab, setActiveTab] = useState('All');
    // -1 = no row selected → Control Panel is hidden.
    const [selectedIndex, setSelectedIndex] = useState(-1);
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
    const [onHoldModalOpen, setOnHoldModalOpen] = useState(false);
    const [removeOnHoldModalOpen, setRemoveOnHoldModalOpen] = useState(false);
    const [notesModalOpen, setNotesModalOpen] = useState(false);
    const [pinModalOpen, setPinModalOpen] = useState(false);
    // `now` ticks every 30s so time-driven UI (currently just the Pinned tab
    // overdue flash) re-evaluates without forcing a full reservations refresh.
    // 30s is fine-grained enough for human-scale reminders and cheap enough
    // to keep running indefinitely.
    const [now, setNow] = useState(() => Date.now());
    const [scheduleModRequestOpen, setScheduleModRequestOpen] = useState(false);
    // Collapsed by default — the "Other" actions only expand when the user
    // clicks the Other toggle, never on their own.
    const [selectedOtherOpen, setSelectedOtherOpen] = useState(false);
    const [extendSaving, setExtendSaving] = useState(false);
    const [extendError, setExtendError] = useState('');
    const [assignError, setAssignError] = useState('');
    // Client-side queue pagination (filtered/sorted rows, not the full DB).
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const dropdownRef = useRef(null);
    const toastTimeoutRef = useRef(null);
    const otherSectionRef = useRef(null);
    // Skip the first effect fire (the section starts open by default — we
    // only want to auto-scroll on subsequent user toggles).
    const otherInitialMountRef = useRef(true);

    const statusOptions = STATUS_FILTER_OPTIONS;
    const isModTab = activeTab === 'Modification Request';

    const filtered = useMemo(() => {
        // Camp Manager dashboard: modification requests come from request_reservations,
        // not from reservation status filters.
        if (isModTab) {
            let rows = modificationRequests;
            if (search) {
                const s = search.toLowerCase();
                rows = rows.filter((r) =>
                    `${r.worker} ${r.company} ${r.status} ${r.requestedBy}`.toLowerCase().includes(s),
                );
            }
            return rows;
        }

        let rows = reservations.filter((r) => reservationMatchesTab(activeTab, r));
        if (statusFilter !== 'All') rows = rows.filter((r) => r.status === statusFilter);
        if (priorityFilter !== 'All') rows = rows.filter((r) => r.approval === priorityFilter);
        if (search) {
            const s = search.toLowerCase();
            rows = rows.filter((r) => `${r.worker} ${r.company} ${r.room}`.toLowerCase().includes(s));
        }
        return dedupeQueueRows(rows);
    }, [reservations, modificationRequests, isModTab, activeTab, statusFilter, priorityFilter, search]);

    // Per-tab counts for the queue tab badges. Computed against the full
    // reservation set (not the active filter) so each badge always reflects how
    // many rows live in that queue — after the same dedupe applied to the table.
    const tabCounts = useMemo(() => {
        const counts = {};
        for (const t of TABS) {
            if (t.key === 'Modification Request') {
                counts[t.key] = modificationRequests.length;
                continue;
            }
            counts[t.key] = dedupeQueueRows(
                reservations.filter((r) => reservationMatchesTab(t.key, r)),
            ).length;
        }
        return counts;
    }, [reservations, modificationRequests]);

    const sortedFiltered = useMemo(() => {
        if (!sort.key) return filtered;
        // Sort metadata can come from either the default queue's column set or
        // the Modification Requests column set; first-match wins so shared keys
        // like `company` / `status` / `notes` keep their existing behavior.
        const col =
            WORKER_NAME_COLUMNS.find((c) => c.key === sort.key) ||
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

    const totalEntries = sortedFiltered.length;
    const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize) || 1);
    const currentPage = Math.min(page, totalPages);
    const pageStart = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const pageEnd = Math.min(currentPage * pageSize, totalEntries);
    const pagedRows = useMemo(
        () => sortedFiltered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
        [sortedFiltered, currentPage, pageSize],
    );

    // Reset to page 1 when the visible queue set or page size changes.
    useEffect(() => {
        setPage(1);
    }, [activeTab, statusFilter, priorityFilter, search, pageSize, sort.key, sort.dir]);

    // Keep page in range when the filtered total shrinks (e.g. after a tab change
    // that already reset to 1, or when rows are removed mid-session).
    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    function requestSort(key) {
        setSort((prev) => {
            if (prev.key !== key) return { key, dir: 'asc' };
            if (prev.dir === 'asc') return { key, dir: 'desc' };
            return { key: null, dir: 'asc' };
        });
    }

    const selected = selectedIndex >= 0
        ? (isModTab ? modificationRequests[selectedIndex] : reservations[selectedIndex])
        : null;

    function flash(message) {
        setToast(message);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setToast(''), 2400);
    }

    /** Select a queue row, or clear selection if the same row is toggled off. */
    function toggleSelection(index) {
        if (selectedIndex === index) {
            setSelectedIndex(-1);
            setSelectedOtherOpen(false);
            setDropdown((d) => ({ ...d, open: false }));
            return;
        }
        setSelectedIndex(index);
    }

    function setTab(key) {
        setActiveTab(key);
        setSelectedIndex(-1);
        const tab = TABS.find((t) => t.key === key);
        flash(`Showing ${tab ? tab.label : key} queue`);
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
        if (isModTab) {
            setModificationRequests((rows) => {
                const next = [...rows];
                if (next[selectedIndex]) {
                    next[selectedIndex] = { ...next[selectedIndex], [field]: value };
                }
                return next;
            });
            return;
        }
        setReservations((rows) => {
            const next = [...rows];
            if (next[selectedIndex]) {
                next[selectedIndex] = { ...next[selectedIndex], [field]: value };
            }
            return next;
        });
    }

    // Pin pop-up handlers — the pin icon on the Selected Reservation panel
    // always opens the Pin Reservation modal (whether the row is currently
    // pinned or not). Save persists `pinned: true` plus the manager-only
    // `pinNote` / `pinRemindBy` fields; Unpin clears all three. The pin
    // record lives entirely on the reservation row and never bleeds into the
    // public `notes` timeline.
    function openPinModal() {
        if (selectedIndex < 0 || !reservations[selectedIndex]) return;
        setPinModalOpen(true);
    }

    function savePinDetails({ pinNote, pinRemindBy }) {
        const target = reservations[selectedIndex];
        if (!target) return;
        setReservations((rows) => {
            const next = [...rows];
            if (next[selectedIndex]) {
                next[selectedIndex] = {
                    ...next[selectedIndex],
                    pinned: true,
                    pinNote: pinNote || '',
                    pinRemindBy: pinRemindBy || '',
                };
            }
            return next;
        });
        setPinModalOpen(false);
        let remindSuffix = '';
        if (pinRemindBy) {
            const d = new Date(pinRemindBy);
            const pretty = Number.isNaN(d.getTime())
                ? pinRemindBy
                : d.toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                  });
            remindSuffix = ` · remind by ${pretty}`;
        }
        flash(`Pinned ${target.worker || 'reservation'}${remindSuffix}`);
    }

    function unpinSelected() {
        const target = reservations[selectedIndex];
        if (!target) return;
        setReservations((rows) => {
            const next = [...rows];
            if (next[selectedIndex]) {
                next[selectedIndex] = {
                    ...next[selectedIndex],
                    pinned: false,
                    pinNote: '',
                    pinRemindBy: '',
                };
            }
            return next;
        });
        setPinModalOpen(false);
        flash(`Unpinned ${target.worker || 'reservation'}`);
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
            // Lodge-wide policy: on-hold disabled for all companies.
            if (onHoldPolicy?.onHoldEnabled === false && !isOnHoldExempt(target, policy)) {
                setAlertModal({
                    open: true,
                    title: 'On-Hold disabled by policy',
                    message:
                        'The on-hold policy does not allow companies to place rooms on hold. Update the On-Hold policy in the Policies tab to enable it.',
                });
                return;
            }
            const dormRestriction = policy.onHold?.dormRestriction?.trim();
            if (
                dormRestriction &&
                target?.dorm &&
                target.dorm !== dormRestriction &&
                !isOnHoldExempt(target, policy)
            ) {
                setAlertModal({
                    open: true,
                    title: 'On-Hold dorm restriction',
                    message: `On-hold is limited to ${dormRestriction} for this project. This reservation is in ${target.dorm}.`,
                });
                return;
            }
            if (target && target.onHoldAllowed === false) {
                setAlertModal({
                    open: true,
                    title: 'On-Hold not authorized',
                    message:
                        'This Reservation is not authorized to place their room on hold. Please contact their scheduling manager to request a change.',
                });
                return;
            }
            // Authorized: collect the departure + return dates before flipping
            // the row to On-Hold (handled by submitOnHold).
            setOnHoldModalOpen(true);
            return;
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
        if (action === 'Approve Reservation') {
            const target = reservations[selectedIndex];
            if (target?.status === 'Walk-In' && policy.walkIn?.allowed === false) {
                setAlertModal({
                    open: true,
                    title: 'Walk-ins disabled by policy',
                    message:
                        'Walk-in reservations are not allowed under the current lodge policy. Update Walk-In rules in the Policies tab.',
                });
                return;
            }
            submitApprove();
            return;
        }
        setReservations((rows) => {
            const next = [...rows];
            const r = { ...next[selectedIndex] };
            if (action === 'Arrival') {
                // Manual mark-as-arrival: status flips to Arrival and approval
                // is set so the row honors the Pending↔Arrival lifecycle rule
                // (Arrival implies approved).
                r.status = 'Arrival';
                r.approval = 'Approved';
            }
            if (action === 'Mark No-Show') {
                if (policy.noShow?.releaseRequiresApproval) {
                    r.status = 'Hold for Review';
                    r.notes = [
                        ...(Array.isArray(r.notes) ? r.notes : []),
                        {
                            author: userName,
                            text: `No-show flagged for approval (cutoff ${policy.noShow?.cutoffTime ?? '07:00'}).`,
                            createdAt: new Date().toISOString(),
                        },
                    ];
                } else {
                    r.status = 'No-Show';
                }
            }
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

    function submitOnHold(departureDate, returnDate, overPolicy = false) {
        const maxDays = onHoldPolicy?.maxHoldDays ?? null;
        const selected = reservations[selectedIndex];
        const exempt = isOnHoldExempt(selected, policy);
        setReservations((rows) => {
            const next = [...rows];
            if (!next[selectedIndex]) return rows;
            const base = next[selectedIndex];

            // Over the on-hold policy: don't place the hold outright. Escalate
            // to the scheduling manager by routing the request into the
            // Modification Requests queue ("Hold for Review"), preserving the
            // requested dates and logging why it was escalated.
            if (overPolicy && !exempt) {
                const note = {
                    author: userName,
                    text:
                        `On-hold escalated for approval: requested hold ` +
                        `(departs ${departureDate}, returns ${returnDate}) exceeds the ` +
                        `${maxDays}-day on-hold policy.`,
                    createdAt: new Date().toISOString(),
                };
                next[selectedIndex] = {
                    ...base,
                    status: 'Hold for Review',
                    onHoldDepartureDate: departureDate,
                    onHoldReturnDate: returnDate,
                    notes: [...(Array.isArray(base.notes) ? base.notes : []), note],
                };
                return next;
            }

            const r = {
                ...base,
                status: 'On-Hold',
                onHoldDepartureDate: departureDate,
                onHoldReturnDate: returnDate,
            };
            if (r.allotment === 'Allotted') r.allotment = 'On-Hold';
            next[selectedIndex] = r;
            return next;
        });
        setOnHoldModalOpen(false);
        const display = reservations[selectedIndex]?.worker || 'worker';
        if (overPolicy) {
            flash(
                `Hold exceeds ${maxDays}-day policy — escalated to scheduling manager for approval (Modification Requests).`,
            );
        } else {
            flash(`On-Hold: ${display} · departs ${departureDate}, returns ${returnDate}`);
        }
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

    function submitApprove() {
        const reservation = reservations[selectedIndex];
        if (!reservation) return;

        // Local-only reservation (no persisted id, e.g. seed data): flip the
        // approval/status directly so the demo data still advances queues.
        if (!reservation.id) {
            setReservations((rows) => {
                const next = [...rows];
                const r = { ...next[selectedIndex] };
                r.approval = 'Approved';
                if (r.status === 'Pending') r.status = 'Arrival';
                next[selectedIndex] = r;
                return next;
            });
            flash(`Approve Reservation: ${reservation.worker}`);
            return;
        }

        router.post(
            route('dashboard.approve'),
            { reservation_id: reservation.id },
            {
                preserveScroll: true,
                onError: (errors) => {
                    flash(errors.reservation || 'Unable to approve reservation.');
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
        if (!serverReservations.length) return;

        // Keep the panel locked onto the same reservation across reloads. The
        // rebuilt list re-sorts (rows with an assigned room sort last), so the
        // positional selectedIndex would otherwise jump to a different row after
        // a room assignment — making the just-assigned room look like it never
        // landed. Re-resolve the selection by its stable id instead.
        const previousId = reservations[selectedIndex]?.id;
        const enriched = dedupeQueueRows(serverReservations.map(enrichReservation));
        setReservations(enriched);

        if (previousId != null) {
            const nextIndex = enriched.findIndex((r) => r.id === previousId);
            if (nextIndex !== -1) setSelectedIndex(nextIndex);
        }
    }, [serverReservations]);

    useEffect(() => {
        if (sessionFlash?.toast) flash(sessionFlash.toast);
    }, [sessionFlash?.toast]);

    // 30-second clock for time-driven UI (Pinned tab overdue-flash). The
    // interval is cleared on unmount so it never leaks between page
    // navigations.
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(id);
    }, []);

    // True when at least one pinned reservation has a remind-by datetime
    // that's already passed. Drives the Pinned tab's slow-orange flash so
    // the lodge manager notices reminders even from another tab.
    const hasOverduePin = useMemo(() => {
        return reservations.some((r) => {
            if (!r.pinned || !r.pinRemindBy) return false;
            const t = Date.parse(r.pinRemindBy);
            return !Number.isNaN(t) && t <= now;
        });
    }, [reservations, now]);

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

    // Live metric counts from the queue, merged with server-computed
    // vs-yesterday change strings from `metricValues`.
    const metrics = useMemo(() => {
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

        const liveCounts = {
            'Pending Approvals': reservations.filter(
                (r) => r.status === 'Pending' || (r.approval && r.approval !== 'Approved' && r.approval !== '—'),
            ).length,
            'Rooms to Allocate': reservations.filter(
                (r) =>
                    (r.room === 'Unassigned' || !r.roomId) &&
                    !['No-Show', 'Check-Out', 'No-Sleep'].includes(r.status),
            ).length,
            'Rooms Allotted Tonight': reservations.filter((r) => {
                const hasRoom = Boolean(r.roomId) || (r.room && r.room !== 'Unassigned');
                if (!hasRoom) return false;
                if (!r.arrival || !r.departure) return r.allotment === 'Allotted';
                const arrival = Date.parse(r.arrival);
                const departure = Date.parse(r.departure);
                if (Number.isNaN(arrival) || Number.isNaN(departure)) return r.allotment === 'Allotted';
                const start = new Date();
                start.setHours(0, 0, 0, 0);
                const end = new Date(start);
                end.setHours(23, 59, 59, 999);
                return arrival <= end.getTime() && departure >= start.getTime();
            }).length,
            'Check-Ins': `${checkedInToday} / ${expectedInToday}`,
            'Check-Outs': `${checkedOutToday} / ${expectedOutToday}`,
            'Active Extensions': reservations.filter((r) => r.status === 'Extension').length,
            'Walk-Ins': reservations.filter(
                (r) => r.status === 'Walk-In' && r.arrival === todayLabel,
            ).length,
            'No-Shows': (() => {
                const todayNoShows = reservations.filter(
                    (r) => r.status === 'No-Show' && r.arrival === todayLabel,
                ).length;
                if (todayNoShows > 0) return todayNoShows;
                return reservations.filter((r) => r.status === 'No-Show').length;
            })(),
        };

        return METRICS.map((m) => {
            const server = metricValues?.[m.label];
            const serverValue = server && typeof server === 'object' ? server.value : server;
            const live = liveCounts[m.label];
            const value = live != null ? live : serverValue != null ? serverValue : m.value;
            const change =
                server && typeof server === 'object' && server.change != null
                    ? server.change
                    : m.change;
            const direction =
                server && typeof server === 'object' && server.direction != null
                    ? server.direction
                    : m.direction;

            return {
                ...m,
                value: formatMetricValue(value),
                change,
                direction,
            };
        });
    }, [reservations, metricValues]);

    const queueTitle =
        activeTab === 'All'
            ? 'Reservation Operations Queue'
            : `${TABS.find((t) => t.key === activeTab)?.label ?? activeTab} Queue`;

    return (
        <>
            <Head title="Reservation Operations Center" />

            <AppLayout activeHref="dashboard">
                <AppPageShell>
                    <AppPageHeader className="sticky top-0 z-20 flex h-[78px] shrink-0 items-center justify-between gap-4 border-b border-lx-border bg-white px-6 max-[1100px]:sticky min-[1101px]:static">
                        <div className="min-w-0 shrink">
                            <h1 className="m-0 truncate text-[26px] tracking-[-0.5px] text-lx-navy">
                                Reservation Operations Center
                            </h1>
                            <p className="mt-0.5 truncate text-[13px] font-semibold text-slate-500 max-[1100px]:hidden">
                                Unified control for reservation approvals, room movement, arrivals, and exception handling.
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-4 whitespace-nowrap">
                            <span className="whitespace-nowrap text-xs font-extrabold text-slate-500 max-[1280px]:hidden">
                                Last updated: {lastUpdated || '—'}
                            </span>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search reservations, workers, company, or room..."
                                className="h-[42px] w-[280px] shrink rounded-xl border border-lx-border bg-white px-3.5 outline-none focus:border-lx-blue max-[1100px]:w-[200px] min-[1400px]:w-[420px]"
                            />
                            <span aria-hidden>🔔</span>
                            <span aria-hidden>❔</span>
                            <UserAccountMenu
                                userName={userName}
                                userEmail={auth?.user?.email}
                                userInitials={userInitials}
                                triggerClassName="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border border-transparent px-1.5 py-1 transition hover:border-lx-border hover:bg-[#f6faff]"
                            >
                                <div className="grid h-[38px] w-[38px] place-items-center rounded-full bg-lx-blue font-black text-white">
                                    {userInitials}
                                </div>
                                <div className="whitespace-nowrap text-left text-xs max-[900px]:hidden">
                                    <strong>{userName}</strong>
                                    <br />
                                    <span className="text-slate-500">Operations Manager</span>
                                </div>
                            </UserAccountMenu>
                        </div>
                    </AppPageHeader>

                    <AppPageBody className="p-4 sm:p-6">
                        <section
                            className={`grid grid-cols-1 items-start gap-[18px] ${
                                selected ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : ''
                            }`}
                        >
                            <div className="min-w-0">
                                <section className="mb-[18px] rounded-[24px] border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-3 shadow-lg shadow-blue-100/50 sm:p-4">
                                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-8">
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
                                                        <div
                                                            className={`whitespace-nowrap font-black leading-none tracking-tight text-slate-950 ${
                                                                typeof m.value === 'string' && m.value.includes('/')
                                                                    ? 'text-2xl'
                                                                    : 'text-3xl'
                                                            }`}
                                                            title={typeof m.value === 'string' && m.value.includes('/')
                                                                ? `${m.value.split('/')[0].trim()} checked / ${m.value.split('/')[1].trim()} expected today`
                                                                : undefined}
                                                        >
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
                                <div className="overflow-hidden rounded-2xl border border-lx-border bg-white shadow-lx-card min-[1101px]:sticky min-[1101px]:top-0 min-[1101px]:z-10">
                                    {/* Queue tabs: size to label content and scroll horizontally so
                                        names never clip. Chevron interlocking only on very wide
                                        screens where there is room for every tab. */}
                                    <div className="-mx-px flex gap-2 overflow-x-auto overscroll-x-contain border-b border-lx-border bg-white p-3 [scrollbar-width:thin] min-[1600px]:gap-0">
                                        {TABS.map((t, i) => {
                                            const isActive = activeTab === t.key;
                                            const tabTitle =
                                                t.key === 'Modification Request'
                                                    ? 'Pending modification requests from Reservation Managers and others (same list as camp Manager dashboard)'
                                                    : t.title || '';
                                            const isFirst = i === 0;
                                            const isLast = i === TABS.length - 1;
                                            const shape = isFirst
                                                ? 'min-[1600px]:rounded-l-2xl min-[1600px]:pr-7 min-[1600px]:[clip-path:polygon(0_0,94%_0,100%_50%,94%_100%,0_100%)]'
                                                : isLast
                                                  ? 'min-[1600px]:-ml-px min-[1600px]:rounded-r-2xl min-[1600px]:pl-6 min-[1600px]:[clip-path:polygon(0_0,100%_0,100%_100%,0_100%,6%_50%)]'
                                                  : 'min-[1600px]:-ml-px min-[1600px]:pl-6 min-[1600px]:pr-7 min-[1600px]:[clip-path:polygon(0_0,94%_0,100%_50%,94%_100%,0_100%,6%_50%)]';
                                            return (
                                                <button
                                                    key={t.key}
                                                    onClick={() => setTab(t.key)}
                                                    title={tabTitle}
                                                    className={`relative flex h-14 shrink-0 cursor-pointer items-center justify-between gap-2.5 rounded-xl border px-3.5 transition-colors sm:h-16 sm:px-4 ${shape} ${
                                                        isActive
                                                            ? 'z-[2] border-[#2b74ff] bg-gradient-to-b from-[#1d75ff] to-[#005bff] text-white shadow-[0_10px_24px_rgba(17,97,255,0.28)]'
                                                            : 'border-lx-border bg-white text-lx-blue hover:bg-[#f6faff]'
                                                    }`}
                                                >
                                                    <span className="flex items-center gap-2 sm:gap-3">
                                                        <span className="grid h-6 w-6 shrink-0 place-items-center">{t.icon}</span>
                                                        <span className="whitespace-nowrap text-[13px] font-black leading-none sm:text-[15px]">{t.label}</span>
                                                    </span>
                                                    <span
                                                        className={`inline-flex h-[28px] min-w-[28px] shrink-0 items-center justify-center rounded-full px-2 text-sm font-black leading-none sm:h-[30px] sm:min-w-[30px] sm:px-2.5 ${
                                                            isActive ? 'bg-white/20 text-white' : 'bg-[#eef4ff] text-lx-blue'
                                                        }`}
                                                    >
                                                        {tabCounts[t.key] ?? 0}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 border-b border-lx-border px-4 py-3 sm:px-[18px] sm:py-4">
                                        <div className="min-w-0 text-sm font-black text-lx-navy sm:text-base">
                                            {queueTitle}
                                            <span className="ml-1.5 inline-block rounded-full bg-[#eaf2ff] px-2.5 py-1 text-xs font-bold text-lx-blue">
                                                {filtered.length}
                                            </span>
                                        </div>
                                    </div>

                                    <QueuePaginationBar
                                        pageSize={pageSize}
                                        onPageSizeChange={setPageSize}
                                        page={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={setPage}
                                        pageStart={pageStart}
                                        pageEnd={pageEnd}
                                        totalEntries={totalEntries}
                                    />

                                    {/* Horizontal + vertical scroll so the wide queue fits any viewport
                                        without clipping column headers or cell text. */}
                                    <div className="max-h-[min(70vh,calc(100vh-210px))] overflow-auto overscroll-contain [scrollbar-width:thin] border-t border-lx-border">
                                        <table className="w-full min-w-[1100px] border-collapse table-auto">
                                            <thead>
                                                <tr>
                                                    <th className="sticky top-0 z-20 w-[42px] whitespace-nowrap border-b border-lx-line bg-[#fbfdff] p-3 text-left text-xs font-black text-lx-ink-soft shadow-[0_1px_0_0_#edf2fb]">
                                                        <input type="checkbox" />
                                                    </th>
                                                    {WORKER_NAME_COLUMNS.map((c) => {
                                                        const isActive = sort.key === c.key;
                                                        const arrow = isActive ? (sort.dir === 'asc' ? '▲' : '▼') : '↕';
                                                        return (
                                                            <th
                                                                key={c.key}
                                                                onClick={() => requestSort(c.key)}
                                                                title={`Sort by ${c.label}`}
                                                                aria-sort={
                                                                    isActive
                                                                        ? sort.dir === 'asc'
                                                                            ? 'ascending'
                                                                            : 'descending'
                                                                        : 'none'
                                                                }
                                                                className="sticky top-0 z-20 cursor-pointer select-none whitespace-nowrap border-b border-lx-line bg-[#fbfdff] p-3 text-left text-xs font-black text-lx-ink-soft shadow-[0_1px_0_0_#edf2fb] hover:bg-[#eef4ff]"
                                                            >
                                                                {/* Offset the Last Name label by the avatar + gap (30px + 10px)
                                                                    so the header lines up with the name text below it. */}
                                                                <span
                                                                    className={`inline-flex items-center gap-1 ${
                                                                        c.key === 'lastName' ? 'pl-10' : ''
                                                                    }`}
                                                                >
                                                                    {c.label}
                                                                    <span
                                                                        className={`text-[10px] leading-none ${
                                                                            isActive ? 'text-lx-blue' : 'text-slate-300'
                                                                        }`}
                                                                    >
                                                                        {arrow}
                                                                    </span>
                                                                </span>
                                                            </th>
                                                        );
                                                    })}
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
                                                                className={`sticky top-0 z-20 select-none whitespace-nowrap border-b border-lx-line bg-[#fbfdff] p-3 text-left text-xs font-black text-lx-ink-soft shadow-[0_1px_0_0_#edf2fb] ${
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
                                                    <th className="sticky top-0 z-20 whitespace-nowrap border-b border-lx-line bg-[#fbfdff] p-3 text-center text-xs font-black text-lx-ink-soft shadow-[0_1px_0_0_#edf2fb]">
                                                        {activeTab === 'Modification Request' ? 'Open' : 'Action'}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pagedRows.map((r) => {
                                                    const realIndex = isModTab
                                                        ? modificationRequests.indexOf(r)
                                                        : reservations.indexOf(r);
                                                    const isSelected = realIndex === selectedIndex;
                                                    // On the Pinned tab, mirror the tab-level
                                                    // flash on each row whose remind-by has
                                                    // already passed. The selection outline
                                                    // still shows which row is active because
                                                    // outline is independent of background.
                                                    const pinRemindAt = r.pinned && r.pinRemindBy
                                                        ? Date.parse(r.pinRemindBy)
                                                        : NaN;
                                                    const isOverduePin =
                                                        activeTab === 'Pinned' &&
                                                        !Number.isNaN(pinRemindAt) &&
                                                        pinRemindAt <= now;
                                                    return (
                                                        <tr
                                                            key={r.id ?? `${r.worker}-${realIndex}`}
                                                            onClick={() => toggleSelection(realIndex)}
                                                            className={`cursor-pointer transition-colors ${
                                                                isOverduePin
                                                                    ? 'animate-pin-flash motion-reduce:animate-none motion-reduce:bg-orange-100'
                                                                    : 'hover:bg-[#f8fbff]'
                                                            } ${
                                                                isSelected ? 'bg-[#eef6ff] outline outline-1 outline-[#bcd7ff]' : ''
                                                            }`}
                                                        >
                                                            <td className="border-b border-lx-line p-3 align-middle text-[13px] text-lx-ink">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => toggleSelection(realIndex)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </td>
                                                            <td className="whitespace-nowrap border-b border-lx-line p-3 align-middle text-[13px] text-lx-ink">
                                                                <div className="flex items-center gap-2.5 font-extrabold">
                                                                    <span
                                                                        className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-lx-blue text-xs font-black text-white"
                                                                    >
                                                                        {r.initials}
                                                                    </span>
                                                                    {r.lastName || r.worker}
                                                                </div>
                                                            </td>
                                                            <td className="whitespace-nowrap border-b border-lx-line p-3 align-middle text-[13px] font-extrabold text-lx-ink">
                                                                {r.firstName}
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
                                                                        {r.canOpen !== false ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setSelectedIndex(realIndex);
                                                                                    // Camp Manager dashboard hosts the resolve / bill-out /
                                                                                    // walk-in / schedule-modification modals.
                                                                                    if (campDashboardUrl) {
                                                                                        window.open(
                                                                                            campDashboardUrl,
                                                                                            '_blank',
                                                                                            'noopener,noreferrer',
                                                                                        );
                                                                                        return;
                                                                                    }
                                                                                    if (
                                                                                        r.requestType ===
                                                                                            'schedule_modification_published' ||
                                                                                        r.requestType ===
                                                                                            'search_modification'
                                                                                    ) {
                                                                                        setScheduleModRequestOpen(true);
                                                                                    }
                                                                                }}
                                                                                className="inline-flex cursor-pointer items-center gap-1 rounded-md border-0 bg-transparent p-0 text-[13px] font-black text-lx-blue underline-offset-2 hover:underline"
                                                                                title={
                                                                                    campDashboardUrl
                                                                                        ? 'Open on camp Manager dashboard'
                                                                                        : 'Open Schedule Modification Request'
                                                                                }
                                                                            >
                                                                                Open
                                                                                <span className="text-[11px] leading-none">↗</span>
                                                                            </button>
                                                                        ) : (
                                                                            <span className="text-slate-400">—</span>
                                                                        )}
                                                                    </td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td className="whitespace-nowrap border-b border-lx-line p-3 align-middle text-[13px] text-lx-ink">{r.company}</td>
                                                                    <td className="whitespace-nowrap border-b border-lx-line p-3 align-middle text-[13px] font-extrabold text-lx-ink">
                                                                        {r.shift || <span className="text-slate-400">—</span>}
                                                                    </td>
                                                                    <td
                                                                        className="whitespace-nowrap border-b border-lx-line p-3 align-middle text-[13px] font-extrabold text-lx-ink"
                                                                        title={PROVINCE_LABELS[r.province] || ''}
                                                                    >
                                                                        {r.province || <span className="text-slate-400">—</span>}
                                                                    </td>
                                                                    <td className="whitespace-nowrap border-b border-lx-line p-3 align-middle text-[13px]"><Pill value={r.status} /></td>
                                                                    <td className="whitespace-nowrap border-b border-lx-line p-3 align-middle text-[13px] text-lx-ink">{r.arrival}</td>
                                                                    <td className="whitespace-nowrap border-b border-lx-line p-3 align-middle text-[13px] text-lx-ink">{r.departure}</td>
                                                                    <td className="whitespace-nowrap border-b border-lx-line p-3 align-middle text-[13px] text-lx-ink">{r.room}</td>
                                                                    <td className="whitespace-nowrap border-b border-lx-line p-3 align-middle text-[13px] text-lx-ink">
                                                                        {r.onHoldDisplay || 'N/A'}
                                                                    </td>
                                                                    <td className="whitespace-nowrap border-b border-lx-line p-3 align-middle text-[13px]">
                                                                        {activeTab === 'Pinned' ? (
                                                                            // Pinned tab — Notes cell surfaces the manager-only
                                                                            // pin note + reminder via the Pin modal. The public
                                                                            // notes timeline stays hidden on this tab so the two
                                                                            // note streams never bleed into each other.
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setSelectedIndex(realIndex);
                                                                                    setPinModalOpen(true);
                                                                                }}
                                                                                title="View pin note & reminder"
                                                                                className="cursor-pointer rounded-md border-0 bg-transparent p-0 text-[13px] font-black text-lx-blue underline-offset-2 hover:underline"
                                                                            >
                                                                                View
                                                                            </button>
                                                                        ) : Array.isArray(r.notes) && r.notes.length > 0 ? (
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

                                    <QueuePaginationBar
                                        pageSize={pageSize}
                                        onPageSizeChange={setPageSize}
                                        page={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={setPage}
                                        pageStart={pageStart}
                                        pageEnd={pageEnd}
                                        totalEntries={totalEntries}
                                    />
                                </div>

                                <div className="mt-[18px] grid grid-cols-1 gap-3 rounded-2xl border border-lx-border bg-white px-4 py-3 text-xs font-extrabold text-lx-ink sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                                    {[
                                        'System Health: Operational',
                                        'AI Engine: Operational',
                                        'Database: Operational',
                                        'Integrations: Operational',
                                        'Data Sync: Auto-refresh ON',
                                    ].map((label) => (
                                        <span key={label} className="min-w-0 break-words">
                                            <span className="text-green-600">●</span>{' '}
                                            {label}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {selected && !selected.isModificationRequest && (
                            <aside
                                className={`min-w-0 xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-150px)] ${
                                    selectedOtherOpen ? 'xl:overflow-y-auto' : 'xl:overflow-y-hidden'
                                } overflow-x-hidden`}
                            >
                                <ReservationControlPanel
                                    selected={selected}
                                    onAction={runAction}
                                    assignSaving={assignSaving}
                                    checkInSaving={checkInSaving}
                                    otherOpen={selectedOtherOpen}
                                    onToggleOther={() => setSelectedOtherOpen((open) => !open)}
                                    otherSectionRef={otherSectionRef}
                                />
                            </aside>
                            )}
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

            <OnHoldModal
                open={onHoldModalOpen}
                onClose={() => setOnHoldModalOpen(false)}
                onConfirm={submitOnHold}
                reservation={selected}
                maxHoldDays={
                    isOnHoldExempt(selected, policy)
                        ? null
                        : onHoldPolicy?.onHoldEnabled
                          ? onHoldPolicy?.maxHoldDays ?? null
                          : null
                }
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

            <PinReservationModal
                open={pinModalOpen}
                onClose={() => setPinModalOpen(false)}
                reservation={selected}
                onSave={savePinDetails}
                onUnpin={unpinSelected}
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
