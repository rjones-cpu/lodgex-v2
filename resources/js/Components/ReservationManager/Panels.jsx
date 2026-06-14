import { Link } from '@inertiajs/react';

const STATUS_TONES = {
    arriving: 'bg-emerald-100 text-emerald-700',
    departing: 'bg-violet-100 text-violet-700',
    pending: 'bg-amber-100 text-amber-700',
};

export function MetricCard({ metric, compact = false }) {
    const danger = metric.tone === 'danger';

    return (
        <div
            className={`rounded-2xl border border-lx-border bg-white shadow-lx-soft ${
                compact ? 'p-4' : 'p-5'
            }`}
        >
            <div className="flex items-center gap-2 text-xs font-extrabold text-lx-ink-soft">
                <span>{metric.icon}</span>
                <span>{metric.label}</span>
            </div>
            <div
                className={`mt-2 font-black text-lx-navy ${compact ? 'text-2xl' : 'text-[34px]'} ${
                    danger ? 'text-red-600' : ''
                }`}
            >
                {metric.value}
            </div>
        </div>
    );
}

export function CardShell({ title, action, children, menu = true }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-lx-border bg-white shadow-lx-soft">
            <div className="flex items-center justify-between border-b border-lx-border px-5 py-4">
                <h3 className="text-base font-black text-lx-navy">{title}</h3>
                <div className="flex items-center gap-2">
                    {action}
                    {menu && (
                        <button
                            type="button"
                            className="h-8 w-8 rounded-lg text-lg text-lx-ink hover:bg-[#f0f6ff]"
                            aria-label="More options"
                        >
                            ⋯
                        </button>
                    )}
                </div>
            </div>
            {children}
        </div>
    );
}

