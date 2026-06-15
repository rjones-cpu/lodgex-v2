import { useEffect, useState } from 'react';

// Default value for the Remind By picker — today at 08:00 in the user's
// local timezone, formatted to match `<input type="datetime-local">`. The
// modal seeds this whenever the reservation doesn't already have a
// `pinRemindBy` value, so the manager only has to adjust the date if the
// 8:00 AM default works for them.
function defaultRemindBy() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T08:00`;
}

// Accepts either an ISO date ("2026-06-20") for backwards compatibility or a
// datetime-local string ("2026-06-20T14:30") and renders both as a friendly
// human-readable label, including the time when present.
function formatDisplayDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const dateLabel = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
    if (typeof value === 'string' && value.includes('T')) {
        const timeLabel = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
        });
        return `${dateLabel} · ${timeLabel}`;
    }
    return dateLabel;
}

/**
 * Pin Reservation modal — opened from the pin icon on the Selected Reservation
 * panel. Captures a manager-private reminder note plus an optional "remind
 * by" date. These two fields are stored on the reservation as `pinNote` and
 * `pinRemindBy`, and live entirely separate from the reservation's public
 * `notes` timeline (which is what surfaces in Info Card → Past Notes). When
 * the manager unpins, both fields are cleared along with the `pinned` flag.
 */
export default function PinReservationModal({
    open,
    onClose,
    onSave,
    onUnpin,
    reservation,
}) {
    const [note, setNote] = useState('');
    const [remindBy, setRemindBy] = useState('');

    useEffect(() => {
        if (!open) return;
        setNote(reservation?.pinNote || '');
        // Seed today @ 08:00 only when the reservation hasn't already stored a
        // remind-by — preserves any previously-saved time when re-opening to
        // edit an existing pin.
        setRemindBy(reservation?.pinRemindBy || defaultRemindBy());
    }, [open, reservation?.id, reservation?.pinNote, reservation?.pinRemindBy]);

    useEffect(() => {
        if (!open) return;
        function onKey(e) {
            if (e.key === 'Escape') onClose?.();
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open || !reservation) return null;

    const isAlreadyPinned = reservation.pinned === true;
    const trimmedNote = note.trim();

    return (
        <div
            className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/45 p-4"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="pin-reservation-title"
                onClick={(e) => e.stopPropagation()}
                className="flex w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-lx-border bg-white shadow-lx-pop"
            >
                <div className="flex items-start justify-between gap-4 border-b border-lx-border px-6 py-5">
                    <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.04em] text-lx-blue">
                            <span aria-hidden>📌</span>
                            {isAlreadyPinned ? 'Edit Pin' : 'Pin Reservation'}
                        </p>
                        <h2
                            id="pin-reservation-title"
                            className="mt-1 truncate text-xl font-black text-lx-navy"
                        >
                            {reservation.worker}
                        </h2>
                        <p className="mt-1 truncate text-sm text-slate-500">
                            {reservation.company}
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

                <div className="space-y-5 px-6 py-5">
                    <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-[#f4f8ff] px-3 py-2.5 text-xs text-slate-600">
                        <span
                            aria-hidden
                            className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-lx-blue text-[10px] font-black text-white"
                        >
                            i
                        </span>
                        <span>
                            <strong className="font-black text-lx-navy">Manager-only.</strong>{' '}
                            This pin and its reminder are visible to the Lodge Manager only —
                            they are <strong>not</strong> saved to the reservation’s notes
                            profile or shared with the worker.
                        </span>
                    </div>

                    <div>
                        <label
                            htmlFor="pin-note-input"
                            className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500"
                        >
                            Reminder note
                        </label>
                        <textarea
                            id="pin-note-input"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="What should this pin remind you about? (e.g., follow up with scheduling, hold pending Sr. assignment...)"
                            rows={4}
                            className="w-full resize-y rounded-[10px] border border-lx-border px-3 py-2.5 text-sm text-lx-ink focus:border-lx-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="pin-remind-input"
                            className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500"
                        >
                            Remind by (date &amp; time)
                        </label>
                        <input
                            id="pin-remind-input"
                            type="datetime-local"
                            value={remindBy}
                            onChange={(e) => setRemindBy(e.target.value)}
                            // Browsers only open the native picker when the
                            // small calendar icon is clicked. Calling
                            // showPicker() on any click within the input
                            // makes the entire box act as the picker
                            // trigger. Modern Chrome/Edge/Safari/Firefox all
                            // support this; older browsers fall back to the
                            // default focus-only behavior because of `?.()`.
                            onClick={(e) => {
                                try {
                                    e.currentTarget.showPicker?.();
                                } catch {
                                    // showPicker can throw on browsers that
                                    // restrict it — degrade silently.
                                }
                            }}
                            onFocus={(e) => {
                                // Keyboard tab-focus → also surface the
                                // picker (via the same API) for parity with
                                // the click affordance.
                                try {
                                    e.currentTarget.showPicker?.();
                                } catch {
                                    /* noop */
                                }
                            }}
                            className="h-[42px] w-full cursor-pointer rounded-[10px] border border-lx-border px-3 text-sm font-bold text-lx-ink focus:border-lx-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                        <p className="mt-1.5 text-xs text-slate-500">
                            {remindBy
                                ? `Pin will surface a reminder by ${formatDisplayDate(remindBy)}.`
                                : 'Optional — leave blank for an open-ended pin.'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-lx-border bg-[#fbfdff] px-6 py-4">
                    {isAlreadyPinned ? (
                        <button
                            type="button"
                            onClick={onUnpin}
                            className="cursor-pointer rounded-[10px] border border-red-200 bg-white px-4 py-2.5 text-sm font-black text-red-600 hover:bg-red-50"
                        >
                            Unpin
                        </button>
                    ) : (
                        <span />
                    )}
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
                            onClick={() =>
                                onSave?.({
                                    pinNote: trimmedNote,
                                    pinRemindBy: remindBy || '',
                                })
                            }
                            className="cursor-pointer rounded-[10px] border-0 bg-lx-blue px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700"
                        >
                            {isAlreadyPinned ? 'Save changes' : 'Pin reservation'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
