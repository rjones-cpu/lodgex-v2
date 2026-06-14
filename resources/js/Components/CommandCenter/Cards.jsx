import { Link } from '@inertiajs/react';

const STATUS_TONES = {
    success: 'text-emerald-700 bg-emerald-50',
    danger: 'text-red-600 bg-red-50',
    warning: 'text-amber-700 bg-amber-50',
    purple: 'text-violet-700 bg-violet-50',
};

const ALERT_TONES = {
    high: 'bg-red-600 text-white',
    medium: 'bg-teal-600 text-white',
    low: 'bg-sky-600 text-white',
};

const KPI_ACCENTS = {
    blue: 'text-lx-blue',
    green: 'text-emerald-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
    purple: 'text-violet-600',
    teal: 'text-teal-600',
};

function routeHref(widget) {
    if (!widget.route) return null;
    if (widget.routeParams) {
        return route(widget.route, widget.routeParams);
    }
    return route(widget.route);
}

export function WidgetButton({ widget, className = '' }) {
    const href = routeHref(widget);
    const btn = (
        <span
            className={`inline-flex cursor-pointer items-center justify-center rounded-lg border border-lx-blue px-4 py-2 text-sm font-bold text-lx-blue transition hover:bg-[#eef6ff] ${className}`}
        >
            {widget.ctaLabel} →
        </span>
    );
    if (href) {
        return <Link href={href}>{btn}</Link>;
    }
    return btn;
}

export function SummaryWidgetCard({ widget }) {
    const tone = STATUS_TONES[widget.statusTone] || STATUS_TONES.success;

    return (
        <div className="flex min-h-[200px] flex-col rounded-2xl border border-lx-border bg-white p-5 shadow-lx-soft">
            <div className="flex items-start justify-between gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#f0f6ff] text-xl">
                    {widget.icon}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${tone}`}>{widget.status}</span>
            </div>
            <h3 className="mt-4 text-base font-black text-lx-navy">{widget.title}</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
                {widget.primaryValue} {widget.secondaryText}
            </p>
            <div className="mt-auto pt-5">
                <WidgetButton widget={widget} className="w-full" />
            </div>
        </div>
    );
}

export function KpiCard({ kpi }) {
    const href = routeHref(kpi);
    const accent = KPI_ACCENTS[kpi.accent] || KPI_ACCENTS.blue;
    const inner = (
        <div className="flex min-h-[130px] flex-col items-center justify-center rounded-2xl border border-lx-border bg-white p-4 text-center shadow-lx-soft transition hover:border-lx-blue hover:shadow-lx-card">
            <div className="text-2xl">{kpi.icon}</div>
            <div className="mt-2 text-xs font-extrabold uppercase tracking-wide text-slate-500">{kpi.title}</div>
            <div className={`mt-2 text-2xl font-black ${accent}`}>{kpi.value}</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">{kpi.subtext}</div>
        </div>
    );

    if (href) {
        return <Link href={href}>{inner}</Link>;
    }
    return inner;
}

export function AlertRow({ alert }) {
    const badgeTone = ALERT_TONES[alert.tone] || ALERT_TONES.low;

    return (
        <div
            className="flex min-h-[76px] items-center gap-[18px] border-b border-lx-line px-5 py-4 last:border-b-0"
            style={{ lineHeight: 1.35 }}
        >
            <span className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-black tracking-wide ${badgeTone}`}>
                {alert.priority}
            </span>
            <div className="min-w-0 flex-1">
                <div className="font-extrabold text-lx-navy">{alert.title}</div>
                <div className="text-sm text-slate-500">{alert.description}</div>
            </div>
        </div>
    );
}

export function PanelCard({ title, footerLabel, footerRoute, footerParams, children }) {
    const footerHref = footerRoute
        ? footerParams
            ? route(footerRoute, footerParams)
            : route(footerRoute)
        : null;

    return (
        <div className="overflow-hidden rounded-2xl border border-lx-border bg-white shadow-lx-soft">
            <div className="border-b border-lx-border px-5 py-4">
                <h3 className="text-base font-black text-lx-navy">{title}</h3>
            </div>
            {children}
            {footerLabel && (
                <div className="border-t border-lx-line px-5 py-3">
                    {footerHref ? (
                        <Link href={footerHref} className="text-sm font-black text-lx-blue">
                            {footerLabel} →
                        </Link>
                    ) : (
                        <span className="text-sm font-black text-lx-blue">{footerLabel} →</span>
                    )}
                </div>
            )}
        </div>
    );
}

export function ChildModuleCard({ module }) {
    const href = routeHref(module);

    return (
        <div className="flex min-h-[180px] flex-col rounded-2xl border border-lx-border bg-white p-5 shadow-lx-soft">
            <div className="flex items-start justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#f0f6ff] text-lg">{module.icon}</div>
                <span className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {module.status}
                </span>
            </div>
            <h3 className="mt-3 text-sm font-black text-lx-navy">{module.title}</h3>
            <p className="mt-1 flex-1 text-xs font-semibold text-slate-500">{module.description}</p>
            {href ? (
                <Link href={href} className="mt-4 text-sm font-black text-lx-blue">
                    Open module →
                </Link>
            ) : (
                <span className="mt-4 text-sm font-black text-lx-blue">Open module →</span>
            )}
        </div>
    );
}

export function HealthRing({ score }) {
    return (
        <div className="relative mx-auto grid h-20 w-20 place-items-center">
            <div
                className="absolute inset-0 rounded-full"
                style={{
                    background: `conic-gradient(#0b66e4 0 ${score}%, #e5e7eb ${score}% 100%)`,
                }}
            />
            <div className="relative grid h-14 w-14 place-items-center rounded-full bg-white text-center text-sm font-black text-lx-navy">
                {score}%
            </div>
        </div>
    );
}
