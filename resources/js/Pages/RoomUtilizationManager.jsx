import {
    AiPanel,
    AllotmentPanel,
    ApprovalsPanel,
    categoryLabel,
    cleanDecimalDays,
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

// Matches Reservation Operations metric card styling.
const METRIC_PALETTE = {
    border: 'border-blue-100',
    bar: 'from-blue-600 to-blue-500',
    iconBg: 'bg-blue-50',
    iconText: 'text-blue-600',
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
    const [rooms, setRooms] = useState(initialRooms);
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

    // Badge counts shown on each tab, derived from the dataset that tab renders
    // so the numbers always reflect live data rather than hard-coded values.
    const tabCounts = useMemo(
        () => ({
            overview: recommendations.length,
            status: rooms.length,
            forecast: forecastDays.length,
            onhold: onHoldReview.length,
            release: releaseCandidates.length,
            overflow: overflowOptions.length,
            housekeeping: housekeepingPriority.length,
            maintenance: maintenanceImpact.length,
            allotment: contractorAllotments.length,
            ai: recommendations.length,
            approvals: approvals.length,
        }),
        [
            recommendations,
            rooms,
            forecastDays,
            onHoldReview,
            releaseCandidates,
            overflowOptions,
            housekeepingPriority,
            maintenanceImpact,
            contractorAllotments,
            approvals,
        ],
    );

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
        setRooms(initialRooms);
    }, [initialRooms]);

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
    const activeTabCount =
        activeTab === 'status' ? filteredRooms.length : (tabCounts[activeTab] ?? 0);

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
                        <section className="mb-[18px] rounded-[24px] border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-4 shadow-lg shadow-blue-100/50">
                            <div className="grid grid-cols-8 gap-2.5 max-[1450px]:grid-cols-4 max-[900px]:grid-cols-2">
                                {metrics.map((m) => (
                                    <div
                                        key={m.label}
                                        className={`relative h-[108px] min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md ${METRIC_PALETTE.border}`}
                                    >
                                        <div
                                            aria-hidden
                                            className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${METRIC_PALETTE.bar}`}
                                        />
                                        <div className="flex h-full flex-col justify-between py-3 pl-4 pr-3">
                                            <div className="flex min-w-0 items-start gap-2">
                                                <div
                                                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-xs font-black ${METRIC_PALETTE.iconBg} ${METRIC_PALETTE.iconText}`}
                                                >
                                                    {m.icon}
                                                </div>
                                                <div className="line-clamp-2 break-words text-[12px] font-bold leading-tight text-slate-700">
                                                    {m.label}
                                                </div>
                                            </div>
                                            <div className="flex items-end justify-between gap-2">
                                                <div className="text-3xl font-black leading-none tracking-tight text-slate-950">
                                                    {m.value}
                                                </div>
                                                <div
                                                    className={`whitespace-nowrap text-[10px] font-bold ${
                                                        m.direction === 'up' ? 'text-emerald-600' : 'text-red-600'
                                                    }`}
                                                >
                                                    {m.change}
                                                </div>
                                            </div>
                                            <div className="text-[10px] text-slate-400">current status</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-[18px] max-[1100px]:grid-cols-1">
                            <div className="min-w-0">
                                <div className="overflow-hidden rounded-2xl border border-lx-border bg-white shadow-lx-card">
                                    {/* Interlocking chevron tabs — compact sizing so all 11 fit on one row. */}
                                    <div className="flex gap-2 overflow-x-auto border-b border-lx-border bg-white p-2 min-[1100px]:gap-0 min-[1100px]:overflow-x-hidden">
                                        {UTILIZATION_TABS.map((t, i) => {
                                            const isActive = activeTab === t.key;
                                            const isFirst = i === 0;
                                            const isLast = i === UTILIZATION_TABS.length - 1;
                                            const shape = isFirst
                                                ? 'min-[1100px]:rounded-l-xl min-[1100px]:pr-4 min-[1100px]:[clip-path:polygon(0_0,96%_0,100%_50%,96%_100%,0_100%)]'
                                                : isLast
                                                  ? 'min-[1100px]:-ml-px min-[1100px]:rounded-r-xl min-[1100px]:pl-3 min-[1100px]:[clip-path:polygon(0_0,100%_0,100%_100%,0_100%,4%_50%)]'
                                                  : 'min-[1100px]:-ml-px min-[1100px]:pl-3 min-[1100px]:pr-4 min-[1100px]:[clip-path:polygon(0_0,96%_0,100%_50%,96%_100%,0_100%,4%_50%)]';
                                            return (
                                                <button
                                                    key={t.key}
                                                    type="button"
                                                    title={t.label}
                                                    onClick={() => setTab(t.key)}
                                                    className={`relative flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-between gap-1 rounded-lg border px-2 transition-colors min-[1100px]:h-12 min-[1100px]:px-2.5 ${shape} ${
                                                        isActive
                                                            ? 'z-[2] border-[#2b74ff] bg-gradient-to-b from-[#1d75ff] to-[#005bff] text-white shadow-[0_8px_18px_rgba(17,97,255,0.22)]'
                                                            : 'border-lx-border bg-white text-lx-blue hover:bg-[#f6faff]'
                                                    }`}
                                                >
                                                    <span className="flex min-w-0 items-center gap-1.5">
                                                        <span className="grid h-4 w-4 shrink-0 place-items-center text-[13px] leading-none">
                                                            {t.icon}
                                                        </span>
                                                        <span className="truncate text-[11px] font-black leading-tight min-[1100px]:text-xs">
                                                            {t.label}
                                                        </span>
                                                    </span>
                                                    <span
                                                        className={`ml-0.5 inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-black leading-none min-[1100px]:h-[22px] min-[1100px]:min-w-[22px] min-[1100px]:px-1.5 min-[1100px]:text-[11px] ${
                                                            isActive ? 'bg-white/20 text-white' : 'bg-[#eef4ff] text-lx-blue'
                                                        }`}
                                                    >
                                                        {tabCounts[t.key] ?? 0}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-lx-border px-[18px] py-4">
                                        <div className="text-base font-black text-lx-navy">
                                            {tabLabel}
                                            <span className="ml-1.5 inline-block rounded-full bg-[#eaf2ff] px-2.5 py-1 text-xs font-bold text-lx-blue">
                                                {activeTabCount}
                                            </span>
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
                                            <strong className="block text-sm text-lx-navy">{cleanDecimalDays(selectedRec.issue)}</strong>
                                            <p className="mt-2 text-xs text-lx-ink">
                                                <span className="font-extrabold text-slate-500">Risk: </span>
                                                <span className={RISK_STYLES[selectedRec.risk.toLowerCase()]}>
                                                    {selectedRec.risk}
                                                </span>
                                            </p>
                                            <p className="mt-2 text-xs text-lx-ink">
                                                <span className="font-extrabold text-slate-500">Data: </span>
                                                {cleanDecimalDays(selectedRec.dataUsed)}
                                            </p>
                                            <p className="mt-2 text-xs text-lx-ink">
                                                <span className="font-extrabold text-slate-500">Recommendation: </span>
                                                {cleanDecimalDays(selectedRec.recommendation)}
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
