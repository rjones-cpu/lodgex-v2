import { ExecutiveDashboardView } from './ExecutiveDashboardView';
import {
    AlertRow,
    ChildModuleCard,
    HealthRing,
    KpiCard,
    PanelCard,
    SummaryWidgetCard,
} from './Cards';
import { Link } from '@inertiajs/react';

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

export function ModuleHealthDashboard({ detail }) {
    return (
        <div className="grid gap-5">
            <DashboardHero detail={detail} />
            <section className="grid gap-4 md:grid-cols-[280px_1fr]">
                <div className="rounded-2xl border border-lx-border bg-white p-6 text-center shadow-lx-soft">
                    <HealthRing score={detail.health?.healthScore ?? 98} />
                    <p className="mt-3 font-black text-lx-navy">Overall Health Score</p>
                    <p className="text-sm text-slate-500">
                        {detail.health?.modulesActive} modules active · {detail.health?.warnings} warnings
                    </p>
                </div>
                <PanelCard title="Sync Timeline">
                    <ul className="divide-y divide-lx-line">
                        {(detail.syncTimeline || []).map((item) => (
                            <li key={item.module} className="flex items-center justify-between px-5 py-3">
                                <span className="font-extrabold text-lx-navy">{item.module}</span>
                                <span className="text-xs font-bold text-slate-500">
                                    {item.status} · {item.time}
                                </span>
                            </li>
                        ))}
                    </ul>
                </PanelCard>
            </section>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(detail.modules || []).map((module) => (
                    <ChildModuleCard key={module.id} module={module} />
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
