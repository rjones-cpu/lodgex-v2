import { useState } from 'react';
import { Link } from '@inertiajs/react';

const KPI_ACCENTS = {
    blue: 'text-lx-blue',
    green: 'text-emerald-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
    purple: 'text-violet-600',
    teal: 'text-teal-600',
};

const STATUS_TONES = {
    good: 'text-emerald-700 bg-emerald-50',
    warning: 'text-amber-700 bg-amber-50',
    high: 'text-red-700 bg-red-50',
    neutral: 'text-slate-600 bg-slate-100',
};

const TREND_DIRECTION = {
    up: { icon: '↑', className: 'text-emerald-700 bg-emerald-50' },
    down: { icon: '↓', className: 'text-red-700 bg-red-50' },
    stable: { icon: '→', className: 'text-slate-600 bg-slate-100' },
};

function routeHref(item) {
    if (!item?.route) return null;
    if (item.routeParams) {
        return route(item.route, item.routeParams);
    }
    return route(item.route);
}

function Sparkline({ points = [], barClass = 'bg-lx-blue' }) {
    if (!points.length) return null;
    const peak = Math.max(...points.map((p) => p.value || 0), 1);

    return (
        <div className="flex h-16 items-end gap-1">
            {points.map((point) => {
                const height = `${Math.max(12, Math.round(((point.value || 0) / peak) * 100))}%`;
                return (
                    <div
                        key={point.label}
                        className={`min-w-[6px] flex-1 rounded-t ${barClass}`}
                        style={{ height }}
                        title={`${point.label}: ${point.value}`}
                    />
                );
            })}
        </div>
    );
}

function ExecutiveKpiCard({ kpi }) {
    const href = routeHref(kpi);
    const accent = KPI_ACCENTS[kpi.accent] || KPI_ACCENTS.blue;
    const inner = (
        <div className="flex min-h-[118px] flex-col items-center justify-center rounded-2xl border border-lx-border bg-white px-3 py-4 text-center shadow-lx-soft transition hover:border-lx-blue hover:shadow-lx-card">
            <div className="text-xl">{kpi.icon}</div>
            <div className="mt-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{kpi.title}</div>
            <div className={`mt-1.5 text-xl font-black leading-tight ${accent}`}>{kpi.value}</div>
            <div className="mt-1 text-[11px] font-semibold text-slate-500">{kpi.subtext}</div>
        </div>
    );

    if (href) {
        return <Link href={href}>{inner}</Link>;
    }
    return inner;
}

function ExecutiveSummaryCard({ card }) {
    const href = routeHref(card);
    const statusTone = STATUS_TONES[card.statusTone] || STATUS_TONES.neutral;

    return (
        <div className="flex min-h-[168px] flex-col rounded-2xl border border-lx-border bg-white p-4 shadow-lx-soft">
            <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-black text-lx-navy">{card.title}</h4>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${statusTone}`}>{card.status}</span>
            </div>
            <div className="mt-3 text-2xl font-black text-lx-navy">{card.primaryValue}</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">{card.secondaryValue}</div>
            {card.utilityServices?.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                    {card.utilityServices.map((service) => (
                        <li
                            key={service}
                            className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-bold capitalize text-teal-700"
                        >
                            {service}
                        </li>
                    ))}
                </ul>
            )}
            <div className="mt-auto pt-4">
                {href ? (
                    <Link href={href} className="text-xs font-black text-lx-blue hover:underline">
                        {card.ctaLabel} →
                    </Link>
                ) : (
                    <span className="text-xs font-black text-lx-blue">{card.ctaLabel} →</span>
                )}
            </div>
        </div>
    );
}

