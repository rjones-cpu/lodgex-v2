import { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    AlertTriangle,
    Bell,
    CalendarDays,
    ChevronDown,
    Clock,
    Eye,
    FileDown,
    Mail,
    MessageCircle,
    Plus,
    Search,
    SlidersHorizontal,
    UserPlus,
    X,
} from 'lucide-react';
import { usePage } from '@inertiajs/react';

import WorkforceLayout from '../../Layouts/WorkforceLayout';
import SpecialRequestModal from '../../Components/Workforce/SpecialRequestModal';
import Dropdown from '../../Components/Dropdown';
import { cn } from '../../Components/Workforce/WorkforceWidgets';
import { LODGES } from '../../data/staffingMatrixSeed';
import {
    ALERT_HISTORY,
    CURRENT_SHORTAGES,
    INITIAL_SPECIAL_REQUESTS,
    SHORTAGE_DEPARTMENTS,
    SHORTAGE_PRIORITIES,
    SHORTAGE_SHIFTS,
    UPCOMING_ALERTS,
    nextRequestId,
    summarizeRequests,
    summarizeShortages,
} from '../../data/shortagesAlertsSeed';

const TABS = [
    { key: 'current', label: 'Current Shortages', short: 'Current' },
    { key: 'upcoming', label: 'Upcoming Alerts (7 Days)', short: 'Upcoming' },
    { key: 'history', label: 'All Alerts History', short: 'History' },
    { key: 'requests', label: 'Special Requests', short: 'Requests' },
];

const PAGE_SIZE = 8;

const PRIORITY_PILL = {
    Critical: 'bg-red-50 text-red-700 ring-1 ring-red-100',
    High: 'bg-orange-50 text-orange-700 ring-1 ring-orange-100',
    Medium: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
    Low: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    Info: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
};

const STATUS_PILL = {
    Open: 'bg-orange-50 text-orange-700 ring-1 ring-orange-100',
    'Head Office Reviewing': 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
    'Head Office Response': 'bg-sky-50 text-sky-800 ring-1 ring-sky-100',
    Resolved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    Closed: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    'Pending Approval': 'bg-orange-50 text-orange-700 ring-1 ring-orange-100',
    Approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    Rejected: 'bg-red-50 text-red-700 ring-1 ring-red-100',
};

const IMPACT_TONE = {
    High: 'text-red-600',
    Medium: 'text-orange-600',
    Low: 'text-emerald-600',
};

const filterClass = 'h-9 w-full rounded-lg border-slate-200 py-1 text-xs font-semibold text-slate-700 shadow-sm lg:h-8 lg:w-auto';

function Pill({ value, map }) {
    const isPriority = map === PRIORITY_PILL;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black',
                map[value] || 'bg-slate-100 text-slate-600',
            )}
        >
            {isPriority && <AlertTriangle className="h-3 w-3" strokeWidth={2.25} />}
            {value}
        </span>
    );
}

function SummaryCard({ label, value, unit, caption, icon: Icon, tone }) {
    return (
        <article className="relative min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <div className={cn('pointer-events-none absolute -left-10 -top-12 h-28 w-28 rounded-full blur-2xl', tone.tint)} />
            <div className="relative flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className={cn('m-0 text-sm font-bold leading-5', tone.heading)}>{label}</p>
                    <p className="m-0 mt-1.5 flex flex-wrap items-baseline gap-x-1.5 text-[28px] font-black leading-none tracking-tight text-slate-950 sm:text-[32px]">
                        {value}
                        {unit && <span className="text-xs font-normal text-slate-500 sm:text-sm">{unit}</span>}
                    </p>
                    <p className="mt-1.5 m-0 text-xs font-normal text-slate-600">{caption}</p>
                </div>
                <Icon className={cn('h-10 w-10 shrink-0 sm:h-12 sm:w-12', tone.icon)} strokeWidth={1.5} />
            </div>
        </article>
    );
}

