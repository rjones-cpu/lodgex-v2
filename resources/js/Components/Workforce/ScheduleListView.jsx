import {
    AlertTriangle,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Download,
    Filter,
    UserRound,
    UsersRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';

const PAGE_SIZE = 15;

function parseDate(value) {
    return value ? new Date(`${value}T00:00:00`) : null;
}

function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + amount);

    return nextDate;
}

function startOfWeek(date) {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
    weekStart.setHours(0, 0, 0, 0);

    return weekStart;
}

function formatRange(start, end) {
    const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endLabel = end.toLocaleDateString('en-US', {
        month: start.getMonth() === end.getMonth() ? undefined : 'short',
        day: 'numeric',
        year: 'numeric',
    });

    return `${startLabel} – ${endLabel}`;
}

function initials(name) {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0] || '')
        .join('')
        .toUpperCase();
}

function isBetween(date, start, end) {
    return (!start || date >= start) && (!end || date <= end);
}

function scheduleForDate(schedule, date) {
    const day = schedule.scheduleData?.[toDateKey(date)];
    if (!day) {
        return { label: '', detail: '', tone: 'empty' };
    }

    const boardTypeById = {
        1: 'work',
        2: 'work',
        3: 'work',
        4: 'off',
        5: 'travel',
        6: 'sick',
        9: 'vacation',
        11: 'work',
        13: 'no sleep',
        14: 'no show',
        15: 'blocked',
        16: 'offsite',
    };
    const typeName = String(day.typeName || '').trim();
    const normalizedType = boardTypeById[Number(day.typeId)]
        || typeName.toLowerCase().replaceAll('_', ' ');
    const pendingDetail = day.isPending ? 'Pending change' : '';

    if (normalizedType.includes('work')) {
        return { label: schedule.shift || typeName || 'Work Day', detail: pendingDetail, tone: 'work' };
    }
    if (normalizedType.includes('travel')) {
        return { label: typeName || 'Travel Day', detail: pendingDetail, tone: 'travel' };
    }
    if (normalizedType.includes('vacation')) {
        return { label: typeName, detail: pendingDetail, tone: 'vacation' };
    }
    if (normalizedType.includes('sick')) {
        return { label: typeName, detail: pendingDetail, tone: 'sick' };
    }
    if (normalizedType.includes('no show')) {
        return { label: typeName, detail: pendingDetail, tone: 'no-show' };
    }
    if (normalizedType.includes('no sleep')) {
        return { label: typeName, detail: pendingDetail, tone: 'no-sleep' };
    }
    if (normalizedType.includes('blocked')) {
        return { label: typeName, detail: pendingDetail, tone: 'blocked' };
    }
    if (normalizedType.includes('offsite')) {
        return { label: typeName, detail: pendingDetail, tone: 'offsite' };
    }
    if (normalizedType.includes('off') || normalizedType === 'loa') {
        return { label: typeName || 'Off', detail: pendingDetail, tone: 'off' };
    }

    return { label: typeName || 'Scheduled', detail: pendingDetail, tone: 'work' };
}

const CELL_STYLES = {
    empty: 'border-transparent bg-white text-slate-400',
    work: 'border-blue-100 bg-blue-50 text-blue-800',
    travel: 'border-amber-100 bg-amber-50 text-amber-800',
    off: 'border-slate-100 bg-slate-50 text-slate-500',
    offsite: 'border-violet-100 bg-violet-50 text-violet-700',
    sick: 'border-rose-100 bg-rose-50 text-rose-700',
    vacation: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    'no-show': 'border-yellow-200 bg-yellow-50 text-yellow-800',
    'no-sleep': 'border-sky-200 bg-sky-100 text-sky-800',
    blocked: 'border-slate-300 bg-slate-200 text-slate-700',
};

function MetricCard({ icon: Icon, label, value, detail, tone }) {
    const tones = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
        orange: 'bg-orange-50 text-orange-600',
        red: 'bg-rose-50 text-rose-600',
    };

    return (
        <article className="flex min-w-0 items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="min-w-0">
                <p className="m-0 truncate text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
                <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">{detail}</p>
            </div>
            <span className={`ml-3 grid h-10 w-10 shrink-0 place-items-center rounded-full ${tones[tone]}`}>
                <Icon className="h-5 w-5" />
            </span>
        </article>
    );
}

