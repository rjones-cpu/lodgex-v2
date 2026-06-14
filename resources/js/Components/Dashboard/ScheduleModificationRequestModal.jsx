import { useEffect, useMemo } from 'react';

/**
 * Schedule Modification Request modal — opened from the "Open" link in the
 * Modification Requests queue. Mirrors the company's existing modification
 * modal: two stacked panels (Current Schedule on top, Modification Request
 * below) showing the same field set with the requested changes outlined in
 * black so the manager can see at a glance what the scheduling system is
 * asking them to acknowledge.
 *
 * The modal is read-only — the only outcome is the manager hitting
 * Acknowledge, which fires `onAcknowledge` and closes. Approval flow lives
 * elsewhere (right-click context menu / Selected Reservation panel).
 */
const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const PROVINCE_FULL_NAMES = {
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

function splitName(fullName) {
    if (!fullName || typeof fullName !== 'string') return ['', ''];
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) return [parts[0] || '', ''];
    return [parts.slice(0, -1).join(' '), parts[parts.length - 1]];
}

function parseLabelDate(label) {
    if (!label || typeof label !== 'string') return null;
    const cleaned = label.replace(/—|--/g, '').trim();
    if (!cleaned) return null;
    const d = new Date(cleaned);
    return Number.isNaN(d.getTime()) ? null : d;
}