export function StatusPill({ value, tone }) {
    const className = STATUS_TONES[tone] || 'bg-slate-100 text-slate-600';
    return (
        <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-black ${className}`}>{value}</span>
    );
}

export function ArrivalsDeparturesPanel({ rows }) {
    return (
        <CardShell
            title="Today's Arrivals & Departures"
            action={
                <Link
                    href={route('dashboard')}
                    className="rounded-lg bg-lx-blue px-3 py-1.5 text-xs font-black text-white"
                >
                    Open Reservations
                </Link>
            }
        >
            <div className="max-h-[420px] overflow-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead>
                        <tr className="text-left text-xs font-black text-lx-ink-soft">
                            <th className="sticky top-0 z-10 border-b border-lx-line bg-[#fbfdff] p-3">Guest / Company</th>
                            <th className="sticky top-0 z-10 border-b border-lx-line bg-[#fbfdff] p-3">Arrival / Departure</th>
                            <th className="sticky top-0 z-10 border-b border-lx-line bg-[#fbfdff] p-3">Status</th>
                            <th className="sticky top-0 z-10 border-b border-lx-line bg-[#fbfdff] p-3">Room</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={`${row.guest}-${row.dates}`} className="border-b border-lx-line">
                                <td className="p-3">
                                    <div className="font-extrabold text-lx-navy">{row.guest}</div>
                                    <div className="text-xs text-slate-500">{row.company}</div>
                                </td>
                                <td className="p-3 font-semibold text-lx-ink">{row.dates}</td>
                                <td className="p-3">
                                    <StatusPill value={row.status} tone={row.statusTone} />
                                </td>
                                <td className="p-3 font-semibold text-lx-ink">{row.room}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </CardShell>
    );
}

export function ApprovalWorkflowPanel({ rows }) {
    return (
        <CardShell title="Approval Workflow">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-lx-line bg-[#fbfdff] text-left text-xs font-black text-lx-ink-soft">
                            <th className="p-3">Request ID</th>
                            <th className="p-3">Guest</th>
                            <th className="p-3">Request Type</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.id} className="border-b border-lx-line">
                                <td className="p-3">
                                    <Link href={route('dashboard')} className="font-black text-lx-blue">
                                        {row.id}
                                    </Link>
                                </td>
                                <td className="p-3 font-semibold text-lx-ink">{row.guest}</td>
                                <td className="p-3 text-lx-ink">{row.type}</td>
                                <td className="p-3 text-lx-ink">{row.date}</td>
                                <td className="p-3">
                                    <StatusPill value={row.status} tone="pending" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </CardShell>
    );
}

export function ExceptionMonitoringPanel({ items }) {
    return (
        <CardShell title="No-Show & Exception Monitoring">
            <div className="grid gap-0 md:grid-cols-3">
                {items.map((item) => (
                    <div
                        key={item.label}
                        className="border-b border-lx-line p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
                    >
                        <div className="text-sm font-extrabold text-lx-navy">{item.label}</div>
                        <div className="mt-2 text-3xl font-black text-lx-navy">{item.count}</div>
                        <Link href={route('dashboard')} className="mt-2 inline-block text-xs font-black text-lx-blue">
                            View Details →
                        </Link>
                    </div>
                ))}
            </div>
        </CardShell>
    );
}

export function ForecastChartPanel({ days }) {
    const maxVal = Math.max(...days.flatMap((d) => [d.arrivals, d.departures]), 1);

    return (
        <CardShell title="Forecast & Reporting">
            <div className="p-5">
                <div className="mb-4 flex gap-4 text-xs font-bold text-lx-ink">
                    <span>
                        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-lx-blue" />
                        Arrivals
                    </span>
                    <span>
                        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-300" />
                        Departures
                    </span>
                </div>
                <div className="flex h-[180px] items-end gap-3">
                    {days.map((day) => (
                        <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                            <div className="flex h-[140px] w-full items-end justify-center gap-1">
                                <div
                                    className="w-3 rounded-t bg-lx-blue"
                                    style={{ height: `${(day.arrivals / maxVal) * 100}%` }}
                                    title={`Arrivals: ${day.arrivals}`}
                                />
                                <div
                                    className="w-3 rounded-t bg-sky-300"
                                    style={{ height: `${(day.departures / maxVal) * 100}%` }}
                                    title={`Departures: ${day.departures}`}
                                />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">{day.date}</span>
                        </div>
                    ))}
                </div>
                <p className="mt-3 text-xs font-semibold text-slate-500">Arrivals vs departures — next 7 days</p>
            </div>
        </CardShell>
    );
}

export function AiAssistantPanel({ items }) {
    return (
        <CardShell title="AI Reservation Assistant" menu={false}>
            <ul className="m-0 list-none p-4">
                {items.map((item) => (
                    <li
                        key={item.title}
                        className="mb-3 flex gap-3 rounded-xl border border-lx-line bg-[#fbfdff] p-3 last:mb-0"
                    >
                        <span className="text-xl">{item.icon}</span>
                        <div>
                            <div className="text-sm font-black text-lx-navy">{item.title}</div>
                            <div className="text-xs font-semibold text-slate-500">{item.detail}</div>
                        </div>
                    </li>
                ))}
            </ul>
        </CardShell>
    );
}

export function RoomAllocationPanel({ stats }) {
    return (
        <CardShell
            title="Room Allocation & Availability"
            action={
                <Link href={route('room-utilization')} className="text-xs font-black text-lx-blue">
                    Assign Rooms →
                </Link>
            }
        >
            <div className="grid grid-cols-2 gap-3 p-4">
                {stats.map((s) => (
                    <div
                        key={s.label}
                        className="rounded-xl border border-lx-line bg-[#fbfdff] p-4 text-center"
                    >
                        <div className="text-2xl">{s.icon}</div>
                        <div className="mt-2 text-2xl font-black text-lx-navy">{s.value}</div>
                        <div className="text-xs font-bold text-slate-500">{s.label}</div>
                    </div>
                ))}
            </div>
        </CardShell>
    );
}

export function CompanyAllotmentsPanel({ rows }) {
    return (
        <CardShell title="Company Allotments">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-lx-line bg-[#fbfdff] text-left text-xs font-black text-lx-ink-soft">
                            <th className="p-3">Company</th>
                            <th className="p-3">Total</th>
                            <th className="p-3">Used</th>
                            <th className="p-3">Remaining</th>
                            <th className="p-3">Usage</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.company} className="border-b border-lx-line">
                                <td className="p-3 font-extrabold text-lx-navy">{row.company}</td>
                                <td className="p-3">{row.total}</td>
                                <td className="p-3">{row.used}</td>
                                <td className="p-3">{row.remaining}</td>
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                                            <div
                                                className="h-full rounded-full bg-lx-blue"
                                                style={{ width: `${row.pct}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-bold">{row.pct}%</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </CardShell>
    );
}

export function ForecastSummaryPanel({ summary }) {
    return (
        <CardShell
            title="Forecast Summary"
            action={
                <button
                    type="button"
                    className="rounded-lg border border-lx-blue px-3 py-1.5 text-xs font-black text-lx-blue"
                >
                    Open Forecast
                </button>
            }
        >
            <div className="p-5">
                <p className="text-sm font-semibold leading-relaxed text-lx-ink">{summary.narrative}</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                    {summary.stats.map((s) => (
                        <div key={s.label} className="rounded-xl border border-lx-line bg-[#fbfdff] p-3 text-center">
                            <div className="text-lg font-black text-lx-navy">{s.value}</div>
                            <div className="text-xs font-bold text-slate-500">{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </CardShell>
    );
}
