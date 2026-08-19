import { Fragment, useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    AlertTriangle,
    BedDouble,
    Briefcase,
    Moon,
    Sparkles,
    UserCheck,
    Users,
    UtensilsCrossed,
    Wrench,
} from 'lucide-react';

import {
    CAMP_CAPACITY,
    FORECAST_DAYS,
    OCCUPANCY_FORECAST,
    STAFFING_SUMMARY,
    averageDays,
    departmentTotals,
    grandTotals,
    staffingGapsFromRequirements,
} from '../../data/workforceSeed';

export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}

export function gapTone(gap) {
    if (gap >= 0) return 'ok';
    if (gap >= -2) return 'monitor';
    return 'action';
}

const GAP_PILL = {
    ok: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    monitor: 'bg-orange-50 text-orange-700 ring-1 ring-orange-100',
    action: 'bg-red-50 text-red-700 ring-1 ring-red-100',
};

const GAP_DOT = {
    ok: 'bg-emerald-500',
    monitor: 'bg-orange-500',
    action: 'bg-red-500',
};

export function GapPill({ gap, className = '' }) {
    const tone = gapTone(gap);
    const label = gap > 0 ? `+${gap}` : String(gap);
    return (
        <span
            className={cn(
                'inline-flex min-w-[36px] items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-black',
                GAP_PILL[tone],
                className,
            )}
        >
            {label}
        </span>
    );
}

export function formatCount(value) {
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(1);
}

const DEPT_ICONS = {
    utensils: UtensilsCrossed,
    moon: Moon,
    bed: BedDouble,
    sparkles: Sparkles,
    desk: Briefcase,
    wrench: Wrench,
};

export function DepartmentIcon({ icon, className = 'h-4 w-4' }) {
    const Icon = DEPT_ICONS[icon] || Users;
    return <Icon className={className} strokeWidth={2.1} />;
}

export function KpiCard({
    label,
    value,
    unit,
    caption,
    percent,
    barColor,
    icon: Icon,
    iconClass,
    alert = false,
}) {
    return (
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs">{label}</p>
                <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', iconClass)}>
                    {alert ? <AlertTriangle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
            </div>
            <p className="m-0 text-2xl font-black leading-none tracking-tight text-slate-950 sm:text-[28px]">
                {value}
                {unit && (
                    <span className="mt-1.5 block text-xs font-bold text-slate-500 sm:ml-1.5 sm:mt-0 sm:inline sm:text-sm">
                        {unit}
                    </span>
                )}
            </p>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs font-bold text-slate-500">
                <span>{caption}</span>
                {percent != null && <span className="text-slate-700">{percent}%</span>}
            </div>
            {percent != null && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={cn('h-full rounded-full', barColor)} style={{ width: `${Math.min(100, percent)}%` }} />
                </div>
            )}
        </article>
    );
}

