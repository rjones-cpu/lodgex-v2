import { ExecutiveDashboardView } from './ExecutiveDashboardView';
import {
    AlertRow,
    KpiCard,
    PanelCard,
    SummaryWidgetCard,
} from './Cards';
import { Link } from '@inertiajs/react';
// Icon set for the Smart Lodge Intelligence Hub — kept colocated here
// because every other dashboard in this file uses inline SVG / Cards. The
// Hub design (HealthCard, SyncTimelineCard, ModuleCard) draws on these.
import {
    Activity,
    ArrowRight,
    BarChart3,
    CalendarDays,
    ClipboardList,
    Clock3,
    ForkKnife,
    Package,
    ShieldCheck,
    User,
    Users,
    WandSparkles,
} from 'lucide-react';

const THEMES = {
    blue: {
        hero: 'border-[#cfe0f3] bg-gradient-to-br from-[#f2f9ff] via-white to-[#eef6ff]',
        accent: 'text-[#0b66e4]',
        chip: 'bg-[#eef6ff] text-[#0b66e4]',
        bar: 'bg-[#0b66e4]',
    },
    green: {
        hero: 'border-[#bdebd5] bg-gradient-to-br from-[#effcf6] via-white to-[#eefbf4]',
        accent: 'text-emerald-700',
        chip: 'bg-emerald-50 text-emerald-700',
        bar: 'bg-emerald-600',
    },
    orange: {
        hero: 'border-[#ffd0a1] bg-gradient-to-br from-[#fff7ed] via-white to-[#fff1e6]',
        accent: 'text-orange-600',
        chip: 'bg-orange-50 text-orange-700',
        bar: 'bg-orange-500',
    },
    purple: {
        hero: 'border-[#d8c8ff] bg-gradient-to-br from-[#f6f1ff] via-white to-[#f5f0ff]',
        accent: 'text-violet-700',
        chip: 'bg-violet-50 text-violet-700',
        bar: 'bg-violet-600',
    },
    teal: {
        hero: 'border-[#bce7ee] bg-gradient-to-br from-[#effcff] via-white to-[#eefbfb]',
        accent: 'text-teal-700',
        chip: 'bg-teal-50 text-teal-700',
        bar: 'bg-teal-600',
    },
    slate: {
        hero: 'border-[#d8e1ec] bg-gradient-to-br from-[#f8fbff] via-white to-[#f1f5f9]',
        accent: 'text-slate-700',
        chip: 'bg-slate-100 text-slate-700',
        bar: 'bg-slate-600',
    },
};

const TONE_STYLES = {
    good: 'text-emerald-700 bg-emerald-50',
    warning: 'text-amber-700 bg-amber-50',
    high: 'text-red-700 bg-red-50',
    neutral: 'text-slate-600 bg-slate-100',
};

function themeFor(detail) {
    return THEMES[detail.theme] || THEMES.blue;
}