export default function ScheduleListView({ schedules = [] }) {
    const today = useMemo(() => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return date;
    }, []);
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
    const [department, setDepartment] = useState('all');
    const [shift, setShift] = useState('all');
    const [company, setCompany] = useState('all');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [page, setPage] = useState(1);

    const weekDates = useMemo(
        () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
        [weekStart],
    );
    const weekEnd = weekDates[6];
    const departments = useMemo(
        () => [...new Set(schedules.map((item) => item.department).filter(Boolean))].sort(),
        [schedules],
    );
    const shifts = useMemo(
        () => [...new Set(schedules.map((item) => item.shift).filter(Boolean))].sort(),
        [schedules],
    );
    const companies = useMemo(
        () => [...new Set(schedules.map((item) => item.company).filter(Boolean))].sort(),
        [schedules],
    );
    const filteredSchedules = useMemo(
        () => schedules.filter((item) => (
            (department === 'all' || item.department === department)
            && (shift === 'all' || item.shift === shift)
            && (company === 'all' || item.company === company)
        )),
        [company, department, schedules, shift],
    );
    const totalPages = Math.max(1, Math.ceil(filteredSchedules.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const visibleSchedules = filteredSchedules.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
    );

    const weekSchedules = schedules.filter((item) => {
        const arrival = parseDate(item.arrivalDate);
        const departure = parseDate(item.departureDate);
        return (!departure || departure >= weekStart) && (!arrival || arrival <= weekEnd);
    });
    const onsiteToday = schedules.filter((item) => (
        isBetween(today, parseDate(item.arrivalDate), parseDate(item.departureDate))
    )).length;
    const nextSevenDays = addDays(today, 7);
    const arrivals = schedules.filter((item) => {
        const date = parseDate(item.arrivalDate);
        return date && date >= today && date <= nextSevenDays;
    }).length;
    const departures = schedules.filter((item) => {
        const date = parseDate(item.departureDate);
        return date && date >= today && date <= nextSevenDays;
    }).length;
    const issues = schedules.filter((item) => (
        ['pending', 'cancelled', 'canceled', 'denied'].includes(String(item.status || '').toLowerCase())
    )).length;

    function updateFilter(setter, value) {
        setter(value);
        setPage(1);
    }

    function exportCsv() {
        const headers = ['Worker', 'Position', 'Department', 'Company', 'Shift', 'Arrival', 'Departure', 'Status'];
        const rows = filteredSchedules.map((item) => [
            item.worker,
            item.position,
            item.department,
            item.company,
            item.shift,
            item.arrivalDate,
            item.departureDate,
            item.status,
        ]);
        const csv = [headers, ...rows]
            .map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
            .join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `workforce-schedule-${toDateKey(weekStart)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    return (
        <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard icon={UsersRound} label="Workers Scheduled" value={weekSchedules.length} detail="In selected week" tone="blue" />
                <MetricCard icon={Clock3} label="Onsite Today" value={onsiteToday} detail={`${schedules.length ? Math.round((onsiteToday / schedules.length) * 100) : 0}% of workforce`} tone="green" />
                <MetricCard icon={UsersRound} label="Arrivals (7 Days)" value={arrivals} detail="Upcoming arrivals" tone="amber" />
                <MetricCard icon={UserRound} label="Departures (7 Days)" value={departures} detail="Upcoming departures" tone="orange" />
                <MetricCard icon={AlertTriangle} label="Schedule Issues" value={issues} detail={issues ? 'Requires review' : 'No open issues'} tone="red" />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 p-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                        <select
                            value={department}
                            onChange={(event) => updateFilter(setDepartment, event.target.value)}
                            className="rounded-lg border-slate-200 py-2 pl-3 pr-8 text-xs font-bold text-slate-700 focus:border-lx-blue focus:ring-lx-blue"
                        >
                            <option value="all">All Departments</option>
                            {departments.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        <select
                            value={shift}
                            onChange={(event) => updateFilter(setShift, event.target.value)}
                            className="rounded-lg border-slate-200 py-2 pl-3 pr-8 text-xs font-bold text-slate-700 focus:border-lx-blue focus:ring-lx-blue"
                        >
                            <option value="all">All Shifts</option>
                            {shifts.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        <select
                            value={company}
                            onChange={(event) => updateFilter(setCompany, event.target.value)}
                            className={`${filtersOpen ? 'block' : 'hidden'} rounded-lg border-slate-200 py-2 pl-3 pr-8 text-xs font-bold text-slate-700 focus:border-lx-blue focus:ring-lx-blue sm:block`}
                        >
                            <option value="all">All Companies</option>
                            {companies.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center rounded-lg border border-slate-200 bg-white">
                            <button
                                type="button"
                                onClick={() => setWeekStart((date) => addDays(date, -7))}
                                className="p-2 text-slate-500 hover:bg-slate-50"
                                aria-label="Previous week"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="flex items-center gap-2 border-x border-slate-200 px-3 py-2 text-xs font-black text-slate-700">
                                <CalendarDays className="h-4 w-4 text-slate-400" />
                                {formatRange(weekStart, weekEnd)}
                            </span>
                            <button
                                type="button"
                                onClick={() => setWeekStart((date) => addDays(date, 7))}
                                className="p-2 text-slate-500 hover:bg-slate-50"
                                aria-label="Next week"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => setWeekStart(startOfWeek(today))}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => setFiltersOpen((value) => !value)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 sm:hidden"
                        >
                            <Filter className="h-4 w-4" />
                            Filters
                        </button>
                        <button
                            type="button"
                            onClick={exportCsv}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                        >
                            <Download className="h-4 w-4" />
                            Export
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-[1200px] w-full border-collapse text-left">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/70">
                                <th className="sticky left-0 z-20 min-w-52 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Worker / Position</th>
                                <th className="min-w-36 px-3 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Department</th>
                                <th className="min-w-32 px-3 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500">Company</th>
                                {weekDates.map((date) => (
                                    <th key={toDateKey(date)} className="min-w-32 px-2 py-3 text-[10px] font-black text-slate-500">
                                        <span className="block uppercase tracking-wide">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                        <span className={toDateKey(date) === toDateKey(today) ? 'text-lx-blue' : 'text-slate-800'}>
                                            {date.toLocaleDateString('en-US', { day: 'numeric' })}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {visibleSchedules.map((schedule, rowIndex) => (
                                <tr key={schedule.scheduleId || schedule.id} className="border-b border-slate-100 last:border-b-0">
                                    <td className="sticky left-0 z-10 bg-white px-4 py-2.5">
                                        <div className="flex items-center gap-2.5">
                                            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-black ${
                                                rowIndex % 3 === 0 ? 'bg-blue-100 text-blue-700' : rowIndex % 3 === 1 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                                {initials(schedule.worker)}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="m-0 truncate text-xs font-black text-slate-900">{schedule.worker}</p>
                                                <p className="m-0 truncate text-[10px] font-semibold text-slate-500">{schedule.position}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-[11px] font-bold text-slate-600">{schedule.department || 'Unassigned'}</td>
                                    <td className="px-3 py-2.5 text-[11px] font-bold text-slate-600">{schedule.company}</td>
                                    {weekDates.map((date) => {
                                        const assignment = scheduleForDate(schedule, date);
                                        return (
                                            <td key={toDateKey(date)} className="px-1.5 py-2">
                                                <div className={`min-h-11 rounded-md border px-2 py-1.5 ${CELL_STYLES[assignment.tone]}`}>
                                                    <p className="m-0 truncate text-[10px] font-black">{assignment.label}</p>
                                                    {assignment.detail && <p className="m-0 mt-0.5 truncate text-[9px] font-semibold opacity-75">{assignment.detail}</p>}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {visibleSchedules.length === 0 && (
                        <div className="grid min-h-64 place-items-center px-6 text-center">
                            <div>
                                <UsersRound className="mx-auto h-9 w-9 text-slate-300" />
                                <h2 className="mt-3 text-sm font-black text-slate-800">No workers found</h2>
                                <p className="mt-1 text-xs font-semibold text-slate-500">Add a schedule or adjust the selected filters.</p>
                            </div>
                        </div>
                    )}
                </div>

                <footer className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="m-0 text-[11px] font-semibold text-slate-500">
                        Showing {filteredSchedules.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0} to {Math.min(currentPage * PAGE_SIZE, filteredSchedules.length)} of {filteredSchedules.length} workers
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            disabled={currentPage === 1}
                            onClick={() => setPage((value) => Math.max(1, value - 1))}
                            className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 disabled:opacity-40"
                            aria-label="Previous page"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                            <button
                                key={pageNumber}
                                type="button"
                                onClick={() => setPage(pageNumber)}
                                className={`h-8 min-w-8 rounded-md px-2 text-xs font-black ${
                                    currentPage === pageNumber
                                        ? 'bg-lx-blue text-white'
                                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                {pageNumber}
                            </button>
                        ))}
                        <button
                            type="button"
                            disabled={currentPage === totalPages}
                            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                            className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-500 disabled:opacity-40"
                            aria-label="Next page"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </footer>
            </div>
        </section>
    );
}
