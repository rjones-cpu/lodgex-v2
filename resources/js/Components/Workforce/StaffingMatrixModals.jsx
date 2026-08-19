import Modal from '../Modal';

function Field({ label, children }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
            {children}
        </label>
    );
}

const inputClass = 'w-full rounded-xl border-slate-200 text-sm font-semibold text-slate-800 shadow-sm';

export function UnlockMatrixModal({ show, form, onChange, onClose, onConfirm }) {
    return (
        <Modal show={show} maxWidth="2xl" onClose={onClose}>
            <div className="p-6">
                <h2 className="m-0 text-lg font-black text-slate-950">Unlock Matrix</h2>
                <p className="mt-2 text-sm font-medium text-slate-500">
                    Unlocking the matrix allows authorized users to create or update a draft. The current published
                    matrix will continue to drive operational forecasts until a new version is published.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Field label="Reason for Unlocking">
                        <textarea
                            value={form.reason}
                            onChange={(event) => onChange('reason', event.target.value)}
                            rows={3}
                            className={inputClass}
                            placeholder="Why is editing being opened?"
                        />
                    </Field>
                    <div className="space-y-4">
                        <Field label="Who May Edit">
                            <select value={form.whoMayEdit} onChange={(event) => onChange('whoMayEdit', event.target.value)} className={inputClass}>
                                <option>Head Office only</option>
                                <option>Head Office and selected Lodge Managers</option>
                                <option>Selected users only</option>
                            </select>
                        </Field>
                        <Field label="Unlock Starts">
                            <select value={form.starts} onChange={(event) => onChange('starts', event.target.value)} className={inputClass}>
                                <option>Immediately</option>
                                <option>Scheduled date and time</option>
                            </select>
                        </Field>
                    </div>
                    <Field label="Automatic Relock">
                        <select value={form.relock} onChange={(event) => onChange('relock', event.target.value)} className={inputClass}>
                            <option>No automatic relock</option>
                            <option>Relock in 48 hours</option>
                            <option>Relock at a selected date and time</option>
                        </select>
                    </Field>
                    <Field label="Notification Recipients">
                        <select value={form.notify} onChange={(event) => onChange('notify', event.target.value)} className={inputClass}>
                            <option>Lodge Manager</option>
                            <option>Head Office workforce team</option>
                            <option>Selected users</option>
                        </select>
                    </Field>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={!form.reason.trim()}
                        className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-white disabled:opacity-40"
                    >
                        Unlock Matrix
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export function LockMatrixModal({ show, form, changeCount, onChange, onClose, onConfirm }) {
    return (
        <Modal show={show} maxWidth="2xl" onClose={onClose}>
            <div className="p-6">
                <h2 className="m-0 text-lg font-black text-slate-950">Lock Matrix</h2>
                <p className="mt-2 text-sm font-medium text-slate-500">
                    Locking the matrix will stop further edits. The current published version will continue to drive
                    staffing calculations. Unpublished changes will be handled according to the selected draft option.
                </p>
                {changeCount > 0 && (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
                        {changeCount} unpublished field change{changeCount === 1 ? '' : 's'} in the draft.
                    </p>
                )}
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Field label="Reason for Locking">
                        <textarea
                            value={form.reason}
                            onChange={(event) => onChange('reason', event.target.value)}
                            rows={3}
                            className={inputClass}
                            placeholder="Why is the matrix being locked?"
                        />
                    </Field>
                    <div className="space-y-4">
                        <Field label="Draft Handling">
                            <select value={form.draftHandling} onChange={(event) => onChange('draftHandling', event.target.value)} className={inputClass}>
                                <option value="preserve">Preserve draft for future review</option>
                                <option value="submit">Submit draft for Head Office review</option>
                                <option value="discard">Discard draft</option>
                                <option value="publish">Publish approved draft and lock</option>
                            </select>
                        </Field>
                        <Field label="Notification Recipients">
                            <select value={form.notify} onChange={(event) => onChange('notify', event.target.value)} className={inputClass}>
                                <option>Lodge Manager</option>
                                <option>Head Office workforce team</option>
                                <option>Selected users</option>
                            </select>
                        </Field>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={!form.reason.trim()}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white disabled:opacity-40"
                    >
                        Confirm Lock
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export function RequestUnlockModal({ show, form, onChange, onClose, onConfirm }) {
    return (
        <Modal show={show} maxWidth="lg" onClose={onClose}>
            <div className="p-6">
                <h2 className="m-0 text-lg font-black text-slate-950">Request Unlock</h2>
                <p className="mt-2 text-sm font-medium text-slate-500">
                    Head Office must approve this request before the matrix can be edited.
                </p>
                <div className="mt-5 space-y-4">
                    <Field label="Reason">
                        <select value={form.reasonCode} onChange={(event) => onChange('reasonCode', event.target.value)} className={inputClass}>
                            <option>Occupancy pattern changed</option>
                            <option>Operational model changed</option>
                            <option>New position required</option>
                            <option>Position no longer required</option>
                            <option>Shift coverage changed</option>
                            <option>Seasonal staffing change</option>
                            <option>Correction required</option>
                            <option>Other</option>
                        </select>
                    </Field>
                    <Field label="Describe the requested changes">
                        <textarea
                            value={form.description}
                            onChange={(event) => onChange('description', event.target.value)}
                            rows={4}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Requested completion date">
                        <input
                            type="date"
                            value={form.completionDate}
                            onChange={(event) => onChange('completionDate', event.target.value)}
                            className={inputClass}
                        />
                    </Field>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={!form.description.trim()}
                        className="rounded-xl bg-lx-blue px-4 py-2 text-sm font-black text-white disabled:opacity-40"
                    >
                        Submit Request
                    </button>
                </div>
            </div>
        </Modal>
    );
}

export function PublishMatrixModal({ show, form, impact, onChange, onClose, onConfirm }) {
    return (
        <Modal show={show} maxWidth="lg" onClose={onClose}>
            <div className="p-6">
                <h2 className="m-0 text-lg font-black text-slate-950">Publish Matrix</h2>
                <p className="mt-2 text-sm font-medium text-slate-500">
                    Publishing creates a new immutable version. The current published matrix stays active until the
                    effective date.
                </p>
                {impact != null && (
                    <p className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800">
                        At current occupancy, required headcount changes from {impact.current} to {impact.next} ({impact.delta >= 0 ? '+' : ''}
                        {impact.delta}).
                    </p>
                )}
                <div className="mt-5 space-y-4">
                    <Field label="Change summary">
                        <textarea
                            value={form.summary}
                            onChange={(event) => onChange('summary', event.target.value)}
                            rows={3}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Effective date">
                        <input
                            type="date"
                            value={form.effectiveDate}
                            onChange={(event) => onChange('effectiveDate', event.target.value)}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Publication">
                        <select value={form.when} onChange={(event) => onChange('when', event.target.value)} className={inputClass}>
                            <option value="now">Publish immediately</option>
                            <option value="schedule">Schedule publication</option>
                        </select>
                    </Field>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input
                            type="checkbox"
                            checked={form.relock}
                            onChange={(event) => onChange('relock', event.target.checked)}
                            className="rounded border-slate-300 text-lx-blue"
                        />
                        Relock automatically after publication
                    </label>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={!form.summary.trim()}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-40"
                    >
                        Confirm Publish
                    </button>
                </div>
            </div>
        </Modal>
    );
}