function MetricStrip({ metrics = [] }) {
    if (!metrics.length) return null;

    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {metrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-lx-border bg-white p-4 shadow-lx-soft">
                    <div className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{metric.label}</div>
                    <div className="mt-2 text-2xl font-black text-lx-navy">{metric.value}</div>
                    {metric.change && <div className="mt-1 text-xs font-bold text-slate-500">{metric.change}</div>}
                    {metric.tone && !metric.change && (
                        <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${TONE_STYLES[metric.tone] || TONE_STYLES.neutral}`}>
                            {metric.tone}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}

function BarChart({ items = [], valueKey = 'value', labelKey = 'label', max, barClass = 'bg-lx-blue' }) {
    if (!items.length) return null;
    const peak = max || Math.max(...items.map((item) => item[valueKey] || 0), 1);

    return (
        <div className="flex h-40 items-end gap-2">
            {items.map((item) => {
                const value = item[valueKey] || 0;
                const height = `${Math.max(8, Math.round((value / peak) * 100))}%`;

                return (
                    <div key={item[labelKey]} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                        <div className="flex h-full w-full items-end justify-center">
                            <div className={`w-full max-w-[42px] rounded-t-md ${barClass}`} style={{ height }} />
                        </div>
                        <span className="truncate text-[10px] font-bold text-slate-500">{item[labelKey]}</span>
                    </div>
                );
            })}
        </div>
    );
}

function DashboardHero({ detail }) {
    const theme = themeFor(detail);

    return (
        <section className={`rounded-2xl border p-5 shadow-lx-soft ${theme.hero}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${theme.chip}`}>
                        Command Center Dashboard
                    </span>
                    <h2 className={`mt-3 text-2xl font-black ${theme.accent}`}>{detail.title}</h2>
                    {detail.subtitle && <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-600">{detail.subtitle}</p>}
                </div>
            </div>
        </section>
    );
}

function DataTable({ columns, rows, rowKey = 'id' }) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
                <thead>
                    <tr className="border-b border-lx-border text-xs font-black uppercase tracking-wide text-slate-500">
                        {columns.map((col) => (
                            <th key={col.key} className="px-4 py-3">
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={row[rowKey] || index} className="border-b border-lx-line last:border-b-0">
                            {columns.map((col) => (
                                <td key={col.key} className="px-4 py-3 font-semibold text-lx-ink">
                                    {row[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function ExecutiveDashboard({ detail }) {
    return <ExecutiveDashboardView detail={detail} />;
}

export function PredictiveAnalyticsDashboard({ detail }) {
    const theme = themeFor(detail);

    return (
        <div className="grid gap-5">
            <DashboardHero detail={detail} />
            <MetricStrip
                metrics={[
                    { label: 'Peak shortage', value: detail.peakShortage ?? '—', tone: 'warning' },
                    { label: 'Peak date', value: detail.peakShortageDate ?? '—', tone: 'neutral' },
                    { label: 'Overflow rooms', value: detail.peakOverflowRooms ?? '—', tone: 'warning' },
                    { label: '7-day outlook', value: detail.outlook?.['7d']?.peakRisk ?? 'medium', tone: 'neutral' },
                ]}
            />
            <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
                <PanelCard title="Capacity Forecast (7 Days)">
                    <DataTable
                        columns={[
                            { key: 'date', label: 'Date' },
                            { key: 'arrivals', label: 'Arrivals' },
                            { key: 'departures', label: 'Departures' },
                            { key: 'projectedOccupancy', label: 'Occupancy' },
                            { key: 'shortage', label: 'Shortage' },
                            { key: 'risk', label: 'Risk' },
                        ]}
                        rows={detail.forecastDays || []}
                        rowKey="dateIso"
                    />
                </PanelCard>
                <PanelCard title="AI Insights">
                    <ul className="space-y-3 p-5">
                        {(detail.insights || []).map((line) => (
                            <li key={line} className="rounded-xl border border-lx-border bg-[#fbfdff] p-3 text-sm font-semibold text-lx-ink">
                                {line}
                            </li>
                        ))}
                    </ul>
                </PanelCard>
            </section>
            <PanelCard title="Housekeeping Workload Forecast">
                <div className="p-5">
                    <BarChart
                        items={(detail.hkForecast || []).map((d) => ({ label: d.day, value: d.points }))}
                        barClass={theme.bar}
                    />
                </div>
            </PanelCard>
        </div>
    );
}

export function AlertsDashboard({ detail }) {
    return (
        <div className="grid gap-5">
            <DashboardHero detail={detail} />
            <MetricStrip metrics={detail.stats || []} />
            <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
                <PanelCard title="Operational Alert Queue">
                    <div className="overflow-hidden">
                        {(detail.alerts || []).map((alert) => (
                            <AlertRow key={alert.title} alert={alert} />
                        ))}
                    </div>
                </PanelCard>
                <PanelCard title="Recent Actions">
                    <ul className="divide-y divide-lx-line">
                        {(detail.recentActions || []).map((item) => (
                            <li key={item.action} className="px-5 py-4">
                                <div className="font-extrabold text-lx-navy">{item.action}</div>
                                <div className="text-xs font-semibold text-slate-500">{item.time}</div>
                            </li>
                        ))}
                    </ul>
                </PanelCard>
            </section>
        </div>
    );
}

export function ScenarioPlanningDashboard({ detail }) {
    return (
        <div className="grid gap-5">
            <DashboardHero detail={detail} />
            <section className="grid gap-4 md:grid-cols-3">
                {(detail.scenarios || []).map((scenario) => (
                    <div key={scenario.name} className="rounded-2xl border border-lx-border bg-white p-5 shadow-lx-soft">
                        <div className="flex items-center justify-between gap-2">
                            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700">
                                {scenario.status}
                            </span>
                            <span className="text-xs font-black text-orange-600">{scenario.impact} impact</span>
                        </div>
                        <h3 className="mt-3 text-base font-black text-lx-navy">{scenario.name}</h3>
                        <p className="mt-2 text-sm font-semibold text-slate-500">{scenario.summary}</p>
                        {scenario.shortage > 0 && (
                            <p className="mt-3 text-xs font-black text-red-600">Projected shortage: {scenario.shortage} rooms</p>
                        )}
                    </div>
                ))}
            </section>
            <PanelCard title="Scenario Levers">
                <div className="grid gap-3 p-5 md:grid-cols-2">
                    {(detail.levers || []).map((lever) => (
                        <div key={lever} className="rounded-xl border border-dashed border-lx-border bg-[#fbfdff] px-4 py-3 text-sm font-extrabold text-lx-navy">
                            {lever}
                        </div>
                    ))}
                </div>
            </PanelCard>
            {detail.ctaRoute && (
                <Link href={route(detail.ctaRoute)} className="inline-flex w-fit rounded-xl bg-lx-blue px-5 py-3 font-black text-white">
                    {detail.ctaLabel} →
                </Link>
            )}
        </div>
    );
}

export function StrategicRecommendationsDashboard({ detail }) {
    return (
        <div className="grid gap-5">
            <DashboardHero detail={detail} />
            <MetricStrip metrics={(detail.stats || []).map((s) => ({ ...s, tone: 'neutral' }))} />
            <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
                <PanelCard title="Recommendation Queue">
                    <ul className="divide-y divide-lx-line">
                        {(detail.items || []).map((item) => (
                            <li key={item.title} className="flex items-center justify-between gap-4 px-5 py-4">
                                <span className="font-extrabold text-lx-navy">{item.title}</span>
                                <span
                                    className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-black ${
                                        item.approval === 'Required' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                    }`}
                                >
                                    {item.approval}
                                </span>
                            </li>
                        ))}
                    </ul>
                </PanelCard>
                <PanelCard title="Impact vs Effort">
                    <ul className="space-y-3 p-5">
                        {(detail.priorityMatrix || []).map((item) => (
                            <li key={item.title} className="rounded-xl border border-lx-border bg-[#fbfdff] p-3">
                                <div className="font-extrabold text-lx-navy">{item.title}</div>
                                <div className="mt-1 text-xs font-bold text-slate-500">
                                    Impact: {item.impact} · Effort: {item.effort}
                                </div>
                            </li>
                        ))}
                    </ul>
                </PanelCard>
            </section>
        </div>
    );
}

