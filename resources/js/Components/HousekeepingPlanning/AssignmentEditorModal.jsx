import { useEffect, useMemo, useState } from 'react';

/**
 * Modal for manually editing one housekeeper's daily assignment.
 *
 * What the supervisor can do here:
 *   1. Reassign any individual room to another housekeeper (or unassign it).
 *   2. Bulk-move every room in a given dorm currently held by this housekeeper to another HK.
 *   3. Add any currently-unassigned task to this housekeeper.
 *
 * The modal stages all changes locally (no per-action network call) and only
 * commits when "Save Changes" is clicked. Cancel discards. Closes on Escape.
 *
 * Props:
 *   open: boolean
 *   onClose(): close without saving
 *   housekeeper: { id, name, primaryDorm, maxRooms, maxCheckouts, maxPoints, ... }
 *   allHousekeepers: list of { id, name, primaryDorm, ... }
 *   allTasks: every task today (we filter ourselves)
 *   onSave(changes): supervisor clicked save. changes = [{ taskId, housekeeperId|null }]
 *   isSaving: disable Save while a request is in flight
 */
export default function AssignmentEditorModal({
    open,
    onClose,
    housekeeper,
    allHousekeepers = [],
    allTasks = [],
    onSave,
    isSaving = false,
}) {
    // Map taskId → newHousekeeperId (null = unassign). Absent = no change.
    const [pendingChanges, setPendingChanges] = useState({});
    const [bulkDorm, setBulkDorm] = useState('');
    const [bulkTarget, setBulkTarget] = useState('');
    const [addPickerOpen, setAddPickerOpen] = useState(false);
    const [addSelection, setAddSelection] = useState({}); // taskId → true

    useEffect(() => {
        if (!open) {
            setPendingChanges({});
            setBulkDorm('');
            setBulkTarget('');
            setAddPickerOpen(false);
            setAddSelection({});
        }
    }, [open, housekeeper?.id]);

    useEffect(() => {
        if (!open) return;
        function onKey(e) {
            if (e.key === 'Escape') onClose?.();
        }
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    const myTasks = useMemo(() => {
        if (!housekeeper) return [];
        return allTasks
            .filter((t) => t.housekeeperId === housekeeper.id || pendingChanges[t.id] === housekeeper.id)
            .filter((t) => pendingChanges[t.id] !== undefined ? pendingChanges[t.id] === housekeeper.id : true);
    }, [allTasks, housekeeper, pendingChanges]);

    // Tasks the supervisor pulled in *from* somewhere else (orig HK != this HK, new = this HK).
    const incomingTasks = useMemo(() => {
        if (!housekeeper) return [];
        return allTasks.filter(
            (t) => t.housekeeperId !== housekeeper.id && pendingChanges[t.id] === housekeeper.id,
        );
    }, [allTasks, housekeeper, pendingChanges]);

    const unassignedTasks = useMemo(
        () =>
            allTasks
                .filter((t) => t.housekeeperId === null || t.housekeeperId === undefined)
                .filter((t) => pendingChanges[t.id] === undefined),
        [allTasks, pendingChanges],
    );

    // Live recompute of totals based on the current pending state.
    const liveTotals = useMemo(() => {
        if (!housekeeper) return { rooms: 0, checkouts: 0, points: 0, minutes: 0, dorms: [] };
        const rows = myTasks.concat(incomingTasks);
        // De-dupe (incoming might overlap with myTasks if someone toggled back)
        const seen = new Set();
        const unique = rows.filter((t) => (seen.has(t.id) ? false : seen.add(t.id)));
        let rooms = 0, checkouts = 0, points = 0, minutes = 0;
        const dormSet = new Set();
        for (const t of unique) {
            rooms++;
            if (/check.?out/i.test(t.taskType)) checkouts++;
            points += Number(t.points) || 0;
            minutes += Number(t.minutes) || 0;
            if (t.dorm) dormSet.add(t.dorm);
        }
        return { rooms, checkouts, points, minutes, dorms: [...dormSet].sort() };
    }, [myTasks, incomingTasks, housekeeper]);

    const myDorms = useMemo(() => {
        const set = new Set();
        for (const t of myTasks) if (t.dorm) set.add(t.dorm);
        return [...set].sort();
    }, [myTasks]);

    const otherHousekeepers = useMemo(
        () => allHousekeepers.filter((h) => h.id !== housekeeper?.id),
        [allHousekeepers, housekeeper],
    );

    const overload = !!(
        housekeeper && (
            liveTotals.rooms > housekeeper.maxRooms ||
            liveTotals.checkouts > housekeeper.maxCheckouts ||
            liveTotals.points > housekeeper.maxPoints
        )
    );

    const changesArray = useMemo(
        () => Object.entries(pendingChanges).map(([taskId, hkId]) => ({
            taskId: Number(taskId),
            housekeeperId: hkId === null ? null : Number(hkId),
        })),
        [pendingChanges],
    );

    function changeTask(taskId, newHkId) {
        setPendingChanges((cur) => {
            const next = { ...cur };
            const origTask = allTasks.find((t) => t.id === taskId);
            // If the new value equals the task's *original* assignment, drop the change (clean state).
            if (origTask && origTask.housekeeperId === newHkId) {
                delete next[taskId];
            } else {
                next[taskId] = newHkId;
            }
            return next;
        });
    }

    function undoChange(taskId) {
        setPendingChanges((cur) => {
            const next = { ...cur };
            delete next[taskId];
            return next;
        });
    }

    function undoAllChanges() {
        setPendingChanges({});
    }

    // Joined list of pending changes with task + housekeeper-name lookups — used to render
    // the "Pending changes" section so the user can review/redirect/undo each one even after
    // the affected room has been moved out of this HK's "Assigned rooms" view.
    const pendingChangesDetail = useMemo(() => {
        const hkName = (id) => {
            if (id == null) return 'Unassigned';
            return allHousekeepers.find((h) => h.id === id)?.name ?? `HK#${id}`;
        };
        return Object.entries(pendingChanges)
            .map(([taskIdStr, newHkId]) => {
                const taskId = Number(taskIdStr);
                const task = allTasks.find((t) => t.id === taskId);
                if (!task) return null;
                return {
                    taskId,
                    task,
                    originalHkId: task.housekeeperId,
                    originalName: hkName(task.housekeeperId),
                    newHkId,
                    newName: hkName(newHkId),
                };
            })
            .filter(Boolean)
            .sort((a, b) => {
                const d = String(a.task.dorm ?? '').localeCompare(String(b.task.dorm ?? ''));
                if (d !== 0) return d;
                return String(a.task.room ?? '').localeCompare(String(b.task.room ?? ''));
            });
    }, [pendingChanges, allTasks, allHousekeepers]);

    function applyBulkMove() {
        if (!bulkDorm || !bulkTarget) return;
        const targetId = bulkTarget === 'unassigned' ? null : Number(bulkTarget);
        const affected = myTasks.filter((t) => t.dorm === bulkDorm && !t.locked);
        if (affected.length === 0) return;
        setPendingChanges((cur) => {
            const next = { ...cur };
            for (const t of affected) {
                if (t.housekeeperId === targetId) {
                    delete next[t.id];
                } else {
                    next[t.id] = targetId;
                }
            }
            return next;
        });
        setBulkDorm('');
        setBulkTarget('');
    }

    function addSelectedToMe() {
        if (!housekeeper) return;
        const taskIds = Object.entries(addSelection).filter(([, v]) => v).map(([k]) => Number(k));
        if (taskIds.length === 0) return;
        setPendingChanges((cur) => {
            const next = { ...cur };
            for (const id of taskIds) next[id] = housekeeper.id;
            return next;
        });
        setAddSelection({});
        setAddPickerOpen(false);
    }

    function handleSave() {
        if (changesArray.length === 0) {
            onClose?.();
            return;
        }
        onSave?.(changesArray);
    }

    if (!open || !housekeeper) return null;

    const limitClass = (current, max) => (current > max ? 'text-red-600' : current === max ? 'text-orange-500' : 'text-slate-700');

    return (
        <div
            className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/40 p-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        >
            <div className="flex max-h-[90vh] w-full max-w-[960px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-lx-line px-6 py-4">
                    <div>
                        <h3 className="text-lg font-black text-lx-navy">Edit Assignment — {housekeeper.name}</h3>
                        <p className="text-xs text-slate-500">
                            {housekeeper.shift || 'Day Shift'}
                            {housekeeper.primaryDorm ? ` · Primary dorm ${housekeeper.primaryDorm}` : ''}
                            {housekeeper.skill ? ` · ${housekeeper.skill}` : ''}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Live totals */}
                <div className={`border-b border-lx-line px-6 py-3 ${overload ? 'bg-red-50' : 'bg-[#fbfdff]'}`}>
                    <div className="grid grid-cols-5 gap-3 text-xs">
                        {[
                            ['Rooms', liveTotals.rooms, housekeeper.maxRooms],
                            ['Check-outs', liveTotals.checkouts, housekeeper.maxCheckouts],
                            ['Points', liveTotals.points.toFixed(1), housekeeper.maxPoints],
                            ['Minutes', liveTotals.minutes, null],
                            ['Dorms', liveTotals.dorms.join(', ') || '—', null],
                        ].map(([label, value, max]) => (
                            <div key={label}>
                                <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
                                <div className={`text-base font-black ${typeof value === 'number' && max ? limitClass(value, max) : 'text-slate-700'}`}>
                                    {value}{max != null ? <span className="ml-1 text-[11px] font-bold text-slate-400">/ {max}</span> : null}
                                </div>
                            </div>
                        ))}
                    </div>
                    {overload && (
                        <div className="mt-2 text-xs font-bold text-red-600">
                            ⚠ Workload exceeds this housekeeper's limits. You can still save (will be flagged Overload).
                        </div>
                    )}
                </div>

                {/* Body — scrollable */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {/* Pending changes (review + redirect + undo).
                        Only appears once the supervisor has staged at least one change.
                        Shows every change — including rooms that have been moved AWAY from this
                        housekeeper and therefore no longer appear in the "Assigned rooms" table. */}
                    {pendingChangesDetail.length > 0 && (
                        <section className="mb-5 rounded-xl border border-blue-200 bg-blue-50/60 p-3">
                            <div className="mb-2 flex items-center justify-between">
                                <h4 className="text-xs font-black uppercase tracking-wide text-lx-blue">
                                    Pending changes ({pendingChangesDetail.length})
                                </h4>
                                <button
                                    type="button"
                                    onClick={undoAllChanges}
                                    className="text-[11px] font-bold text-slate-600 hover:text-red-600 hover:underline"
                                >
                                    Undo all
                                </button>
                            </div>
                            <div className="overflow-hidden rounded-lg border border-lx-border bg-white">
                                <table className="w-full border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 text-left text-[10px] font-black uppercase text-slate-500">
                                            <th className="border-b border-lx-line px-2 py-2">Room</th>
                                            <th className="border-b border-lx-line px-2 py-2">Dorm</th>
                                            <th className="border-b border-lx-line px-2 py-2">Task</th>
                                            <th className="border-b border-lx-line px-2 py-2">From</th>
                                            <th className="border-b border-lx-line px-2 py-2 w-[210px]">Reassign to</th>
                                            <th className="border-b border-lx-line px-2 py-2 w-[40px] text-center">Undo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingChangesDetail.map((c) => (
                                            <tr key={c.taskId}>
                                                <td className="border-b border-lx-line px-2 py-1.5 font-bold text-slate-800">{c.task.room}</td>
                                                <td className="border-b border-lx-line px-2 py-1.5 text-slate-700">{c.task.dorm}</td>
                                                <td className="border-b border-lx-line px-2 py-1.5 capitalize text-slate-600">{c.task.taskType}</td>
                                                <td className="border-b border-lx-line px-2 py-1.5 text-slate-600">
                                                    {c.originalName}
                                                    {c.originalHkId === housekeeper.id && (
                                                        <span className="ml-1 text-[10px] font-bold text-slate-400">(this HK)</span>
                                                    )}
                                                </td>
                                                <td className="border-b border-lx-line px-2 py-1.5">
                                                    <select
                                                        value={c.newHkId ?? ''}
                                                        onChange={(e) => {
                                                            const v = e.target.value;
                                                            changeTask(c.taskId, v === '' ? null : Number(v));
                                                        }}
                                                        className="w-full rounded-lg border border-lx-border bg-white px-2 py-1 text-xs"
                                                    >
                                                        <option value="">— Unassigned —</option>
                                                        {allHousekeepers.map((h) => (
                                                            <option key={h.id} value={h.id}>
                                                                {h.id === housekeeper.id ? `${h.name} (current)` : h.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="border-b border-lx-line px-2 py-1.5 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => undoChange(c.taskId)}
                                                        title="Undo this change"
                                                        className="rounded px-1.5 text-base leading-none text-slate-400 hover:bg-red-50 hover:text-red-600"
                                                    >
                                                        ✕
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="mt-2 text-[11px] text-slate-500">
                                Tip: use the dropdown to redirect a change without reopening the source modal.
                                Changes commit only when you click <span className="font-bold text-slate-700">Save</span>.
                            </p>
                        </section>
                    )}

                    {/* Bulk move */}
                    {myDorms.length > 0 && (
                        <section className="mb-5 rounded-xl border border-lx-border bg-[#fbfdff] p-3">
                            <h4 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-600">Bulk move by dorm</h4>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-bold text-slate-600">Move all rooms in dorm</span>
                                <select
                                    value={bulkDorm}
                                    onChange={(e) => setBulkDorm(e.target.value)}
                                    className="rounded-lg border border-lx-border bg-white px-2 py-1.5 text-xs font-bold"
                                >
                                    <option value="">Select dorm…</option>
                                    {myDorms.map((d) => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <span className="font-bold text-slate-600">to</span>
                                <select
                                    value={bulkTarget}
                                    onChange={(e) => setBulkTarget(e.target.value)}
                                    className="rounded-lg border border-lx-border bg-white px-2 py-1.5 text-xs font-bold"
                                >
                                    <option value="">Select housekeeper…</option>
                                    {otherHousekeepers.map((h) => <option key={h.id} value={h.id}>{h.name}{h.primaryDorm ? ` (${h.primaryDorm})` : ''}</option>)}
                                    <option value="unassigned">— Unassign —</option>
                                </select>
                                <button
                                    type="button"
                                    disabled={!bulkDorm || !bulkTarget}
                                    onClick={applyBulkMove}
                                    className="rounded-lg bg-lx-blue px-3 py-1.5 text-xs font-black text-white disabled:bg-slate-300"
                                >
                                    Apply move
                                </button>
                            </div>
                        </section>
                    )}

                    {/* Room list */}
                    <h4 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-600">
                        Assigned rooms ({myTasks.length + incomingTasks.length})
                    </h4>
                    <div className="overflow-hidden rounded-xl border border-lx-border">
                        <table className="w-full border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 text-left text-[10px] font-black uppercase text-slate-500">
                                    <th className="border-b border-lx-line px-2 py-2">Room</th>
                                    <th className="border-b border-lx-line px-2 py-2">Dorm</th>
                                    <th className="border-b border-lx-line px-2 py-2">Task</th>
                                    <th className="border-b border-lx-line px-2 py-2">Priority</th>
                                    <th className="border-b border-lx-line px-2 py-2 text-right">Pts</th>
                                    <th className="border-b border-lx-line px-2 py-2 text-right">Min</th>
                                    <th className="border-b border-lx-line px-2 py-2">Required By</th>
                                    <th className="border-b border-lx-line px-2 py-2 w-[210px]">Reassign to</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...myTasks, ...incomingTasks].length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-3 py-4 text-center text-slate-500">
                                            {pendingChangesDetail.length > 0
                                                ? `No rooms currently assigned to ${housekeeper.name}. See Pending changes above to review or undo.`
                                                : 'No rooms assigned.'}
                                        </td>
                                    </tr>
                                )}
                                {[...myTasks, ...incomingTasks].map((t) => {
                                    const current = pendingChanges[t.id] !== undefined ? pendingChanges[t.id] : t.housekeeperId;
                                    const changed = pendingChanges[t.id] !== undefined;
                                    return (
                                        <tr key={t.id} className={changed ? 'bg-blue-50/60' : ''}>
                                            <td className="border-b border-lx-line px-2 py-1.5 font-bold text-slate-800">{t.room}</td>
                                            <td className="border-b border-lx-line px-2 py-1.5 text-slate-700">{t.dorm}</td>
                                            <td className="border-b border-lx-line px-2 py-1.5 capitalize text-slate-700">{t.taskType}</td>
                                            <td className="border-b border-lx-line px-2 py-1.5">{t.priority}</td>
                                            <td className="border-b border-lx-line px-2 py-1.5 text-right">{t.points}</td>
                                            <td className="border-b border-lx-line px-2 py-1.5 text-right">{t.minutes}</td>
                                            <td className="border-b border-lx-line px-2 py-1.5 text-slate-700">{t.requiredBy}</td>
                                            <td className="border-b border-lx-line px-2 py-1.5">
                                                {t.locked ? (
                                                    <span className="text-[11px] font-bold text-slate-400">Locked ({t.status})</span>
                                                ) : (
                                                    <select
                                                        value={current ?? ''}
                                                        onChange={(e) => {
                                                            const v = e.target.value;
                                                            changeTask(t.id, v === '' ? null : Number(v));
                                                        }}
                                                        className="w-full rounded-lg border border-lx-border bg-white px-2 py-1 text-xs"
                                                    >
                                                        <option value="">— Unassigned —</option>
                                                        {allHousekeepers.map((h) => (
                                                            <option key={h.id} value={h.id}>
                                                                {h.id === housekeeper.id ? `${h.name} (current)` : h.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Add unassigned */}
                    {unassignedTasks.length > 0 && (
                        <section className="mt-5">
                            <button
                                type="button"
                                onClick={() => setAddPickerOpen((o) => !o)}
                                className="text-xs font-black text-lx-blue hover:underline"
                            >
                                {addPickerOpen ? '▾' : '▸'} Add unassigned tasks to {housekeeper.name} ({unassignedTasks.length} available)
                            </button>
                            {addPickerOpen && (
                                <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-lx-border">
                                    <table className="w-full border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 text-left text-[10px] font-black uppercase text-slate-500">
                                                <th className="border-b border-lx-line px-2 py-2 w-8"></th>
                                                <th className="border-b border-lx-line px-2 py-2">Room</th>
                                                <th className="border-b border-lx-line px-2 py-2">Dorm</th>
                                                <th className="border-b border-lx-line px-2 py-2">Task</th>
                                                <th className="border-b border-lx-line px-2 py-2">Priority</th>
                                                <th className="border-b border-lx-line px-2 py-2 text-right">Pts</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {unassignedTasks.map((t) => (
                                                <tr key={t.id}>
                                                    <td className="border-b border-lx-line px-2 py-1.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!addSelection[t.id]}
                                                            onChange={(e) => setAddSelection((s) => ({ ...s, [t.id]: e.target.checked }))}
                                                        />
                                                    </td>
                                                    <td className="border-b border-lx-line px-2 py-1.5 font-bold">{t.room}</td>
                                                    <td className="border-b border-lx-line px-2 py-1.5">{t.dorm}</td>
                                                    <td className="border-b border-lx-line px-2 py-1.5 capitalize">{t.taskType}</td>
                                                    <td className="border-b border-lx-line px-2 py-1.5">{t.priority}</td>
                                                    <td className="border-b border-lx-line px-2 py-1.5 text-right">{t.points}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="flex justify-end gap-2 border-t border-lx-line bg-slate-50 px-3 py-2">
                                        <button
                                            type="button"
                                            onClick={() => setAddSelection({})}
                                            className="rounded-lg border border-lx-border bg-white px-3 py-1.5 text-xs font-bold text-slate-600"
                                        >
                                            Clear
                                        </button>
                                        <button
                                            type="button"
                                            onClick={addSelectedToMe}
                                            disabled={Object.values(addSelection).every((v) => !v)}
                                            className="rounded-lg bg-lx-blue px-3 py-1.5 text-xs font-black text-white disabled:bg-slate-300"
                                        >
                                            Add to {housekeeper.name}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </section>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 border-t border-lx-line bg-slate-50 px-6 py-3">
                    <div className="text-xs text-slate-500">
                        {changesArray.length === 0
                            ? 'No changes yet.'
                            : `${changesArray.length} pending change${changesArray.length === 1 ? '' : 's'}.`}
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-[10px] border border-lx-border bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving || changesArray.length === 0}
                            className="rounded-[10px] bg-lx-blue px-4 py-2 text-xs font-black text-white disabled:bg-slate-300"
                        >
                            {isSaving ? 'Saving…' : `Save ${changesArray.length || ''} change${changesArray.length === 1 ? '' : 's'}`.trim()}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