function toIsoDate(date) {
    if (!date) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function addDays(date, days) {
    const next = new Date(date.getTime());
    next.setDate(next.getDate() + days);
    return next;
}

function addMonths(date, months) {
    const next = new Date(date.getTime());
    next.setMonth(next.getMonth() + months);
    return next;
}

// Strip the "(Dorm X)" suffix and just keep the room number — matches the
// reference modal where the Room field shows the bare number.
function extractRoomNumber(label) {
    if (!label || typeof label !== 'string') return '';
    if (label === 'Unassigned' || label === '—') return '';
    const m = label.match(/^\s*(\S+)/);
    return m ? m[1] : '';
}

// Build a fixed 8-cell schedule strip starting from the given anchor date.
// First and last cell are yellow (travel to / travel from); middle six are
// blue (working) by default. Vacation / sick variants tint the working
// stretch accordingly.
function buildScheduleCells(anchor, scheduleStatus) {
    if (!anchor) return [];
    const middleColor =
        scheduleStatus === 'Green'
            ? 'green'
            : scheduleStatus === 'Red'
                ? 'red'
                : scheduleStatus === 'Light Blue'
                    ? 'lightblue'
                    : 'blue';
    return Array.from({ length: 8 }).map((_, i) => {
        const date = addDays(anchor, i);
        return {
            label: DAY_LABELS[date.getDay()],
            month: date.toLocaleDateString('en-US', { month: 'short' }),
            day: date.getDate(),
            color: i === 0 || i === 7 ? 'yellow' : middleColor,
        };
    });
}

// Synthesize plausible "before" snapshot from the current reservation. Each
// modification type implies a different delta:
//   Extension          → current departure is the original (before the ask)
//   Schedule Change    → current arrival is shifted forward
//   Hold for Review    → current arrival is shifted forward
//   Walk-In            → no prior reservation; arrival/departure both blank
//   No-Show            → schedule unchanged, only status differs
//   Schedule Discrepancy / default → mirror the current values, no diff
function deriveScheduleData(reservation) {
    if (!reservation) return null;

    const [firstName, lastName] = splitName(reservation.worker);
    const arrival = parseLabelDate(reservation.arrival);
    const departure = parseLabelDate(reservation.departure);
    const provinceLabel = reservation.province
        ? PROVINCE_FULL_NAMES[reservation.province] || reservation.province
        : '';
    const projectDeparture = arrival
        ? toIsoDate(addMonths(arrival, 6))
        : '';
    const room = extractRoomNumber(reservation.room);

    const baseFields = {
        firstName,
        lastName,
        arrival: arrival ? toIsoDate(arrival) : '',
        departure: departure ? toIsoDate(departure) : '',
        projectDeparture,
        company: reservation.company || '',
        province: provinceLabel,
        shift: reservation.shift || '',
        room,
        roomType: reservation.roomType || '',
        reservationStatus: reservation.status || 'In House',
    };

    const baseSchedule = buildScheduleCells(arrival, reservation.scheduleStatus);

    let current = { ...baseFields, schedule: baseSchedule };
    const modification = { ...baseFields, schedule: baseSchedule };

    switch (reservation.status) {
        case 'Extension': {
            // Current departure was 7 days earlier — the modification request
            // is to push it out to today's stored value.
            if (departure) {
                current = {
                    ...current,
                    departure: toIsoDate(addDays(departure, -7)),
                    schedule: arrival
                        ? buildScheduleCells(addDays(arrival, -1), reservation.scheduleStatus)
                        : current.schedule,
                };
            }
            break;
        }
        case 'Schedule Change':
        case 'Hold for Review': {
            // Modification asks to shift arrival 2 days forward.
            if (arrival) {
                current = {
                    ...current,
                    arrival: toIsoDate(addDays(arrival, -2)),
                    schedule: buildScheduleCells(addDays(arrival, -2), reservation.scheduleStatus),
                };
            }
            break;
        }
        case 'Walk-In': {
            // No prior reservation — every date / room field starts blank.
            current = {
                ...current,
                arrival: '',
                departure: '',
                projectDeparture: '',
                room: '',
                reservationStatus: 'No Reservation',
                schedule: [],
            };
            break;
        }
        case 'Schedule Discrepancy':
        case 'No-Show':
        default:
            // Same data on both sides — the manager is acknowledging a status
            // mismatch rather than a field-level change. No diff to draw.
            break;
    }

    return { current, modification };
}

function fieldsDiffer(a, b, key) {
    if (a == null || b == null) return false;
    return (a[key] || '') !== (b[key] || '');
}

function FieldInput({ label, value, infoIcon = false, highlight = false, tint = 'none' }) {
    const tintCls =
        tint === 'green'
            ? 'bg-[#e9f7ee]'
            : tint === 'yellow'
                ? 'bg-[#fef6e0]'
                : 'bg-white';
    const borderCls = highlight
        ? 'border-2 border-lx-ink'
        : 'border border-lx-border';
    return (
        <div className="min-w-0">
            <div className="mb-1 flex items-center gap-1 text-[11px] font-bold text-slate-500">
                {label}
                {infoIcon && (
                    <span
                        className="grid h-3.5 w-3.5 place-items-center rounded-full bg-lx-blue text-[9px] font-black text-white"
                        aria-hidden
                    >
                        i
                    </span>
                )}
            </div>
            <input
                type="text"
                value={value || ''}
                readOnly
                className={`h-9 w-full rounded-md ${borderCls} ${tintCls} px-2 text-[13px] text-lx-ink focus:outline-none`}
            />
        </div>
    );
}

function ScheduleStrip({ cells }) {
    if (!cells || cells.length === 0) {
        return (
            <div className="rounded-md border border-lx-border bg-[#fbfdff] px-4 py-6 text-center text-xs font-bold text-slate-400">
                No schedule on file
            </div>
        );
    }
    return (
        <div className="overflow-x-auto rounded-md border border-lx-border bg-white p-3">
            <div className="flex gap-1.5">
                {cells.map((c, i) => {
                    const barCls =
                        c.color === 'yellow'
                            ? 'bg-[#fbbf24]'
                            : c.color === 'green'
                                ? 'bg-[#34d399]'
                                : c.color === 'red'
                                    ? 'bg-[#f87171]'
                                    : c.color === 'lightblue'
                                        ? 'bg-[#7dd3fc]'
                                        : 'bg-[#3b82f6]';
                    return (
                        <div
                            key={`${c.label}-${c.day}-${i}`}
                            className="flex w-[58px] shrink-0 flex-col items-center"
                        >
                            <div className="text-[10px] font-bold tracking-wider text-slate-500">
                                {c.label}
                            </div>
                            <div className="text-[10px] text-slate-400">{c.month}</div>
                            <div className="text-base font-black text-lx-navy">{c.day}</div>
                            <div className={`mt-2 h-7 w-full rounded-sm ${barCls}`} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ScheduleSection({ title, data, currentData, isModification }) {
    return (
        <div className="rounded-2xl border border-lx-border p-4">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-black text-lx-navy">{title}</h3>
                <button
                    type="button"
                    className="cursor-pointer border-0 bg-transparent p-0 text-sm font-black text-lx-blue hover:underline"
                >
                    Current Shift
                </button>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <FieldInput
                    label="First Name"
                    value={data.firstName}
                    highlight={isModification && fieldsDiffer(currentData, data, 'firstName')}
                />
                <FieldInput
                    label="Last Name"
                    value={data.lastName}
                    highlight={isModification && fieldsDiffer(currentData, data, 'lastName')}
                />
                <FieldInput
                    label="Arrival"
                    value={data.arrival}
                    infoIcon
                    tint="green"
                    highlight={isModification && fieldsDiffer(currentData, data, 'arrival')}
                />
                <FieldInput
                    label="Departure"
                    value={data.departure}
                    infoIcon
                    tint="green"
                    highlight={isModification && fieldsDiffer(currentData, data, 'departure')}
                />
                <FieldInput
                    label="Project Departure"
                    value={data.projectDeparture}
                    tint="yellow"
                    highlight={isModification && fieldsDiffer(currentData, data, 'projectDeparture')}
                />
                <FieldInput
                    label="Company"
                    value={data.company}
                    highlight={isModification && fieldsDiffer(currentData, data, 'company')}
                />
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <FieldInput
                    label="Province"
                    value={data.province}
                    infoIcon
                    highlight={isModification && fieldsDiffer(currentData, data, 'province')}
                />
                <FieldInput
                    label="Shift"
                    value={data.shift}
                    highlight={isModification && fieldsDiffer(currentData, data, 'shift')}
                />
                <FieldInput
                    label="Room"
                    value={data.room}
                    highlight={isModification && fieldsDiffer(currentData, data, 'room')}
                />
                <FieldInput
                    label="Room Type"
                    value={data.roomType}
                    highlight={isModification && fieldsDiffer(currentData, data, 'roomType')}
                />
                <FieldInput
                    label="Reservation Status"
                    value={data.reservationStatus}
                    highlight={isModification && fieldsDiffer(currentData, data, 'reservationStatus')}
                />
                <div aria-hidden />
            </div>

            <ScheduleStrip cells={data.schedule} />
        </div>
    );
}

export default function ScheduleModificationRequestModal({
    open,
    onClose,
    onAcknowledge,
    reservation,
}) {
    useEffect(() => {
        if (!open) return;
        function onKey(e) {
            if (e.key === 'Escape') onClose?.();
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    const data = useMemo(() => deriveScheduleData(reservation), [reservation]);

    if (!open || !reservation || !data) return null;

    return (
        <div
            className="fixed inset-0 z-[3000] flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4"
            onClick={onClose}
        >
            <div
                className="my-auto flex w-full max-w-[1100px] flex-col overflow-hidden rounded-2xl border border-lx-border bg-white shadow-lx-pop"
                role="dialog"
                aria-modal="true"
                aria-labelledby="schedule-mod-request-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative flex items-center justify-center border-b border-lx-border px-6 py-5">
                    <h2
                        id="schedule-mod-request-title"
                        className="text-lg font-black text-lx-navy"
                    >
                        Schedule Modification Request
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-4 top-1/2 grid h-9 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-lg border border-lx-border bg-white text-lg text-slate-500 hover:bg-[#f6faff]"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto px-6 py-5">
                    <ScheduleSection title="Current Schedule" data={data.current} />
                    <ScheduleSection
                        title="Modification Request"
                        data={data.modification}
                        currentData={data.current}
                        isModification
                    />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-lx-border bg-[#fbfdff] px-6 py-4">
                    <p className="flex items-center gap-2 text-sm text-slate-600">
                        <span
                            className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lx-blue text-[11px] font-black text-white"
                            aria-hidden
                        >
                            i
                        </span>
                        The requested modifications are highlighted with black border for better understanding
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            onAcknowledge?.(reservation);
                            onClose?.();
                        }}
                        className="cursor-pointer rounded-md border-0 bg-lx-blue px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700"
                    >
                        Acknowledge
                    </button>
                </div>
            </div>
        </div>
    );
}