function ExecutiveTrendCard({ trend }) {
    const [expanded, setExpanded] = useState(false);
    const direction = TREND_DIRECTION[trend.direction] || TREND_DIRECTION.stable;

    return (
        <div className="rounded-2xl border border-lx-border bg-white shadow-lx-soft">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-black text-lx-navy">{trend.title}</h4>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-lg font-black text-lx-blue">{trend.currentValue}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${direction.className}`}>
                            <span>{direction.icon}</span>
                            {trend.directionLabel}
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setExpanded((open) => !open)}
                    className="rounded-lg border border-lx-border px-3 py-1.5 text-xs font-black text-lx-blue hover:bg-[#eef6ff]"
                >
                    {expanded ? 'Collapse' : 'Expand'}
                </button>
            </div>
            <div className="border-t border-lx-line px-4 py-3">
                <Sparkline points={trend.points} barClass={expanded ? 'bg-lx-blue' : 'bg-[#93c5fd]'} />
            </div>
            {expanded && (
                <div className="border-t border-lx-line px-4 py-3">
                    <div className="h-36">
                        <Sparkline points={trend.points} barClass="bg-lx-blue" />
                    </div>
                </div>
            )}
        </div>
    );
}

function ModuleDrillDownCard({ module }) {
    const href = routeHref(module);

    return (
        <div className="flex min-h-[180px] flex-col rounded-2xl border border-lx-border bg-white p-5 shadow-lx-soft">
            <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-black text-lx-navy">{module.title}</h4>
                <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {module.status}
                </span>
            </div>
            <div className="mt-4 text-sm font-extrabold text-lx-blue">{module.keyMetric}</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">{module.openItems} open items</div>
            <div className="mt-auto pt-4">
                {href ? (
                    <Link href={href} className="inline-flex rounded-lg border border-lx-blue px-3 py-2 text-xs font-black text-lx-blue hover:bg-[#eef6ff]">
                        Open Module →
                    </Link>
                ) : (
                    <span className="inline-flex rounded-lg border border-lx-blue px-3 py-2 text-xs font-black text-lx-blue">
                        Open Module →
                    </span>
                )}
            </div>
        </div>
    );
}

export function ExecutiveDashboardView({ detail }) {
    return (
        <div className="grid gap-6">
            <section className="grid grid-cols-2 gap-3 min-[900px]:grid-cols-4 min-[1200px]:grid-cols-8">
                {(detail.kpis || []).map((kpi) => (
                    <ExecutiveKpiCard key={kpi.id} kpi={kpi} />
                ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
                {(detail.summaryColumns || []).map((column) => (
                    <div key={column.title} className="grid gap-3">
                        <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">{column.title}</h3>
                        {column.cards.map((card) => (
                            <ExecutiveSummaryCard key={card.id} card={card} />
                        ))}
                    </div>
                ))}
            </section>

            <section>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                    <div>
                        <h3 className="text-base font-black text-lx-navy">Executive AI Recommendations</h3>
                        <p className="mt-0.5 text-xs font-semibold text-slate-500">
                            Top leadership actions ranked by impact. Approval required before execution.
                        </p>
                    </div>
                    <Link
                        href={route('command-center.show', { view: 'ai-recommendations' })}
                        className="text-xs font-black text-lx-blue hover:underline"
                    >
                        View all recommendations →
                    </Link>
                </div>
                <div className="overflow-hidden rounded-2xl border border-lx-border bg-white shadow-lx-soft">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-lx-border bg-[#fbfdff] text-xs font-black uppercase tracking-wide text-slate-500">
                                    <th className="px-4 py-3">Recommendation</th>
                                    <th className="px-4 py-3">Impact</th>
                                    <th className="px-4 py-3">Affected Module</th>
                                    <th className="px-4 py-3">Approval Required</th>
                                    <th className="px-4 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(detail.executiveRecommendations || []).map((row) => {
                                    const href = routeHref(row);
                                    return (
                                        <tr key={row.recommendation} className="border-b border-lx-line last:border-b-0">
                                            <td className="px-4 py-3 font-extrabold text-lx-navy">{row.recommendation}</td>
                                            <td className="px-4 py-3 font-semibold text-slate-600">{row.impact}</td>
                                            <td className="px-4 py-3 font-semibold text-slate-600">{row.module}</td>
                                            <td className="px-4 py-3">
                                                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
                                                    {row.approval}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {href ? (
                                                    <Link href={href} className="text-xs font-black text-lx-blue hover:underline">
                                                        Review
                                                    </Link>
                                                ) : (
                                                    <span className="text-xs font-black text-lx-blue">Review</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section>
                <h3 className="mb-3 text-base font-black text-lx-navy">Trends</h3>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {(detail.trends || []).map((trend) => (
                        <ExecutiveTrendCard key={trend.id} trend={trend} />
                    ))}
                </div>
            </section>

            <section>
                <h3 className="mb-3 text-base font-black text-lx-navy">Module Drill-Down</h3>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {(detail.moduleDrillDown || []).map((module) => (
                        <ModuleDrillDownCard key={module.id} module={module} />
                    ))}
                </div>
            </section>
        </div>
    );
}
