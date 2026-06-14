import { useEffect, useMemo, useState } from 'react';

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

/**
 * Notes timeline modal: lists every past note attached to a reservation
 * (author + timestamp + text) and lets the lodge manager append a new one.
 * Saving calls `onSave(updatedNotes)` so the parent (Dashboard) can persist
 * the array via its existing `updateSelectedField` helper.
 */
export default function ReservationNotesModal({
    open,
    onClose,
    reservation,
    onSave,
    currentUser = 'You',
    isSaving = false,
}) {
    const [draft, setDraft] = useState('');

    const notes = useMemo(
        () => (Array.isArray(reservation?.notes) ? reservation.notes : []),
        [reservation?.notes],
    );

    // Newest first in the list; underlying array order is preserved on save.
    const orderedNotes = useMemo(() => {
        return [...notes].sort((a, b) => {
            const at = a?.createdAt ? Date.parse(a.createdAt) || 0 : 0;
            const bt = b?.createdAt ? Date.parse(b.createdAt) || 0 : 0;
            return bt - at;
        });
    }, [notes]);

    useEffect(() => {
        if (!open) {
            setDraft('');
        }
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

    const trimmed = draft.trim();
    const canSave = trimmed.length > 0 && !isSaving;

    function handleSave() {
        if (!canSave) return;
        const newEntry = {
            author: currentUser,
            text: trimmed,
            createdAt: new Date().toISOString(),
        };
        onSave?.([...notes, newEntry]);
        setDraft('');
    }

    return (
        <div
            className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/45 p-4"
            onClick={onClose}
        >
            <div
                className="flex max-h-[90vh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-lx-border bg-white shadow-lx-pop"
                role="dialog"
                aria-modal="true"
                aria-labelledby="reservation-notes-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-lx-border px-6 py-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.04em] text-lx-blue">
                            Reservation Notes
                        </p>
                        <h2
                            id="reservation-notes-title"
                            className="mt-1 text-xl font-black text-lx-navy"
                        >
                            {reservation.worker}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            {reservation.company} · {orderedNotes.length} note{orderedNotes.length === 1 ? '' : 's'}
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

                {/* Timeline */}
                <div className="min-h-0 flex-1 overflow-y-auto border-b border-lx-border bg-[#fbfdff] px-6 py-4">
                    {orderedNotes.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-lx-border bg-white px-4 py-8 text-center">
                            <p className="text-sm font-black text-lx-navy">No notes yet</p>
                            <p className="mt-1 text-xs text-slate-500">
                                Add the first note below to start the timeline.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {orderedNotes.map((note, idx) => (
                                <article
                                    key={`${note.createdAt || 'no-date'}-${idx}`}
                                    className="rounded-xl border border-lx-border bg-white p-3 shadow-sm"
                                >
                                    <header className="grid grid-cols-[1fr_auto] items-baseline gap-3">
                                        <span className="truncate text-sm font-black text-lx-navy">
                                            {note.author || 'Unknown user'}
                                        </span>
                                        <time className="shrink-0 text-[11px] font-bold text-slate-500">
                                            {formatNoteDate(note.createdAt)}
                                        </time>
                                    </header>
                                    <p className="mt-1 whitespace-pre-wrap text-sm text-lx-ink">
                                        {note.text}
                                    </p>
                                </article>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add new */}
                <div className="px-6 py-4">
                    <label
                        htmlFor="reservation-notes-input"
                        className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500"
                    >
                        Add a new note
                    </label>
                    <textarea
                        id="reservation-notes-input"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={3}
                        placeholder={`Notes will be attributed to ${currentUser}.`}
                        className="w-full resize-y rounded-[10px] border border-lx-border px-3 py-2.5 text-sm font-bold text-lx-ink"
                    />
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-lx-border px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer rounded-[10px] border border-lx-border bg-white px-4 py-2.5 text-sm font-black text-lx-ink"
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        disabled={!canSave}
                        onClick={handleSave}
                        className="cursor-pointer rounded-[10px] border-0 bg-lx-blue px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? 'Saving…' : 'Add Note'}
                    </button>
                </div>
            </div>
        </div>
    );
}
