import { useEffect, useState } from 'react';

function todayIso() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDisplayDate(value) {
    if (!value) return '—';
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return '—';
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Whole days between two YYYY-MM-DD strings (return - departure).
function holdLengthInDays(departureDate, returnDate) {
    if (!departureDate || !returnDate) return 0;
    const [dy, dm, dd] = departureDate.split('-').map(Number);
    const [ry, rm, rd] = returnDate.split('-').map(Number);
    if (!dy || !ry) return 0;
    const start = new Date(dy, dm - 1, dd);
    const end = new Date(ry, rm - 1, rd);
    return Math.round((end - start) / 86400000);
}

/**
 * On-Hold modal — asks for the departure date (when the worker leaves) and the
 * return date (when they come back). Both use native calendar pickers, matching
 * the Check-Out date modal. The return date cannot precede the departure date.
 *
 * When `maxHoldDays` is set, a hold whose length exceeds it is flagged: the
 * caller still confirms, but the action becomes an escalation to the scheduling
 * manager (handled by the parent via the `overPolicy` flag on confirm).
 */
export default function OnHoldModal({
    open,
    onClose,
    onConfirm,
    reservation,
    isSaving = false,
    maxHoldDays = null,
}) {
    const [departureDate, setDepartureDate] = useState('');
    const [returnDate, setReturnDate] = useState('');

    useEffect(() => {
        if (!open) {
            setDepartureDate('');
            setReturnDate('');
            return;
        }
        setDepartureDate(todayIso());
        setReturnDate('');
    }, [open, reservation?.id]);

    useEffect(() => {
        if (!open) return;
        function onKey(e) {
            if (e.key === 'Escape') onClose?.();
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open || !reservation) return null;

    const returnBeforeDeparture =
        departureDate && returnDate && returnDate < departureDate;
    const holdDays = holdLengthInDays(departureDate, returnDate);
    const hasLimit = typeof maxHoldDays === 'number' && maxHoldDays > 0;
    const overPolicy =
        hasLimit && !returnBeforeDeparture && departureDate && returnDate && holdDays > maxHoldDays;
    const canConfirm = departureDate && returnDate && !returnBeforeDeparture && !isSaving;

    return (
        <div
            className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/45 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-lx-border bg-white shadow-lx-pop"
                role="dialog"
                aria-modal="true"
                aria-labelledby="on-hold-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-lx-border px-6 py-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.04em] text-lx-blue">
                            Place On-Hold
                        </p>
                        <h2 id="on-hold-title" className="mt-1 text-xl font-black text-lx-navy">
                            {reservation.worker}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            {reservation.company}
                            {reservation.room && reservation.room !== 'Unassigned'
                                ? ` · Room ${reservation.room}`
                                : ''}
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
                    <div>
                        <label
                            htmlFor="on-hold-departure-input"
                            className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500"
                        >
                            Departure date
                        </label>
                        <input
                            id="on-hold-departure-input"
                            type="date"
                            value={departureDate}
                            onChange={(e) => setDepartureDate(e.target.value)}
                            className="h-[46px] w-full cursor-pointer rounded-[10px] border border-lx-border px-3 text-sm font-bold text-lx-ink"
                        />
                        <p className="mt-2 text-sm font-bold text-lx-ink">
                            {departureDate
                                ? `Selected: ${formatDisplayDate(departureDate)}`
                                : 'Choose the departure date.'}
                        </p>
                    </div>

                    <div>
                        <label
                            htmlFor="on-hold-return-input"
                            className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500"
                        >
                            Return date
                        </label>
                        <input
                            id="on-hold-return-input"
                            type="date"
                            value={returnDate}
                            min={departureDate || undefined}
                            onChange={(e) => setReturnDate(e.target.value)}
                            className="h-[46px] w-full cursor-pointer rounded-[10px] border border-lx-border px-3 text-sm font-bold text-lx-ink"
                        />
                        <p className="mt-2 text-sm font-bold text-lx-ink">
                            {returnDate
                                ? `Selected: ${formatDisplayDate(returnDate)}`
                                : 'Choose the return date.'}
                        </p>
                        {returnBeforeDeparture ? (
                            <p className="mt-2 text-sm font-bold text-red-600">
                                Return date cannot be before the departure date.
                            </p>
                        ) : null}
                    </div>

                    {overPolicy ? (
                        <div className="flex items-start gap-3 rounded-[10px] border border-amber-300 bg-amber-50 px-4 py-3">
                            <span aria-hidden className="text-lg leading-none text-amber-600">
                                ⚠️
                            </span>
                            <div>
                                <p className="text-sm font-black text-amber-800">
                                    Exceeds on-hold policy ({maxHoldDays} day
                                    {maxHoldDays === 1 ? '' : 's'} max)
                                </p>
                                <p className="mt-0.5 text-sm font-semibold text-amber-700">
                                    This hold is {holdDays} days. Confirming will escalate the
                                    request to the scheduling manager for approval via a modification
                                    request.
                                </p>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-lx-border px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer rounded-[10px] border border-lx-border bg-white px-4 py-2.5 text-sm font-black text-lx-ink"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={!canConfirm}
                        onClick={() => onConfirm?.(departureDate, returnDate, overPolicy)}
                        className="cursor-pointer rounded-[10px] border-0 bg-amber-500 px-4 py-2.5 text-sm font-black text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving
                            ? 'Saving…'
                            : overPolicy
                                ? 'Escalate for Approval'
                                : 'Confirm On-Hold'}
                    </button>
                </div>
            </div>
        </div>
    );
}
