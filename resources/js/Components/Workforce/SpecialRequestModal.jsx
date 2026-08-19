import { useMemo, useState } from 'react';
import { Check, CloudUpload, Plus, Trash2, X } from 'lucide-react';

import Modal from '../Modal';
import { cn } from './WorkforceWidgets';
import {
    POSITION_OPTIONS,
    REASON_CATEGORIES,
    REQUEST_TYPES,
    SHORTAGE_PRIORITIES,
    SHORTAGE_SHIFTS,
    SHORTAGE_DEPARTMENTS,
} from '../../data/shortagesAlertsSeed';

const inputClass = 'w-full rounded-xl border-slate-200 text-sm font-semibold text-slate-800 shadow-sm';
const MAX_REASON = 500;
const MAX_FILES = 5;
const MAX_FILE_MB = 10;

const emptyPosition = () => ({
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    position: POSITION_OPTIONS[0],
    shift: 'Day',
    qty: 1,
});

const DEFAULT_FORM = {
    requestType: 'Additional Workers',
    priority: 'Critical',
    neededBy: '2026-08-16',
    shift: 'Day',
    department: 'Housekeeping',
    reasonCategory: 'High Occupancy / Turnover',
    positions: [
        { key: 'pos-1', position: 'Housekeepers', shift: 'Day', qty: 3 },
        { key: 'pos-2', position: 'Dishwashing', shift: 'Night', qty: 1 },
    ],
    reason: 'High occupancy this weekend with multiple check-outs and limited available staff.',
    impact: 'Rooms may not be ready on time, impacting guest satisfaction and online reviews.',
    notes: 'We are actively checking nearby lodges for possible transfers.',
};

function Field({ label, children }) {
    return (
        <label className="block min-w-0">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</span>
            {children}
        </label>
    );
}

function CharCount({ value, max }) {
    return (
        <span className="text-[11px] font-bold text-slate-400">
            {value.length}/{max}
        </span>
    );
}

function PriorityDot({ priority }) {
    const tone = {
        Critical: 'bg-red-500',
        High: 'bg-orange-500',
        Medium: 'bg-amber-400',
        Low: 'bg-emerald-500',
        Info: 'bg-blue-500',
    }[priority];

    return <span className={cn('inline-block h-2 w-2 rounded-full', tone)} />;
}

function ApprovalStep({ step, label, detail, state }) {
    const complete = state === 'complete';
    const current = state === 'current';

    return (
        <li className="relative flex gap-3 pb-5 last:pb-0">
            <span
                className={cn(
                    'relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-black',
                    complete && 'bg-lx-blue text-white',
                    current && 'bg-lx-blue text-white ring-4 ring-blue-100',
                    state === 'upcoming' && 'bg-slate-100 text-slate-400',
                )}
            >
                {complete ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : step}
            </span>
            <div className="min-w-0 pt-0.5">
                <p className={cn('m-0 text-sm font-black', current || complete ? 'text-slate-900' : 'text-slate-400')}>
                    {label}
                </p>
                <p className="m-0 mt-0.5 text-xs font-medium text-slate-500">{detail}</p>
            </div>
        </li>
    );
}

