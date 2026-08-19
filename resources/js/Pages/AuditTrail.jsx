import AppLayout from '../Layouts/AppLayout';
import { AppPageBody, AppPageShell } from '../Components/AppPageShell';
import UserAccountMenu from '../Components/AccommodationWorkforce/UserAccountMenu';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ClipboardList,
    CalendarDays,
    BedDouble,
    GitBranch,
    Search,
    X,
} from 'lucide-react';

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

function formatNumber(value) {
    return Number(value || 0).toLocaleString();
}

function activityTone(type) {
    switch (type) {
        case 'reservation':
            return 'bg-blue-50 text-blue-700';
        case 'request':
            return 'bg-amber-50 text-amber-700';
        case 'schedule_modification':
            return 'bg-violet-50 text-violet-700';
        default:
            return 'bg-slate-100 text-slate-600';
    }
}

function SummaryCard({ title, value, subtitle, icon: Icon, accent }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${accent}`}>
                    <Icon className="h-7 w-7" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-slate-500">{title}</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{formatNumber(value)}</p>
                    <p className="text-sm text-slate-500">{subtitle}</p>
                </div>
            </div>
        </div>
    );
}

function DetailDrawer({ trail, onClose, onViewNotes }) {
    if (!trail) return null;

    const fields = [
        ['Reservation', trail.guestName],
        ['Activity', trail.activityLabel],
        ['Date', trail.date],
        ['Time', trail.time],
        ['Username', trail.username],
        ['Arrival / Departure', trail.stay || '—'],
        ['Company', trail.company],
        ['Province', trail.province],
        ['Shift', trail.shift],
        ['Room type', trail.roomType],
    ];

    return (
        <div className="fixed inset-0 z-[180] flex justify-end bg-slate-950/30" onClick={onClose}>
            <aside
                className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Audit entry</p>
                        <h2 className="mt-1 text-xl font-black text-slate-950">{trail.guestName}</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{trail.activityLabel}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                    <dl className="grid grid-cols-2 gap-4">
                        {fields.map(([label, value]) => (
                            <div key={label} className="rounded-xl border border-slate-100 bg-[#fbfdff] px-3 py-2.5">
                                <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</dt>
                                <dd className="mt-1 text-sm font-bold text-slate-900">{value || '—'}</dd>
                            </div>
                        ))}
                    </dl>

                    {trail.description && (
                        <div className="mt-5">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Description</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{trail.description}</p>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                    {trail.hasNotes ? (
                        <button
                            type="button"
                            onClick={() => onViewNotes(trail)}
                            className="h-10 rounded-xl border border-lx-border bg-white px-4 text-sm font-bold text-lx-blue hover:bg-lx-blue/5"
                        >
                            View notes
                        </button>
                    ) : (
                        <span className="text-sm font-semibold text-slate-400">No notes</span>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 rounded-xl bg-lx-blue px-5 text-sm font-bold text-white hover:opacity-90"
                    >
                        Close
                    </button>
                </div>
            </aside>
        </div>
    );
}

function NotesModal({ trail, onClose }) {
    if (!trail) return null;

    return (
        <div className="fixed inset-0 z-[190] grid place-items-center bg-slate-950/40 p-4" onClick={onClose}>
            <div
                className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                        <h3 className="m-0 text-lg font-black text-slate-950">Notes</h3>
                        <p className="m-0 text-sm font-semibold text-slate-500">{trail.guestName}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-5">
                    {trail.notes?.length ? (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    {['Role', 'Status', 'Date', 'Note'].map((label) => (
                                        <th
                                            key={label}
                                            className="border-b border-slate-200 pb-2 text-left text-xs font-black uppercase tracking-wide text-slate-400"
                                        >
                                            {label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {trail.notes.map((note, index) => (
                                    <tr key={`${trail.id}-note-${index}`}>
                                        <td className="py-3 pr-3 text-sm font-bold text-slate-800">{note.role || '—'}</td>
                                        <td className="py-3 pr-3 text-sm text-slate-600">{note.status || '—'}</td>
                                        <td className="whitespace-nowrap py-3 pr-3 text-sm text-slate-600">{note.date}</td>
                                        <td className="py-3 text-sm text-slate-700">{note.note}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-sm font-semibold text-slate-500">No notes for this reservation.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function AuditTrail({
    trails = [],
    pagination = {},
    filters = {},
    stats = {},
    types = [],
    available = true,
    message = null,
    lastUpdated = '',
}) {
    const { auth } = usePage().props;
    const userName = auth?.user?.name || 'John Doe';
    const userInitials = getInitials(userName);
    const [search, setSearch] = useState(filters.search || '');
    const [selected, setSelected] = useState(null);
    const [notesTrail, setNotesTrail] = useState(null);
    const searchTimer = useRef(null);

    useEffect(() => {
        setSearch(filters.search || '');
    }, [filters.search]);

    function visit(next = {}) {
        router.get(
            route('audit-trail'),
            {
                search: next.search ?? filters.search ?? '',
                type: next.type ?? filters.type ?? 'all',
                sort: next.sort ?? filters.sort ?? 'date',
                dir: next.dir ?? filters.dir ?? 'desc',
                per_page: next.per_page ?? filters.per_page ?? 25,
                page: next.page ?? 1,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    function onSearchChange(value) {
        setSearch(value);
        if (searchTimer.current) window.clearTimeout(searchTimer.current);
        searchTimer.current = window.setTimeout(() => visit({ search: value, page: 1 }), 350);
    }

    function toggleSort(key) {
        const isActive = filters.sort === key;
        const nextDir = isActive && filters.dir === 'asc' ? 'desc' : 'asc';
        visit({ sort: key, dir: key === 'date' && !isActive ? 'desc' : nextDir, page: 1 });
    }

    const sortArrow = (key) => {
        if (filters.sort !== key) return '↕';
        return filters.dir === 'asc' ? '▲' : '▼';
    };

    const columns = useMemo(
        () => [
            { key: 'name', label: 'Reservation Name', sortable: true },
            { key: 'activity', label: 'Activity Type' },
            { key: 'date', label: 'Date', sortable: true },
            { key: 'time', label: 'Time' },
            { key: 'username', label: 'Username' },
            { key: 'stay', label: 'Arrival / Departure' },
            { key: 'company', label: 'Company' },
            { key: 'province', label: 'Province' },
            { key: 'shift', label: 'Shift' },
            { key: 'roomType', label: 'Room Type' },
            { key: 'action', label: 'Action' },
            { key: 'notes', label: 'Notes' },
        ],
        [],
    );

    return (
        <>
            <Head title="Audit Trail" />

            <AppLayout activeHref="audit-trail">
                <AppPageShell>
                    <AppPageBody className="p-0">
                        <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-white via-blue-50/40 to-white">
                            <div className="mx-auto max-w-[1600px] px-5 py-7 sm:px-8">
                                <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
                                    <div>
                                        <p className="m-0 text-xs font-bold uppercase tracking-wide text-lx-blue">
                                            Child Module •{' '}
                                            <Link href={route('command-center')} className="hover:underline">
                                                Smart Lodge Command Center
                                            </Link>
                                        </p>
                                        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                                            Audit Trail
                                        </h1>
                                        <p className="mt-2 max-w-2xl text-base text-slate-600">
                                            Every reservation, request, and schedule change logged for this lodge.
                                        </p>
                                        {lastUpdated && (
                                            <p className="mt-2 text-xs font-bold text-slate-400">
                                                Last updated: {lastUpdated}
                                            </p>
                                        )}
                                    </div>
                                    <UserAccountMenu
                                        userName={userName}
                                        userEmail={auth?.user?.email}
                                        userInitials={userInitials}
                                        triggerClassName="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border border-lx-border bg-white px-2 py-1.5 shadow-sm"
                                    >
                                        <div className="grid h-10 w-10 place-items-center rounded-full bg-lx-blue font-black text-white">
                                            {userInitials}
                                        </div>
                                        <div className="pr-2 text-left text-xs">
                                            <strong>{userName}</strong>
                                            <br />
                                            <span className="text-slate-500">Lodge operations</span>
                                        </div>
                                    </UserAccountMenu>
                                </div>

                                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                    <SummaryCard
                                        title="Total entries"
                                        value={stats.total}
                                        subtitle="Camp activity log"
                                        icon={ClipboardList}
                                        accent="bg-indigo-50 text-indigo-700"
                                    />
                                    <SummaryCard
                                        title="Today"
                                        value={stats.today}
                                        subtitle="Logged since midnight"
                                        icon={CalendarDays}
                                        accent="bg-cyan-50 text-cyan-700"
                                    />
                                    <SummaryCard
                                        title="Reservations"
                                        value={stats.reservations}
                                        subtitle="Booking activity"
                                        icon={BedDouble}
                                        accent="bg-blue-50 text-blue-700"
                                    />
                                    <SummaryCard
                                        title="Schedule changes"
                                        value={stats.modifications}
                                        subtitle="Modifications"
                                        icon={GitBranch}
                                        accent="bg-violet-50 text-violet-700"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mx-auto max-w-[1600px] px-5 py-6 sm:px-8">
                            <section className="overflow-hidden rounded-2xl border border-lx-border bg-white shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-lx-border px-4 py-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {(types.length ? types : [{ value: 'all', label: 'All activity' }]).map((type) => {
                                            const active = (filters.type || 'all') === type.value;
                                            return (
                                                <button
                                                    key={type.value}
                                                    type="button"
                                                    onClick={() => visit({ type: type.value, page: 1 })}
                                                    className={`h-9 rounded-xl px-3 text-sm font-bold ${
                                                        active
                                                            ? 'bg-lx-blue text-white'
                                                            : 'border border-lx-border bg-white text-lx-navy hover:bg-[#f6faff]'
                                                    }`}
                                                >
                                                    {type.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                            Length
                                            <select
                                                value={filters.per_page || 25}
                                                onChange={(e) => visit({ per_page: Number(e.target.value), page: 1 })}
                                                className="h-9 rounded-xl border border-lx-border bg-white px-2 text-sm font-bold text-lx-navy"
                                            >
                                                {[10, 25, 50, 100].map((n) => (
                                                    <option key={n} value={n}>
                                                        {n}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <div className="relative">
                                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <input
                                                value={search}
                                                onChange={(e) => onSearchChange(e.target.value)}
                                                placeholder="Search name, activity, user, company..."
                                                className="h-9 w-[280px] rounded-xl border border-lx-border bg-white pl-9 pr-3 text-sm outline-none focus:border-lx-blue"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <p className="m-0 border-b border-lx-line px-4 py-2 text-xs font-semibold text-slate-500">
                                    Newest entries stay first. Click <strong>Reservation Name</strong> to sort A–Z / Z–A,
                                    or <strong>Date</strong> to return to newest first.
                                </p>

                                <div className="max-h-[min(70vh,calc(100vh-220px))] overflow-auto [scrollbar-width:thin]">
                                    <table className="w-full min-w-[1280px] border-collapse">
                                        <thead>
                                            <tr>
                                                {columns.map((column) => (
                                                    <th
                                                        key={column.key}
                                                        onClick={column.sortable ? () => toggleSort(column.key) : undefined}
                                                        className={`sticky top-0 z-20 whitespace-nowrap border-b border-lx-line bg-[#fbfdff] p-3 text-left text-xs font-black text-lx-ink-soft shadow-[0_1px_0_0_#edf2fb] ${
                                                            column.sortable ? 'cursor-pointer hover:bg-[#eef4ff]' : ''
                                                        }`}
                                                    >
                                                        <span className="inline-flex items-center gap-1">
                                                            {column.label}
                                                            {column.sortable && (
                                                                <span
                                                                    className={`text-[10px] ${
                                                                        filters.sort === column.key
                                                                            ? 'text-lx-blue'
                                                                            : 'text-slate-300'
                                                                    }`}
                                                                >
                                                                    {sortArrow(column.key)}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {trails.length === 0 ? (
                                                <tr>
                                                    <td colSpan={columns.length} className="px-4 py-16 text-center">
                                                        <p className="m-0 text-sm font-bold text-slate-500">
                                                            {message || 'Nothing to show — you’re all caught up.'}
                                                        </p>
                                                        {!available && (
                                                            <p className="mt-2 text-xs font-semibold text-slate-400">
                                                                Audit rows come from the shared reservation activity log.
                                                            </p>
                                                        )}
                                                    </td>
                                                </tr>
                                            ) : (
                                                trails.map((trail) => (
                                                    <tr
                                                        key={trail.id}
                                                        className="cursor-pointer hover:bg-[#f8fbff]"
                                                        onClick={() => setSelected(trail)}
                                                    >
                                                        <td className="whitespace-nowrap border-b border-lx-line p-3 text-[13px] font-extrabold text-lx-ink">
                                                            <div className="flex items-center gap-2.5">
                                                                <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-lx-blue text-[11px] font-black text-white">
                                                                    {trail.initials}
                                                                </span>
                                                                {trail.guestName}
                                                            </div>
                                                        </td>
                                                        <td className="border-b border-lx-line p-3 text-[13px]">
                                                            <span
                                                                className={`inline-flex max-w-[220px] truncate rounded-full px-2.5 py-1 text-[11px] font-black ${activityTone(trail.activityType)}`}
                                                                title={trail.activityLabel}
                                                            >
                                                                {trail.activityLabel}
                                                            </span>
                                                        </td>
                                                        <td className="whitespace-nowrap border-b border-lx-line p-3 text-[13px] text-lx-ink">
                                                            {trail.date}
                                                        </td>
                                                        <td className="whitespace-nowrap border-b border-lx-line p-3 text-[13px] text-lx-ink">
                                                            {trail.time}
                                                        </td>
                                                        <td className="whitespace-nowrap border-b border-lx-line p-3 text-[13px] font-bold text-lx-ink">
                                                            {trail.username}
                                                        </td>
                                                        <td className="whitespace-nowrap border-b border-lx-line p-3 text-[13px] text-lx-ink">
                                                            {trail.stay || '—'}
                                                        </td>
                                                        <td className="border-b border-lx-line p-3 text-[13px] text-lx-ink">
                                                            {trail.company}
                                                        </td>
                                                        <td className="whitespace-nowrap border-b border-lx-line p-3 text-[13px] text-lx-ink">
                                                            {trail.province}
                                                        </td>
                                                        <td className="whitespace-nowrap border-b border-lx-line p-3 text-[13px] text-lx-ink">
                                                            {trail.shift}
                                                        </td>
                                                        <td className="whitespace-nowrap border-b border-lx-line p-3 text-[13px] text-lx-ink">
                                                            {trail.roomType}
                                                        </td>
                                                        <td className="border-b border-lx-line p-3 text-[13px]">
                                                            {trail.canOpen ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelected(trail);
                                                                    }}
                                                                    className="font-black text-lx-blue hover:underline"
                                                                >
                                                                    Open
                                                                </button>
                                                            ) : (
                                                                <span className="text-slate-300">—</span>
                                                            )}
                                                        </td>
                                                        <td className="border-b border-lx-line p-3 text-[13px]">
                                                            {trail.hasNotes ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setNotesTrail(trail);
                                                                    }}
                                                                    className="font-black text-lx-blue hover:underline"
                                                                >
                                                                    View
                                                                </button>
                                                            ) : (
                                                                <span className="text-slate-300">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-lx-border px-4 py-3 text-sm font-bold text-slate-500">
                                    <p className="m-0">
                                        {pagination.total
                                            ? `Showing ${pagination.from}–${pagination.to} of ${formatNumber(pagination.total)}`
                                            : 'No entries'}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={(pagination.current_page || 1) <= 1}
                                            onClick={() => visit({ page: (pagination.current_page || 1) - 1 })}
                                            className="h-9 rounded-xl border border-lx-border bg-white px-3 text-lx-navy disabled:opacity-40"
                                        >
                                            Previous
                                        </button>
                                        <span>
                                            Page {pagination.current_page || 1} of {pagination.last_page || 1}
                                        </span>
                                        <button
                                            type="button"
                                            disabled={(pagination.current_page || 1) >= (pagination.last_page || 1)}
                                            onClick={() => visit({ page: (pagination.current_page || 1) + 1 })}
                                            className="h-9 rounded-xl border border-lx-border bg-white px-3 text-lx-navy disabled:opacity-40"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </AppPageBody>
                </AppPageShell>
            </AppLayout>

            <DetailDrawer
                trail={selected}
                onClose={() => setSelected(null)}
                onViewNotes={(trail) => setNotesTrail(trail)}
            />
            <NotesModal trail={notesTrail} onClose={() => setNotesTrail(null)} />
        </>
    );
}
