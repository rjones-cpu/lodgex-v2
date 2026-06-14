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

/**
 * Generic confirm-with-date modal used for Check-Out and Remove On-Hold.
 * Shows a calendar pre-set to today's date that the manager can adjust,
 * plus a single confirm button styled per the action's tone.
 */
export default function DateConfirmModal({
    open,
    onClose,
    onConfirm,
    reservation,
    title = 'Confirm date',
    subtitleSuffix = '',
    label = 'Date',
    confirmLabel = 'Confirm',
    confirmTone = 'bg-lx-blue hover:bg-blue-700',
    isSaving = false,
}) {
    const [date, setDate] = useState('');

    useEffect(() => {
        if (!open) {
            setDate('');
            return;
        }
        setDate(todayIso());
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

    return (
        <div
            className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/45 p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-lx-border bg-white shadow-lx-pop"
                role="dialog"
                aria-modal="true"
                aria-labelledby="date-confirm-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-lx-border px-6 py-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.04em] text-lx-blue">
                            {title}
                        </p>
                        <h2 id="date-confirm-title" className="mt-1 text-xl font-black text-lx-navy">
                            {reservation.worker}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            {reservation.company}
                            {subtitleSuffix ? ` · ${subtitleSuffix}` : ''}
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
                    <label
                        htmlFor="date-confirm-input"
                        className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500"
                    >
                        {label}
                    </label>
                    <input
                        id="date-confirm-input"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="h-[46px] w-full cursor-pointer rounded-[10px] border border-lx-border px-3 text-sm font-bold text-lx-ink"
                    />
                    <p className="mt-3 text-sm font-bold text-lx-ink">
                        {date ? `Selected: ${formatDisplayDate(date)}` : 'Choose a date to continue.'}
                    </p>
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
                        disabled={!date || isSaving}
                        onClick={() => onConfirm?.(date)}
                        className={`cursor-pointer rounded-[10px] border-0 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60 ${confirmTone}`}
                    >
                        {isSaving ? 'Saving…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