export function OccupancyForecastChart({ points = OCCUPANCY_FORECAST }) {
    const W = 420;
    const H = 220;
    const PAD_LEFT = 36;
    const PAD_RIGHT = 12;
    const PAD_TOP = 16;
    const PAD_BOTTOM = 32;
    const plotW = W - PAD_LEFT - PAD_RIGHT;
    const plotH = H - PAD_TOP - PAD_BOTTOM;
    const yMax = 300;
    const series = points.length ? points : OCCUPANCY_FORECAST;
    const [hover, setHover] = useState(null);

    const chart = useMemo(() => {
        const xAt = (index) =>
            series.length === 1
                ? PAD_LEFT + plotW / 2
                : PAD_LEFT + (index * plotW) / (series.length - 1);
        const yAt = (value) => PAD_TOP + (1 - value / yMax) * plotH;
        const path = series.map((point, index) => {
            const command = index === 0 ? 'M' : 'L';
            return `${command} ${xAt(index)} ${yAt(point.occupancy)}`;
        }).join(' ');
        const area = `${path} L ${xAt(series.length - 1)} ${yAt(0)} L ${xAt(0)} ${yAt(0)} Z`;
        return { xAt, yAt, path, area };
    }, [plotW, plotH, series]);

    const ticks = [0, 100, 200, 300];

    return (
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="m-0 text-sm font-black text-slate-950 sm:text-base">Occupancy Forecast (7 Days)</h2>
            <div className="relative mt-3">
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    className="h-44 w-full sm:h-52"
                    role="img"
                    aria-label="7-day occupancy forecast"
                    onMouseLeave={() => setHover(null)}
                >
                    {ticks.map((value) => (
                        <g key={value}>
                            <line
                                x1={PAD_LEFT}
                                x2={W - PAD_RIGHT}
                                y1={chart.yAt(value)}
                                y2={chart.yAt(value)}
                                stroke="#e8eef6"
                                strokeWidth="1"
                            />
                            <text
                                x={PAD_LEFT - 8}
                                y={chart.yAt(value)}
                                textAnchor="end"
                                dominantBaseline="middle"
                                className="fill-slate-400"
                                style={{ fontSize: 10, fontWeight: 600 }}
                            >
                                {value}
                            </text>
                        </g>
                    ))}
                    <line
                        x1={PAD_LEFT}
                        x2={W - PAD_RIGHT}
                        y1={chart.yAt(CAMP_CAPACITY)}
                        y2={chart.yAt(CAMP_CAPACITY)}
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                        strokeDasharray="5 5"
                    />
                    <path d={chart.area} fill="rgba(37, 99, 235, 0.08)" />
                    <path
                        d={chart.path}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {series.map((point, index) => {
                        const x = chart.xAt(index);
                        const y = chart.yAt(point.occupancy);
                        const active = hover?.index === index;
                        const dayLabel = String(point.date).replace(/^[A-Za-z]{3}\s+/, '');

                        return (
                            <g key={point.key || point.date}>
                                <circle cx={x} cy={y} r={active ? 6 : 4} fill="#2563eb" />
                                {active && (
                                    <circle cx={x} cy={y} r="9" fill="none" stroke="#2563eb" strokeWidth="1.5" opacity="0.35" />
                                )}
                                <circle
                                    cx={x}
                                    cy={y}
                                    r="14"
                                    fill="transparent"
                                    className="cursor-pointer"
                                    onMouseEnter={() => setHover({ index, x, y, date: point.date, occupancy: point.occupancy })}
                                    onFocus={() => setHover({ index, x, y, date: point.date, occupancy: point.occupancy })}
                                >
                                    <title>{`${point.date}: ${point.occupancy} in house`}</title>
                                </circle>
                                <text
                                    x={x}
                                    y={H - 10}
                                    textAnchor="middle"
                                    className="fill-slate-500"
                                    style={{ fontSize: 10, fontWeight: 700 }}
                                >
                                    {dayLabel}
                                </text>
                            </g>
                        );
                    })}
                </svg>
                {hover && (
                    <div
                        className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900 px-2.5 py-1.5 text-center shadow-lg"
                        style={{
                            left: `${(hover.x / W) * 100}%`,
                            top: `${(hover.y / H) * 100}%`,
                            marginTop: '-12px',
                        }}
                    >
                        <p className="m-0 text-[11px] font-bold text-slate-300">{hover.date}</p>
                        <p className="m-0 text-sm font-black leading-tight text-white">{hover.occupancy} in house</p>
                    </div>
                )}
            </div>
            <p className="mt-1 text-[11px] font-bold text-slate-400">Dashed line = camp capacity ({CAMP_CAPACITY})</p>
        </section>
    );
}

function forecastBarColor(gap) {
    if (gap <= 0) return '#22c55e';
    if (gap === 1) return '#eab308';
    if (gap === 2) return '#f97316';
    return '#ef4444';
}