function ShortageDetailsPanel({ row, onClose, onFollowUp, onViewHistory }) {
    if (!row) return null;

    return (
        <aside className="flex flex-col gap-4">
            <section className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="m-0 text-base font-black text-slate-950">Shortage Details</h2>
                        <Pill value={row.priority} map={PRIORITY_PILL} />
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close details">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <p className="mt-3 m-0 text-[15px] font-black leading-snug text-slate-900">
                    {row.department} — {row.position} ({row.shift} Shift)
                </p>
                <p className="mt-1 m-0 text-sm font-medium text-slate-400">{row.date}</p>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-4">
                    <div className="flex flex-wrap gap-6">
                        <Stat label="Required" value={row.required} />
                        <Stat label="Filled" value={row.filled} />
                        <Stat label="Gap" value={row.gap} valueClass="text-red-600" />
                    </div>
                    <div className="space-y-2 text-right">
                        <p className="m-0 text-sm font-semibold text-slate-500">
                            Impact: <span className={cn('font-black', IMPACT_TONE[row.impact])}>{row.impact}</span>
                        </p>
                        <p className="m-0 text-sm font-semibold text-slate-500">
                            Priority: <span className={cn('font-black', IMPACT_TONE[row.priority] || 'text-red-600')}>{row.priority}</span>
                        </p>
                    </div>
                </div>

                <div className="mt-5 space-y-4">
                    <DetailBlock title="Reason" body={row.reason} />
                    <DetailBlock title="Operational Impact" body={row.operationalImpact} />
                    <DetailBlock title="Notes (Lodge)" body={row.notes} />
                    <div>
                        <p className="mb-1 text-[11px] font-black uppercase tracking-wide text-slate-400">Created By</p>
                        <p className="m-0 text-sm font-bold text-slate-800">{row.createdBy}</p>
                        <p className="m-0 text-xs font-medium text-slate-400">{row.createdAt}</p>
                    </div>
                </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="m-0 text-base font-black text-slate-950">Head Office Response</h3>
                        {row.hoResponse ? (
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700 ring-1 ring-blue-100">
                                {row.hoResponse.status}
                            </span>
                        ) : (
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 ring-1 ring-amber-100">
                                Awaiting Response
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onViewHistory}
                        className="text-xs font-black text-lx-blue hover:underline"
                    >
                        View History
                    </button>
                </div>

                {row.hoResponse ? (
                    <>
                        <div className="mb-4 flex items-center gap-3">
                            <span className="grid h-10 w-10 place-items-center rounded-full bg-lx-blue text-xs font-black text-white">
                                {row.hoResponse.initials}
                            </span>
                            <div>
                                <p className="m-0 text-sm font-black text-slate-900">
                                    {row.hoResponse.responder}{' '}
                                    <span className="font-semibold text-slate-500">({row.hoResponse.role})</span>
                                </p>
                                <p className="m-0 text-xs font-medium text-slate-400">Responded {row.createdAt}</p>
                            </div>
                        </div>
                        <p className="m-0 text-sm font-medium leading-6 text-slate-600">{row.hoResponse.text}</p>
                        <p className="mb-2 mt-4 text-[11px] font-black uppercase tracking-wide text-slate-400">Action Plan</p>
                        <ul className="m-0 list-disc space-y-1.5 pl-5 text-sm font-medium leading-6 text-slate-600">
                            {row.hoResponse.actionPlan.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                        <p className="mt-4 m-0 text-sm font-semibold text-slate-500">
                            Expected Resolution:{' '}
                            <span className="font-black text-slate-800">{row.hoResponse.expectedResolution}</span>
                        </p>
                    </>
                ) : (
                    <p className="m-0 text-sm font-medium leading-6 text-slate-500">
                        Head Office has not responded yet. Submit a special request or send a follow-up.
                    </p>
                )}

                <button
                    type="button"
                    onClick={onFollowUp}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-lx-blue bg-white px-3 py-2.5 text-sm font-black text-lx-blue hover:bg-blue-50"
                >
                    <Mail className="h-4 w-4" />
                    Send Follow-up
                </button>
            </section>
        </aside>
    );
}

function Stat({ label, value, valueClass = 'text-slate-900' }) {
    return (
        <div>
            <p className="m-0 text-[11px] font-bold text-slate-400">{label}</p>
            <p className={cn('m-0 mt-1 text-2xl font-black leading-none', valueClass)}>{value}</p>
        </div>
    );
}

function DetailBlock({ title, body }) {
    return (
        <div>
            <p className="mb-1.5 text-[11px] font-black uppercase tracking-wide text-slate-400">{title}</p>
            <p className="m-0 text-sm font-medium leading-6 text-slate-600">{body}</p>
        </div>
    );
}

function formatNeededBy(value) {
    if (!value) return 'Aug 16, 2026';
    const [year, month, day] = value.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ShortagesAlerts() {
    const { auth } = usePage().props;
    const userName = auth?.user?.name || 'Ralph Jones';

    const [lodgeId, setLodgeId] = useState(LODGES[0].id);
    const [tab, setTab] = useState('current');
    const [dateFilter, setDateFilter] = useState('All');
    const [department, setDepartment] = useState('All');
    const [shift, setShift] = useState('All');
    const [priority, setPriority] = useState('All');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [selectedId, setSelectedId] = useState(CURRENT_SHORTAGES[0].id);
    const [requests, setRequests] = useState(INITIAL_SPECIAL_REQUESTS);
    const [modalOpen, setModalOpen] = useState(false);
    const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [toast, setToast] = useState('');

    const lodgeName = LODGES.find((lodge) => lodge.id === lodgeId)?.name || LODGES[0].name;
    const kpis = summarizeShortages();
    const requestSummary = summarizeRequests(requests);
    const selected = CURRENT_SHORTAGES.find((row) => row.id === selectedId) || null;

    function flash(message) {
        setToast(message);
        window.clearTimeout(flash._timer);
        flash._timer = window.setTimeout(() => setToast(''), 2400);
    }

    function openDetails(id) {
        setSelectedId(id);
        if (window.innerWidth < 1280) {
            setMobilePanelOpen(true);
        }
    }

    function closeDetails() {
        setSelectedId(null);
        setMobilePanelOpen(false);
    }

    useEffect(() => {
        if (!mobilePanelOpen || window.innerWidth >= 1280) return undefined;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previous;
        };
    }, [mobilePanelOpen]);

    const dates = useMemo(
        () => ['All', ...[...new Set(CURRENT_SHORTAGES.map((row) => row.date))]],
        [],
    );

    const filteredShortages = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return CURRENT_SHORTAGES.filter((row) => {
            if (dateFilter !== 'All' && row.date !== dateFilter) return false;
            if (department !== 'All' && row.department !== department) return false;
            if (shift !== 'All' && row.shift !== shift) return false;
            if (priority !== 'All' && row.priority !== priority) return false;
            if (!needle) return true;
            return `${row.department} ${row.position} ${row.status}`.toLowerCase().includes(needle);
        });
    }, [dateFilter, department, shift, priority, query]);

    const pageCount = Math.max(1, Math.ceil(filteredShortages.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const pagedShortages = filteredShortages.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    function submitRequest(form) {
        const positions = form.positions
            .filter((row) => Number(row.qty) > 0)
            .map((row) => `${row.qty} ${row.position} (${row.shift})`)
            .join(', ');
        setRequests((current) => [
            {
                id: nextRequestId(current),
                positions,
                reason: form.reasonCategory,
                requestedOn: formatNeededBy(form.neededBy),
                status: 'Pending Approval',
                hoResponse: '—',
            },
            ...current,
        ]);
        setTab('requests');
        flash('Special request submitted to Head Office');
    }

    const toolbar = (
        <div className="flex w-full flex-wrap items-center justify-end gap-1.5">
            <select
                value={lodgeId}
                onChange={(event) => setLodgeId(event.target.value)}
                className="h-8 min-w-0 flex-1 rounded-lg border-slate-200 py-1 text-xs font-bold text-slate-700 shadow-sm sm:flex-none"
            >
                {LODGES.map((lodge) => (
                    <option key={lodge.id} value={lodge.id}>
                        {lodge.name}
                    </option>
                ))}
            </select>
            <button
                type="button"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
                aria-label="Select alert date"
            >
                <CalendarDays className="h-3.5 w-3.5" />
            </button>
            <Dropdown>
                <Dropdown.Trigger>
                    <button
                        type="button"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-black text-slate-700 shadow-sm"
                    >
                        <FileDown className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Export</span>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                </Dropdown.Trigger>
                <Dropdown.Content align="right" contentClasses="py-1 bg-white">
                    <button
                        type="button"
                        onClick={() => flash('CSV export is not connected in this demo')}
                        className="block w-full px-4 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Export CSV
                    </button>
                    <button
                        type="button"
                        onClick={() => flash('PDF export is not connected in this demo')}
                        className="block w-full px-4 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Export PDF
                    </button>
                </Dropdown.Content>
            </Dropdown>
            <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-lx-blue px-2.5 text-xs font-black text-white shadow-sm hover:bg-[#0952b8]"
            >
                <Plus className="h-3.5 w-3.5" />
                <span className="sm:hidden">Request</span>
                <span className="hidden sm:inline">Special Request</span>
            </button>
        </div>
    );

    return (
        <WorkforceLayout
            title="Shortages & Alerts"
            subtitle="Monitor staffing shortages, alerts and Head Office responses."
            activeHref="workforce.shortages-alerts"
            roleLabel="Lodge Manager"
            toolbar={toolbar}
            compact
        >
            <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                <SummaryCard
                    label="Critical Shortages"
                    value={kpis.criticalCount}
                    unit="Positions"
                    caption={`Affecting ${kpis.criticalDepartments} departments`}
                    icon={AlertTriangle}
                    tone={{ heading: 'text-[#E11D2E]', icon: 'text-[#E11D2E]', tint: 'bg-red-200/50' }}
                />
                <SummaryCard
                    label="Open Shortages"
                    value={kpis.openCount}
                    unit="Positions"
                    caption={`Across ${kpis.openDepartments} departments`}
                    icon={AlertCircle}
                    tone={{ heading: 'text-[#F97316]', icon: 'text-[#F97316]', tint: 'bg-orange-200/50' }}
                />
                <SummaryCard
                    label="Alerts (Next 7 Days)"
                    value={kpis.alertDays}
                    unit="Days With Deficiencies"
                    caption={`Largest gap: ${kpis.largestGap} on ${kpis.largestGapDate}`}
                    icon={Bell}
                    tone={{ heading: 'text-[#C8920A]', icon: 'text-[#C8920A]', tint: 'bg-amber-200/45' }}
                />
                <SummaryCard
                    label="Special Requests"
                    value={requestSummary.pending}
                    unit="Pending Approval"
                    caption={`${requestSummary.approved} Approved • ${requestSummary.rejected} Rejected`}
                    icon={UserPlus}
                    tone={{ heading: 'text-[#16A34A]', icon: 'text-[#16A34A]', tint: 'bg-emerald-200/45' }}
                />
                <SummaryCard
                    label="Pending Responses"
                    value={kpis.pendingResponses}
                    unit="From Head Office"
                    caption="Requires action"
                    icon={Clock}
                    tone={{ heading: 'text-[#2563EB]', icon: 'text-[#2563EB]', tint: 'bg-blue-200/45' }}
                />
            </section>

            <div className={cn('mt-3 grid grid-cols-1 gap-4', selected && tab === 'current' && 'xl:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]')}>
                <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex gap-0.5 overflow-x-auto border-b border-slate-200 px-2 pt-2 [scrollbar-width:thin] sm:px-3">
                        {TABS.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => {
                                    setTab(item.key);
                                    setPage(1);
                                }}
                                className={cn(
                                    'shrink-0 px-2.5 py-2 text-xs font-black',
                                    tab === item.key
                                        ? 'border-b-2 border-lx-blue text-lx-blue'
                                        : 'text-slate-500 hover:text-slate-800',
                                )}
                            >
                                <span className="sm:hidden">{item.short}</span>
                                <span className="hidden sm:inline">{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {tab === 'current' && (
                        <>
                            <div className="border-b border-slate-100 px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <div className="relative min-w-0 flex-1">
                                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="search"
                                            value={query}
                                            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                                            placeholder="Search shortages..."
                                            className="h-9 w-full rounded-lg border-slate-200 py-1 pl-8 text-xs font-semibold text-slate-700 shadow-sm lg:h-8"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFiltersOpen((open) => !open)}
                                        className={cn(
                                            'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-black lg:hidden',
                                            filtersOpen ? 'border-lx-blue bg-blue-50 text-lx-blue' : 'border-slate-200 bg-white text-slate-600',
                                        )}
                                    >
                                        <SlidersHorizontal className="h-3.5 w-3.5" />
                                        Filters
                                    </button>
                                </div>
                                <div className={cn('mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:mt-2 lg:flex lg:flex-wrap lg:items-center', !filtersOpen && 'hidden lg:flex')}>
                                    <select value={dateFilter} onChange={(event) => { setDateFilter(event.target.value); setPage(1); }} className={filterClass}>
                                        {dates.map((option) => (
                                            <option key={option} value={option}>
                                                {option === 'All' ? 'All dates' : option}
                                            </option>
                                        ))}
                                    </select>
                                    <select value={department} onChange={(event) => { setDepartment(event.target.value); setPage(1); }} className={filterClass}>
                                        <option value="All">All departments</option>
                                        {SHORTAGE_DEPARTMENTS.map((option) => (
                                            <option key={option}>{option}</option>
                                        ))}
                                    </select>
                                    <select value={shift} onChange={(event) => { setShift(event.target.value); setPage(1); }} className={filterClass}>
                                        <option value="All">All shifts</option>
                                        {SHORTAGE_SHIFTS.map((option) => (
                                            <option key={option}>{option}</option>
                                        ))}
                                    </select>
                                    <select value={priority} onChange={(event) => { setPriority(event.target.value); setPage(1); }} className={filterClass}>
                                        <option value="All">All priorities</option>
                                        {SHORTAGE_PRIORITIES.map((option) => (
                                            <option key={option}>{option}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2 p-3 lg:hidden">
                                {pagedShortages.map((row) => (
                                    <ShortageCard
                                        key={row.id}
                                        row={row}
                                        active={selectedId === row.id}
                                        onOpen={() => openDetails(row.id)}
                                        onComment={() => { openDetails(row.id); flash('Opened lodge comments'); }}
                                    />
                                ))}
                                {pagedShortages.length === 0 && (
                                    <p className="py-8 text-center text-sm font-semibold text-slate-500">No shortages match these filters.</p>
                                )}
                            </div>

                            <div className="hidden overflow-x-auto lg:block">
                                <table className="min-w-[860px] w-full border-collapse">
                                    <thead>
                                        <tr className="bg-[#f8fbff] text-[9px] font-black uppercase tracking-[0.04em] text-slate-500">
                                            <th className="px-3 py-2 text-left">Priority</th>
                                            <th className="px-3 py-2 text-left">Date</th>
                                            <th className="px-3 py-2 text-left">Department / Position</th>
                                            <th className="px-3 py-2 text-left">Shift</th>
                                            <th className="px-2 py-2 text-center">Required</th>
                                            <th className="px-2 py-2 text-center">Filled</th>
                                            <th className="px-2 py-2 text-center">Gap</th>
                                            <th className="px-3 py-2 text-left">Impact</th>
                                            <th className="px-3 py-2 text-left">Status</th>
                                            <th className="px-3 py-2 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pagedShortages.map((row) => {
                                            const active = selectedId === row.id;
                                            return (
                                                <tr
                                                    key={row.id}
                                                    onClick={() => openDetails(row.id)}
                                                    className={cn(
                                                        'cursor-pointer border-t border-slate-100 text-[11px]',
                                                        active ? 'bg-blue-50/80' : 'hover:bg-slate-50/80',
                                                    )}
                                                >
                                                    <td className="px-3 py-2">
                                                        <Pill value={row.priority} map={PRIORITY_PILL} />
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-600">{row.date}</td>
                                                    <td className="px-3 py-2">
                                                        <p className="m-0 font-bold text-slate-800">{row.department}</p>
                                                        <p className="m-0 text-[10px] font-semibold text-slate-500">{row.position}</p>
                                                    </td>
                                                    <td className="px-3 py-2 font-semibold text-slate-600">{row.shift}</td>
                                                    <td className="px-2 py-2 text-center font-bold text-slate-700">{row.required}</td>
                                                    <td className="px-2 py-2 text-center font-bold text-slate-700">{row.filled}</td>
                                                    <td className="px-2 py-2 text-center font-black text-red-600">{row.gap}</td>
                                                    <td className={cn('px-3 py-2 font-black', IMPACT_TONE[row.impact])}>{row.impact}</td>
                                                    <td className="px-3 py-2">
                                                        <Pill value={row.status} map={STATUS_PILL} />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="flex justify-end gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={(event) => { event.stopPropagation(); openDetails(row.id); }}
                                                                className="grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:bg-white hover:text-lx-blue"
                                                                aria-label="View shortage"
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(event) => { event.stopPropagation(); openDetails(row.id); flash('Opened lodge comments'); }}
                                                                className="relative grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:bg-white hover:text-lx-blue"
                                                                aria-label="View comments"
                                                            >
                                                                <MessageCircle className="h-3.5 w-3.5" />
                                                                {row.comments > 0 && (
                                                                    <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-lx-blue px-1 text-[9px] font-black text-white">
                                                                        {row.comments}
                                                                    </span>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {pagedShortages.length === 0 && (
                                            <tr>
                                                <td colSpan={10} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                                                    No shortages match these filters.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-[10px] font-bold text-slate-500">
                                <span>
                                    Showing {(safePage - 1) * PAGE_SIZE + (filteredShortages.length ? 1 : 0)} to{' '}
                                    {Math.min(safePage * PAGE_SIZE, filteredShortages.length)} of {filteredShortages.length} shortages
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        disabled={safePage <= 1}
                                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                                        className="rounded-lg border border-slate-200 px-2.5 py-1 disabled:opacity-40"
                                    >
                                        Prev
                                    </button>
                                    <button
                                        type="button"
                                        disabled={safePage >= pageCount}
                                        onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                                        className="rounded-lg border border-slate-200 px-2.5 py-1 disabled:opacity-40"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {tab === 'upcoming' && <AlertsTable rows={UPCOMING_ALERTS} empty="No upcoming alerts in the next 7 days." />}
                    {tab === 'history' && <AlertsTable rows={ALERT_HISTORY} showStatus empty="No historical alerts." />}
                    {tab === 'requests' && (
                        <RequestsTable
                            requests={requests}
                            onNew={() => setModalOpen(true)}
                            onView={() => flash('Request detail is not connected in this demo')}
                        />
                    )}
                </section>

                {selected && tab === 'current' && (
                    <div className="hidden min-w-0 xl:block">
                        <ShortageDetailsPanel
                            row={selected}
                            onClose={closeDetails}
                            onFollowUp={() => flash(`Follow-up sent for ${selected.position}`)}
                            onViewHistory={() => flash('Response history is not connected in this demo')}
                        />
                    </div>
                )}
            </div>

            {selected && tab === 'current' && mobilePanelOpen && (
                <div className="fixed inset-0 z-40 xl:hidden">
                    <button type="button" className="absolute inset-0 bg-slate-900/40" aria-label="Close details" onClick={() => setMobilePanelOpen(false)} />
                    <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto bg-[#f4f7fb] p-3 shadow-2xl sm:p-4">
                        <ShortageDetailsPanel
                            row={selected}
                            onClose={() => setMobilePanelOpen(false)}
                            onFollowUp={() => flash(`Follow-up sent for ${selected.position}`)}
                            onViewHistory={() => flash('Response history is not connected in this demo')}
                        />
                    </div>
                </div>
            )}

            {tab !== 'requests' && (
                <section className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <h2 className="m-0 text-sm font-black text-slate-950">Special Requests</h2>
                            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-violet-100 px-1 text-[10px] font-black text-violet-700">
                                {requestSummary.pending}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setModalOpen(true)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-2.5 text-xs font-black text-white hover:bg-violet-700"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span className="sm:hidden">New request</span>
                            <span className="hidden sm:inline">New Special Request</span>
                        </button>
                    </div>
                    <RequestsTable requests={requests} onView={() => flash('Request detail is not connected in this demo')} />
                </section>
            )}

            <footer className="mt-3 flex flex-col gap-2 text-[10px] font-bold text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                    <LegendDot color="bg-red-500" label="Critical" />
                    <LegendDot color="bg-orange-500" label="High" />
                    <LegendDot color="bg-amber-400" label="Medium" />
                    <LegendDot color="bg-emerald-500" label="Low" />
                    <LegendDot color="bg-blue-500" label="Info" />
                </div>
                <p className="m-0">
                    Gaps are calculated from required vs filled headcount for the selected lodge and shift.
                </p>
            </footer>

            <SpecialRequestModal
                show={modalOpen}
                lodgeName={lodgeName}
                requestedBy={userName}
                onClose={() => setModalOpen(false)}
                onSubmit={submitRequest}
                onSaveDraft={() => flash('Special request draft saved')}
            />

            {toast && (
                <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-lx-toast sm:left-auto sm:right-5 sm:bottom-5">
                    {toast}
                </div>
            )}
        </WorkforceLayout>
    );
}

function ShortageCard({ row, active, onOpen, onComment }) {
    return (
        <article
            className={cn(
                'rounded-xl border p-3 shadow-sm',
                active ? 'border-lx-blue bg-blue-50/70' : 'border-slate-200 bg-white',
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Pill value={row.priority} map={PRIORITY_PILL} />
                        <Pill value={row.status} map={STATUS_PILL} />
                    </div>
                    <p className="mt-2 m-0 text-sm font-black text-slate-900">{row.department}</p>
                    <p className="m-0 text-xs font-semibold text-slate-500">
                        {row.position} · {row.shift} · {row.date}
                    </p>
                </div>
                <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={onOpen} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-lx-blue" aria-label="View shortage">
                        <Eye className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={onComment} className="relative grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-lx-blue" aria-label="View comments">
                        <MessageCircle className="h-4 w-4" />
                        {row.comments > 0 && (
                            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-lx-blue px-1 text-[9px] font-black text-white">
                                {row.comments}
                            </span>
                        )}
                    </button>
                </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                <div>
                    <p className="m-0 text-[10px] font-bold text-slate-400">Req</p>
                    <p className="m-0 text-sm font-black text-slate-800">{row.required}</p>
                </div>
                <div>
                    <p className="m-0 text-[10px] font-bold text-slate-400">Filled</p>
                    <p className="m-0 text-sm font-black text-slate-800">{row.filled}</p>
                </div>
                <div>
                    <p className="m-0 text-[10px] font-bold text-slate-400">Gap</p>
                    <p className="m-0 text-sm font-black text-red-600">{row.gap}</p>
                </div>
                <div>
                    <p className="m-0 text-[10px] font-bold text-slate-400">Impact</p>
                    <p className={cn('m-0 text-sm font-black', IMPACT_TONE[row.impact])}>{row.impact}</p>
                </div>
            </div>
        </article>
    );
}

function AlertsTable({ rows, showStatus = false, empty }) {
    return (
        <>
            <div className="space-y-2 p-3 lg:hidden">
                {rows.map((row) => (
                    <article key={row.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Pill value={row.priority} map={PRIORITY_PILL} />
                            {showStatus && <Pill value={row.status} map={STATUS_PILL} />}
                        </div>
                        <p className="mt-2 m-0 text-sm font-black text-slate-900">{row.department}</p>
                        <p className="m-0 text-xs font-semibold text-slate-500">
                            {row.position} · {row.shift} · {row.date}
                        </p>
                        <p className="mt-2 m-0 text-xs font-medium text-slate-600">{row.detail}</p>
                        <p className="mt-2 m-0 text-sm font-black text-red-600">Gap {row.gap}</p>
                    </article>
                ))}
                {rows.length === 0 && <p className="py-8 text-center text-sm font-semibold text-slate-500">{empty}</p>}
            </div>
            <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-[720px] w-full border-collapse">
                    <thead>
                        <tr className="bg-[#f8fbff] text-[9px] font-black uppercase tracking-[0.04em] text-slate-500">
                            <th className="px-3 py-2 text-left">Priority</th>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-left">Department / Position</th>
                            <th className="px-3 py-2 text-left">Shift</th>
                            <th className="px-2 py-2 text-center">Gap</th>
                            {showStatus && <th className="px-3 py-2 text-left">Status</th>}
                            <th className="px-3 py-2 text-left">Detail</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.id} className="border-t border-slate-100 text-[11px]">
                                <td className="px-3 py-2">
                                    <Pill value={row.priority} map={PRIORITY_PILL} />
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-600">{row.date}</td>
                                <td className="px-3 py-2">
                                    <p className="m-0 font-bold text-slate-800">{row.department}</p>
                                    <p className="m-0 text-[10px] font-semibold text-slate-500">{row.position}</p>
                                </td>
                                <td className="px-3 py-2 font-semibold text-slate-600">{row.shift}</td>
                                <td className="px-2 py-2 text-center font-black text-red-600">{row.gap}</td>
                                {showStatus && (
                                    <td className="px-3 py-2">
                                        <Pill value={row.status} map={STATUS_PILL} />
                                    </td>
                                )}
                                <td className="px-3 py-2 font-medium text-slate-500">{row.detail}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={showStatus ? 7 : 6} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                                    {empty}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}

function RequestsTable({ requests, onNew, onView }) {
    return (
        <div>
            {onNew && (
                <div className="flex justify-end border-b border-slate-100 px-3 py-2 sm:px-4 sm:py-3">
                    <button
                        type="button"
                        onClick={onNew}
                        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white sm:text-sm"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="sm:hidden">New request</span>
                        <span className="hidden sm:inline">New Special Request</span>
                    </button>
                </div>
            )}
            <div className="space-y-2 p-3 lg:hidden">
                {requests.map((row) => (
                    <article key={row.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="m-0 text-sm font-black text-lx-blue">{row.id}</p>
                                <p className="mt-1 m-0 text-xs font-semibold text-slate-700">{row.positions}</p>
                            </div>
                            <Pill value={row.status} map={STATUS_PILL} />
                        </div>
                        <p className="mt-2 m-0 text-xs font-medium text-slate-500">{row.reason} · {row.requestedOn}</p>
                        <p className="mt-1 m-0 text-xs font-medium text-slate-500">{row.hoResponse}</p>
                        <button type="button" onClick={onView} className="mt-2 text-xs font-black text-lx-blue">
                            View request
                        </button>
                    </article>
                ))}
            </div>
            <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-[860px] w-full border-collapse">
                    <thead>
                        <tr className="bg-[#f8fbff] text-[9px] font-black uppercase tracking-[0.04em] text-slate-500">
                            <th className="px-3 py-2 text-left">Request ID</th>
                            <th className="px-3 py-2 text-left">Positions Requested</th>
                            <th className="px-3 py-2 text-left">Reason</th>
                            <th className="px-3 py-2 text-left">Requested On</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-left">Head Office Response</th>
                            <th className="px-3 py-2 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map((row) => (
                            <tr key={row.id} className="border-t border-slate-100 text-[11px]">
                                <td className="px-3 py-2 font-black text-lx-blue">{row.id}</td>
                                <td className="px-3 py-2 font-semibold text-slate-700">{row.positions}</td>
                                <td className="px-3 py-2 font-medium text-slate-500">{row.reason}</td>
                                <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-600">{row.requestedOn}</td>
                                <td className="px-3 py-2">
                                    <Pill value={row.status} map={STATUS_PILL} />
                                </td>
                                <td className="px-3 py-2 font-medium text-slate-500">{row.hoResponse}</td>
                                <td className="px-3 py-2">
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={onView}
                                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-lx-blue"
                                            aria-label={`View ${row.id}`}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function LegendDot({ color, label }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', color)} />
            {label}
        </span>
    );
}
