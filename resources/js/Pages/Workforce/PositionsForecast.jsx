import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Download, SlidersHorizontal } from 'lucide-react';

import WorkforceLayout from '../../Layouts/WorkforceLayout';
import {
    KpiCard,
    KPI_ICON,
    OccupancyForecastChart,
    PositionRequirementsTable,
    StaffingDonut,
    TopShortagesList,
} from '../../Components/Workforce/WorkforceWidgets';
import {
    CAMP_CAPACITY,
    DEPARTMENTS,
    FORECAST_DAYS,
    buildDaySnapshot,
    grandTotals,
    initialForecastDayIndex,
} from '../../data/workforceSeed';

const DURATIONS = ['7 Days', '14 Days', '30 Days'];

export default function PositionsForecast({ inHouseCount = 0, occupancyForecast = [] }) {
    const [duration, setDuration] = useState('7 Days');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [selectedDayIndex, setSelectedDayIndex] = useState(() => initialForecastDayIndex());
    const [selectedDepartments, setSelectedDepartments] = useState(() => DEPARTMENTS.map((d) => d.id));
    const [toast, setToast] = useState('');

    const visibleDepartments = useMemo(
        () => DEPARTMENTS.filter((department) => selectedDepartments.includes(department.id)),
        [selectedDepartments],
    );

    const dayTotals = useMemo(() => grandTotals(visibleDepartments), [visibleDepartments]);

    const snapshot = useMemo(
        () => buildDaySnapshot(selectedDayIndex, visibleDepartments, dayTotals),
        [selectedDayIndex, visibleDepartments, dayTotals],
    );

    const selectedDay = FORECAST_DAYS[selectedDayIndex];
    const occupancyPercent = CAMP_CAPACITY
        ? Math.round((inHouseCount / CAMP_CAPACITY) * 1000) / 10
        : 0;

    function flash(message) {
        setToast(message);
        window.clearTimeout(flash._timer);
        flash._timer = window.setTimeout(() => setToast(''), 2200);
    }

    function toggleDepartment(id) {
        setSelectedDepartments((current) => {
            if (current.includes(id)) {
                return current.length === 1 ? current : current.filter((value) => value !== id);
            }
            return [...current, id];
        });
    }

    function exportCsv() {
        const header = ['Department', 'Position', ...['Aug 15', 'Aug 16', 'Aug 17', 'Aug 18', 'Aug 19', 'Aug 20', 'Aug 21'].flatMap((day) => [`${day} REQ`, `${day} FILLED`, `${day} GAP`])];
        const rows = visibleDepartments.flatMap((department) =>
            department.positions.map((position) => [
                department.name,
                position.name,
                ...position.days.flatMap((day) => [day.req, day.filled, day.gap]),
            ]),
        );
        const csv = [header, ...rows].map((row) => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'workforce-positions-forecast.csv';
        link.click();
        URL.revokeObjectURL(url);
        flash('Forecast exported');
    }

    const toolbar = (
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center 2xl:justify-end">
            <div className="col-span-2 inline-flex min-w-0 items-center justify-between gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm font-bold text-slate-700 shadow-sm sm:col-auto sm:w-auto">
                <button
                    type="button"
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-40"
                    aria-label="Previous day"
                    disabled={selectedDayIndex === 0}
                    onClick={() => setSelectedDayIndex((index) => Math.max(0, index - 1))}
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <CalendarDays className="h-4 w-4 shrink-0 text-lx-blue" />
                <span className="truncate">{selectedDay.label}, 2026</span>
                <button
                    type="button"
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-40"
                    aria-label="Next day"
                    disabled={selectedDayIndex === FORECAST_DAYS.length - 1}
                    onClick={() => setSelectedDayIndex((index) => Math.min(FORECAST_DAYS.length - 1, index + 1))}
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
            <select
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                className="w-full min-w-0 rounded-xl border-slate-200 text-sm font-bold text-slate-700 shadow-sm sm:w-auto"
            >
                {DURATIONS.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
            <div className="relative w-full sm:w-auto">
                <button
                    type="button"
                    onClick={() => setFiltersOpen((value) => !value)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 sm:w-auto"
                >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                </button>
                {filtersOpen && (
                    <div className="absolute left-0 z-20 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:left-auto sm:right-0">
                        <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Departments</p>
                        <div className="space-y-2">
                            {DEPARTMENTS.map((department) => (
                                <label key={department.id} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={selectedDepartments.includes(department.id)}
                                        onChange={() => toggleDepartment(department.id)}
                                        className="rounded border-slate-300 text-lx-blue"
                                    />
                                    {department.name}
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <button
                type="button"
                onClick={exportCsv}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-lx-blue px-3 py-2 text-sm font-black text-white shadow-sm hover:bg-[#0952b8] sm:w-auto"
            >
                <Download className="h-4 w-4" />
                <span className="sm:hidden">Export</span>
                <span className="hidden sm:inline">Export Report</span>
            </button>
        </div>
    );

    return (
        <WorkforceLayout
            title="Workforce Requirements Forecast"
            subtitle="Plan, monitor and forecast camp workforce needs by position."
            activeHref="workforce.positions-forecast"
            toolbar={toolbar}
        >
            {duration !== '7 Days' && (
                <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
                    Demo data is a 7-day snapshot. {duration} will use the same week until live forecasts are wired.
                </p>
            )}

            <p className="mb-3 text-[11px] font-bold leading-5 text-slate-500 sm:text-xs">
                Positions Filled, Required, and Gap use TOTAL ALL POSITIONS for {selectedDay.label}: {snapshot.filled.count} filled / {snapshot.required.count} required / {dayTotals.days[selectedDayIndex].gap}.
            </p>
            <section className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <KpiCard
                    label="Current Occupancy"
                    value={inHouseCount}
                    unit="People in Camp"
                    caption={`Capacity: ${CAMP_CAPACITY}`}
                    percent={occupancyPercent}
                    barColor="bg-blue-500"
                    icon={KPI_ICON.occupancy}
                    iconClass="bg-blue-50 text-blue-600"
                />
                <KpiCard
                    label="Positions Filled"
                    value={snapshot.filled.count}
                    unit="Filled Positions"
                    caption="vs Required"
                    percent={snapshot.filled.percent}
                    barColor="bg-emerald-500"
                    icon={KPI_ICON.filled}
                    iconClass="bg-emerald-50 text-emerald-600"
                />
                <KpiCard
                    label="Positions Required"
                    value={snapshot.required.count}
                    unit="Total Required"
                    caption={`Open Positions: ${snapshot.required.open}`}
                    percent={snapshot.required.percent}
                    barColor="bg-orange-400"
                    icon={KPI_ICON.required}
                    iconClass="bg-orange-50 text-orange-600"
                />
                <KpiCard
                    label="Staffing Gap"
                    value={snapshot.gap.count}
                    unit="Positions to Fill"
                    caption="vs Forecast"
                    percent={snapshot.gap.percent}
                    barColor="bg-red-500"
                    icon={KPI_ICON.gap}
                    iconClass="bg-red-50 text-red-600"
                    alert
                />
                <KpiCard
                    label="Housekeeping Workload"
                    value={snapshot.housekeeping.roomsPerHousekeeper}
                    unit="Rooms Per Housekeeper"
                    caption={`Target: ${snapshot.housekeeping.targetMin}–${snapshot.housekeeping.targetMax}`}
                    icon={KPI_ICON.housekeeping}
                    iconClass="bg-violet-50 text-violet-600"
                />
            </section>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.85fr)]">
                <OccupancyForecastChart points={occupancyForecast} />
                <StaffingDonut summary={snapshot.summary} />
                <TopShortagesList shortages={snapshot.shortages} />
            </div>

            <div className="mt-4 min-w-0">
                <PositionRequirementsTable
                    departments={visibleDepartments}
                    totals={dayTotals}
                    selectedDayIndex={selectedDayIndex}
                    onSelectDay={setSelectedDayIndex}
                />
            </div>

            {toast && (
                <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-lx-toast sm:left-auto sm:right-5 sm:bottom-5">
                    {toast}
                </div>
            )}
        </WorkforceLayout>
    );
}
