import { useEffect, useMemo, useState } from 'react';

// --- helpers ----------------------------------------------------------------

function dormFromRoomLabel(label) {
    if (!label || typeof label !== 'string') return '';
    const match = label.match(/\(([^)]+)\)/);
    return match ? match[1].trim() : '';
}

function bookingCodeFor(reservation) {
    if (!reservation) return 'N/A';
    const idPart = reservation.id ?? reservation.bookingCode ?? null;
    if (!idPart) return 'N/A';
    return `BK${String(idPart).padStart(8, '0')}`;
}

function formatNoteDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function appStatusFor(reservation) {
    const approval = reservation?.approval;
    if (approval === 'Approved') return { label: 'Approved', tone: 'good' };
    if (approval === '—' || !approval) return { label: 'N/A', tone: 'neutral' };
    return { label: 'Pending', tone: 'bad' };
}

// --- icons ------------------------------------------------------------------
// Small outlined icons that match the rounded-circle style in the design.

function IconWrap({ children }) {
    return (
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-500">
            {children}
        </span>
    );
}

const Icons = {
    bed: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v11" /><path d="M21 11H3" /><path d="M21 18v-7a3 3 0 0 0-3-3h-6v6" /><circle cx="7" cy="13" r="2" />
        </svg>
    ),
    phone: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92V21a1 1 0 0 1-1.11 1A19 19 0 0 1 2 4.11 1 1 0 0 1 3 3h4.09a1 1 0 0 1 1 .75l1 4a1 1 0 0 1-.27 1L7 10.5a16 16 0 0 0 6.5 6.5l1.75-1.83a1 1 0 0 1 1-.27l4 1a1 1 0 0 1 .75 1z" />
        </svg>
    ),
    clock: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
        </svg>
    ),
    rules: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h6" /><path d="M8 17h4" />
        </svg>
    ),
    barcode: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6v12M8 6v12M12 6v12M16 6v12M20 6v12" />
        </svg>
    ),
    badge: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h6" /><circle cx="17" cy="10" r="2" /><path d="M14 17a3 3 0 0 1 6 0" />
        </svg>
    ),
    user: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
    ),
    building: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01" />
        </svg>
    ),
    pin: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s7-7.58 7-13a7 7 0 1 0-14 0c0 5.42 7 13 7 13z" /><circle cx="12" cy="9" r="2.5" />
        </svg>
    ),
    division: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
    ),
    car: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 17h14M3 17v-4l2-5h14l2 5v4" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
        </svg>
    ),
    calIn: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M12 14v4M10 16l2 2 2-2" />
        </svg>
    ),
    calOut: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M12 18v-4M10 16l2-2 2 2" />
        </svg>
    ),
    meal: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" />
        </svg>
    ),
    allergy: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M8 14c1.5 1.5 6.5 1.5 8 0" /><path d="M9 9h.01M15 9h.01" />
        </svg>
    ),
    diet: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 13l2 2 4-4" />
        </svg>
    ),
};

// --- field card -------------------------------------------------------------

function Field({ icon, label, value, accent }) {
    return (
        <div className="flex items-start gap-2.5">
            <IconWrap>{icon}</IconWrap>
            <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.06em] text-slate-500">
                    {label}
                </p>
                <p className={`mt-0.5 text-sm font-bold ${accent ?? 'text-lx-ink'}`}>{value || 'N/A'}</p>
            </div>
        </div>
    );
}

function SectionHeader({ children }) {
    return (
        <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-lx-blue">{children}</h3>
    );
}

// --- modal ------------------------------------------------------------------