function forecastYTicks(yMax) {
    if (yMax <= 4) return [0, 1, 2, 3, 4];
    const step = yMax <= 8 ? 2 : Math.ceil(yMax / 4);
    const ticks = [];
    for (let value = 0; value <= yMax; value += step) ticks.push(value);
    if (ticks[ticks.length - 1] !== yMax) ticks.push(yMax);
    return ticks;
}

export function StaffingForecastChart({ departments, points } = {}) {
    const series = points?.length ? points : staffingGapsFromRequirements(departments);
    const fullyStaffed = series.filter((point) => point.gap <= 0).length;
    const deficient = series.length - fullyStaffed;
    const largestGap = Math.max(0, ...series.map((point) => point.gap));

    const W = 420;
    const H = 220;
    const PAD_LEFT = 28;
    const PAD_RIGHT = 8;
    const PAD_TOP = 22;
    const PAD_BOTTOM = 28;
    const plotW = W - PAD_LEFT - PAD_RIGHT;
    const plotH = H - PAD_TOP - PAD_BOTTOM;
    const yMax = Math.max(4, largestGap);
    const yAt = (value) => PAD_TOP + (1 - value / yMax) * plotH;
    const slot = plotW / series.length;
    const barWidth = Math.min(26, slot * 0.48);

    return (
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="m-0 text-sm font-black text-slate-950 sm:text-base">7 Day Staffing Forecast</h2>
                    <p className="mt-0.5 m-0 text-[11px] font-bold text-slate-400">Gap (Positions)</p>
                </div>
                {deficient > 0 && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black text-red-600 ring-1 ring-red-100">
                        <AlertTriangle className="h-3 w-3" />
                        Attention Required
                    </span>
                )}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_168px] lg:items-center">
                <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" role="img" aria-label="7-day staffing gap forecast">
                    {forecastYTicks(yMax).map((tick) => (
                        <g key={tick}>
                            <line
                                x1={PAD_LEFT}
                                x2={W - PAD_RIGHT}
                                y1={yAt(tick)}
                                y2={yAt(tick)}
                                stroke="#eef2f7"
                                strokeWidth="1"
                            />
                            <text
                                x={PAD_LEFT - 8}
                                y={yAt(tick)}
                                textAnchor="end"
                                dominantBaseline="middle"
                                className="fill-slate-400"
                                style={{ fontSize: 10, fontWeight: 600 }}
                            >
                                {tick}
                            </text>
                        </g>
                    ))}
                    {series.map((point, index) => {
                        const stub = point.gap <= 0;
                        const height = stub ? 8 : (point.gap / yMax) * plotH;
                        const x = PAD_LEFT + slot * index + (slot - barWidth) / 2;
                        const y = stub ? yAt(0) - height : yAt(point.gap);
                        const color = forecastBarColor(point.gap);
                        return (
                            <g key={point.date}>
                                <rect x={x} y={y} width={barWidth} height={height} rx="4" fill={color} />
                                <text
                                    x={x + barWidth / 2}
                                    y={y - 7}
                                    textAnchor="middle"
                                    fill={stub ? color : '#334155'}
                                    style={{ fontSize: 11, fontWeight: 800 }}
                                >
                                    {point.gap}
                                </text>
                                <text
                                    x={x + barWidth / 2}
                                    y={H - 8}
                                    textAnchor="middle"
                                    className="fill-slate-500"
                                    style={{ fontSize: 10, fontWeight: 700 }}
                                >
                                    {point.date}
                                </text>
                            </g>
                        );
                    })}
                </svg>
                <ul className="m-0 list-none space-y-3 p-0 text-sm font-semibold text-slate-600">
                    <li className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            Days Fully Staffed:
                        </span>
                        <span className="font-black text-slate-900">{fullyStaffed}</span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                            Days with Deficiencies:
                        </span>
                        <span className="font-black text-slate-900">{deficient}</span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                            Largest Gap:
                        </span>
                        <span className="font-black text-slate-900">{largestGap} positions</span>
                    </li>
                </ul>
            </div>
        </section>
    );
}

