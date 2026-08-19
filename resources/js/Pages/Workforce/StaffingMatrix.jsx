import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    Copy,
    History,
    Info,
    Lock,
    LockOpen,
    Pencil,
    Plus,
    Save,
    ShieldAlert,
    Star,
    Trash2,
    Upload,
} from 'lucide-react';

import WorkforceLayout from '../../Layouts/WorkforceLayout';
import {
    DepartmentIcon,
    OccupancyForecastChart,
    StaffingForecastChart,
    TopShortagesList,
    cn,
} from '../../Components/Workforce/WorkforceWidgets';
import {
    LockMatrixModal,
    PublishMatrixModal,
    RequestUnlockModal,
    UnlockMatrixModal,
} from '../../Components/Workforce/StaffingMatrixModals';
import { DEPARTMENTS, TOP_SHORTAGES, staffingGapsFromRequirements } from '../../data/workforceSeed';
import {
    CHANGE_REQUESTS,
    CURRENT_OCCUPANCY,
    INITIAL_AUDIT,
    INITIAL_LOCK,
    LODGES,
    MATRIX_META,
    OCCUPANCY_LEVELS,
    PUBLISHED_MATRIX,
    SHIFT_DEFINITIONS,
    TEMPORARY_OVERRIDES,
    VERSION_HISTORY,
    changedCells,
    cloneMatrix,
    departmentTheme,
    departmentTotalAt,
    emptyRequirements,
    matrixTotalAt,
    resolveOccupancyLevel,
} from '../../data/staffingMatrixSeed';

const TABS = [
    { key: 'editor', label: 'Matrix Editor' },
    { key: 'departments', label: 'Departments & Positions' },
    { key: 'shifts', label: 'Shift Definitions' },
    { key: 'critical', label: 'Critical Positions' },
    { key: 'history', label: 'History' },
    { key: 'overrides', label: 'Overrides' },
    { key: 'requests', label: 'Change Requests' },
    { key: 'audit', label: 'Audit' },
];

const SHIFT_OPTIONS = SHIFT_DEFINITIONS.map((shift) => shift.name);
const TYPE_OPTIONS = [
    { value: 'ratio', label: 'Ratio' },
    { value: 'fixed', label: 'Fixed' },
];

const emptyUnlock = { reason: '', whoMayEdit: 'Head Office only', starts: 'Immediately', relock: 'Relock in 48 hours', notify: 'Lodge Manager' };
const emptyLock = { reason: '', draftHandling: 'preserve', notify: 'Lodge Manager' };
const emptyRequest = { reasonCode: 'Occupancy pattern changed', description: '', completionDate: '2026-08-20' };
const emptyPublish = { summary: '', effectiveDate: '2026-09-01', when: 'schedule', relock: true };

function nowStamp() {
    return 'Aug 16, 2026 9:12 PM';
}

function nextAuditId(log) {
    return `AUD-${300 + log.length + 1}`;
}