export function AiRecommendationsDashboard({ detail }) {
    return (
        <div className="grid gap-5">
            <DashboardHero detail={detail} />
            <MetricStrip metrics={(detail.stats || []).map((s) => ({ ...s, tone: 'neutral' }))} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(detail.items || []).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-lx-border bg-white p-5 shadow-lx-soft">
                        <div className="flex items-center justify-between">
                            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700">{item.status}</span>
                            <span className="text-xs font-black text-emerald-700">{item.confidence}% confidence</span>
                        </div>
                        <p className="mt-4 text-sm font-extrabold text-lx-navy">{item.text}</p>
                        <p className="mt-2 text-xs font-semibold text-slate-500">Source: {item.source}</p>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <button type="button" className="rounded-lg bg-green-600 px-3 py-2 text-xs font-black text-white">
                                Approve
                            </button>
                            <button type="button" className="rounded-lg border border-lx-border px-3 py-2 text-xs font-black text-slate-600">
                                Dismiss
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// === Smart Lodge Intelligence Hub helpers ===
// Local to ModuleHealthDashboard. The shared HealthRing / ChildModuleCard /
// DashboardHero / PanelCard in Cards.jsx remain in place for every other
// detail view that still uses them.

// Module id -> lucide icon. Used by HubModuleCard to pick the glyph for
// each tile. Unknown ids fall back to CalendarDays.
const HUB_MODULE_ICONS = {
    reservations: CalendarDays,
    'room-utilization': BarChart3,
    housekeeping: WandSparkles,
    labour: Users,
    consumables: Package,
    guest: User,
    'guest-profile': User,
    food: ForkKnife,
    'boon-schedule': ClipboardList,
};

function hubModuleHref(module) {
    if (!module?.route) return null;
    return module.routeParams ? route(module.route, module.routeParams) : route(module.route);
}

function HubStatusPill({ label, tone = 'success' }) {
    const styles = tone === 'success'
        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
        : 'bg-amber-50 text-amber-600 border-amber-100';
    const dot = tone === 'success' ? 'bg-emerald-500' : 'bg-amber-500';
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${styles}`}>
            <span className={`h-2 w-2 rounded-full ${dot}`} />
            {label}
        </span>
    );
}

function HubTopBar({ detail }) {
    const title = detail.title || 'Smart Lodge Intelligence Hub';
    const subtitle = detail.subtitle || 'Health and freshness across Smart Lodge intelligence modules.';
    return (
        <div className="min-w-0">
            {/* Back link lives inline with the hero now that the white page
                header strip is suppressed for this view (see Detail.jsx). */}
            <Link
                href={route('command-center')}
                className="inline-flex items-center text-sm font-semibold text-blue-700 hover:underline"
            >
                ← Back to Command Center
            </Link>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 md:text-5xl xl:text-6xl">
                {title}
            </h1>
            <p className="mt-3 text-lg text-slate-500">{subtitle}</p>
        </div>
    );
}

function HubHealthScoreCard({ health }) {
    const score = health?.healthScore ?? 98;
    const modulesActive = health?.modulesActive ?? 0;
    const warnings = health?.warnings ?? 0;

    return (
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex h-full flex-col items-center gap-6 md:flex-row md:gap-10">
                {/* Donut: full conic ring with white inner circle, bottom
                    shield-check badge. Mirrors the reference DonutProgress. */}
                <div className="relative flex h-40 w-40 shrink-0 items-center justify-center">
                    <div
                        className="h-40 w-40 rounded-full"
                        style={{
                            background: `conic-gradient(#2563eb 0 ${score}%, #dbeafe ${score}% 100%)`,
                        }}
                        aria-hidden
                    />
                    <div className="absolute flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white shadow-sm">
                        <span className="text-4xl font-bold text-slate-900">{score}%</span>
                    </div>
                    <div className="absolute bottom-1 rounded-full bg-white p-2 shadow-md ring-1 ring-slate-100">
                        <ShieldCheck className="h-5 w-5 text-blue-600" />
                    </div>
                </div>

                <div className="text-center md:text-left">
                    <h2 className="text-2xl font-bold text-slate-900">Overall Health Score</h2>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-lg text-slate-500 md:justify-start">
                        <span>{modulesActive} modules active</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>{warnings} warnings</span>
                    </div>
                </div>
            </div>

            {/* Decorative gradient strip at the bottom of the card. */}
            <div className="mt-8 h-16 rounded-[22px] bg-gradient-to-r from-blue-50 to-slate-50" />
        </div>
    );
}