export function StaffingDonut({ summary = STAFFING_SUMMARY }) {
    const { filled, open, surplus, total, filledPercent, openPercent, surplusPercent } = summary;
    const bars = [
        { label: 'Filled', value: filled, percent: parseFloat(filledPercent), color: '#16a34a' },
        { label: 'Open', value: open, percent: parseFloat(openPercent), color: '#f59e0b' },
        { label: 'Surplus', value: surplus, percent: parseFloat(surplusPercent), color: '#2563eb' },
    ];

    const W = 360;
    const H = 200;
    const PAD_LEFT = 36;
    const PAD_RIGHT = 12;
    const PAD_TOP = 12;
    const PAD_BOTTOM = 36;
    const plotW = W - PAD_LEFT - PAD_RIGHT;
    const plotH = H - PAD_TOP - PAD_BOTTOM;
    const ticks = [0, 25, 50, 75, 100];
    const yAt = (percent) => PAD_TOP + (1 - percent / 100) * plotH;
    const barWidth = 42;
    const slot = plotW / bars.length;

    return (
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <h2 className="m-0 text-sm font-black text-slate-950 sm:text-base">Staffing Summary</h2>
                <div className="text-right">
                    <p className="m-0 text-xl font-black leading-none text-slate-950">{total}</p>
                    <p className="m-0 text-[11px] font-bold text-slate-500">Total Required</p>
                </div>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-44 w-full sm:h-52" role="img" aria-label="Staffing summary bar chart">
                {ticks.map((tick) => (
                    <g key={tick}>
                        <line
                            x1={PAD_LEFT}
                            x2={W - PAD_RIGHT}
                            y1={yAt(tick)}
                            y2={yAt(tick)}
                            stroke="#e8eef6"
                            strokeWidth="1"
                        />
                        <text
                            x={PAD_LEFT - 8}
                            y={yAt(tick)}
                            textAnchor="end"
                            dominantBaseline="middle"
                            className="fill-slate-400"
                            style={{ fontSize: 10, fontWeight: 600 }}
                        >
                            {tick}%
                        </text>
                    </g>
                ))}
                {bars.map((bar, index) => {
                    const x = PAD_LEFT + slot * index + (slot - barWidth) / 2;
                    const height = Math.max(bar.percent > 0 ? 4 : 0, (bar.percent / 100) * plotH);
                    const y = yAt(bar.percent);
                    return (
                        <g key={bar.label}>
                            <rect
                                x={x}
                                y={PAD_TOP}
                                width={barWidth}
                                height={plotH}
                                rx="6"
                                fill="#f1f5f9"
                            />
                            {height > 0 && (
                                <rect x={x} y={y} width={barWidth} height={height} rx="6" fill={bar.color} />
                            )}
                            <text
                                x={x + barWidth / 2}
                                y={H - 12}
                                textAnchor="middle"
                                className="fill-slate-500"
                                style={{ fontSize: 11, fontWeight: 700 }}
                            >
                                {bar.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <ul className="m-0 mt-1 list-none space-y-2 p-0">
                <LegendRow color="bg-emerald-500" label="Filled Positions" value={filled} percent={filledPercent} />
                <LegendRow color="bg-orange-400" label="Open Positions" value={open} percent={openPercent} />
                <LegendRow color="bg-blue-500" label="Surplus Positions" value={surplus} percent={surplusPercent} />
            </ul>
        </section>
    );
}

function LegendRow({ color, label, value, percent }) {
    return (
        <li className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 font-semibold text-slate-600">
                <span className={cn('h-2.5 w-2.5 rounded-full', color)} />
                {label}
            </span>
            <span className="font-black text-slate-900">
                {value} <span className="font-bold text-slate-400">({percent})</span>
            </span>
        </li>
    );
}

export function TopShortagesList({ shortages }) {
    return (
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="m-0 text-sm font-black text-slate-950 sm:text-base">Top Shortages</h2>
            <ul className="mt-4 list-none space-y-2.5 p-0">
                {shortages.length === 0 && (
                    <li className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm font-semibold text-slate-500">
                        No shortages on this date.
                    </li>
                )}
                {shortages.map((row) => (
                    <li
                        key={row.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                    >
                        <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                            <AlertTriangle
                                className={cn('h-4 w-4', row.severity === 'action' ? 'text-red-500' : 'text-orange-500')}
                            />
                            {row.name}
                        </span>
                        <GapPill gap={row.gap} />
                    </li>
                ))}
            </ul>
            <Link
                href={route('workforce.shortages-alerts')}
                className="mt-4 inline-flex text-sm font-black text-lx-blue hover:underline"
            >
                View all shortages →
            </Link>
        </section>
    );
}

function DayCell({ day, highlight = false, onSelect }) {
    const tone = highlight ? 'bg-blue-50' : '';
    const selectProps = onSelect
        ? { onClick: onSelect, role: 'button', tabIndex: 0, onKeyDown: (event) => event.key === 'Enter' && onSelect() }
        : {};
    return (
        <>
            <td className={cn('border-b border-slate-100 px-2 py-2 text-center text-xs font-bold text-slate-700', tone, onSelect && 'cursor-pointer')} {...selectProps}>
                {formatCount(day.req)}
            </td>
            <td className={cn('border-b border-slate-100 px-2 py-2 text-center text-xs font-bold text-slate-700', tone, onSelect && 'cursor-pointer')} {...selectProps}>
                {formatCount(day.filled)}
            </td>
            <td className={cn('border-b border-slate-100 px-2 py-2 text-center', tone, onSelect && 'cursor-pointer')} {...selectProps}>
                <GapPill gap={day.gap} />
            </td>
        </>
    );
}

export function PositionRequirementsTable({ departments, totals: totalsProp, selectedDayIndex = 0, onSelectDay }) {
    const totals = totalsProp || grandTotals(departments);
    const selectedDay = FORECAST_DAYS[selectedDayIndex];

    return (
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-3 py-3 sm:px-5 sm:py-4">
                <h2 className="m-0 text-sm font-black text-slate-950 sm:text-base">Position Requirements By Day</h2>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500 sm:gap-3">
                    <span className="inline-flex items-center gap-1.5">
                        <span className={cn('h-2 w-2 rounded-full', GAP_DOT.ok)} /> 0 = On Target
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className={cn('h-2 w-2 rounded-full', GAP_DOT.monitor)} /> -1 to -2 = Monitor
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className={cn('h-2 w-2 rounded-full', GAP_DOT.action)} /> ≤ -3 = Action Required
                    </span>
                </div>
            </div>

            {onSelectDay && (
                <div className="flex gap-2 overflow-x-auto px-3 py-3 [scrollbar-width:thin] lg:hidden">
                    {FORECAST_DAYS.map((day, index) => (
                        <button
                            key={day.key}
                            type="button"
                            onClick={() => onSelectDay(index)}
                            className={cn(
                                'shrink-0 rounded-xl px-3 py-2 text-xs font-black',
                                index === selectedDayIndex
                                    ? 'bg-lx-blue text-white'
                                    : 'border border-slate-200 bg-white text-slate-600',
                            )}
                        >
                            {day.label}
                            <span className="ml-1 font-bold opacity-70">{day.weekday}</span>
                        </button>
                    ))}
                </div>
            )}

            <div className="lg:hidden">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-[#f8fbff] text-[10px] font-black uppercase tracking-wide text-slate-500">
                            <th className="px-3 py-2 text-left">Position · {selectedDay.label}</th>
                            <th className="px-2 py-2 text-center">Req</th>
                            <th className="px-2 py-2 text-center">Filled</th>
                            <th className="px-2 py-2 text-center">Gap</th>
                        </tr>
                    </thead>
                    <tbody>
                        {departments.map((department) => {
                            const subtotal = departmentTotals(department).days[selectedDayIndex];
                            return (
                                <Fragment key={department.id}>
                                    <tr className="bg-slate-50">
                                        <td colSpan={4} className="px-3 py-2 text-[11px] font-black uppercase tracking-wide text-slate-700">
                                            {department.name}
                                        </td>
                                    </tr>
                                    {department.positions.map((position) => (
                                        <tr key={position.id} className="border-t border-slate-100">
                                            <td className="px-3 py-2 text-sm font-semibold text-slate-700">
                                                {position.name}
                                                {position.excludedFromRatio ? '*' : ''}
                                            </td>
                                            <td className="px-2 py-2 text-center text-xs font-bold text-slate-700">
                                                {formatCount(position.days[selectedDayIndex].req)}
                                            </td>
                                            <td className="px-2 py-2 text-center text-xs font-bold text-slate-700">
                                                {formatCount(position.days[selectedDayIndex].filled)}
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <GapPill gap={position.days[selectedDayIndex].gap} />
                                            </td>
                                        </tr>
                                    ))}
                                    {department.positions.length > 1 && (
                                        <tr className="bg-[#f3f7fd] text-xs font-black text-slate-800">
                                            <td className="px-3 py-2">TOTAL</td>
                                            <td className="px-2 py-2 text-center">{formatCount(subtotal.req)}</td>
                                            <td className="px-2 py-2 text-center">{formatCount(subtotal.filled)}</td>
                                            <td className="px-2 py-2 text-center">
                                                <GapPill gap={subtotal.gap} />
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                        <tr className="bg-[#eef4ff] text-xs font-black text-slate-900">
                            <td className="px-3 py-3">TOTAL ALL POSITIONS</td>
                            <td className="px-2 py-3 text-center">{formatCount(totals.days[selectedDayIndex].req)}</td>
                            <td className="px-2 py-3 text-center">{formatCount(totals.days[selectedDayIndex].filled)}</td>
                            <td className="px-2 py-3 text-center">
                                <GapPill gap={totals.days[selectedDayIndex].gap} />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="hidden max-w-full overflow-x-auto lg:block">
                <table className="min-w-[1080px] w-full border-collapse">
                    <thead>
                        <tr className="bg-[#f8fbff] text-[10px] font-black uppercase tracking-wide text-slate-500">
                            <th rowSpan={2} className="sticky left-0 z-10 border-b border-slate-200 bg-[#f8fbff] px-4 py-2 text-left">
                                Department / Position
                            </th>
                            {FORECAST_DAYS.map((day, index) => {
                                const selected = index === selectedDayIndex;
                                return (
                                    <th
                                        key={day.key}
                                        colSpan={3}
                                        className={cn(
                                            'border-b border-l border-slate-200 px-2 py-2 text-center',
                                            selected && 'bg-blue-100',
                                        )}
                                    >
                                        {onSelectDay ? (
                                            <button
                                                type="button"
                                                onClick={() => onSelectDay(index)}
                                                className={cn(
                                                    'block w-full rounded-md px-1 py-0.5',
                                                    selected ? 'text-lx-blue' : 'text-slate-800 hover:bg-white/70',
                                                )}
                                            >
                                                <span className="block">{day.label}</span>
                                                <span className="font-bold text-slate-400">{day.weekday}</span>
                                            </button>
                                        ) : (
                                            <>
                                                <span className="block text-slate-800">{day.label}</span>
                                                <span className="font-bold text-slate-400">{day.weekday}</span>
                                            </>
                                        )}
                                    </th>
                                );
                            })}
                            <th colSpan={3} className="border-b border-l border-slate-200 px-2 py-2 text-center text-lx-blue">
                                7 Day Total Avg
                            </th>
                        </tr>
                        <tr className="bg-[#f8fbff] text-[10px] font-black uppercase tracking-wide text-slate-400">
                            {FORECAST_DAYS.map((day, index) => (
                                <DaySubHeads key={day.key} highlight={index === selectedDayIndex} />
                            ))}
                            <DaySubHeads />
                        </tr>
                    </thead>
                    <tbody>
                        {departments.map((department) => {
                            const subtotal = departmentTotals(department);
                            return (
                                <DepartmentBlock
                                    key={department.id}
                                    department={department}
                                    subtotal={subtotal}
                                    selectedDayIndex={selectedDayIndex}
                                    onSelectDay={onSelectDay}
                                />
                            );
                        })}
                        <tr className="bg-[#eef4ff] text-xs font-black text-slate-900">
                            <td className="sticky left-0 z-10 bg-[#eef4ff] px-4 py-3">TOTAL ALL POSITIONS</td>
                            {totals.days.map((day, index) => (
                                <DayCell
                                    key={FORECAST_DAYS[index].key}
                                    day={day}
                                    highlight={index === selectedDayIndex}
                                    onSelect={onSelectDay ? () => onSelectDay(index) : undefined}
                                />
                            ))}
                            <DayCell day={totals.avg} />
                        </tr>
                    </tbody>
                </table>
            </div>

            <p className="m-0 border-t border-slate-100 px-3 py-3 text-[11px] font-semibold text-slate-500 sm:px-5">
                * Camp Manager, Chef &amp; Maintenance Staff are not included in ratio calculations.
            </p>
        </section>
    );
}

function DaySubHeads({ highlight = false }) {
    return (
        <>
            <th className={cn('border-b border-l border-slate-200 px-2 py-1.5', highlight && 'bg-blue-100')}>Req</th>
            <th className={cn('border-b border-slate-200 px-2 py-1.5', highlight && 'bg-blue-100')}>Filled</th>
            <th className={cn('border-b border-slate-200 px-2 py-1.5', highlight && 'bg-blue-100')}>Gap</th>
        </>
    );
}

function DepartmentBlock({ department, subtotal, selectedDayIndex = 0, onSelectDay }) {
    return (
        <>
            <tr className="bg-slate-50">
                <td colSpan={1 + (FORECAST_DAYS.length + 1) * 3} className="px-4 py-2">
                    <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-700">
                        <DepartmentIcon icon={department.icon} className="h-3.5 w-3.5 text-lx-blue" />
                        {department.name}
                    </span>
                </td>
            </tr>
            {department.positions.map((position) => (
                <tr key={position.id} className="hover:bg-slate-50/70">
                    <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                        {position.name}
                        {position.excludedFromRatio ? '*' : ''}
                    </td>
                    {position.days.map((day, index) => (
                        <DayCell
                            key={`${position.id}-${FORECAST_DAYS[index].key}`}
                            day={day}
                            highlight={index === selectedDayIndex}
                            onSelect={onSelectDay ? () => onSelectDay(index) : undefined}
                        />
                    ))}
                    <DayCell day={averageDays(position.days)} />
                </tr>
            ))}
            {department.positions.length > 1 && (
                <tr className="bg-[#f3f7fd] text-xs font-black text-slate-800">
                    <td className="sticky left-0 z-10 border-b border-slate-200 bg-[#f3f7fd] px-4 py-2">
                        TOTAL {department.name.replace('Kitchen — ', '').toUpperCase()}
                    </td>
                    {subtotal.days.map((day, index) => (
                        <DayCell
                            key={`${department.id}-total-${FORECAST_DAYS[index].key}`}
                            day={day}
                            highlight={index === selectedDayIndex}
                            onSelect={onSelectDay ? () => onSelectDay(index) : undefined}
                        />
                    ))}
                    <DayCell day={subtotal.avg} />
                </tr>
            )}
        </>
    );
}

export const KPI_ICON = {
    occupancy: Users,
    filled: UserCheck,
    required: Briefcase,
    gap: AlertTriangle,
    housekeeping: BedDouble,
};