export default function SpecialRequestModal({ show, lodgeName, requestedBy, onClose, onSubmit, onSaveDraft }) {
    const [form, setForm] = useState(DEFAULT_FORM);
    const [files, setFiles] = useState([]);

    function setField(key, value) {
        setForm((current) => ({ ...current, [key]: value }));
    }

    function updatePosition(key, field, value) {
        setForm((current) => ({
            ...current,
            positions: current.positions.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
        }));
    }

    function removePosition(key) {
        setForm((current) => ({
            ...current,
            positions: current.positions.filter((row) => row.key !== key),
        }));
    }

    function addPosition() {
        setForm((current) => ({ ...current, positions: [...current.positions, emptyPosition()] }));
    }

    function resetAndClose() {
        setForm(DEFAULT_FORM);
        setFiles([]);
        onClose();
    }

    const canSubmit = useMemo(() => {
        const hasPositions = form.positions.some((row) => Number(row.qty) > 0);
        return hasPositions && form.reason.trim().length > 0 && form.impact.trim().length > 0 && form.neededBy;
    }, [form]);

    function handleFiles(list) {
        const incoming = Array.from(list || []).filter((file) => file.size <= MAX_FILE_MB * 1024 * 1024);
        setFiles((current) => [...current, ...incoming].slice(0, MAX_FILES));
    }

    function payload() {
        return {
            ...form,
            files: files.map((file) => file.name),
        };
    }

    return (
        <Modal show={show} maxWidth="6xl" onClose={resetAndClose}>
            <div className="flex max-h-[92vh] flex-col">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
                    <div>
                        <h2 className="m-0 text-xl font-black text-slate-950">New Special Request</h2>
                        <p className="mt-1 m-0 text-sm font-medium text-slate-500">
                            Submit a request for additional workers requiring Head Office approval.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={resetAndClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="space-y-5 px-4 py-4 sm:px-6 sm:py-5">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <Field label="Request Type">
                                <select value={form.requestType} onChange={(event) => setField('requestType', event.target.value)} className={inputClass}>
                                    {REQUEST_TYPES.map((option) => (
                                        <option key={option}>{option}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Priority">
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                                        <PriorityDot priority={form.priority} />
                                    </span>
                                    <select
                                        value={form.priority}
                                        onChange={(event) => setField('priority', event.target.value)}
                                        className={cn(inputClass, 'pl-8')}
                                    >
                                        {SHORTAGE_PRIORITIES.map((option) => (
                                            <option key={option}>{option}</option>
                                        ))}
                                    </select>
                                </div>
                            </Field>
                            <Field label="Needed By">
                                <input
                                    type="date"
                                    value={form.neededBy}
                                    onChange={(event) => setField('neededBy', event.target.value)}
                                    className={inputClass}
                                />
                            </Field>
                            <Field label="Shift">
                                <select value={form.shift} onChange={(event) => setField('shift', event.target.value)} className={inputClass}>
                                    {SHORTAGE_SHIFTS.map((option) => (
                                        <option key={option}>{option}</option>
                                    ))}
                                </select>
                            </Field>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Department">
                                <select value={form.department} onChange={(event) => setField('department', event.target.value)} className={inputClass}>
                                    {SHORTAGE_DEPARTMENTS.map((option) => (
                                        <option key={option}>{option}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Reason Category">
                                <select value={form.reasonCategory} onChange={(event) => setField('reasonCategory', event.target.value)} className={inputClass}>
                                    {REASON_CATEGORIES.map((option) => (
                                        <option key={option}>{option}</option>
                                    ))}
                                </select>
                            </Field>
                        </div>

                        <div>
                            <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-500">Positions Requested</p>
                            <div className="overflow-hidden rounded-xl border border-slate-200">
                                <div className="hidden grid-cols-[minmax(0,1.4fr)_110px_80px_44px] gap-2 bg-[#f8fbff] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-500 sm:grid">
                                    <span>Position</span>
                                    <span>Shift</span>
                                    <span>Qty</span>
                                    <span className="text-center">Actions</span>
                                </div>
                                {form.positions.map((row) => (
                                    <div
                                        key={row.key}
                                        className="grid grid-cols-1 gap-2 border-t border-slate-100 px-3 py-3 sm:grid-cols-[minmax(0,1.4fr)_110px_80px_44px] sm:items-center sm:py-2"
                                    >
                                        <select
                                            value={row.position}
                                            onChange={(event) => updatePosition(row.key, 'position', event.target.value)}
                                            className="rounded-lg border-slate-200 text-sm font-semibold text-slate-800"
                                        >
                                            {POSITION_OPTIONS.map((option) => (
                                                <option key={option}>{option}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={row.shift}
                                            onChange={(event) => updatePosition(row.key, 'shift', event.target.value)}
                                            className="rounded-lg border-slate-200 text-sm font-semibold text-slate-800"
                                        >
                                            {SHORTAGE_SHIFTS.map((option) => (
                                                <option key={option}>{option}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            min="1"
                                            value={row.qty}
                                            onChange={(event) => updatePosition(row.key, 'qty', Number.parseInt(event.target.value, 10) || 0)}
                                            className="rounded-lg border-slate-200 text-sm font-bold text-slate-800"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removePosition(row.key)}
                                            disabled={form.positions.length === 1}
                                            className="mx-auto grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                                            aria-label="Remove position"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={addPosition}
                                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-200 bg-blue-50/50 px-3 py-2.5 text-sm font-black text-lx-blue hover:bg-blue-50"
                            >
                                <Plus className="h-4 w-4" />
                                Add Position
                            </button>
                        </div>

                        <Field label="Operational Reason / Justification">
                            <textarea
                                value={form.reason}
                                maxLength={MAX_REASON}
                                rows={3}
                                onChange={(event) => setField('reason', event.target.value)}
                                className={inputClass}
                            />
                            <div className="mt-1 text-right">
                                <CharCount value={form.reason} max={MAX_REASON} />
                            </div>
                        </Field>
                        <Field label="Operational Impact if Unfilled">
                            <textarea
                                value={form.impact}
                                maxLength={MAX_REASON}
                                rows={3}
                                onChange={(event) => setField('impact', event.target.value)}
                                className={inputClass}
                            />
                            <div className="mt-1 text-right">
                                <CharCount value={form.impact} max={MAX_REASON} />
                            </div>
                        </Field>
                        <Field label="Notes for Head Office (Optional)">
                            <textarea
                                value={form.notes}
                                maxLength={MAX_REASON}
                                rows={2}
                                onChange={(event) => setField('notes', event.target.value)}
                                className={inputClass}
                            />
                            <div className="mt-1 text-right">
                                <CharCount value={form.notes} max={MAX_REASON} />
                            </div>
                        </Field>

                        <div>
                            <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-500">
                                Supporting Documents (Optional)
                            </p>
                            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-center hover:border-blue-300 hover:bg-blue-50/40">
                                <CloudUpload className="h-7 w-7 text-slate-400" />
                                <p className="mt-2 m-0 text-sm font-bold text-slate-600">
                                    Drag and drop files here, or click to browse.
                                </p>
                                <p className="mt-1 m-0 text-xs font-medium text-slate-400">
                                    PDF, JPG, PNG up to {MAX_FILE_MB}MB each (Max {MAX_FILES} files)
                                </p>
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    multiple
                                    className="hidden"
                                    onChange={(event) => {
                                        handleFiles(event.target.files);
                                        event.target.value = '';
                                    }}
                                />
                            </label>
                            {files.length > 0 && (
                                <ul className="mt-2 list-none space-y-1 p-0 text-xs font-semibold text-slate-600">
                                    {files.map((file) => (
                                        <li key={file.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                                            <span className="truncate">{file.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => setFiles((current) => current.filter((item) => item !== file))}
                                                className="text-slate-400 hover:text-red-600"
                                            >
                                                Remove
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <aside className="border-t border-slate-200 bg-[#f8fbff] px-5 py-5 lg:border-l lg:border-t-0">
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                            <p className="m-0 text-[11px] font-black uppercase tracking-wide text-amber-700">
                                Head Office Approval Status
                            </p>
                            <p className="mt-1 m-0 inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-800">
                                Approval Required
                            </p>
                        </div>

                        <dl className="mt-5 space-y-3 text-sm">
                            <div>
                                <dt className="text-[11px] font-black uppercase tracking-wide text-slate-400">Sent to</dt>
                                <dd className="m-0 mt-0.5 font-bold text-slate-800">Head Office Workforce Team</dd>
                            </div>
                            <div>
                                <dt className="text-[11px] font-black uppercase tracking-wide text-slate-400">Requested by</dt>
                                <dd className="m-0 mt-0.5 font-bold text-slate-800">{requestedBy}</dd>
                            </div>
                            <div>
                                <dt className="text-[11px] font-black uppercase tracking-wide text-slate-400">Lodge</dt>
                                <dd className="m-0 mt-0.5 font-bold text-slate-800">{lodgeName}</dd>
                            </div>
                            <div>
                                <dt className="text-[11px] font-black uppercase tracking-wide text-slate-400">Expected Response SLA</dt>
                                <dd className="m-0 mt-0.5 font-bold text-slate-800">
                                    Within 4 hours for Critical requests
                                </dd>
                            </div>
                        </dl>

                        <p className="mb-3 mt-6 text-[11px] font-black uppercase tracking-wide text-slate-400">Approval Flow</p>
                        <ol className="relative m-0 list-none p-0 before:absolute before:bottom-4 before:left-3.5 before:top-3.5 before:w-px before:bg-slate-200">
                            <ApprovalStep step={1} label="Submitted" detail="Your request is submitted." state="complete" />
                            <ApprovalStep step={2} label="Head Office Review" detail="Reviewing request and availability." state="current" />
                            <ApprovalStep step={3} label="Approved / Rejected" detail="Decision communicated." state="upcoming" />
                            <ApprovalStep step={4} label="Staffing Response" detail="Workers assigned and notified." state="upcoming" />
                        </ol>
                    </aside>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:px-6 sm:py-4">
                    <button type="button" onClick={resetAndClose} className="rounded-xl px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50 sm:py-2">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onSaveDraft?.(payload());
                            resetAndClose();
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 sm:py-2"
                    >
                        Save Draft
                    </button>
                    <button
                        type="button"
                        disabled={!canSubmit}
                        onClick={() => {
                            onSubmit?.(payload());
                            resetAndClose();
                        }}
                        className="rounded-xl bg-lx-blue px-4 py-2.5 text-sm font-black text-white disabled:opacity-40 sm:py-2"
                    >
                        Submit Request
                    </button>
                </div>
            </div>
        </Modal>
    );
}
