import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    Download,
    Filter,
    Info,
    PlaneLanding,
    PlaneTakeoff,
    UsersRound,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

const DAY_COUNT = 14;

function parseDate(value) {
    return value ? new Date(`${value}T00:00:00`) : null;
}

function addDays(date, amount) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + amount);
    return nextDate;
}

function startOfWeek(date) {
    const start = new Date(date);
    const day = start.getDay();
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
    start.setHours(0, 0, 0, 0);
    return start;
}

function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function isWithin(date, start, end) {
    return (!start || date >= start) && (!end || date <= end);
}

function isWorkDay(day) {
    if (!day) return false;
    const workTypeIds = [1, 2, 3, 11];
    return workTypeIds.includes(Number(day.typeId))
        || String(day.typeName || '').toLowerCase().includes('work');
}

function isNightShift(schedule) {
    return String(schedule.shift || '').toLowerCase().includes('night');
}

function formatRange(start, end) {
    const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startLabel} – ${endLabel}`;
}

function percentage(value, total) {
    return total ? Math.round((value / total) * 100) : 0;
}

function uniqueValues(schedules, key) {
    return [...new Set(schedules.map((schedule) => schedule[key]).filter(Boolean))].sort();
}

function SummaryCard({ icon: Icon, label, value, detail, tone = 'blue' }) {
    const tones = {
        blue: 'text-blue-600',
        green: 'text-emerald-600',
        amber: 'text-amber-600',
        orange: 'text-orange-500',
        red: 'text-rose-600',
    };

    return (
        <article className="flex min-w-0 items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="min-w-0">
                <p className="m-0 truncate text-[10px] font-bold text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-black leading-none text-slate-950">{value}</p>
                <p className="mt-1.5 truncate text-[9px] font-semibold text-slate-400">{detail}</p>
            </div>
            <Icon className={`h-5 w-5 shrink-0 ${tones[tone]}`} />
        </article>
    );
}

function ShiftCell({ label, scheduled, required, tone }) {
    const coverage = percentage(scheduled, required);
    const tones = {
        day: 'border-blue-100 bg-blue-50 text-blue-700',
        night: 'border-violet-100 bg-violet-50 text-violet-700',
    };

    return (
        <div className={`rounded-md border px-2 py-1.5 ${tones[tone]}`}>
            <div className="flex items-center justify-between gap-2 text-[9px] font-black">
                <span className="flex items-center gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${tone === 'day' ? 'bg-blue-500' : 'bg-violet-600'}`} />
                    {label}
                </span>
                <span>{coverage}%</span>
            </div>
            <p className="m-0 mt-1 text-[10px] font-black text-slate-700">
                {scheduled} / {required}
            </p>
        </div>
    );
}

function SidePanel({ title, children, action }) {
    return (
        <section className="rounded-lg border border-slate-200 bg-white">
            <header className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
                <h3 className="m-0 text-[11px] font-black text-slate-800">{title}</h3>
                {action}
            </header>
            {children}
        </section>
    );
}