export default function StaffingMatrix() {
    const [role, setRole] = useState('head-office');
    const [lodgeId, setLodgeId] = useState(MATRIX_META.lodgeId);
    const [tab, setTab] = useState('editor');
    const [lock, setLock] = useState(INITIAL_LOCK);
    const [meta, setMeta] = useState(MATRIX_META);
    const [published, setPublished] = useState(() => cloneMatrix(PUBLISHED_MATRIX));
    const [draft, setDraft] = useState(() => cloneMatrix(PUBLISHED_MATRIX));
    const [draftStatus, setDraftStatus] = useState(null);
    const [dirty, setDirty] = useState(false);
    const [audit, setAudit] = useState(INITIAL_AUDIT);
    const [requests, setRequests] = useState(CHANGE_REQUESTS);
    const [history, setHistory] = useState(VERSION_HISTORY);
    const [toast, setToast] = useState('');
    const [validation, setValidation] = useState(null);
    const [modal, setModal] = useState(null);
    const [unlockForm, setUnlockForm] = useState(emptyUnlock);
    const [lockForm, setLockForm] = useState(emptyLock);
    const [requestForm, setRequestForm] = useState(emptyRequest);
    const [publishForm, setPublishForm] = useState(emptyPublish);
    const [addingDepartment, setAddingDepartment] = useState(false);
    const [newDepartment, setNewDepartment] = useState({ name: '', code: '' });
    const [editingPositionId, setEditingPositionId] = useState(null);

    const isHeadOffice = role === 'head-office';
    const canEdit = !lock.isLocked && (isHeadOffice || lock.whoMayEdit !== 'Head Office only');
    const activeLevel = resolveOccupancyLevel(CURRENT_OCCUPANCY);
    const activeIndex = OCCUPANCY_LEVELS.indexOf(activeLevel);
    const changes = useMemo(() => changedCells(published, draft), [published, draft]);
    const publishedRequired = matrixTotalAt(published, activeIndex);
    const draftRequired = matrixTotalAt(draft, activeIndex);

    function flash(message) {
        setToast(message);
        window.clearTimeout(flash._timer);
        flash._timer = window.setTimeout(() => setToast(''), 2400);
    }

    function record(action, reason, user = isHeadOffice ? 'Ralph Jones' : 'Elena Rossi') {
        setAudit((current) => [
            {
                id: nextAuditId(current),
                action,
                user,
                role: isHeadOffice ? 'Head Office Admin' : 'Lodge Manager',
                at: nowStamp(),
                reason,
            },
            ...current,
        ]);
    }

    useEffect(() => {
        function onLeave(event) {
            if (!dirty) return;
            event.preventDefault();
            event.returnValue = '';
        }
        window.addEventListener('beforeunload', onLeave);
        return () => window.removeEventListener('beforeunload', onLeave);
    }, [dirty]);

    function updateRequirement(departmentId, positionId, levelIndex, raw) {
        const nextValue = Number.parseInt(raw, 10);
        if (Number.isNaN(nextValue) || nextValue < 0) return;
        setDraft((current) =>
            current.map((department) =>
                department.id !== departmentId
                    ? department
                    : {
                          ...department,
                          positions: department.positions.map((position) =>
                              position.id !== positionId
                                  ? position
                                  : {
                                        ...position,
                                        requirements: position.requirements.map((value, index) =>
                                            index === levelIndex ? nextValue : value,
                                        ),
                                    },
                          ),
                      },
            ),
        );
        setDirty(true);
        setDraftStatus('unsaved');
        setValidation(null);
    }

    function markDraftDirty() {
        setDirty(true);
        setDraftStatus('unsaved');
        setValidation(null);
    }

    function updatePositionMeta(departmentId, positionId, patch) {
        setDraft((current) =>
            current.map((department) =>
                department.id !== departmentId
                    ? department
                    : {
                          ...department,
                          positions: department.positions.map((position) =>
                              position.id !== positionId ? position : { ...position, ...patch },
                          ),
                      },
            ),
        );
        markDraftDirty();
    }

    function duplicatePosition(departmentId, positionId) {
        setDraft((current) =>
            current.map((department) => {
                if (department.id !== departmentId) return department;
                const source = department.positions.find((position) => position.id === positionId);
                if (!source) return department;
                const copy = {
                    ...source,
                    id: `${source.id}-copy-${Date.now()}`,
                    name: `${source.name} (copy)`,
                    code: source.code ? `${source.code}-C` : '',
                    requirements: [...source.requirements],
                };
                const index = department.positions.findIndex((position) => position.id === positionId);
                const positions = [...department.positions];
                positions.splice(index + 1, 0, copy);
                return { ...department, positions };
            }),
        );
        markDraftDirty();
        flash('Position duplicated in the draft');
    }

    function deletePosition(departmentId, positionId) {
        setDraft((current) =>
            current.map((department) =>
                department.id !== departmentId
                    ? department
                    : {
                          ...department,
                          positions: department.positions.filter((position) => position.id !== positionId),
                      },
            ),
        );
        markDraftDirty();
        flash('Position removed from the draft');
    }

    function addDepartment() {
        const name = newDepartment.name.trim();
        if (!name) return;
        const code = (newDepartment.code.trim() || name.slice(0, 3)).toUpperCase();
        setDraft((current) => [
            ...current,
            {
                id: `dept-${Date.now()}`,
                name,
                code,
                icon: 'desk',
                positions: [
                    {
                        id: `pos-${Date.now()}`,
                        name: 'New position',
                        code: `${code}-1`,
                        shift: 'Day',
                        type: 'ratio',
                        critical: false,
                        requirements: emptyRequirements(),
                    },
                ],
            },
        ]);
        setNewDepartment({ name: '', code: '' });
        setAddingDepartment(false);
        setTab('editor');
        markDraftDirty();
        flash(`${name} added to the draft matrix`);
    }

    function addPosition(departmentId) {
        setDraft((current) =>
            current.map((department) =>
                department.id !== departmentId
                    ? department
                    : {
                          ...department,
                          positions: [
                              ...department.positions,
                              {
                                  id: `pos-${Date.now()}`,
                                  name: 'New position',
                                  code: `${department.code || 'POS'}-${department.positions.length + 1}`,
                                  shift: 'Day',
                                  type: 'ratio',
                                  critical: false,
                                  requirements: emptyRequirements(),
                              },
                          ],
                      },
            ),
        );
        markDraftDirty();
        flash('Position added to the draft');
    }

    function saveDraft() {
        setDirty(false);
        setDraftStatus('saved');
        setMeta((current) => ({ ...current, lastModified: nowStamp() }));
        record('Draft saved', 'Draft updated without changing the published matrix.');
        flash('Draft saved. Live forecasts still use version ' + meta.version);
    }

    function validateDraft() {
        const errors = [];
        const warnings = [];
        draft.forEach((department) => {
            department.positions.forEach((position) => {
                if (!position.name || !position.shift) errors.push(`${position.code || 'Position'} is missing a name or shift.`);
                if (position.requirements.some((value) => value < 0)) errors.push(`${position.name} has a negative requirement.`);
                if (position.requirements.every((value) => value === 0)) warnings.push(`${position.name} has no occupancy requirements.`);
            });
        });
        if (changes.some((change) => change.next < change.previous - 2)) {
            warnings.push('One or more positions drop by more than two workers at an occupancy level.');
        }
        setValidation({ errors, warnings });
        record('Draft validated', errors.length ? 'Validation failed' : 'Validation passed');
        flash(errors.length ? 'Validation found errors' : 'Draft passed validation');
        return errors.length === 0;
    }

    function confirmUnlock() {
        setLock({
            isLocked: false,
            lockedBy: lock.lockedBy,
            lockedAt: lock.lockedAt,
            lockReason: lock.lockReason,
            unlockedBy: 'Ralph Jones',
            unlockedAt: nowStamp(),
            unlockReason: unlockForm.reason,
            whoMayEdit: unlockForm.whoMayEdit,
            relockAt: unlockForm.relock === 'Relock in 48 hours' ? 'Aug 18, 2026 9:12 PM' : null,
            draftOwner: unlockForm.whoMayEdit === 'Head Office only' ? 'Ralph Jones' : 'Elena Rossi',
        });
        setDraftStatus(draftStatus || 'open');
        record('Matrix unlocked', unlockForm.reason);
        setModal(null);
        setUnlockForm(emptyUnlock);
        flash('Matrix unlocked. Published version remains active.');
    }

    function confirmLock() {
        if (lockForm.draftHandling === 'discard') {
            setDraft(cloneMatrix(published));
            setDraftStatus(null);
            setDirty(false);
        } else if (lockForm.draftHandling === 'submit') {
            setDraftStatus('pending-review');
            setDirty(false);
        } else if (lockForm.draftHandling === 'publish') {
            publishDraft(true);
            return;
        } else {
            setDirty(false);
            if (changes.length) setDraftStatus('saved');
        }
        setLock({
            ...lock,
            isLocked: true,
            lockedBy: 'Ralph Jones',
            lockedAt: nowStamp(),
            lockReason: lockForm.reason,
        });
        record('Matrix locked', lockForm.reason);
        setModal(null);
        setLockForm(emptyLock);
        flash('Matrix locked by Head Office.');
    }

    function confirmRequest() {
        const number = `CR-${1042 + requests.length}`;
        setRequests((current) => [
            {
                number,
                requestedBy: 'Elena Rossi',
                date: 'Aug 16, 2026',
                priority: 'Medium',
                reason: requestForm.reasonCode,
                status: 'Submitted',
                description: requestForm.description,
            },
            ...current,
        ]);
        record('Unlock requested', requestForm.description, 'Elena Rossi');
        setModal(null);
        setRequestForm(emptyRequest);
        setTab('requests');
        flash(`${number} submitted to Head Office`);
    }

    function publishDraft(fromLock = false) {
        if (!validateDraft()) {
            setModal(null);
            return;
        }
        const nextVersion = (Number.parseFloat(meta.version) + 0.1).toFixed(1);
        setPublished(cloneMatrix(draft));
        setHistory((current) => [
            {
                version: nextVersion,
                status: publishForm.when === 'now' ? 'Active' : 'Scheduled',
                effectiveDate: publishForm.effectiveDate === '2026-09-01' ? 'Sep 1, 2026' : publishForm.effectiveDate,
                publishedBy: 'Ralph Jones',
                publishedAt: nowStamp(),
                summary: publishForm.summary,
            },
            ...current.map((row) => (row.status === 'Active' ? { ...row, status: 'Archived' } : row)),
        ]);
        setMeta((current) => ({
            ...current,
            version: nextVersion,
            lastPublished: nowStamp(),
            lastModified: nowStamp(),
            effectiveDate: publishForm.effectiveDate,
            publishedBy: 'Ralph Jones',
        }));
        setDraftStatus(null);
        setDirty(false);
        if (fromLock || publishForm.relock) {
            setLock({
                ...lock,
                isLocked: true,
                lockedBy: 'Ralph Jones',
                lockedAt: nowStamp(),
                lockReason: publishForm.summary || 'Published and relocked.',
            });
        }
        record(`Version ${nextVersion} published`, publishForm.summary);
        setModal(null);
        setPublishForm(emptyPublish);
        flash(`Version ${nextVersion} published. Live calculations switch on the effective date.`);
    }

    const statusBadge = lock.isLocked
        ? { label: 'LOCKED BY HEAD OFFICE', className: 'bg-slate-800 text-white', Icon: Lock }
        : draftStatus === 'pending-review'
          ? { label: 'PENDING HEAD OFFICE REVIEW', className: 'bg-violet-100 text-violet-800', Icon: ShieldAlert }
          : draftStatus === 'saved' || draftStatus === 'unsaved'
            ? { label: 'UNLOCKED — DRAFT CHANGES', className: 'bg-amber-100 text-amber-800', Icon: LockOpen }
            : { label: 'UNLOCKED — EDITING ALLOWED', className: 'bg-amber-100 text-amber-800', Icon: LockOpen };

    const toolbar = (
        <div className="flex flex-wrap items-center justify-end gap-2">
            <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="rounded-xl border-slate-200 text-xs font-bold text-slate-700 shadow-sm"
            >
                <option value="head-office">View as Head Office Admin</option>
                <option value="lodge">View as Lodge Manager</option>
            </select>
            <button
                type="button"
                onClick={() => flash('Matrix duplicated as a new draft')}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700"
            >
                <Copy className="h-4 w-4" />
                Duplicate Matrix
            </button>
            <button
                type="button"
                onClick={() => flash('Import is not connected in this demo')}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700"
            >
                <Upload className="h-4 w-4" />
                Import Matrix
            </button>
            <button
                type="button"
                onClick={saveDraft}
                disabled={!canEdit}
                className="inline-flex items-center gap-2 rounded-xl bg-lx-blue px-3 py-2 text-sm font-black text-white disabled:opacity-40"
            >
                <Save className="h-4 w-4" />
                Save Changes
            </button>
        </div>
    );

    return (
        <WorkforceLayout
            title="Staffing Matrix"
            subtitle="Configure staffing requirements by occupancy level, department, position and shift."
            activeHref="workforce.staffing-matrix"
            toolbar={toolbar}
        >
            <section className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={lodgeId}
                        onChange={(event) => setLodgeId(event.target.value)}
                        className="rounded-xl border-slate-200 text-sm font-bold text-slate-800 shadow-sm"
                    >
                        {LODGES.map((lodge) => (
                            <option key={lodge.id} value={lodge.id}>
                                {lodge.name}
                            </option>
                        ))}
                    </select>
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black', statusBadge.className)}>
                        <statusBadge.Icon className="h-3.5 w-3.5" />
                        {statusBadge.label}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                        Active v{meta.version}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                        Effective {meta.effectiveDate} · Last published {meta.lastPublished}
                    </span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {canEdit && (
                        <>
                            <button type="button" onClick={validateDraft} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700">
                                Validate
                            </button>
                            <button type="button" onClick={() => setModal('preview')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700">
                                Preview Impact
                            </button>
                            {isHeadOffice && (
                                <button type="button" onClick={() => setModal('publish')} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-black text-white">
                                    Publish
                                </button>
                            )}
                            {!isHeadOffice && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDraftStatus('pending-review');
                                        setDirty(false);
                                        record('Draft submitted for review', 'Lodge Manager submitted draft.', 'Elena Rossi');
                                        flash('Draft submitted for Head Office review');
                                    }}
                                    className="rounded-xl bg-lx-blue px-3 py-2 text-sm font-black text-white"
                                >
                                    Submit for Review
                                </button>
                            )}
                        </>
                    )}
                    {lock.isLocked && isHeadOffice && (
                        <button type="button" onClick={() => setModal('unlock')} className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-black text-white">
                            Unlock Matrix
                        </button>
                    )}
                    {lock.isLocked && !isHeadOffice && (
                        <button type="button" onClick={() => setModal('request')} className="rounded-xl bg-lx-blue px-3 py-2 text-sm font-black text-white">
                            Request Unlock
                        </button>
                    )}
                    {!lock.isLocked && isHeadOffice && (
                        <button type="button" onClick={() => setModal('lock')} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-black text-white">
                            Lock Matrix
                        </button>
                    )}
                </div>
            </section>

            {dirty && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
                    <span>Unsaved Changes — draft only. Live forecasts still use v{meta.version}.</span>
                    <button type="button" onClick={saveDraft} className="rounded-lg bg-white px-3 py-1.5 text-xs font-black text-lx-blue">
                        Save Changes
                    </button>
                </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_1.15fr_0.8fr]">
                <OccupancyForecastChart />
                <StaffingForecastChart points={staffingGapsFromRequirements(DEPARTMENTS)} />
                <TopShortagesList shortages={TOP_SHORTAGES} />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2 overflow-x-auto">
                    {TABS.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => setTab(item.key)}
                            className={cn(
                                'whitespace-nowrap rounded-xl px-3 py-2 text-sm font-black',
                                tab === item.key ? 'bg-lx-blue text-white' : 'border border-slate-200 bg-white text-slate-600',
                            )}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => {
                        setAddingDepartment(true);
                        setTab('departments');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-lx-blue px-3 py-2 text-sm font-black text-white disabled:opacity-40"
                >
                    <Plus className="h-4 w-4" />
                    Add Department
                </button>
            </div>

            {tab === 'editor' && (
                <>
                    {validation && (
                        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <h3 className="m-0 text-sm font-black text-slate-900">Validation</h3>
                            {validation.errors.map((item) => (
                                <p key={item} className="mt-2 m-0 text-sm font-semibold text-red-600">Error — {item}</p>
                            ))}
                            {validation.warnings.map((item) => (
                                <p key={item} className="mt-2 m-0 text-sm font-semibold text-amber-700">Warning — {item}</p>
                            ))}
                            {!validation.errors.length && !validation.warnings.length && (
                                <p className="mt-2 m-0 text-sm font-semibold text-emerald-700">No errors. Draft is ready to publish.</p>
                            )}
                        </section>
                    )}

                    {modal === 'preview' && (
                        <section className="mt-4 rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
                            <h3 className="m-0 text-sm font-black text-slate-900">Forecast impact at {CURRENT_OCCUPANCY} occupancy</h3>
                            <p className="mt-2 text-sm font-semibold text-slate-600">
                                Current required {publishedRequired} → proposed {draftRequired} ({draftRequired - publishedRequired >= 0 ? '+' : ''}
                                {draftRequired - publishedRequired}). Live calculations stay on v{meta.version} until publish.
                            </p>
                            <ul className="mt-3 list-none space-y-1 p-0 text-sm font-semibold text-slate-600">
                                {changes.slice(0, 8).map((change) => (
                                    <li key={`${change.position}-${change.level}`}>
                                        {change.department} / {change.position} @ {change.level}: {change.previous} → {change.next}
                                    </li>
                                ))}
                                {changes.length === 0 && <li>No quantity changes in the draft.</li>}
                            </ul>
                            <button type="button" onClick={() => setModal(null)} className="mt-3 text-sm font-black text-lx-blue">
                                Close preview
                            </button>
                        </section>
                    )}

                    <MatrixGrid
                        departments={draft}
                        canEdit={canEdit}
                        activeIndex={activeIndex}
                        editingPositionId={editingPositionId}
                        onChange={updateRequirement}
                        onMetaChange={updatePositionMeta}
                        onEdit={(positionId) => setEditingPositionId(positionId)}
                        onDuplicate={duplicatePosition}
                        onDelete={deletePosition}
                    />
                </>
            )}

            {tab === 'departments' && (
                <DepartmentsPanel
                    departments={draft}
                    canEdit={canEdit}
                    adding={addingDepartment}
                    newDepartment={newDepartment}
                    onNewChange={setNewDepartment}
                    onCancelAdd={() => setAddingDepartment(false)}
                    onAddDepartment={addDepartment}
                    onAddPosition={addPosition}
                    onStartAdd={() => setAddingDepartment(true)}
                />
            )}
            {tab === 'shifts' && <ShiftsPanel />}
            {tab === 'critical' && (
                <CriticalPanel
                    departments={draft}
                    canEdit={canEdit}
                    onToggle={(departmentId, positionId, critical) => updatePositionMeta(departmentId, positionId, { critical })}
                />
            )}
            {tab === 'history' && <HistoryPanel rows={history} />}
            {tab === 'overrides' && <OverridesPanel rows={TEMPORARY_OVERRIDES} />}
            {tab === 'requests' && <RequestsPanel rows={requests} />}
            {tab === 'audit' && <AuditPanel rows={audit} />}

            <UnlockMatrixModal
                show={modal === 'unlock'}
                form={unlockForm}
                onChange={(key, value) => setUnlockForm((current) => ({ ...current, [key]: value }))}
                onClose={() => setModal(null)}
                onConfirm={confirmUnlock}
            />
            <LockMatrixModal
                show={modal === 'lock'}
                form={lockForm}
                changeCount={changes.length}
                onChange={(key, value) => setLockForm((current) => ({ ...current, [key]: value }))}
                onClose={() => setModal(null)}
                onConfirm={confirmLock}
            />
            <RequestUnlockModal
                show={modal === 'request'}
                form={requestForm}
                onChange={(key, value) => setRequestForm((current) => ({ ...current, [key]: value }))}
                onClose={() => setModal(null)}
                onConfirm={confirmRequest}
            />
            <PublishMatrixModal
                show={modal === 'publish'}
                form={publishForm}
                impact={{ current: publishedRequired, next: draftRequired, delta: draftRequired - publishedRequired }}
                onChange={(key, value) => setPublishForm((current) => ({ ...current, [key]: value }))}
                onClose={() => setModal(null)}
                onConfirm={() => publishDraft(false)}
            />

            {toast && (
                <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-lx-toast">
                    {toast}
                </div>
            )}
        </WorkforceLayout>
    );
}

