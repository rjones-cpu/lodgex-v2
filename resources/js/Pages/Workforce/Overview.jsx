import { Link } from '@inertiajs/react';
import { ArrowRight, CalendarClock, ClipboardList, TriangleAlert } from 'lucide-react';

import WorkforceLayout from '../../Layouts/WorkforceLayout';
import {
    GapPill,
    KpiCard,
    KPI_ICON,
    OccupancyForecastChart,
    TopShortagesList,
} from '../../Components/Workforce/WorkforceWidgets';
import {
    DEPARTMENTS,
    SHORTAGE_ALERTS,
    TOP_SHORTAGES,
    WORKFORCE_KPIS,
    departmentTotals,
    grandTotals,
} from '../../data/workforceSeed';

export default function Overview() {
    const today = grandTotals().days[0];
    const peak = grandTotals().days[4];

    return (
        <WorkforceLayout
            title="Workforce Overview"
            subtitle="Today’s camp staffing snapshot and the week ahead."
            activeHref="workforce.overview"
        >
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                    label="People in Camp"
                    value={WORKFORCE_KPIS.occupancy.people}
                    caption={`Capacity ${WORKFORCE_KPIS.occupancy.capacity}`}
                    percent={WORKFORCE_KPIS.occupancy.percent}
                    barColor="bg-blue-500"
                    icon={KPI_ICON.occupancy}
                    iconClass="bg-blue-50 text-blue-600"
                />
                <KpiCard
                    label="Today Required"
                    value={today.req}
                    caption={`${today.filled} filled`}
                    icon={KPI_ICON.required}
                    iconClass="bg-orange-50 text-orange-600"
                />
                <KpiCard
                    label="Today Gap"
                    value={Math.abs(today.gap)}
                    unit="to fill"
                    caption="vs required"
                    icon={KPI_ICON.gap}
                    iconClass="bg-red-50 text-red-600"
                    alert
                />
                <KpiCard
                    label="Peak Night Gap"
                    value={Math.abs(peak.gap)}
                    caption="Wednesday Aug 19"
                    icon={KPI_ICON.housekeeping}
                    iconClass="bg-violet-50 text-violet-600"
                />
            </section>

            <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.9fr]">
                <OccupancyForecastChart />
                <TopShortagesList shortages={TOP_SHORTAGES} />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="m-0 text-base font-black text-slate-950">Department coverage today</h2>
                        <Link href={route('workforce.staffing-matrix')} className="text-sm font-black text-lx-blue hover:underline">
                            Open matrix
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {DEPARTMENTS.map((department) => {
                            const day = departmentTotals(department).days[0];
                            return (
                                <div key={department.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                                    <div>
                                        <p className="m-0 text-sm font-bold text-slate-800">{department.name}</p>
                                        <p className="m-0 text-xs font-semibold text-slate-500">
                                            {day.filled} filled / {day.req} required
                                        </p>
                                    </div>
                                    <GapPill gap={day.gap} />
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                        <TriangleAlert className="h-5 w-5 text-orange-500" />
                        <h2 className="m-0 text-base font-black text-slate-950">Open alerts</h2>
                    </div>
                    <div className="space-y-3">
                        {SHORTAGE_ALERTS.slice(0, 3).map((alert) => (
                            <article key={alert.id} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3">
                                <p className="m-0 text-sm font-bold text-slate-800">{alert.title}</p>
                                <p className="mt-1 text-xs font-medium text-slate-500">{alert.date} · {alert.department}</p>
                            </article>
                        ))}
                    </div>
                    <Link
                        href={route('workforce.shortages-alerts')}
                        className="mt-4 inline-flex items-center gap-1 text-sm font-black text-lx-blue hover:underline"
                    >
                        Review all alerts <ArrowRight className="h-4 w-4" />
                    </Link>
                </section>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <QuickLink href={route('workforce.positions-forecast')} icon={CalendarClock} label="Positions Forecast" copy="Day-by-day required, filled, and gap." />
                <QuickLink href={route('workforce.staffing-matrix')} icon={ClipboardList} label="Staffing Matrix" copy="Who is scheduled against each role." />
                <QuickLink href={route('workforce.reports')} icon={KPI_ICON.required} label="Workforce Reports" copy="Export gap, occupancy, and coverage packs." />
            </div>
        </WorkforceLayout>
    );
}

function QuickLink({ href, icon: Icon, label, copy }) {
    return (
        <Link
            href={href}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
        >
            <Icon className="h-5 w-5 text-lx-blue" />
            <p className="mt-3 m-0 text-sm font-black text-slate-900">{label}</p>
            <p className="mt-1 m-0 text-xs font-medium text-slate-500">{copy}</p>
        </Link>
    );
}
