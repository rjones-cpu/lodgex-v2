import { useEffect, useMemo, useState } from 'react';

function parseIsoDate(value) {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
}

function formatDisplayDate(value) {
    const date = parseIsoDate(value);
    if (!date) return '—';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function addDaysIso(isoDate, days) {
    const date = parseIsoDate(isoDate);
    if (!date) return '';
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Modal for selecting a new departure date when extending a stay.
 */
export default function ExtendStayModal({
    open,
    onClose,
    reservation,
    onExtend,
    isSaving = false,
    error = '',
}) {
    const [newDepartureDate, setNewDepartureDate] = useState('');

    useEffect(() => {
        if (!open) {
            setNewDepartureDate('');
            return;
        }

        if (reservation?.departureDate) {
            setNewDepartureDate(addDaysIso(reservation.departureDate, 1));
        }
    }, [open, reservation?.id, reservation?.departureDate]);

    useEffect(() => {
        if (!open) return;
        function onKey(e) {
            if (e.key === 'Escape') onClose?.();
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    const minDate = useMemo(() => {
        if (!reservation?.departureDate) return '';
        return addDaysIso(reservation.departureDate, 1);
    }, [reservation?.departureDate]);

    const extensionNights = useMemo(() => {
        if (!reservation?.departureDate || !newDepartureDate) return 0;
        const current = parseIsoDate(reservation.departureDate);
        const next = parseIsoDate(newDepartureDate);
        if (!current || !next || next <= current) return 0;
        const diffMs = next.getTime() - current.getTime();
        return Math.round(diffMs / (1000 * 60 * 60 * 24));
    }, [reservation?.departureDate, newDepartureDate]);

    if (!open || !reservation) return null;

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/45 p-4">
            <div
                className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-lx-border bg-white shadow-lx-pop"
                role="dialog"
                aria-modal="true"
                aria-labelledby="extend-stay-title"
            >
                <div className="flex items-start justify-between gap-4 border-b border-lx-border px-6 py-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.04em] text-lx-blue">
                            Extend Stay
                        </p>
                        <h2 id="extend-stay-title" className="mt-1 text-xl font-black text-lx-navy">
                            Extend stay for {reservation.worker}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            {reservation.company} · Current departure {reservation.departure}
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

                <div className="px-6 py-5">
                    <label htmlFor="new-departure-date" className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">
                        New departure date
                    </label>
                    <input
                        id="new-departure-date"
                        type="date"
                        value={newDepartureDate}
                        min={minDate}
                        onChange={(e) => setNewDepartureDate(e.target.value)}
                        className="h-[46px] w-full cursor-pointer rounded-[10px] border border-lx-border px-3 text-sm font-bold text-lx-ink"
                    />
                    <p className="mt-3 text-sm font-bold text-lx-ink">
                        {extensionNights > 0 ? (
                            <>
                                Extending stay by{' '}
                                <span className="text-lx-blue">
                                    {extensionNights} night{extensionNights === 1 ? '' : 's'}
                                </span>{' '}
                                to {formatDisplayDate(newDepartureDate)}.
                            </>
                        ) : (
                            'Choose a date after the current departure to extend the stay.'
                        )}
                    </p>
                </div>

                {error && (
                    <div className="mx-6 mb-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                        {error}
                    </div>
                )}

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
                        disabled={!newDepartureDate || extensionNights < 1 || isSaving}
                        onClick={() => onExtend?.(newDepartureDate)}
                        className="cursor-pointer rounded-[10px] border-0 bg-orange-500 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? 'Extending…' : 'Confirm Extension'}
                    </button>
                </div>
            </div>
        </div>
    );
}