export default function ScheduleCalendarView({ schedules = [] }) {
    const today = useMemo(() => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return date;
    }, []);
    const [rangeStart, setRangeStart] = useState(() => startOfWeek(new Date()));
    const [department, setDepartment] = useState('all');
    const [shift, setShift] = useState('all');
    const [company, setCompany] = useState('all');
    const [status, setStatus] = useState('all');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [showInfo, setShowInfo] = useState(true);

    const dates = useMemo(
        () => Array.from({ length: DAY_COUNT }, (_, index) => addDays(rangeStart, index)),
        [rangeStart],
    );
    const rangeEnd = dates[dates.length - 1];
    const departments = useMemo(() => uniqueValues(schedules, 'department'), [schedules]);
    const shifts = useMemo(() => uniqueValues(schedules, 'shift'), [schedules]);
    const companies = useMemo(() => uniqueValues(schedules, 'company'), [schedules]);
    const statuses = useMemo(() => uniqueValues(schedules, 'status'), [schedules]);
    const filteredSchedules = useMemo(
        () => schedules.filter((schedule) => (
            (department === 'all' || schedule.department === department)
            && (shift === 'all' || schedule.shift === shift)
            && (company === 'all' || schedule.company === company)
            && (status === 'all' || schedule.status === status)
        )),
        [company, department, schedules, shift, status],
    );

    const dayStats = useMemo(
        () => dates.map((date) => {
            const active = filteredSchedules.filter((schedule) => (
                isWithin(date, parseDate(schedule.arrivalDate), parseDate(schedule.departureDate))
            ));
            const dayWorkers = active.filter((schedule) => !isNightShift(schedule));
            const nightWorkers = active.filter(isNightShift);
            const dateKey = toDateKey(date);
            const dayScheduled = dayWorkers.filter((schedule) => isWorkDay(schedule.scheduleData?.[dateKey])).length;
            const nightScheduled = nightWorkers.filter((schedule) => isWorkDay(schedule.scheduleData?.[dateKey])).length;

            return {
                date,
                dayRequired: dayWorkers.length,
                dayScheduled,
                nightRequired: nightWorkers.length,
                nightScheduled,
                shortage: Math.max(0, dayWorkers.length - dayScheduled)
                    + Math.max(0, nightWorkers.length - nightScheduled),
            };
        }),
        [dates, filteredSchedules],
    );

    const onsiteToday = filteredSchedules.filter((schedule) => (
        isWithin(today, parseDate(schedule.arrivalDate), parseDate(schedule.departureDate))
    )).length;
    const arrivals = filteredSchedules.filter((schedule) => {
        const arrival = parseDate(schedule.arrivalDate);
        return arrival && arrival >= rangeStart && arrival <= rangeEnd;
    });
    const departures = filteredSchedules.filter((schedule) => {
        const departure = parseDate(schedule.departureDate);
        return departure && departure >= rangeStart && departure <= rangeEnd;
    });
    const pending = filteredSchedules.filter((schedule) => (
        String(schedule.status || '').toLowerCase() === 'pending'
        || Object.values(schedule.scheduleData || {}).some((day) => day.isPending)
    ));
    const issueDays = dayStats.filter((day) => day.shortage > 0);
    const totalRequired = dayStats.reduce((sum, day) => sum + day.dayRequired + day.nightRequired, 0);
    const totalScheduled = dayStats.reduce((sum, day) => sum + day.dayScheduled + day.nightScheduled, 0);
    const rangeWorkers = filteredSchedules.filter((schedule) => (
        (!parseDate(schedule.departureDate) || parseDate(schedule.departureDate) >= rangeStart)
        && (!parseDate(schedule.arrivalDate) || parseDate(schedule.arrivalDate) <= rangeEnd)
    )).length;

    const positionStats = useMemo(() => {
        const positions = {};
        filteredSchedules.forEach((schedule) => {
            const arrival = parseDate(schedule.arrivalDate);
            const departure = parseDate(schedule.departureDate);
            if ((arrival && arrival > rangeEnd) || (departure && departure < rangeStart)) return;

            const position = schedule.position || 'Unassigned';
            if (!positions[position]) positions[position] = { required: 0, scheduled: 0 };
            positions[position].required += 1;
            if (dates.some((date) => isWorkDay(schedule.scheduleData?.[toDateKey(date)]))) {
                positions[position].scheduled += 1;
            }
        });

        return Object.entries(positions)
            .map(([position, counts]) => ({ position, ...counts }))
            .sort((left, right) => (right.required - right.scheduled) - (left.required - left.scheduled))
            .slice(0, 5);
    }, [dates, filteredSchedules, rangeEnd, rangeStart]);

    function exportCsv() {
        const rows = [
            ['Date', 'Day Scheduled', 'Day Required', 'Night Scheduled', 'Night Required', 'Shortage'],
            ...dayStats.map((day) => [
                toDateKey(day.date),
                day.dayScheduled,
                day.dayRequired,
                day.nightScheduled,
                day.nightRequired,
                day.shortage,
            ]),
        ];
        const csv = rows.map((row) => row.map((value) => `"${value}"`).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `workforce-calendar-${toDateKey(rangeStart)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    return (
        <section className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryCard icon={UsersRound} label="Workers Scheduled" value={rangeWorkers} detail="In selected two weeks" />
                <SummaryCard icon={CheckCircle2} label="Onsite Today" value={onsiteToday} detail={`${percentage(onsiteToday, filteredSchedules.length)}% of workforce`} tone="green" />
                <SummaryCard icon={PlaneLanding} label="Arrivals (14 Days)" value={arrivals.length} detail={arrivals[0]?.arrivalDate ? `Next: ${arrivals[0].arrivalDate}` : 'No upcoming arrivals'} tone="amber" />
                <SummaryCard icon={PlaneTakeoff} label="Departures (14 Days)" value={departures.length} detail={departures[0]?.departureDate ? `Next: ${departures[0].departureDate}` : 'No upcoming departures'} tone="orange" />
                <SummaryCard icon={AlertTriangle} label="Schedule Issues" value={issueDays.length + pending.length} detail={issueDays.length ? `${issueDays.length} coverage gaps` : 'No coverage gaps'} tone="red" />
            </div>

            <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_270px]">
                <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-200 p-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap gap-2">
                            <select value={department} onChange={(event) => setDepartment(event.target.value)} className="rounded-md border-slate-200 py-1.5 pl-2.5 pr-7 text-[10px] font-bold text-slate-700 focus:border-lx-blue focus:ring-lx-blue">
                                <option value="all">All Departments</option>
                                {departments.map((item) => <option key={item} value={item}>{item}</option>)}
                            </select>
                            <select value={shift} onChange={(event) => setShift(event.target.value)} className="rounded-md border-slate-200 py-1.5 pl-2.5 pr-7 text-[10px] font-bold text-slate-700 focus:border-lx-blue focus:ring-lx-blue">
                                <option value="all">All Shifts</option>
                                {shifts.map((item) => <option key={item} value={item}>{item}</option>)}
                            </select>
                            <select value={company} onChange={(event) => setCompany(event.target.value)} className={`${filtersOpen ? 'block' : 'hidden'} rounded-md border-slate-200 py-1.5 pl-2.5 pr-7 text-[10px] font-bold text-slate-700 focus:border-lx-blue focus:ring-lx-blue sm:block`}>
                                <option value="all">All Companies</option>
                                {companies.map((item) => <option key={item} value={item}>{item}</option>)}
                            </select>
                            <select value={status} onChange={(event) => setStatus(event.target.value)} className={`${filtersOpen ? 'block' : 'hidden'} rounded-md border-slate-200 py-1.5 pl-2.5 pr-7 text-[10px] font-bold text-slate-700 focus:border-lx-blue focus:ring-lx-blue md:block`}>
                                <option value="all">All Worker Statuses</option>
                                {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
                            </select>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => setRangeStart((date) => addDays(date, -DAY_COUNT))} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 text-[10px] font-black text-slate-600 hover:bg-slate-50">
                                <ChevronLeft className="h-3.5 w-3.5" /> Previous
                            </button>
                            <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-700">
                                <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                                {formatRange(rangeStart, rangeEnd)}
                            </span>
                            <button type="button" onClick={() => setRangeStart((date) => addDays(date, DAY_COUNT))} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 text-[10px] font-black text-slate-600 hover:bg-slate-50">
                                Next <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => setRangeStart(startOfWeek(today))} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] font-black text-slate-600 hover:bg-slate-50">Today</button>
                            <button type="button" onClick={() => setFiltersOpen((value) => !value)} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] font-black text-slate-600 hover:bg-slate-50 sm:hidden">
                                <Filter className="h-3.5 w-3.5" /> Filters
                            </button>
                            <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] font-black text-slate-600 hover:bg-slate-50">
                                <Download className="h-3.5 w-3.5" /> Export
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto p-3">
                        <div className="min-w-[940px]">
                            <div className="grid grid-cols-7 border-l border-t border-slate-200">
                                {dayStats.map((day) => {
                                    const dateKey = toDateKey(day.date);
                                    const dayCoverage = percentage(
                                        day.dayScheduled + day.nightScheduled,
                                        day.dayRequired + day.nightRequired,
                                    );
                                    return (
                                        <article key={dateKey} className="min-h-[165px] border-b border-r border-slate-200 bg-white">
                                            <header className={`border-b border-slate-100 px-2.5 py-2 text-center ${dateKey === toDateKey(today) ? 'bg-blue-50' : ''}`}>
                                                <p className="m-0 text-[9px] font-black text-slate-500">{day.date.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                                                <p className={`m-0 text-[10px] font-black ${dateKey === toDateKey(today) ? 'text-lx-blue' : 'text-slate-800'}`}>
                                                    {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </p>
                                            </header>
                                            <div className="space-y-1.5 p-2">
                                                <ShiftCell label="Day Shift" scheduled={day.dayScheduled} required={day.dayRequired} tone="day" />
                                                <ShiftCell label="Night Shift" scheduled={day.nightScheduled} required={day.nightRequired} tone="night" />
                                                <div className={`flex items-center gap-1 text-[9px] font-black ${day.shortage ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {day.shortage ? <CircleAlert className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                                                    {day.shortage ? `Coverage gap (${day.shortage})` : `Good · ${dayCoverage}%`}
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200 px-3 py-2.5">
                        <span className="text-[9px] font-black text-slate-600">Legend:</span>
                        {[['bg-blue-500', 'Day Shift'], ['bg-violet-600', 'Night Shift'], ['bg-emerald-500', 'Covered'], ['bg-rose-500', 'Coverage Gap'], ['bg-amber-400', 'Pending Change']].map(([color, label]) => (
                            <span key={label} className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-500">
                                <span className={`h-2 w-2 rounded-full ${color}`} /> {label}
                            </span>
                        ))}
                    </footer>
                </div>

                <aside className="space-y-3">
                    <SidePanel title={`Required Positions (${formatRange(rangeStart, rangeEnd)})`}>
                        <div className="overflow-x-auto p-3">
                            <div className="grid grid-cols-[1fr_45px_45px_42px] gap-y-2 text-[9px]">
                                <span className="font-black text-slate-500">Position</span>
                                <span className="text-center font-black text-slate-500">Required</span>
                                <span className="text-center font-black text-slate-500">Scheduled</span>
                                <span className="text-right font-black text-slate-500">Shortage</span>
                                {positionStats.map((item) => {
                                    const shortage = Math.max(0, item.required - item.scheduled);
                                    return (
                                        <div key={item.position} className="col-span-4 grid grid-cols-[1fr_45px_45px_42px] border-t border-slate-100 pt-2">
                                            <span className="truncate font-bold text-slate-700">{item.position}</span>
                                            <span className="text-center font-semibold text-slate-600">{item.required}</span>
                                            <span className="text-center font-semibold text-slate-600">{item.scheduled}</span>
                                            <span className={`text-right font-black ${shortage ? 'text-rose-600' : 'text-emerald-600'}`}>{shortage}</span>
                                        </div>
                                    );
                                })}
                                {!positionStats.length && <p className="col-span-4 py-3 text-center font-semibold text-slate-400">No positions in this range.</p>}
                            </div>
                            <div className="mt-3 grid grid-cols-[1fr_45px_45px_42px] border-t-2 border-slate-200 pt-2 text-[9px] font-black text-slate-800">
                                <span>Total</span>
                                <span className="text-center">{positionStats.reduce((sum, item) => sum + item.required, 0)}</span>
                                <span className="text-center">{positionStats.reduce((sum, item) => sum + item.scheduled, 0)}</span>
                                <span className="text-right text-rose-600">{positionStats.reduce((sum, item) => sum + Math.max(0, item.required - item.scheduled), 0)}</span>
                            </div>
                        </div>
                    </SidePanel>

                    <SidePanel title="Arrivals / Departures">
                        <div className="grid grid-cols-2 divide-x divide-slate-100 px-3 py-3 text-center">
                            <div><PlaneLanding className="mx-auto h-4 w-4 text-emerald-500" /><p className="mt-1 text-[9px] font-bold text-slate-500">Arrivals</p><p className="text-sm font-black text-slate-900">{arrivals.length}</p></div>
                            <div><PlaneTakeoff className="mx-auto h-4 w-4 text-violet-500" /><p className="mt-1 text-[9px] font-bold text-slate-500">Departures</p><p className="text-sm font-black text-slate-900">{departures.length}</p></div>
                        </div>
                    </SidePanel>

                    <SidePanel title="Schedule Alerts">
                        <div className="space-y-2 p-3 text-[9px] font-semibold text-slate-600">
                            <p className="m-0 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-500" /> {issueDays.length} coverage gaps</p>
                            <p className="m-0 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-400" /> {pending.length} pending schedule changes</p>
                            <p className="m-0 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-500" /> {percentage(totalScheduled, totalRequired)}% overall coverage</p>
                        </div>
                    </SidePanel>
                </aside>
            </div>

            {showInfo && (
                <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-[9px] font-semibold text-slate-500">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    Schedule data reflects worker assignments, shift patterns, arrival and departure dates, and pending schedule changes.
                    <button type="button" onClick={() => setShowInfo(false)} className="ml-auto text-slate-400 hover:text-slate-600" aria-label="Dismiss information"><X className="h-3.5 w-3.5" /></button>
                </div>
            )}
        </section>
    );
}
