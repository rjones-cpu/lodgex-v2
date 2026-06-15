import {
    AlertTriangle,
    ArrowRight,
    BarChart3,
    Bell,
    Building2,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    ClipboardList,
    Hotel,
    LineChart,
    LockKeyhole,
    Search,
    Send,
    ShieldAlert,
    Sparkles,
    Users,
    Wrench,
} from 'lucide-react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import AppLayout from '../Layouts/AppLayout';
import { AppPageBody, AppPageHeader, AppPageShell } from '../Components/AppPageShell';
import { categoryLabel, cleanDecimalDays } from '../Components/RoomUtilization/Panels';

// Tab order is duplicated locally (instead of reusing UTILIZATION_TABS from
// roomUtilizationSeed) so the new overview design can keep the exact tab
// sequence from the supplied TSX without altering the order on the existing
// teammate-owned manager page.
const OVERVIEW_TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'status', label: 'Room Status' },
    { key: 'forecast', label: 'Forecast' },
    { key: 'onhold', label: 'On-Hold Review' },
    { key: 'release', label: 'Release Candidates' },
    { key: 'housekeeping', label: 'Housekeeping' },
    { key: 'maintenance', label: 'Maintenance' },
    { key: 'allotment', label: 'Contractors' },
    { key: 'ai', label: 'AI Advisor' },
    { key: 'overflow', label: 'Overflow' },
    { key: 'approvals', label: 'Approvals' },
];

// Maps controller metric labels to a tone + lucide icon for the card grid.
const METRIC_TONE_BY_LABEL = {
    'Total Active Rooms': { tone: 'blue', Icon: Hotel },
    'In-House': { tone: 'purple', Icon: Users },
    'Vacant Clean': { tone: 'green', Icon: CheckCircle2 },
    'On-Hold': { tone: 'red', Icon: LockKeyhole },
    'Vacant Dirty': { tone: 'orange', Icon: ClipboardList },
    'Maintenance Hold': { tone: 'purple', Icon: Wrench },
    'Maintenance Holds': { tone: 'purple', Icon: Wrench },
    'Usable Capacity Tonight': { tone: 'green', Icon: BarChart3 },
    'Overflow Risk': { tone: 'red', Icon: ShieldAlert },
};

const TONE_STYLES = {
    blue: { icon: 'bg-blue-50 text-blue-600', text: 'text-slate-400', border: 'hover:border-blue-200' },
    green: { icon: 'bg-emerald-50 text-emerald-600', text: 'text-emerald-600', border: 'hover:border-emerald-200' },
    red: { icon: 'bg-red-50 text-red-600', text: 'text-red-600', border: 'hover:border-red-200' },
    orange: { icon: 'bg-orange-50 text-orange-600', text: 'text-orange-600', border: 'hover:border-orange-200' },
    purple: { icon: 'bg-violet-50 text-violet-600', text: 'text-violet-600', border: 'hover:border-violet-200' },
};

const RISK_BADGE = {
    Critical: 'bg-red-100 text-red-700',
    High: 'bg-red-50 text-red-600',
    Medium: 'bg-orange-50 text-orange-600',
    Low: 'bg-emerald-50 text-emerald-700',
};

function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}

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

function MetricCard({ metric }) {
    const meta = METRIC_TONE_BY_LABEL[metric.label] || { tone: 'blue', Icon: BarChart3 };
    const styles = TONE_STYLES[meta.tone] || TONE_STYLES.blue;
    const Icon = meta.Icon;

    return (
        <div
            className={cn(
                'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
                styles.border,
            )}
        >
            <div className="mb-5 flex items-center gap-2">
                <div className={cn('rounded-lg p-1.5', styles.icon)}>
                    <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-bold text-slate-800">{metric.label}</p>
            </div>
            <p className="text-4xl font-bold tracking-tight text-slate-950">{metric.value}</p>
            <p className={cn('mt-3 text-sm font-bold', styles.text)}>{metric.change || '—'}</p>
        </div>
    );
}