function HubSyncTimelineCard({ items = [] }) {
    return (
        <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                        <Activity className="h-5 w-5" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">Sync Timeline</h3>
                </div>

                <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        Live
                    </span>
                    <button
                        type="button"
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        View all
                    </button>
                </div>
            </div>

            <div>
                {items.map((item, index) => {
                    const isPending = (item.status || '').toLowerCase().startsWith('pending');
                    const isLast = index === items.length - 1;
                    return (
                        <div
                            key={item.module}
                            className={`flex flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:justify-between ${
                                isLast ? '' : 'border-b border-slate-100'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                {isPending ? (
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                                        <Clock3 className="h-4 w-4" />
                                    </div>
                                ) : (
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                        <ShieldCheck className="h-4 w-4" />
                                    </div>
                                )}
                                <span className="font-semibold text-slate-800">{item.module}</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 md:justify-end">
                                <span className={`text-sm font-semibold ${isPending ? 'text-amber-600' : 'text-slate-500'}`}>
                                    {item.status}
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="text-sm text-slate-500">{item.time}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function HubModuleCard({ module }) {
    const Icon = HUB_MODULE_ICONS[module.id] || CalendarDays;
    const href = hubModuleHref(module);
    const status = module.status || 'Active';
    const tone = status.toLowerCase() === 'pending' ? 'warning' : 'success';

    // `flex h-full flex-col` + `mt-auto` on the link pins "Open module" to
    // the bottom edge of every card, so cards with shorter titles/
    // descriptions still line their CTAs up with the longer ones in the
    // same row.
    return (
        <div className="flex h-full flex-col rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="mb-6 flex items-start justify-between gap-4">
                <div className="rounded-2xl bg-slate-50 p-3 text-blue-600">
                    <Icon className="h-5 w-5" />
                </div>
                <HubStatusPill label={status} tone={tone} />
            </div>

            <h4 className="max-w-[260px] text-[26px] font-bold leading-tight text-slate-900">
                {module.title}
            </h4>
            <p className="mt-3 max-w-[300px] text-sm leading-6 text-slate-500">
                {module.description}
            </p>

            {href ? (
                <Link
                    href={href}
                    className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-semibold text-blue-600 hover:underline"
                >
                    Open module <ArrowRight className="h-4 w-4" />
                </Link>
            ) : (
                <span className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-semibold text-blue-600">
                    Open module <ArrowRight className="h-4 w-4" />
                </span>
            )}
        </div>
    );
}

export function ModuleHealthDashboard({ detail }) {
    return (
        <div className="grid gap-8">
            <HubTopBar detail={detail} />

            {/* Top row: health donut + sync timeline. ~1fr / 1.45fr split
                mirrors the reference; stacks vertically below xl. */}
            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_1.45fr]">
                <HubHealthScoreCard health={detail.health} />
                <HubSyncTimelineCard items={detail.syncTimeline || []} />
            </section>

            {/* Module grid: 1 col on mobile, 2 on tablet, 4 on 2xl. */}
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-4">
                {(detail.modules || []).map((module) => (
                    <HubModuleCard key={module.id} module={module} />
                ))}
            </section>
        </div>
    );
}

export function IntegrationsDashboard({ detail }) {
    return (
        <div className="grid gap-5">
            <DashboardHero detail={detail} />
            <MetricStrip metrics={(detail.stats || []).map((s) => ({ ...s, tone: 'neutral' }))} />
            <section className="grid gap-4 xl:grid-cols-2">
                <PanelCard title="Connected Systems">
                    <ul className="divide-y divide-lx-line">
                        {(detail.items || []).map((item) => (
                            <li key={item.name} className="flex items-center justify-between px-5 py-4">
                                <span className="font-extrabold text-lx-navy">{item.name}</span>
                                <span className="font-extrabold text-emerald-700">✓ {item.status}</span>
                            </li>
                        ))}
                    </ul>
                </PanelCard>
                <PanelCard title="Sync Log">
                    <ul className="divide-y divide-lx-line">
                        {(detail.syncLog || []).map((entry) => (
                            <li key={`${entry.system}-${entry.time}`} className="px-5 py-4">
                                <div className="font-extrabold text-lx-navy">{entry.system}</div>
                                <div className="text-sm text-slate-500">{entry.event}</div>
                                <div className="text-xs font-bold text-slate-400">{entry.time}</div>
                            </li>
                        ))}
                    </ul>
                </PanelCard>
            </section>
        </div>
    );
}

export function ModuleMetricsDashboard({ detail, tableColumns, tableRows, tableRowKey, extraPanel }) {
    const theme = themeFor(detail);

    return (
        <div className="grid gap-5">
            <DashboardHero detail={detail} />
            <MetricStrip metrics={detail.metrics || []} />
            {tableColumns && tableRows && (
                <PanelCard title={extraPanel?.title || 'Operational Detail'}>
                    <DataTable columns={tableColumns} rows={tableRows} rowKey={tableRowKey} />
                </PanelCard>
            )}
            {detail.trend && (
                <PanelCard title="Trend">
                    <div className="p-5">
                        <BarChart items={detail.trend} barClass={theme.bar} />
                    </div>
                </PanelCard>
            )}
            {detail.coverageByDay && (
                <PanelCard title="Coverage by Day">
                    <div className="p-5">
                        <BarChart
                            items={detail.coverageByDay.map((d) => ({ label: d.day, value: d.scheduled }))}
                            barClass={theme.bar}
                        />
                    </div>
                </PanelCard>
            )}
            {extraPanel?.content}
        </div>
    );
}

export function ConsumablesDashboard({ detail }) {
    return (
        <ModuleMetricsDashboard
            detail={detail}
            tableColumns={[
                { key: 'item', label: 'Item' },
                { key: 'onHand', label: 'On Hand' },
                { key: 'par', label: 'Par Level' },
                { key: 'status', label: 'Status' },
            ]}
            tableRows={detail.inventory || []}
            tableRowKey="item"
        />
    );
}

export function LabourForecasterDashboard({ detail }) {
    return <ModuleMetricsDashboard detail={detail} />;
}

export function GuestProfileDashboard({ detail }) {
    return (
        <ModuleMetricsDashboard
            detail={detail}
            tableColumns={[
                { key: 'segment', label: 'Company Segment' },
                { key: 'guests', label: 'Guests' },
                { key: 'satisfaction', label: 'Satisfaction' },
            ]}
            tableRows={detail.segments || []}
            tableRowKey="segment"
        />
    );
}

export function EventsDirectorDashboard({ detail }) {
    return (
        <ModuleMetricsDashboard
            detail={detail}
            tableColumns={[
                { key: 'name', label: 'Event' },
                { key: 'date', label: 'Date' },
                { key: 'attendees', label: 'Attendees' },
                { key: 'status', label: 'Status' },
            ]}
            tableRows={detail.events || []}
            tableRowKey="name"
        />
    );
}

export function GuestPortalDashboard({ detail }) {
    return (
        <ModuleMetricsDashboard
            detail={detail}
            tableColumns={[
                { key: 'action', label: 'Top Portal Actions' },
                { key: 'count', label: 'Count' },
            ]}
            tableRows={detail.topActions || []}
            tableRowKey="action"
        />
    );
}

export function FoodPreferencesDashboard({ detail }) {
    return (
        <ModuleMetricsDashboard
            detail={detail}
            tableColumns={[
                { key: 'type', label: 'Preference Type' },
                { key: 'count', label: 'Guests' },
                { key: 'pct', label: '%' },
            ]}
            tableRows={detail.breakdown || []}
            tableRowKey="type"
        />
    );
}

export function CommunicationEngineDashboard({ detail }) {
    return (
        <ModuleMetricsDashboard
            detail={detail}
            tableColumns={[
                { key: 'channel', label: 'Channel' },
                { key: 'sent', label: 'Sent' },
                { key: 'open', label: 'Open Threads' },
            ]}
            tableRows={detail.channels || []}
            tableRowKey="channel"
        />
    );
}

export function GuestConcernsDashboard({ detail }) {
    return (
        <div className="grid gap-5">
            <ModuleMetricsDashboard
                detail={detail}
                tableColumns={[
                    { key: 'guest', label: 'Concern' },
                    { key: 'priority', label: 'Priority' },
                    { key: 'age', label: 'Age' },
                    { key: 'owner', label: 'Owner' },
                ]}
                tableRows={detail.concerns || []}
                tableRowKey="guest"
            />
            {(detail.alerts || []).length > 0 && (
                <PanelCard title="Linked Operational Alerts">
                    <div className="overflow-hidden">
                        {detail.alerts.map((alert) => (
                            <AlertRow key={alert.title} alert={alert} />
                        ))}
                    </div>
                </PanelCard>
            )}
        </div>
    );
}

export function GuestExperienceDashboard({ detail }) {
    return (
        <ModuleMetricsDashboard
            detail={detail}
            tableColumns={[
                { key: 'driver', label: 'Experience Driver' },
                { key: 'score', label: 'Score' },
            ]}
            tableRows={detail.drivers || []}
            tableRowKey="driver"
        />
    );
}

export const VIEW_COMPONENTS = {
    'executive-dashboards': ExecutiveDashboard,
    'predictive-analytics': PredictiveAnalyticsDashboard,
    alerts: AlertsDashboard,
    'scenario-planning': ScenarioPlanningDashboard,
    'strategic-recommendations': StrategicRecommendationsDashboard,
    'ai-recommendations': AiRecommendationsDashboard,
    'module-health': ModuleHealthDashboard,
    integrations: IntegrationsDashboard,
    'consumables-intelligence': ConsumablesDashboard,
    'labour-forecaster': LabourForecasterDashboard,
    'guest-profile': GuestProfileDashboard,
    'events-director': EventsDirectorDashboard,
    'guest-portal': GuestPortalDashboard,
    'food-preferences': FoodPreferencesDashboard,
    'communication-engine': CommunicationEngineDashboard,
    'guest-concerns': GuestConcernsDashboard,
    'guest-experience': GuestExperienceDashboard,
};