function typeInputClass(position) {
    if (position.critical) return 'border-blue-400 text-blue-800 ring-1 ring-blue-200';
    if (position.type === 'fixed') return 'border-violet-300 text-violet-800';
    return 'border-emerald-300 text-emerald-800';
}

function MatrixGrid({
    departments,
    canEdit,
    activeIndex,
    editingPositionId,
    onChange,
    onMetaChange,
    onEdit,
    onDuplicate,
    onDelete,
}) {
    return (
        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-[1180px] w-full border-collapse">
                    <thead>
                        <tr className="bg-[#f8fbff] text-[10px] font-black uppercase tracking-wide text-slate-500">
                            <th rowSpan={2} className="sticky left-0 z-10 border-b border-slate-200 bg-[#f8fbff] px-4 py-3 text-left">
                                Department
                            </th>
                            <th rowSpan={2} className="border-b border-slate-200 px-3 py-3 text-left">
                                Position
                            </th>
                            <th rowSpan={2} className="border-b border-slate-200 px-3 py-3 text-left">
                                Shift
                            </th>
                            <th rowSpan={2} className="border-b border-slate-200 px-3 py-3 text-left">
                                Type
                            </th>
                            <th
                                colSpan={OCCUPANCY_LEVELS.length}
                                className="border-b border-slate-200 px-3 py-2 text-center text-slate-600"
                            >
                                Positions Required by Occupancy Level
                            </th>
                            <th rowSpan={2} className="border-b border-slate-200 px-3 py-3 text-center">
                                Actions
                            </th>
                        </tr>
                        <tr className="bg-[#f8fbff] text-[10px] font-black uppercase tracking-wide text-slate-500">
                            {OCCUPANCY_LEVELS.map((level, index) => (
                                <th
                                    key={level}
                                    className={cn('border-b border-slate-200 px-2 py-2 text-center', index === activeIndex && 'bg-blue-100 text-lx-blue')}
                                >
                                    {level}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {departments.map((department) => (
                            <DepartmentBlock
                                key={department.id}
                                department={department}
                                canEdit={canEdit}
                                activeIndex={activeIndex}
                                editingPositionId={editingPositionId}
                                onChange={onChange}
                                onMetaChange={onMetaChange}
                                onEdit={onEdit}
                                onDuplicate={onDuplicate}
                                onDelete={onDelete}
                            />
                        ))}
                        <tr className="bg-[#e8f0ff] text-xs font-black text-lx-blue">
                            <td className="sticky left-0 z-10 bg-[#e8f0ff] px-4 py-3" colSpan={4}>
                                TOTAL ALL POSITIONS
                            </td>
                            {OCCUPANCY_LEVELS.map((level, index) => (
                                <td key={level} className={cn('px-2 py-3 text-center', index === activeIndex && 'bg-blue-100')}>
                                    {matrixTotalAt(departments, index)}
                                </td>
                            ))}
                            <td />
                        </tr>
                    </tbody>
                </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
                <p className="m-0 inline-flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                    <Info className="h-3.5 w-3.5 text-lx-blue" />
                    All quantities are editable. Changes will be applied to future forecasts and requirements.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-3.5 w-3.5 rounded border-2 border-emerald-400 bg-white" />
                        Ratio (Scales with occupancy)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-3.5 w-3.5 rounded border-2 border-violet-400 bg-white" />
                        Fixed (Always required)
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-3.5 w-3.5 rounded border-2 border-blue-400 bg-white" />
                        Critical Position
                    </span>
                </div>
            </div>
        </section>
    );
}

function DepartmentBlock({
    department,
    canEdit,
    activeIndex,
    editingPositionId,
    onChange,
    onMetaChange,
    onEdit,
    onDuplicate,
    onDelete,
}) {
    const theme = departmentTheme(department);
    const rowSpan = Math.max(department.positions.length, 1) + 1;

    return (
        <>
            {department.positions.map((position, positionIndex) => (
                <tr key={position.id} className="border-t border-slate-100 text-sm">
                    {positionIndex === 0 && (
                        <td rowSpan={rowSpan} className="sticky left-0 z-10 border-r border-slate-100 bg-white px-4 py-3 align-top">
                            <span className="inline-flex items-center gap-2 text-xs font-black text-slate-800">
                                <span className={cn('grid h-8 w-8 place-items-center rounded-lg', theme.iconClass)}>
                                    <DepartmentIcon icon={theme.icon} className="h-4 w-4" />
                                </span>
                                {department.name}
                            </span>
                        </td>
                    )}
                    <td className="px-3 py-2">
                        {editingPositionId === position.id && canEdit ? (
                            <input
                                value={position.name}
                                onChange={(event) => onMetaChange(department.id, position.id, { name: event.target.value })}
                                onBlur={() => onEdit(null)}
                                className="w-full rounded-lg border-slate-200 text-sm font-semibold"
                                autoFocus
                            />
                        ) : (
                            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                                {position.critical && <span className="h-2 w-2 rounded-full bg-blue-500" title="Critical position" />}
                                {position.name}
                                {position.excludedFromRatio ? '*' : ''}
                            </span>
                        )}
                    </td>
                    <td className="px-2 py-2">
                        <select
                            value={position.shift}
                            disabled={!canEdit}
                            onChange={(event) => onMetaChange(department.id, position.id, { shift: event.target.value })}
                            className="w-24 rounded-lg border-slate-200 py-1 text-xs font-bold text-slate-700 disabled:bg-slate-50"
                        >
                            {SHIFT_OPTIONS.map((shift) => (
                                <option key={shift}>{shift}</option>
                            ))}
                        </select>
                    </td>
                    <td className="px-2 py-2">
                        <select
                            value={position.type}
                            disabled={!canEdit}
                            onChange={(event) => onMetaChange(department.id, position.id, { type: event.target.value })}
                            className={cn(
                                'w-24 rounded-lg py-1 text-xs font-bold disabled:bg-slate-50',
                                position.type === 'fixed' ? 'border-violet-200 text-violet-700' : 'border-emerald-200 text-emerald-700',
                            )}
                        >
                            {TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </td>
                    {position.requirements.map((value, index) => (
                        <td key={`${position.id}-${index}`} className={cn('px-1.5 py-1.5 text-center', index === activeIndex && 'bg-blue-50')}>
                            {canEdit ? (
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={value}
                                    onChange={(event) => onChange(department.id, position.id, index, event.target.value)}
                                    className={cn('h-8 w-12 rounded-md border text-center text-sm font-bold', typeInputClass(position))}
                                />
                            ) : (
                                <span
                                    className={cn(
                                        'inline-flex h-8 w-12 items-center justify-center rounded-md border bg-white text-sm font-bold',
                                        typeInputClass(position),
                                    )}
                                    title="This field is controlled by Head Office and cannot be edited while the matrix is locked."
                                >
                                    {value}
                                </span>
                            )}
                        </td>
                    ))}
                    <td className="px-2 py-2">
                        <div className="flex items-center justify-center gap-1">
                            <IconAction
                                label="Edit position"
                                disabled={!canEdit}
                                onClick={() => onEdit(position.id)}
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </IconAction>
                            <IconAction
                                label="Duplicate position"
                                disabled={!canEdit}
                                onClick={() => onDuplicate(department.id, position.id)}
                            >
                                <Copy className="h-3.5 w-3.5" />
                            </IconAction>
                            <IconAction
                                label="Delete position"
                                disabled={!canEdit}
                                onClick={() => onDelete(department.id, position.id)}
                                danger
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </IconAction>
                        </div>
                    </td>
                </tr>
            ))}
            <tr className={cn('border-t border-slate-100 text-xs font-black', theme.totalClass)}>
                {department.positions.length === 0 && (
                    <td className="sticky left-0 z-10 bg-white px-4 py-3">
                        <span className="inline-flex items-center gap-2">
                            <span className={cn('grid h-8 w-8 place-items-center rounded-lg', theme.iconClass)}>
                                <DepartmentIcon icon={theme.icon} className="h-4 w-4" />
                            </span>
                            {department.name}
                        </span>
                    </td>
                )}
                <td className="px-3 py-2" colSpan={3}>
                    TOTAL {department.name.replace('Kitchen — ', '').toUpperCase()}
                </td>
                {OCCUPANCY_LEVELS.map((level, index) => (
                    <td key={level} className={cn('px-2 py-2 text-center', index === activeIndex && 'bg-blue-50')}>
                        {departmentTotalAt(department, index)}
                    </td>
                ))}
                <td />
            </tr>
        </>
    );
}

function IconAction({ label, disabled, onClick, danger = false, children }) {
    return (
        <button
            type="button"
            title={label}
            disabled={disabled}
            onClick={onClick}
            className={cn(
                'rounded-md p-1.5 disabled:opacity-30',
                danger ? 'text-slate-400 hover:bg-red-50 hover:text-red-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700',
            )}
        >
            {children}
        </button>
    );
}

function DepartmentsPanel({
    departments,
    canEdit,
    adding,
    newDepartment,
    onNewChange,
    onCancelAdd,
    onAddDepartment,
    onAddPosition,
    onStartAdd,
}) {
    return (
        <section className="mt-4 space-y-3">
            {adding && (
                <article className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm">
                    <h3 className="m-0 text-sm font-black text-slate-950">Add department</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px_auto]">
                        <input
                            value={newDepartment.name}
                            onChange={(event) => onNewChange({ ...newDepartment, name: event.target.value })}
                            placeholder="Department name"
                            className="rounded-xl border-slate-200 text-sm font-semibold"
                        />
                        <input
                            value={newDepartment.code}
                            onChange={(event) => onNewChange({ ...newDepartment, code: event.target.value })}
                            placeholder="Code"
                            className="rounded-xl border-slate-200 text-sm font-semibold uppercase"
                        />
                        <div className="flex gap-2">
                            <button type="button" onClick={onCancelAdd} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-600">
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onAddDepartment}
                                disabled={!newDepartment.name.trim()}
                                className="rounded-xl bg-lx-blue px-3 py-2 text-sm font-black text-white disabled:opacity-40"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </article>
            )}
            {departments.map((department) => {
                const theme = departmentTheme(department);
                return (
                    <article key={department.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className={cn('grid h-10 w-10 place-items-center rounded-xl', theme.iconClass)}>
                                    <DepartmentIcon icon={theme.icon} className="h-5 w-5" />
                                </span>
                                <div>
                                    <p className="m-0 text-sm font-black text-slate-900">{department.name}</p>
                                    <p className="m-0 text-xs font-bold text-slate-400">{department.code} · {department.positions.length} positions</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                disabled={!canEdit}
                                onClick={() => onAddPosition(department.id)}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 disabled:opacity-40"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add position
                            </button>
                        </div>
                        <ul className="mt-3 flex flex-wrap gap-2 p-0">
                            {department.positions.map((position) => (
                                <li
                                    key={position.id}
                                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700"
                                >
                                    {position.critical && <Star className="h-3 w-3 text-blue-500" />}
                                    {position.name}
                                    <span className="font-semibold text-slate-400">{position.shift} · {position.type}</span>
                                </li>
                            ))}
                        </ul>
                    </article>
                );
            })}
            {!adding && canEdit && (
                <button
                    type="button"
                    onClick={onStartAdd}
                    className="w-full rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm font-black text-slate-500 hover:border-blue-300 hover:text-lx-blue"
                >
                    + Add another department
                </button>
            )}
        </section>
    );
}

function ShiftsPanel() {
    return (
        <section className="mt-4 grid gap-3 md:grid-cols-3">
            {SHIFT_DEFINITIONS.map((shift) => (
                <article key={shift.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="m-0 text-sm font-black text-slate-950">{shift.name} shift</p>
                    <p className="mt-1 m-0 text-xs font-black uppercase tracking-wide text-lx-blue">{shift.window}</p>
                    <p className="mt-3 m-0 text-sm font-medium text-slate-500">{shift.description}</p>
                </article>
            ))}
        </section>
    );
}

function CriticalPanel({ departments, canEdit, onToggle }) {
    const rows = departments.flatMap((department) =>
        department.positions
            .filter((position) => position.critical)
            .map((position) => ({ department, position })),
    );

    return (
        <Panel title="Critical positions" icon={Star}>
            <p className="mb-3 text-sm font-medium text-slate-500">
                Critical roles stay visible in shortage alerts even when the rest of the department is covered.
            </p>
            <Table
                headers={['Department', 'Position', 'Shift', 'Type', 'Status']}
                rows={rows.map(({ department, position }) => [
                    department.name,
                    position.name,
                    position.shift,
                    position.type === 'fixed' ? 'Fixed' : 'Ratio',
                    canEdit ? (
                        <button
                            key={`${position.id}-toggle`}
                            type="button"
                            onClick={() => onToggle(department.id, position.id, false)}
                            className="text-xs font-black text-lx-blue"
                        >
                            Remove critical flag
                        </button>
                    ) : (
                        'Required'
                    ),
                ])}
            />
        </Panel>
    );
}

function HistoryPanel({ rows }) {
    return (
        <Panel title="Version history" icon={History}>
            <Table
                headers={['Version', 'Status', 'Effective date', 'Published by', 'Published at', 'Change summary']}
                rows={rows.map((row) => [row.version, row.status, row.effectiveDate, row.publishedBy, row.publishedAt, row.summary])}
            />
        </Panel>
    );
}

function OverridesPanel({ rows }) {
    return (
        <Panel title="Temporary overrides" icon={AlertTriangle}>
            <p className="mb-3 text-sm font-medium text-slate-500">
                Overrides do not change the base matrix. Forecasts show both the base requirement and the approved override.
            </p>
            <Table
                headers={['Position', 'Shift', 'Start', 'End', 'Base', 'Override', 'Reason', 'Status']}
                rows={rows.map((row) => [row.position, row.shift, row.start, row.end, row.base, row.override, row.reason, row.status])}
            />
        </Panel>
    );
}

function RequestsPanel({ rows }) {
    return (
        <Panel title="Change requests" icon={ShieldAlert}>
            <Table
                headers={['Request', 'Requested by', 'Date', 'Priority', 'Reason', 'Status', 'Description']}
                rows={rows.map((row) => [row.number, row.requestedBy, row.date, row.priority, row.reason, row.status, row.description])}
            />
        </Panel>
    );
}

function AuditPanel({ rows }) {
    return (
        <Panel title="Audit log" icon={History}>
            <Table
                headers={['Event', 'Action', 'User', 'Role', 'Date', 'Reason']}
                rows={rows.map((row) => [row.id, row.action, row.user, row.role, row.at, row.reason])}
            />
        </Panel>
    );
}

function Panel({ title, icon: Icon, children }) {
    return (
        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
                <Icon className="h-4 w-4 text-lx-blue" />
                <h2 className="m-0 text-base font-black text-slate-950">{title}</h2>
            </div>
            <div className="p-4">{children}</div>
        </section>
    );
}

function Table({ headers, rows }) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
                <thead>
                    <tr className="bg-[#f8fbff] text-[11px] font-black uppercase tracking-wide text-slate-500">
                        {headers.map((header) => (
                            <th key={header} className="px-3 py-2 text-left">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={index} className="border-t border-slate-100">
                            {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className="px-3 py-2 font-semibold text-slate-700">
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