function SnapshotCard({ statusEngine }) {
    const rows = [
        ['Assignable now (vacant clean)', String(statusEngine.assignableNow ?? 0)],
        ['Cleanable for tonight', String(statusEngine.cleanableForTonight ?? 0)],
        ['Usable capacity tonight', String(statusEngine.usableCapacityTonight ?? 0)],
        ['On-hold rooms', String(statusEngine.onHold ?? 0)],
        ['On-hold over policy', String(statusEngine.overPolicyHolds ?? 0)],
        ['Projected shortage', `${statusEngine.projectedShortageTonight ?? 0} rooms`],
    ];

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                    <CalendarDays className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-950">Today&apos;s Capacity Snapshot</h2>
            </div>
            <div className="space-y-4">
                {rows.map(([label, value], index) => (
                    <div
                        key={label}
                        className={cn(
                            'flex items-center justify-between text-sm',
                            index === rows.length - 1 && 'border-t border-slate-200 pt-4',
                        )}
                    >
                        <span
                            className={cn(
                                'font-medium text-slate-600',
                                label === 'Usable capacity tonight' && 'font-bold text-blue-700',
                            )}
                        >
                            {label}
                        </span>
                        <span
                            className={cn(
                                'font-bold text-slate-900',
                                (label === 'Usable capacity tonight' || label === 'Projected shortage') &&
                                    'text-blue-700',
                            )}
                        >
                            {value}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}

function ChecklistCard({ statusEngine }) {
    const items = [
        `${statusEngine.assignableNow ?? 0} vacant clean rooms (assignable now)`,
        `${statusEngine.vacantDirty ?? 0} vacant dirty — ${statusEngine.cleanableForTonight ?? 0} cleanable tonight`,
        `${statusEngine.onHold ?? 0} on-hold rooms (${statusEngine.overPolicyHolds ?? 0} over policy)`,
        `${statusEngine.maintenanceHold ?? 0} maintenance holds (${statusEngine.overdueMaintenance ?? 0} overdue)`,
        `${statusEngine.conflictCount ?? 0} status/data conflicts detected`,
    ];

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-950">Before Hotel Overflow — Checklist</h2>
            </div>
            <div className="space-y-4">
                {items.map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm font-medium text-slate-700">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                        <span>{item}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}

function OccupancyCard({ dormOccupancy }) {
    const [expanded, setExpanded] = useState(false);
    const COLLAPSED = 8;
    const total = dormOccupancy.length;
    const visible = expanded || total <= COLLAPSED ? dormOccupancy : dormOccupancy.slice(0, COLLAPSED);
    const hasOverflow = total > COLLAPSED;

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                    <Building2 className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-950">Occupancy by Dorm</h2>
            </div>
            <div className="space-y-3">
                {visible.map(([name, pct]) => {
                    const barColor = pct >= 95 ? 'bg-red-500' : pct >= 40 ? 'bg-emerald-500' : 'bg-emerald-300';
                    return (
                        <div key={name} className="grid grid-cols-[80px_1fr_48px] items-center gap-3">
                            <span className="truncate text-sm font-bold text-slate-700">{name}</span>
                            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                                <div
                                    className={cn('h-full rounded-full', barColor)}
                                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                />
                            </div>
                            <span className="text-right text-sm font-bold text-slate-700">{pct}%</span>
                        </div>
                    );
                })}
            </div>
            {hasOverflow && (
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:underline"
                >
                    {expanded ? 'Show fewer dorms' : `View all dorms (${total})`}
                    <ArrowRight className="h-4 w-4" />
                </button>
            )}
        </section>
    );
}

function ConflictBar({ conflicts = [], conflictCount = 0 }) {
    const [expanded, setExpanded] = useState(false);

    if (!conflictCount) return null;

    // Real-world traffic is 2-3 conflicts max — keep the bar compact.
    // When the count is unusually high (e.g. seed/demo data) the +N toggle
    // reveals the rest in a scrollable strip without growing the page.
    const COLLAPSED = 2;
    const visible = expanded ? conflicts : conflicts.slice(0, COLLAPSED);
    const remaining = Math.max(0, conflictCount - COLLAPSED);

    return (
        <section className="rounded-xl border border-red-200 bg-red-50/70 px-3 py-2 shadow-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="flex shrink-0 items-center gap-2">
                    <div className="rounded-lg bg-red-100 p-1 text-red-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                    </div>
                    <h2 className="text-xs font-bold uppercase tracking-wide text-red-700">
                        Status Conflicts
                        <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
                            {conflictCount}
                        </span>
                    </h2>
                </div>
                <div
                    className={cn(
                        'flex flex-1 flex-wrap items-center gap-1.5',
                        expanded && conflicts.length > 6 && 'max-h-24 overflow-y-auto',
                    )}
                >
                    {visible.map((c) => {
                        const roomList = Array.isArray(c.rooms) && c.rooms.length > 0 ? c.rooms : [c.room];
                        const label = c.worker || `${c.room} (${c.dorm})`;
                        return (
                            <span
                                key={`${c.code ?? 'conflict'}-${c.worker ?? c.room}-${c.dorm}`}
                                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 shadow-sm"
                                title={c.message || ''}
                            >
                                <span className="rounded bg-red-50 px-1.5 text-[11px] font-bold text-red-700">
                                    {label}
                                </span>
                                <span className="text-[11px] font-medium text-slate-500">
                                    rooms {roomList.join(', ')}
                                </span>
                            </span>
                        );
                    })}
                    {remaining > 0 && (
                        <button
                            type="button"
                            onClick={() => setExpanded((v) => !v)}
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold text-blue-700 hover:bg-white"
                        >
                            {expanded ? 'Show fewer' : `+${remaining} more`}
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}

// Picks a "nice" upper bound (and tick step) for the chart's y-axis so the
// labels are round numbers like 0/200/400/600 instead of arbitrary maxima.
function computeYAxis(maxValue) {
    if (!Number.isFinite(maxValue) || maxValue <= 0) {
        return { max: 100, step: 25 };
    }
    const targetSteps = 4;
    const rawStep = maxValue / targetSteps;
    const magnitude = 10 ** Math.floor(Math.log10(rawStep));
    const normalized = rawStep / magnitude;
    let niceNormalized;
    if (normalized <= 1) niceNormalized = 1;
    else if (normalized <= 2) niceNormalized = 2;
    else if (normalized <= 2.5) niceNormalized = 2.5;
    else if (normalized <= 5) niceNormalized = 5;
    else niceNormalized = 10;
    const step = niceNormalized * magnitude;
    const niceMax = Math.ceil(maxValue / step) * step;
    return { max: niceMax, step };
}

function CapacityOutlookCard({ forecastDays = [], totalCapacity = 0 }) {
    // Chart is rendered into a fixed viewBox; preserveAspectRatio defaults to
    // "xMidYMid meet" so lines stay proportional regardless of card width.
    const W = 400;
    const H = 220;
    const PAD_LEFT = 44;
    const PAD_RIGHT = 14;
    const PAD_TOP = 16;
    const PAD_BOTTOM = 36;
    const plotW = W - PAD_LEFT - PAD_RIGHT;
    const plotH = H - PAD_TOP - PAD_BOTTOM;

    const chart = useMemo(() => {
        if (!forecastDays.length) {
            return null;
        }

        const total = forecastDays.map(() => Math.max(0, totalCapacity || 0));
        const usable = forecastDays.map((d) => Math.max(0, d.available ?? 0));
        const demand = forecastDays.map((d) => Math.max(0, d.arrivals ?? 0));
        const peak = Math.max(1, ...total, ...usable, ...demand);
        const { max: yMax, step: yStep } = computeYAxis(peak);

        const ticks = [];
        for (let v = 0; v <= yMax + 0.0001; v += yStep) ticks.push(v);

        const xAt = (i) =>
            forecastDays.length === 1
                ? PAD_LEFT + plotW / 2
                : PAD_LEFT + (i * plotW) / (forecastDays.length - 1);
        const yAt = (value) => PAD_TOP + (1 - value / yMax) * plotH;

        const seriesPath = (values) =>
            values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(v)}`).join(' ');

        return {
            yMax,
            ticks,
            xAt,
            yAt,
            totalPath: seriesPath(total),
            usablePath: seriesPath(usable),
            demandPath: seriesPath(demand),
            totalPoints: total.map((v, i) => ({ x: xAt(i), y: yAt(v) })),
            xLabels: forecastDays.map((d, i) => ({ x: xAt(i), label: d.date })),
        };
    }, [forecastDays, totalCapacity, plotW, plotH]);

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                    <LineChart className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-950">7-Day Capacity Outlook</h2>
            </div>

            <div className="rounded-2xl bg-white p-2">
                {chart ? (
                    <svg
                        viewBox={`0 0 ${W} ${H}`}
                        className="h-56 w-full"
                        role="img"
                        aria-label="7-day capacity outlook chart"
                    >
                        {chart.ticks.map((value) => {
                            const y = chart.yAt(value);
                            return (
                                <g key={value}>
                                    <line
                                        x1={PAD_LEFT}
                                        x2={W - PAD_RIGHT}
                                        y1={y}
                                        y2={y}
                                        stroke="#e2e8f0"
                                        strokeWidth="1"
                                    />
                                    <text
                                        x={PAD_LEFT - 8}
                                        y={y}
                                        textAnchor="end"
                                        dominantBaseline="middle"
                                        className="fill-slate-400"
                                        style={{ fontSize: 11, fontWeight: 600 }}
                                    >
                                        {value}
                                    </text>
                                </g>
                            );
                        })}

                        <line
                            x1={PAD_LEFT}
                            x2={W - PAD_RIGHT}
                            y1={H - PAD_BOTTOM}
                            y2={H - PAD_BOTTOM}
                            stroke="#cbd5e1"
                            strokeWidth="1"
                        />

                        <path
                            d={chart.totalPath}
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <path
                            d={chart.usablePath}
                            fill="none"
                            stroke="#16a34a"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="6 5"
                        />
                        <path
                            d={chart.demandPath}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="6 5"
                        />

                        {chart.totalPoints.map((p, i) => (
                            <circle
                                key={`pt-${i}`}
                                cx={p.x}
                                cy={p.y}
                                r="3.5"
                                fill="#fff"
                                stroke="#2563eb"
                                strokeWidth="2"
                            />
                        ))}

                        {chart.xLabels.map((tick, i) => (
                            <text
                                key={`xl-${i}`}
                                x={tick.x}
                                y={H - PAD_BOTTOM + 18}
                                textAnchor="middle"
                                className="fill-slate-500"
                                style={{ fontSize: 11, fontWeight: 600 }}
                            >
                                {tick.label}
                            </text>
                        ))}
                    </svg>
                ) : (
                    <div className="flex h-56 items-center justify-center text-sm font-medium text-slate-400">
                        No forecast data available.
                    </div>
                )}
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-6 text-xs font-bold text-slate-600">
                <span className="inline-flex items-center gap-2">
                    <span className="inline-flex items-center">
                        <span className="h-[2px] w-6 bg-blue-600" />
                        <span className="-ml-1 h-2 w-2 rounded-full border-2 border-blue-600 bg-white" />
                    </span>
                    Total Capacity
                </span>
                <span className="inline-flex items-center gap-2">
                    <span
                        className="block h-0 w-8"
                        style={{
                            borderTop: '2px dashed #16a34a',
                        }}
                    />
                    Usable Capacity
                </span>
                <span className="inline-flex items-center gap-2">
                    <span
                        className="block h-0 w-8"
                        style={{
                            borderTop: '2px dashed #ef4444',
                        }}
                    />
                    Demand
                </span>
            </div>
        </section>
    );
}

function TopActionsCard({ recommendations = [] }) {
    const [expanded, setExpanded] = useState(false);
    const COLLAPSED = 3;
    const total = recommendations.length;
    const visible = expanded ? recommendations : recommendations.slice(0, COLLAPSED);
    const hasOverflow = total > COLLAPSED;

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                    <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-950">Top AI Actions</h2>
            </div>

            {visible.length === 0 ? (
                <p className="text-sm font-medium text-slate-500">No active recommendations.</p>
            ) : (
                <div className="space-y-3">
                    {visible.map((action) => (
                        <div
                            key={action.id}
                            className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <h3 className="truncate text-sm font-bold text-slate-900">
                                        {cleanDecimalDays(action.issue)}
                                    </h3>
                                    <p className="mt-1 text-sm font-medium text-slate-500">
                                        {cleanDecimalDays(action.nextAction)}
                                    </p>
                                </div>
                                <span
                                    className={cn(
                                        'shrink-0 rounded-xl px-3 py-1 text-xs font-bold',
                                        RISK_BADGE[action.risk] || RISK_BADGE.Medium,
                                    )}
                                >
                                    {action.risk}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {hasOverflow && (
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:underline"
                >
                    {expanded ? 'Show fewer recommendations' : `View all recommendations (${total})`}
                    <ArrowRight className="h-4 w-4" />
                </button>
            )}
        </section>
    );
}

function AdvisorPanel({
    selectedRec,
    recentAudit,
    pendingApprovals,
    onSendReleaseList,
    onEscalateOverflow,
    onGenerateReport,
}) {
    const [activityExpanded, setActivityExpanded] = useState(false);
    const ACTIVITY_COLLAPSED = 4;
    const totalActivity = recentAudit.length;
    const visibleActivity = activityExpanded
        ? recentAudit
        : recentAudit.slice(0, ACTIVITY_COLLAPSED);
    const hasActivityOverflow = totalActivity > ACTIVITY_COLLAPSED;

    return (
        <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                    <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-950">AI Utilization Advisor</h2>
                        <p className="text-sm font-medium text-slate-500">
                            Approval required for operational actions
                        </p>
                    </div>
                </div>

                {selectedRec ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
                        <div className="mb-3 flex items-start justify-between gap-2">
                            {selectedRec.category && (
                                <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                    {categoryLabel(selectedRec.category)}
                                </span>
                            )}
                            {selectedRec.risk && (
                                <span
                                    className={cn(
                                        'rounded-lg px-3 py-1 text-xs font-bold',
                                        RISK_BADGE[selectedRec.risk] || RISK_BADGE.Medium,
                                    )}
                                >
                                    {selectedRec.risk}
                                </span>
                            )}
                        </div>
                        <h3 className="text-sm font-bold text-slate-950">{cleanDecimalDays(selectedRec.issue)}</h3>
                        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                            <span className="font-bold text-red-600">Risk: {selectedRec.risk}</span>
                            <br />
                            Data: {cleanDecimalDays(selectedRec.dataUsed)}
                            <br />
                            Recommendation: {cleanDecimalDays(selectedRec.recommendation)}
                            <br />
                            Approval: {selectedRec.approval}
                        </p>
                        {selectedRec.status && (
                            <div className="mt-4 flex items-center justify-between">
                                <span
                                    className={cn(
                                        'rounded-lg px-3 py-1 text-sm font-bold',
                                        selectedRec.status === 'Approved'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-orange-50 text-orange-600',
                                    )}
                                >
                                    {selectedRec.status}
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-sm font-medium text-slate-500">No active recommendations.</p>
                )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Recent Activity</h2>
                    {hasActivityOverflow && (
                        <button
                            type="button"
                            onClick={() => setActivityExpanded((v) => !v)}
                            className="text-sm font-bold text-blue-700 hover:underline"
                        >
                            {activityExpanded ? 'Show fewer' : 'View all'}
                        </button>
                    )}
                </div>

                {recentAudit.length === 0 ? (
                    <p className="text-sm font-medium text-slate-500">No advisor activity yet.</p>
                ) : (
                    <div className="space-y-3">
                        {visibleActivity.map((entry) => (
                            <div key={entry.id} className="rounded-xl border border-slate-200 p-3">
                                <div className="flex items-start gap-3">
                                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between gap-3">
                                            <p className="text-sm font-bold capitalize text-slate-900">
                                                {entry.action}
                                            </p>
                                            <p className="text-xs font-medium text-slate-500">{entry.at}</p>
                                        </div>
                                        <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-500">
                                            {cleanDecimalDays(entry.issue)}
                                        </p>
                                        {entry.category && (
                                            <span className="mt-1 inline-block text-xs font-bold text-blue-700">
                                                {categoryLabel(entry.category)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <div className="space-y-3">
                <button
                    type="button"
                    onClick={onSendReleaseList}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700"
                >
                    <Send className="h-5 w-5" />
                    Send Release List
                </button>
                <button
                    type="button"
                    onClick={onEscalateOverflow}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-orange-100 hover:bg-orange-600"
                >
                    <AlertTriangle className="h-5 w-5" />
                    Escalate Overflow
                </button>
                <button
                    type="button"
                    onClick={onGenerateReport}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-5 py-4 text-sm font-bold text-blue-700 hover:bg-blue-50"
                >
                    <ClipboardList className="h-5 w-5" />
                    Daily Utilization Report
                </button>
                {pendingApprovals > 0 && (
                    <Link
                        href={route('room-utilization.manage')}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4 text-sm font-bold text-violet-700 hover:bg-violet-100"
                    >
                        <CheckCircle2 className="h-5 w-5" />
                        {pendingApprovals} Pending Approval{pendingApprovals === 1 ? '' : 's'}
                    </Link>
                )}
            </div>
        </aside>
    );
}

export default function RoomUtilizationOverview({
    metrics = [],
    statusEngine = {},
    dormOccupancy = [],
    forecastDays = [],
    aiRecommendations = [],
    recentAudit = [],
    pendingApprovals = [],
    lastUpdated = '',
}) {
    const { auth, flash: sessionFlash } = usePage().props;
    const userName = auth?.user?.name || 'John Doe';
    const userInitials = getInitials(userName);

    const [search, setSearch] = useState('');
    const [toast, setToast] = useState('');
    const [dailyReport, setDailyReport] = useState(null);
    const toastTimeoutRef = useRef(null);

    const selectedRec = useMemo(() => {
        if (!aiRecommendations.length) return null;
        return aiRecommendations.find((r) => r.status === 'Approved') || aiRecommendations[0];
    }, [aiRecommendations]);

    function flash(message) {
        setToast(message);
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setToast(''), 2400);
    }

    useEffect(() => {
        if (sessionFlash?.toast) flash(sessionFlash.toast);
    }, [sessionFlash?.toast]);

    useEffect(() => {
        if (sessionFlash?.dailyReport) setDailyReport(sessionFlash.dailyReport);
    }, [sessionFlash?.dailyReport]);

    useEffect(() => () => toastTimeoutRef.current && clearTimeout(toastTimeoutRef.current), []);

    function submitReleaseList() {
        router.post(route('room-utilization.approvals.release-list'), {}, { preserveScroll: true });
    }

    function submitOverflowEscalation() {
        router.post(route('room-utilization.approvals.overflow'), {}, { preserveScroll: true });
    }

    function generateDailyReport() {
        router.post(route('room-utilization.report.daily'), {}, { preserveScroll: true });
    }

    return (
        <>
            <Head title="Room Utilization — Overview" />

            <AppLayout activeHref="room-utilization">
                <AppPageShell>
                    <AppPageHeader className="border-b border-slate-200 bg-white/90 backdrop-blur">
                        <div className="flex flex-col gap-4 px-6 py-4 xl:flex-row xl:items-center xl:justify-between">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                                    Room Utilization Manager
                                </h1>
                                <p className="mt-1 text-sm font-medium text-slate-500">
                                    Real-time capacity, on-holds, forecasting, and AI decision support
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-4">
                                <p className="text-xs font-semibold text-slate-500">
                                    Last updated: {lastUpdated || '—'}
                                </p>

                                <div className="flex h-12 w-[360px] max-w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
                                    <Search className="h-5 w-5 text-slate-400" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
                                        placeholder="Search room, dorm, worker, status..."
                                    />
                                </div>

                                <button
                                    type="button"
                                    className="relative rounded-full p-3 text-slate-600 hover:bg-slate-100"
                                    aria-label="Notifications"
                                >
                                    <Bell className="h-5 w-5" />
                                    {pendingApprovals.length > 0 && (
                                        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600" />
                                    )}
                                </button>

                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                                        {userInitials}
                                    </div>
                                    <div className="hidden sm:block">
                                        <p className="text-sm font-bold text-slate-900">{userName}</p>
                                        <p className="text-xs font-medium text-slate-500">Utilization Manager</p>
                                    </div>
                                    <ChevronDown className="h-4 w-4 text-slate-500" />
                                </div>
                            </div>
                        </div>
                    </AppPageHeader>

                    <AppPageBody className="bg-[#f7faff] p-6">
                        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
                            {metrics.map((metric) => (
                                <MetricCard key={metric.label} metric={metric} />
                            ))}
                        </section>

                        <div className="mt-5 grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
                            <div className="min-w-0 space-y-5">
                                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <div className="flex overflow-x-auto">
                                        {OVERVIEW_TABS.map((t) => {
                                            const isOverview = t.key === 'overview';
                                            const className = cn(
                                                'min-w-fit border-b-2 px-7 py-4 text-sm font-bold transition',
                                                isOverview
                                                    ? 'border-blue-600 text-blue-700'
                                                    : 'border-transparent text-slate-600 hover:text-slate-950',
                                            );
                                            if (isOverview) {
                                                return (
                                                    <button key={t.key} type="button" className={className}>
                                                        {t.label}
                                                    </button>
                                                );
                                            }
                                            return (
                                                <Link
                                                    key={t.key}
                                                    href={route('room-utilization.manage')}
                                                    className={className}
                                                >
                                                    {t.label}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr_1.25fr]">
                                    <SnapshotCard statusEngine={statusEngine} />
                                    <ChecklistCard statusEngine={statusEngine} />
                                    <OccupancyCard dormOccupancy={dormOccupancy} />
                                </div>

                                <ConflictBar
                                    conflicts={statusEngine.conflicts || []}
                                    conflictCount={statusEngine.conflictCount || 0}
                                />

                                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_1.15fr]">
                                    <CapacityOutlookCard
                                        forecastDays={forecastDays}
                                        totalCapacity={statusEngine.totalActiveRooms || 0}
                                    />
                                    <TopActionsCard recommendations={aiRecommendations} />
                                </div>
                            </div>

                            <AdvisorPanel
                                selectedRec={selectedRec}
                                recentAudit={recentAudit}
                                pendingApprovals={pendingApprovals.length}
                                onSendReleaseList={submitReleaseList}
                                onEscalateOverflow={submitOverflowEscalation}
                                onGenerateReport={generateDailyReport}
                            />
                        </div>
                    </AppPageBody>
                </AppPageShell>
            </AppLayout>

            {toast && (
                <div className="fixed bottom-6 right-6 z-[2000] rounded-xl bg-slate-900 px-[18px] py-3.5 font-extrabold text-white shadow-xl">
                    {toast}
                </div>
            )}

            {dailyReport && (
                <div
                    className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/40 p-4"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 p-4">
                            <strong className="text-slate-900">{dailyReport.title}</strong>
                            <button
                                type="button"
                                onClick={() => setDailyReport(null)}
                                className="cursor-pointer text-sm font-black text-slate-500"
                            >
                                Close
                            </button>
                        </div>
                        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap p-4 text-xs text-slate-700">
                            {dailyReport.text}
                        </pre>
                        <p className="border-t border-slate-200 px-4 py-2 text-[10px] text-slate-500">
                            Generated {dailyReport.generatedAt}
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
