import {
    AiPanel,
    AllotmentPanel,
    ApprovalsPanel,
    categoryLabel,
    ContractorOccupancyPanel,
    ForecastPanel,
    HousekeepingPanel,
    MaintenancePanel,
    OnHoldPanel,
    OverflowPanel,
    OverviewPanel,
    Pill,
    RecentAuditList,
    ReleasePanel,
    RISK_STYLES,
    StatusPanel,
    TopAiPreview,
} from '../Components/RoomUtilization/Panels';
import { UTILIZATION_TABS } from '../data/roomUtilizationSeed';
import AppLayout from '../Layouts/AppLayout';
import { AppPageBody, AppPageHeader, AppPageShell } from '../Components/AppPageShell';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

const PROGRESS_TONE = {
    green: 'bg-green-600',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
};

function getInitials(name) {
    if (!name) return 'JD';
    return (
        name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((n) => n[0]?.toUpperCase() || '')
            .join('') || 'JD'
    );
}

export default function RoomUtilizationManager({
    metrics = [],
    rooms: initialRooms = [],
    forecastDays = [],
    forecastOutlook = {},
    occupancyByDormForecast = [],
    occupancyByContractor = [],
    dormOccupancy = [],
    onHoldReview = [],
    releaseCandidates = [],
    overflowOptions = [],
    housekeepingPriority = [],
    maintenanceImpact = [],
    contractorAllotments = [],
    aiRecommendations = [],
    pendingApprovals = [],
    recentAudit = [],
    statusEngine = {},
    lastUpdated = '',
}) {
    const { auth, flash: sessionFlash } = usePage().props;
    const userName = auth?.user?.name || 'John Doe';
    const userInitials = getInitials(userName);

    const [activeTab, setActiveTab] = useState('overview');
    const [rooms] = useState(initialRooms);
    const [recommendations, setRecommendations] = useState(aiRecommendations);
    const [approvals, setApprovals] = useState(pendingApprovals);
    const [selectedRecId, setSelectedRecId] = useState(aiRecommendations[0]?.id ?? null);
    const [dailyReport, setDailyReport] = useState(null);
    const [statusFilter, setStatusFilter] = useState('All');
    const [dormFilter, setDormFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [toast, setToast] = useState('');
    const toastTimeoutRef = useRef(null);

    const statusOptions = useMemo(
        () => ['All', ...Array.from(new Set(rooms.map((r) => r.status)))],
        [rooms],
    );
    const dormOptions = useMemo(() => ['All', ...Array.from(new Set(rooms.map((r) => r.dorm)))], [rooms]);

    const filteredRooms = useMemo(() => {
        let rows = rooms;
        if (statusFilter !== 'All') rows = rows.filter((r) => r.status === statusFilter);
        if (dormFilter !== 'All') rows = rows.filter((r) => r.dorm === dormFilter);
        if (search) {
            const s = search.toLowerCase();
            rows = rows.filter((r) =>
                `${r.room} ${r.dorm} ${r.status} ${r.worker || ''} ${r.company || ''}`.toLowerCase().includes(s),
            );
        }
        return rows;
    }, [rooms, statusFilter, dormFilter, search]);

    const selectedRec = recommendations.find((r) => r.id === selectedRecId) || recommendations[0] || null;

    function flash(message) {
        setToast(message);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setToast(''), 2400);
    }

    function setTab(key) {
        setActiveTab(key);
        const label = UTILIZATION_TABS.find((t) => t.key === key)?.label || key;
        flash(`Viewing ${label}`);
    }

    function approveRecommendation(id) {
        router.post(
            route('room-utilization.recommendations.approve', id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setRecommendations((rows) =>
                        rows.map((r) => (r.id === id ? { ...r, status: 'Approved' } : r)),
                    );
                },
            },
        );
    }

    function dismissRecommendation(id) {
        router.post(
            route('room-utilization.recommendations.dismiss', id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setRecommendations((rows) => {
                        const next = rows.filter((r) => r.id !== id);
                        if (selectedRecId === id) {
                            setSelectedRecId(next[0]?.id ?? null);
                        }
                        return next;
                    });
                },
            },
        );
    }

    useEffect(() => {
        if (sessionFlash?.toast) {
            flash(sessionFlash.toast);
        }
    }, [sessionFlash?.toast]);

    useEffect(() => {
        setRecommendations(aiRecommendations);
    }, [aiRecommendations]);

    useEffect(() => {
        setApprovals(pendingApprovals);
    }, [pendingApprovals]);

    useEffect(() => {
        if (sessionFlash?.dailyReport) {
            setDailyReport(sessionFlash.dailyReport);
        }
    }, [sessionFlash?.dailyReport]);

    function submitReleaseList() {
        router.post(route('room-utilization.approvals.release-list'), {}, { preserveScroll: true });
    }

    function submitOverflowEscalation() {
        router.post(route('room-utilization.approvals.overflow'), {}, { preserveScroll: true });
    }

    function generateDailyReport() {
        router.post(route('room-utilization.report.daily'), {}, { preserveScroll: true });
    }

    function approveRequest(id) {
        router.post(route('room-utilization.approvals.approve', id), {}, {
            preserveScroll: true,
            onSuccess: () => setApprovals((rows) => rows.filter((r) => r.id !== id)),
        });
    }

    function rejectRequest(id) {
        router.post(route('room-utilization.approvals.reject', id), {}, {
            preserveScroll: true,
            onSuccess: () => setApprovals((rows) => rows.filter((r) => r.id !== id)),
        });
    }

    useEffect(() => () => toastTimeoutRef.current && clearTimeout(toastTimeoutRef.current), []);

    const tabLabel = UTILIZATION_TABS.find((t) => t.key === activeTab)?.label || 'Overview';

    return (
        <>
            <Head title="Room Utilization Manager" />

            <AppLayout activeHref="room-utilization">
                <AppPageShell>
                    <AppPageHeader className="sticky top-0 z-20 flex h-[78px] items-center justify-between border-b border-lx-border bg-white px-6 max-[1100px]:sticky min-[1101px]:static">
                        <div>
                            <h1 className="m-0 text-[26px] tracking-[-0.5px] text-lx-navy">Room Utilization Manager</h1>
                            <p className="mt-0.5 text-[13px] font-semibold text-slate-500">
                                Real-time capacity, on-holds, forecasting, and AI decision support
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-extrabold text-slate-500">
                                Last updated: {lastUpdated || '—'}
                            </span>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search room, dorm, worker, status..."
                                className="h-[42px] w-[380px] max-w-[35vw] rounded-xl border border-lx-border bg-white px-3.5 outline-none focus:border-lx-blue max-[1100px]:hidden"
                            />
                            <span aria-hidden>🔔</span>
                            <span aria-hidden>❔</span>
                            <div className="flex items-center gap-2.5">
                                <div className="grid h-[38px] w-[38px] place-items-center rounded-full bg-lx-blue font-black text-white">
                                    {userInitials}
                                </div>
                                <div className="text-xs">
                                    <strong>{userName}</strong>
                                    <br />
                                    <span className="text-slate-500">Utilization Manager</span>
                                </div>
                            </div>
                        </div>
                    </AppPageHeader>

                    <AppPageBody>
                        <section className="mb-[18px] grid grid-cols-[repeat(8,minmax(140px,1fr))] gap-3.5 max-[1450px]:grid-cols-4">
                            {metrics.map((m) => (
                                <div
                                    key={m.label}
                                    className="min-h-[110px] rounded-2xl border border-lx-border bg-white p-[18px] shadow-lx-soft"
                                >
                                    <div className="text-[13px] font-extrabold text-lx-ink">
                                        {m.icon} {m.label}
                                    </div>
                                    <div className="mt-3.5 text-[28px] font-black text-lx-navy">{m.value}</div>
                                    <div
                                        className={`mt-1 text-xs font-extrabold ${
                                            m.direction === 'up' ? 'text-green-600' : 'text-red-500'
                                        }`}
                                    >
                                        {m.change}
                                    </div>
                                </div>
                            ))}
                        </section>

                        <section className="grid grid-cols-[1fr_340px] items-start gap-[18px] max-[1100px]:grid-cols-1">
                            <div>
                                <div className="overflow-hidden rounded-2xl border border-lx-border bg-white shadow-lx-card">
                                    <div className="grid grid-cols-5 border-b border-lx-border bg-white max-[1450px]:grid-cols-3 max-[900px]:grid-cols-2">
                                        {UTILIZATION_TABS.map((t) => (
                                            <button
                                                key={t.key}
                                                type="button"
                                                onClick={() => setTab(t.key)}
                                                className={`flex items-center justify-center gap-2 border-b-[3px] bg-white px-2 py-3.5 text-xs font-extrabold hover:bg-[#f6faff] max-[900px]:text-[11px] ${
                                                    activeTab === t.key
                                                        ? 'border-lx-blue text-lx-blue'
                                                        : 'border-transparent text-lx-ink'
                                                }`}
                                            >
                                                <span>{t.icon}</span>
                                                <span>{t.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-lx-border px-[18px] py-4">
                                        <div className="text-base font-black text-lx-navy">
                                            {tabLabel}
                                            {activeTab === 'status' && (
                                                <span className="ml-1.5 inline-block rounded-full bg-[#eaf2ff] px-2.5 py-1 text-xs font-bold text-lx-blue">
                                                    {filteredRooms.length}
                                                </span>
                                            )}
                                        </div>
                                        {activeTab === 'status' && (
                                            <div className="flex flex-wrap items-center gap-2.5">
                                                <select
                                                    value={statusFilter}
                                                    onChange={(e) => setStatusFilter(e.target.value)}
                                                    className="h-[38px] rounded-[10px] border border-lx-border bg-white px-3 font-bold text-lx-ink"
                                                >
                                                    {statusOptions.map((s) => (
                                                        <option key={s} value={s}>
                                                            {s === 'All' ? 'All Statuses' : s}
                                                        </option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={dormFilter}
                                                    onChange={(e) => setDormFilter(e.target.value)}
                                                    className="h-[38px] rounded-[10px] border border-lx-border bg-white px-3 font-bold text-lx-ink"
                                                >
                                                    {dormOptions.map((d) => (
                                                        <option key={d} value={d}>
                                                            {d === 'All' ? 'All Dorms' : d}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-[18px]">
                                        {activeTab === 'overview' && <OverviewPanel statusEngine={statusEngine} />}
                                        {activeTab === 'status' && <StatusPanel rows={filteredRooms} />}
                                        {activeTab === 'forecast' && (
                                            <ForecastPanel days={forecastDays} outlook={forecastOutlook} />
                                        )}
                                        {activeTab === 'allotment' && (
                                            <>
                                                <ContractorOccupancyPanel rows={occupancyByContractor} />
                                                <div className="mt-4">
                                                    <AllotmentPanel rows={contractorAllotments} />
                                                </div>
                                            </>
                                        )}
                                        {activeTab === 'onhold' && <OnHoldPanel rows={onHoldReview} />}
                                        {activeTab === 'release' && <ReleasePanel rows={releaseCandidates} />}
                                        {activeTab === 'overflow' && <OverflowPanel rows={overflowOptions} />}
                                        {activeTab === 'housekeeping' && (
                                            <HousekeepingPanel rows={housekeepingPriority} />
                                        )}
                                        {activeTab === 'maintenance' && <MaintenancePanel rows={maintenanceImpact} />}
                                        {activeTab === 'ai' && (
                                            <AiPanel
                                                recommendations={recommendations}
                                                onSelect={setSelectedRecId}
                                                onApprove={approveRecommendation}
                                                onDismiss={dismissRecommendation}
                                            />
                                        )}
                                        {activeTab === 'approvals' && (
                                            <ApprovalsPanel
                                                approvals={approvals}
                                                onApprove={approveRequest}
                                                onReject={rejectRequest}
                                            />
                                        )}
                                    </div>
                                </div>

                                {activeTab === 'overview' && (
                                    <div className="mt-[18px] grid grid-cols-3 gap-3.5 max-[1100px]:grid-cols-1">
                                        <div className="rounded-2xl border border-lx-border bg-white p-4 shadow-lx-soft">
                                            <h4 className="mb-3 text-sm font-black text-lx-navy">Occupancy by Dorm</h4>
                                            {dormOccupancy.map(([name, pct, tone]) => (
                                                <div key={name} className="my-3">
                                                    <div className="mb-1.5 flex justify-between text-xs font-extrabold text-lx-ink">
                                                        <span>{name}</span>
                                                        <span>{pct}%</span>
                                                    </div>
                                                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                                                        <div
                                                            className={`h-full rounded-full ${PROGRESS_TONE[tone]}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="rounded-2xl border border-lx-border bg-white p-4 shadow-lx-soft">
                                            <h4 className="mb-3 text-sm font-black text-lx-navy">7-Day Capacity Outlook</h4>
                                            <div className="flex h-[140px] items-end gap-2 pt-2">
                                                {forecastDays.map((d) => (
                                                    <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                                                        <div
                                                            className={`w-full rounded-t-md ${
                                                                d.risk === 'critical' || d.risk === 'high'
                                                                    ? 'bg-red-500'
                                                                    : d.risk === 'medium'
                                                                      ? 'bg-orange-500'
                                                                      : 'bg-green-600'
                                                            }`}
                                                            style={{
                                                                height: `${Math.min(100, Math.max(12, 50 + d.shortage * 3))}%`,
                                                            }}
                                                            title={`${d.date}: shortage ${d.shortage}`}
                                                        />
                                                        <span className="text-[10px] font-bold text-slate-500">
                                                            {d.date.slice(4)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-lx-border bg-white p-4 shadow-lx-soft">
                                            <h4 className="mb-3 text-sm font-black text-lx-navy">Top AI Actions</h4>
                                            <TopAiPreview
                                                recommendations={recommendations}
                                                onViewAll={() => setTab('ai')}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <aside className="sticky top-4 self-start max-h-[calc(100vh-150px)] overflow-y-auto overflow-x-hidden rounded-2xl border border-lx-border bg-white shadow-lx-card max-[1100px]:static max-[1100px]:max-h-none max-[1100px]:overflow-visible">
                                <div className="border-b border-lx-border p-[18px]">
                                    <strong className="text-base text-lx-navy">AI Utilization Advisor</strong>
                                    <p className="mt-1 text-xs text-slate-500">Approval required for operational actions</p>
                                </div>
                                <div className="p-[18px]">
                                    {selectedRec ? (
                                        <div className="mb-4 rounded-2xl border border-lx-border bg-[#fbfdff] p-4">
                                            {selectedRec.category && (
                                                <span className="mb-2 inline-flex rounded-lg bg-[#eaf2ff] px-2.5 py-1 text-xs font-black text-lx-blue">
                                                    {categoryLabel(selectedRec.category)}
                                                </span>
                                            )}
                                            <strong className="block text-sm text-lx-navy">{selectedRec.issue}</strong>
                                            <p className="mt-2 text-xs text-lx-ink">
                                                <span className="font-extrabold text-slate-500">Risk: </span>
                                                <span className={RISK_STYLES[selectedRec.risk.toLowerCase()]}>
                                                    {selectedRec.risk}
                                                </span>
                                            </p>
                                            <p className="mt-2 text-xs text-lx-ink">
                                                <span className="font-extrabold text-slate-500">Data: </span>
                                                {selectedRec.dataUsed}
                                            </p>
                                            <p className="mt-2 text-xs text-lx-ink">
                                                <span className="font-extrabold text-slate-500">Recommendation: </span>
                                                {selectedRec.recommendation}
                                            </p>
                                            <p className="mt-2 text-xs text-lx-ink">
                                                <span className="font-extrabold text-slate-500">Approval: </span>
                                                {selectedRec.approval}
                                            </p>
                                            <Pill value={selectedRec.status} className="mt-3" />
                                        </div>
                                    ) : (
                                        <p className="mb-4 text-xs text-slate-500">No active recommendations.</p>
                                    )}
                                    <div className="mb-4">
                                        <h4 className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                                            Recent activity
                                        </h4>
                                        <RecentAuditList entries={recentAudit} />
                                    </div>
                                    <div className="grid gap-2.5">
                                        {selectedRec?.status === 'Pending' && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => approveRecommendation(selectedRec.id)}
                                                    className="cursor-pointer rounded-[10px] border-0 bg-green-600 p-3 font-black text-white"
                                                >
                                                    ✅ Approve Recommendation
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => dismissRecommendation(selectedRec.id)}
                                                    className="cursor-pointer rounded-[10px] border border-lx-border bg-white p-3 font-black text-slate-600"
                                                >
                                                    Dismiss Recommendation
                                                </button>
                                            </>
                                        )}
                                        <button
                                            type="button"
                                            onClick={submitReleaseList}
                                            className="cursor-pointer rounded-[10px] border-0 bg-lx-blue p-3 font-black text-white"
                                        >
                                            🔓 Send Release List
                                        </button>
                                        <button
                                            type="button"
                                            onClick={submitOverflowEscalation}
                                            className="cursor-pointer rounded-[10px] border-0 bg-orange-500 p-3 font-black text-white"
                                        >
                                            🏨 Escalate Overflow
                                        </button>
                                        <button
                                            type="button"
                                            onClick={generateDailyReport}
                                            className="cursor-pointer rounded-[10px] border border-blue-300 bg-white p-3 font-black text-lx-blue"
                                        >
                                            📄 Daily Utilization Report
                                        </button>
                                        {approvals.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setTab('approvals')}
                                                className="cursor-pointer rounded-[10px] border border-violet-300 bg-violet-50 p-3 font-black text-violet-700"
                                            >
                                                ✅ {approvals.length} Pending Approval{approvals.length === 1 ? '' : 's'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </aside>
                        </section>

                        <div className="mt-[18px] grid grid-cols-5 gap-3 rounded-2xl border border-lx-border bg-white px-4 py-3 text-xs font-extrabold text-lx-ink max-[1100px]:grid-cols-1">
                            {[
                                `Room Status Engine: ${statusEngine.conflictCount > 0 ? `${statusEngine.conflictCount} conflicts` : 'OK'}`,
                                'AI Advisor: Operational',
                                `Forecast: ${forecastDays.length}-day calculated`,
                                'Policies: 10 active',
                                `Approvals: ${approvals.length} pending`,
                            ].map((label) => (
                                <span key={label}>
                                    <span className="text-green-600">●</span> {label}
                                </span>
                            ))}
                        </div>
                    </AppPageBody>
                </AppPageShell>
            </AppLayout>

            {toast && (
                <div className="fixed bottom-6 right-6 z-[2000] rounded-xl bg-lx-navy px-[18px] py-3.5 font-extrabold text-white shadow-lx-toast">
                    {toast}
                </div>
            )}

            {dailyReport && (
                <div
                    className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/40 p-4"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border border-lx-border bg-white shadow-lx-card">
                        <div className="flex items-center justify-between border-b border-lx-border p-4">
                            <strong className="text-lx-navy">{dailyReport.title}</strong>
                            <button
                                type="button"
                                onClick={() => setDailyReport(null)}
                                className="cursor-pointer text-sm font-black text-slate-500"
                            >
                                Close
                            </button>
                        </div>
                        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap p-4 text-xs text-lx-ink">
                            {dailyReport.text}
                        </pre>
                        <p className="border-t border-lx-border px-4 py-2 text-[10px] text-slate-500">
                            Generated {dailyReport.generatedAt}
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