export default function ReservationInfoCardModal({ open, onClose, reservation, onUpdate }) {
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [pastNotesOpen, setPastNotesOpen] = useState(false);

    useEffect(() => {
        if (!open) {
            setScheduleOpen(false);
            setPastNotesOpen(false);
        }
    }, [open]);

    const pastNotes = useMemo(() => {
        const notes = Array.isArray(reservation?.notes) ? reservation.notes : [];
        return [...notes].sort((a, b) => {
            const at = a?.createdAt ? Date.parse(a.createdAt) || 0 : 0;
            const bt = b?.createdAt ? Date.parse(b.createdAt) || 0 : 0;
            return bt - at;
        });
    }, [reservation?.notes]);

    // Permission flag driven by the reservation itself, not local state, so it
    // persists across re-opens and is read by the On-Hold permission check.
    const onHoldAllowed = reservation?.onHoldAllowed !== false;
    function setOnHoldAllowed(value) {
        if (onUpdate) onUpdate('onHoldAllowed', value);
    }

    useEffect(() => {
        if (!open) return;
        function onKey(e) {
            if (e.key === 'Escape') onClose?.();
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    const lodge = useMemo(() => dormFromRoomLabel(reservation?.room), [reservation?.room]);
    const appStatus = useMemo(() => appStatusFor(reservation), [reservation?.approval]);

    if (!open || !reservation) return null;

    return (
        <div
            className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/45 p-4"
            onClick={onClose}
        >
            <div
                className="flex max-h-[92vh] w-full max-w-[1040px] flex-col overflow-hidden rounded-2xl border border-lx-border bg-white shadow-lx-pop"
                role="dialog"
                aria-modal="true"
                aria-labelledby="reservation-info-title"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative border-b border-lx-border px-6 py-5 text-center">
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-4 top-4 grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-lx-border text-lg text-slate-500 hover:bg-[#f6faff]"
                        aria-label="Close"
                    >
                        ×
                    </button>
                    <h2 id="reservation-info-title" className="text-2xl font-black text-lx-navy">
                        {reservation.worker}
                    </h2>
                    <div className="mt-2 flex items-center justify-center gap-3 text-xs font-bold">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                            Status: <span className="text-lx-ink">{reservation.status || 'N/A'}</span>
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                            App Status:{' '}
                            <span
                                className={
                                    appStatus.tone === 'good'
                                        ? 'text-green-600'
                                        : appStatus.tone === 'bad'
                                        ? 'text-red-500'
                                        : 'text-lx-ink'
                                }
                            >
                                {appStatus.label}
                            </span>
                            <span className="ml-1 align-middle">
                                {appStatus.tone === 'good' ? '✅' : appStatus.tone === 'bad' ? '❌' : ''}
                            </span>
                        </span>
                    </div>
                </div>

                {/* Body */}
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                    {/* Key Info */}
                    <section className="mb-6">
                        <SectionHeader>Key Info</SectionHeader>
                        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-4">
                            <Field icon={Icons.bed} label="Room #" value={reservation.room} />
                            <Field icon={Icons.phone} label="Contact #" value="N/A" />
                            <Field icon={Icons.clock} label="AM / PM" value="Night" />
                            <Field
                                icon={Icons.rules}
                                label="Lodge Rules"
                                value={
                                    <span className="inline-flex items-center gap-1.5">
                                        Signed Off <span className="text-green-600">✅</span>
                                    </span>
                                }
                            />
                            <div className="flex items-start gap-2.5">
                                <IconWrap>{Icons.bed}</IconWrap>
                                <div>
                                    <p
                                        className="text-[10px] font-black uppercase tracking-[0.06em] text-slate-500"
                                        title="Is this reservation allowed to place their room on hold?"
                                    >
                                        On Hold
                                    </p>
                                    <div className="mt-1 inline-flex overflow-hidden rounded-full border border-slate-200 text-[11px] font-black">
                                        <button
                                            type="button"
                                            onClick={() => setOnHoldAllowed(true)}
                                            className={`px-2.5 py-1 ${
                                                onHoldAllowed
                                                    ? 'bg-lx-blue text-white'
                                                    : 'bg-white text-slate-500'
                                            }`}
                                        >
                                            Yes
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setOnHoldAllowed(false)}
                                            className={`px-2.5 py-1 ${
                                                !onHoldAllowed
                                                    ? 'bg-lx-blue text-white'
                                                    : 'bg-white text-slate-500'
                                            }`}
                                        >
                                            No
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <Field icon={Icons.barcode} label="Booking Code" value={bookingCodeFor(reservation)} />
                        </div>
                    </section>

                    {/* Employer & Supervisor Info */}
                    <section className="mb-6">
                        <SectionHeader>Employer &amp; Supervisor Info</SectionHeader>
                        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-4">
                            <Field icon={Icons.badge} label="Employer" value={reservation.company} />
                            <Field icon={Icons.user} label="Scheduling Coordinator" value="N/A" />
                            <Field icon={Icons.user} label="Scheduling Manager" value="Reservation Manager" />
                            <Field icon={Icons.clock} label="Shift" value="Night" />
                            <Field icon={Icons.building} label="Lodge" value={lodge || 'N/A'} />
                            <Field icon={Icons.user} label="Supervisor Name" value="N/A" />
                            <Field icon={Icons.pin} label="Province of Residence" value="N/A" />
                            <Field icon={Icons.division} label="Division" value="N/A" />
                        </div>
                    </section>

                    {/* Contact Info */}
                    <section className="mb-6">
                        <SectionHeader>Contact Info</SectionHeader>
                        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-4">
                            <Field icon={Icons.car} label="License Plate #" value="N/A" />
                            <Field icon={Icons.phone} label="Supervisor Contact #" value="N/A" />
                            <Field icon={Icons.calOut} label="Last Day" value={reservation.departure} />
                            <Field icon={Icons.calIn} label="Arrival Day" value={reservation.arrival} />
                        </div>
                    </section>

                    {/* Food Info */}
                    <section>
                        <SectionHeader>Food Info</SectionHeader>
                        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-4">
                            <Field icon={Icons.meal} label="Meal" value="Breakfast, Lunch, Dinner" />
                            <div />
                            <Field icon={Icons.allergy} label="Special Needs" value="N/A" />
                            <Field icon={Icons.diet} label="Special Dietary Needs" value="N/A" />
                            <div />
                            <Field icon={Icons.allergy} label="Food Allergies" value="N/A" />
                        </div>
                    </section>
                </div>

                {/* Footer / expanders */}
                <div className="border-t border-lx-border px-6 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setScheduleOpen((v) => !v)}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-blue-200 bg-[#eef6ff] px-3 py-2 text-sm font-black text-lx-blue hover:bg-[#dceaff]"
                        >
                            View Schedule Information
                            <span className={`transition-transform ${scheduleOpen ? 'rotate-180' : ''}`}>⌄</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setPastNotesOpen((v) => !v)}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-blue-200 bg-[#eef6ff] px-3 py-2 text-sm font-black text-lx-blue hover:bg-[#dceaff]"
                        >
                            Past Notes
                            <span className="rounded-full bg-blue-100 px-1.5 text-[11px] text-lx-blue">
                                {pastNotes.length}
                            </span>
                            <span className={`transition-transform ${pastNotesOpen ? 'rotate-180' : ''}`}>⌄</span>
                        </button>
                    </div>
                    {pastNotesOpen && (
                        <div className="mt-3 rounded-xl border border-lx-border bg-[#fbfdff] p-3 text-sm">
                            {pastNotes.length === 0 ? (
                                <p className="px-1 py-3 text-center text-xs font-bold text-slate-500">
                                    No notes have been added for this reservation yet.
                                </p>
                            ) : (
                                <ol className="space-y-2">
                                    {pastNotes.map((note, idx) => (
                                        <li
                                            key={`${note.createdAt || 'no-date'}-${idx}`}
                                            className="rounded-lg border border-lx-border bg-white p-3 shadow-sm"
                                        >
                                            <div className="grid grid-cols-[1fr_auto] items-baseline gap-3">
                                                <span className="truncate text-sm font-black text-lx-navy">
                                                    {note.author || 'Unknown user'}
                                                </span>
                                                <time className="shrink-0 text-[11px] font-bold text-slate-500">
                                                    {formatNoteDate(note.createdAt)}
                                                </time>
                                            </div>
                                            <p className="mt-1 whitespace-pre-wrap text-sm text-lx-ink">
                                                {note.text}
                                            </p>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    )}
                    {scheduleOpen && (
                        <div className="mt-3 grid gap-x-6 gap-y-3 rounded-xl border border-lx-border bg-[#fbfdff] p-4 text-sm md:grid-cols-2">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.06em] text-slate-500">Project</p>
                                <p className="font-bold text-lx-ink">{reservation.project || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.06em] text-slate-500">Room Type</p>
                                <p className="font-bold text-lx-ink">{reservation.roomType || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.06em] text-slate-500">Allotment</p>
                                <p className="font-bold text-lx-ink">{reservation.allotment || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.06em] text-slate-500">AI Match Score</p>
                                <p className="font-bold text-lx-ink">{reservation.score ? `${reservation.score}%` : 'N/A'}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
