import { CommandAiAgent } from './CommandCenterPanels';
import {
    CapabilityIcon,
    FunctionIcon,
    IconBell,
    IconBrain,
    IconCalendarGrid,
    IconClock,
    IconPerson,
    ModuleIcon,
    SummaryIcon,
} from './SmartLodgeIcons';
import CommandCenterLayout from '../../Layouts/CommandCenterLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

const SUMMARY_ACCENTS = {
    blue: { icon: 'text-[#006BFF]', value: 'text-[#071B4D]', status: 'text-[#006BFF]' },
    green: { icon: 'text-[#16A34A]', value: 'text-[#071B4D]', status: 'text-[#16A34A]' },
    red: { icon: 'text-[#EF4444]', value: 'text-[#071B4D]', status: 'text-[#EF4444]' },
    orange: { icon: 'text-[#F97316]', value: 'text-[#071B4D]', status: 'text-[#F97316]' },
    teal: { icon: 'text-[#0891B2]', value: 'text-[#071B4D]', status: 'text-[#0891B2]' },
    purple: { icon: 'text-[#6D28D9]', value: 'text-[#071B4D]', status: 'text-[#6D28D9]' },
};

const FUNCTION_THEMES = {
    orange: { bg: 'bg-[#FFF8F3]', border: 'border-[#FFD6B8]', icon: 'bg-[#FF7A1A]', btn: 'border-[#FF7A1A] text-[#E46C00]', secondary: 'text-[#E34D3A]' },
    blue: { bg: 'bg-[#F3F8FF]', border: 'border-[#BFD7FF]', icon: 'bg-[#006BFF]', btn: 'border-[#006BFF] text-[#006BFF]', secondary: 'text-[#16A34A]' },
    green: { bg: 'bg-[#F2FBF7]', border: 'border-[#BFEAD7]', icon: 'bg-[#16A34A]', btn: 'border-[#16A34A] text-[#15803D]', secondary: 'text-[#15803D]' },
    teal: { bg: 'bg-[#F0FBFC]', border: 'border-[#A5F3FC]', icon: 'bg-[#0891B2]', btn: 'border-[#0891B2] text-[#0E7490]', secondary: 'text-[#E34D3A]' },
    purple: { bg: 'bg-[#F7F3FF]', border: 'border-[#DDD6FE]', icon: 'bg-[#7C3AED]', btn: 'border-[#7C3AED] text-[#6D28D9]', secondary: 'text-[#6D28D9]' },
};

const MODULE_ICON_THEMES = {
    blue: 'bg-[#006BFF]',
    green: 'bg-[#16A34A]',
    orange: 'bg-[#F97316]',
    purple: 'bg-[#7C3AED]',
    teal: 'bg-[#0891B2]',
};

function routeHref(item) {
    if (!item?.route) return null;
    return item.routeParams ? route(item.route, item.routeParams) : route(item.route);
}

function moduleTheme(module) {
    if (module.highlight || module.footerTone === 'warning' && module.id === 'concerns') return 'orange';
    if (module.id === 'labour' || module.id === 'guest-profile' || module.id === 'experience') return 'green';
    if (module.id === 'consumables' || module.id === 'portal' || module.id === 'communication') return 'teal';
    if (module.id === 'events' || module.id === 'food-preference') return 'purple';
    return 'blue';
}

function StatusDot({ label, tone = 'good' }) {
    const colors = { good: 'text-emerald-600', warning: 'text-amber-600', danger: 'text-red-600' };
    return (
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${colors[tone] || colors.good}`}>
            <span className={`h-1.5 w-1.5 rounded-full bg-current ${tone === 'warning' ? 'bg-amber-500' : tone === 'danger' ? 'bg-red-500' : 'bg-emerald-500'}`} />
            {label}
        </span>
    );
}

function TrendPill({ trend }) {
    if (!trend) return null;
    const good = trend.tone === 'good';
    return (
        <span className={`inline-flex items-center gap-0.5 text-[8px] font-black ${good ? 'text-emerald-600' : 'text-amber-600'}`}>
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.text}
        </span>
    );
}

function SummaryCard({ metric }) {
    const accent = SUMMARY_ACCENTS[metric.accent] || SUMMARY_ACCENTS.blue;
    const href = routeHref(metric);
    const body = (
        <div className="flex h-full min-h-[96px] flex-col items-center justify-center rounded-[10px] border border-[#E8EEF7] bg-white px-1.5 py-2.5 text-center shadow-[0_1px_4px_rgba(6,25,74,0.03)]">
            <span className={`grid h-7 w-7 place-items-center ${accent.icon}`}>
                <SummaryIcon iconKey={metric.iconKey} className="h-6 w-6" />
            </span>
            <div className="mt-1 text-[9px] font-black uppercase tracking-tight text-[#071B4D]">{metric.title}</div>
            <div className={`mt-1 text-[16px] font-black leading-none ${accent.value}`}>{metric.value}</div>
            <div className={`mt-1 text-[8px] font-bold ${accent.status}`}>{metric.status}</div>
        </div>
    );
    return href ? <Link href={href} className="block min-w-0">{body}</Link> : <div className="min-w-0">{body}</div>;
}

function FunctionCard({ card }) {
    const theme = FUNCTION_THEMES[card.color] || FUNCTION_THEMES.blue;
    const href = routeHref(card);
    const primaryStartsWithValue = /^\d/.test(card.primaryMetric || '');
    const [secondaryValue, ...secondaryRest] = (card.secondaryMetric || '').split(' ');
    const displayLabel = primaryStartsWithValue ? null : card.primaryMetric;
    const displayValue = primaryStartsWithValue ? card.primaryMetric : secondaryValue;
    const displayStatus = primaryStartsWithValue ? card.secondaryMetric : secondaryRest.join(' ');

    return (
        <div className={`flex min-h-[150px] flex-col rounded-[12px] border p-3 ${theme.bg} ${theme.border}`}>
            <div className="flex items-center gap-2">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[8px] text-white shadow-sm ${theme.icon}`}>
                    <FunctionIcon iconKey={card.iconKey || card.id} className="h-5 w-5" />
                </span>
                <h3 className="text-[11px] font-black leading-tight text-[#071B4D]">{card.title}</h3>
            </div>
            <div className="mt-2.5">
                {displayLabel && <p className="m-0 text-[9px] font-black text-[#5A6B8A]">{displayLabel}</p>}
                <p className="mt-1 text-[16px] font-black leading-none text-[#071B4D]">{displayValue}</p>
                <p className={`mt-1 text-[9px] font-black ${theme.secondary}`}>{displayStatus}</p>
            </div>
            {href ? (
                <Link href={href} className={`mt-auto inline-flex w-fit items-center rounded-[6px] border bg-white px-2.5 py-1.5 text-[10px] font-black ${theme.btn}`}>
                    {card.ctaLabel} →
                </Link>
            ) : (
                <span className={`mt-auto inline-flex w-fit items-center rounded-[6px] border bg-white px-2.5 py-1.5 text-[10px] font-black ${theme.btn}`}>{card.ctaLabel} →</span>
            )}
        </div>
    );
}

function EngineModuleCard({ module, linkTone = 'blue' }) {
    const href = routeHref(module);
    const theme = moduleTheme(module);
    const titleClass = linkTone === 'teal' ? 'text-[#0891B2]' : 'text-[#006BFF]';
    const linkClass = linkTone === 'teal' ? 'text-[#0891B2]' : 'text-[#006BFF]';
    const footerTone = module.footerTone === 'warning' ? 'warning' : module.highlight ? 'danger' : 'good';

    return (
        <div className={`flex min-h-[108px] min-w-0 flex-col rounded-[8px] border border-[#E8EEF7] bg-white p-2 ${module.gridClass || ''}`}>
            <div className="flex items-start gap-1.5">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-[6px] text-white ${MODULE_ICON_THEMES[theme]}`}>
                    <ModuleIcon moduleId={module.id} className="h-4 w-4" />
                </span>
                <div className="min-w-0 leading-tight">
                    <div className={`text-[9px] font-black leading-tight ${titleClass}`}>{module.title}</div>
                    <div className="mt-0.5 text-[8px] font-semibold leading-tight text-[#5A6B8A]">{module.metricLabel}</div>
                </div>
            </div>
            <div className="mt-1.5 text-[15px] font-black leading-none text-[#071B4D]">{module.metricValue}</div>
            {module.secondaryMetric && <div className="mt-1 text-[8px] font-black leading-tight text-[#E34D3A]">{module.secondaryMetric}</div>}
            {module.tertiaryMetric && <div className="text-[8px] font-black leading-tight text-[#E34D3A]">{module.tertiaryMetric}</div>}
            <div className="mt-1 shrink-0">
                {module.trend ? <TrendPill trend={module.trend} /> : module.footerStatus ? <StatusDot label={module.footerStatus} tone={footerTone} /> : null}
            </div>
            {href ? (
                <Link href={href} className={`mt-auto pt-1 text-[9px] font-black ${linkClass}`}>View Details →</Link>
            ) : (
                <span className={`mt-auto pt-1 text-[9px] font-black ${linkClass}`}>View Details →</span>
            )}
        </div>
    );
}

function EnginePanel({ title, subtitle, accent, lastUpdated, children }) {
    const isTeal = accent === 'teal';
    return (
        <div className={`rounded-[10px] border bg-white p-2.5 ${isTeal ? 'border-[#A5F3FC]' : 'border-[#BFD7FF]'}`}>
            <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                    <h2 className={`text-[10px] font-black uppercase tracking-wide ${isTeal ? 'text-[#0891B2]' : 'text-[#006BFF]'}`}>{title}</h2>
                    <p className="mt-0.5 text-[8px] font-semibold text-[#5A6B8A]">{subtitle}</p>
                </div>
                {lastUpdated && <span className="shrink-0 text-[8px] font-semibold text-[#5A6B8A]">Last updated: {lastUpdated}</span>}
            </div>
            <div>{children}</div>
        </div>
    );
}

const CAPABILITY_COLORS = [
    'text-[#5B62D6]',
    'text-[#F59E0B]',
    'text-[#16A34A]',
    'text-[#006BFF]',
    'text-[#0891B2]',
    'text-[#F59E0B]',
    'text-[#6D28D9]',
];

function CapabilityItem({ item, index, showDivider }) {
    const color = CAPABILITY_COLORS[index % CAPABILITY_COLORS.length];
    return (
        <div className={`flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2.5 ${showDivider ? 'border-l border-[#E4ECF5]' : ''}`}>
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-[6px] ${color}`}>
                <CapabilityIcon title={item.title} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
                <div className="text-[9px] font-black leading-tight text-[#071B4D]">{item.title}</div>
                <div className="text-[8px] font-semibold leading-tight text-[#5A6B8A]">{item.description}</div>
            </div>
        </div>
    );
}

function getInitials(name) {
    if (!name) return 'BL';
    return name.trim().split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase() || '').join('') || 'BL';
}

export default function SmartLodgeCommandCenter({
    headerDateTime = '',
    headerDayTime = '',
    siteName = 'Bracebridge Lodge',
    siteLabel = 'Main Site',
    notificationCount = 12,
    quickActions = [],
    commandSummary = [],
    commandFunctions = [],
    occupancyEngine = {},
    guestEngine = {},
    intelligenceOutputs = [],
    systemStatus = {},
}) {
    const { auth } = usePage().props;
    const userName = auth?.user?.name || 'Bracey Lodge';
    const [aiQuery, setAiQuery] = useState('');
    const healthHref = systemStatus.healthRoute ? route(systemStatus.healthRoute, systemStatus.healthRouteParams || {}) : null;

    const header = (
        <header className="shrink-0 bg-[#F6F8FC] px-4 pb-2 pt-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="m-0 whitespace-nowrap text-[22px] font-black leading-none tracking-tight text-[#06194A]">SMART LODGE COMMAND CENTER</h1>
                    <p className="m-0 mt-1 whitespace-nowrap text-[11px] font-semibold text-[#006BFF]">Operational Intelligence. AI Insights. Smarter Decisions.</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    <div className="flex items-center gap-2 rounded-[10px] border border-[#E4ECF5] bg-white px-2.5 py-1.5 shadow-[0_2px_8px_rgba(6,25,74,0.04)]">
                        <span className="grid h-7 w-7 place-items-center rounded-[7px] text-[#006BFF]">
                            <IconCalendarGrid className="h-4 w-4" />
                        </span>
                        <div className="text-[9px] leading-tight">
                            <div className="font-black text-[#071B4D]">{headerDateTime || 'May 12, 2025'}</div>
                            <div className="font-semibold text-[#5A6B8A]">{headerDayTime || 'Mon, 10:24 AM'}</div>
                        </div>
                    </div>
                    <button type="button" className="relative grid h-9 w-9 place-items-center rounded-[10px] border border-[#E4ECF5] bg-white text-[#006BFF] shadow-[0_2px_8px_rgba(6,25,74,0.04)]" aria-label={`${notificationCount} notifications`}>
                        <IconBell className="h-4 w-4" />
                        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[8px] font-black text-white">{notificationCount}</span>
                    </button>
                    <div className="flex items-center gap-2 rounded-[10px] border border-[#E4ECF5] bg-white px-2.5 py-1.5 shadow-[0_2px_8px_rgba(6,25,74,0.04)]">
                        <span className="grid h-7 w-7 place-items-center rounded-[7px] text-[#006BFF]">
                            <IconPerson className="h-4 w-4" />
                        </span>
                        <div className="text-[9px] leading-tight">
                            <div className="font-black text-[#071B4D]">{siteName}</div>
                            <div className="font-semibold text-[#5A6B8A]">{siteLabel}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-[10px] border border-[#E4ECF5] bg-white px-2.5 py-1.5 shadow-[0_2px_8px_rgba(6,25,74,0.04)]">
                        <span className="grid h-7 w-7 place-items-center rounded-[7px] text-[#006BFF]">
                            <IconPerson className="h-4 w-4" />
                        </span>
                        <div className="text-[9px] leading-tight">
                            <div className="font-black text-[#071B4D]">{userName}</div>
                            <div className="font-semibold text-[#5A6B8A]">Lodge Manager</div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );

    return (
        <>
            <Head title="Smart Lodge Command Center" />
            <CommandCenterLayout activeHref="command-center" header={header} forceSidebar>
                <div className="smart-lodge-cc bg-[#F6F8FC]">
                    <main className="command-center-main flex flex-col gap-2.5 px-4 pb-2.5">
                        <CommandAiAgent quickActions={quickActions} query={aiQuery} onQueryChange={setAiQuery} />

                        <section className="shrink-0 rounded-[12px] border border-[#E4ECF5] bg-white p-2.5 shadow-[0_4px_16px_rgba(6,25,74,0.035)]">
                            <h2 className="m-0 text-[9px] font-black uppercase tracking-[0.14em] text-[#071B4D]">TODAY&apos;S COMMAND SUMMARY</h2>
                            <div className="mt-2 grid grid-cols-8 gap-1.5">
                                {commandSummary.map((m) => <SummaryCard key={m.id} metric={m} />)}
                            </div>
                        </section>

                        <section className="shrink-0 rounded-[12px] border border-[#E4ECF5] bg-white p-2.5 shadow-[0_4px_16px_rgba(6,25,74,0.035)]">
                            <h2 className="m-0 text-[9px] font-black uppercase tracking-[0.14em] text-[#071B4D]">COMMAND FUNCTIONS</h2>
                            <div className="mt-2 grid grid-cols-5 gap-2">
                                {commandFunctions.map((c) => <FunctionCard key={c.id} card={c} />)}
                            </div>
                        </section>

                        <section className="grid grid-cols-2 gap-2.5">
                            <EnginePanel title={occupancyEngine.title} subtitle={occupancyEngine.subtitle} accent="blue" lastUpdated={occupancyEngine.lastUpdated}>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {(occupancyEngine.modules || []).map((m) => (
                                        <EngineModuleCard key={m.id} module={m} linkTone="blue" />
                                    ))}
                                </div>
                            </EnginePanel>
                            <EnginePanel title={guestEngine.title} subtitle={guestEngine.subtitle} accent="teal" lastUpdated={guestEngine.lastUpdated}>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {(guestEngine.modules || []).map((m) => (
                                        <EngineModuleCard key={m.id} module={m} linkTone="teal" />
                                    ))}
                                </div>
                            </EnginePanel>
                        </section>

                        <section className="shrink-0 overflow-hidden rounded-[10px] border border-[#E4ECF5] bg-white shadow-[0_4px_16px_rgba(6,25,74,0.035)]">
                            <div className="flex items-stretch overflow-x-auto">
                                {intelligenceOutputs.map((item, i) => (
                                    <CapabilityItem key={item.title} item={item} index={i} showDivider={i > 0} />
                                ))}
                            </div>
                        </section>
                    </main>

                    <footer className="shrink-0 border-t border-[#E4ECF5] bg-white px-4 py-2.5">
                        <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-3">
                            <div className="flex items-center justify-center gap-2 border-r border-[#E4ECF5] py-1 text-[9px] text-[#5A6B8A]">
                                <span className="grid h-8 w-8 place-items-center rounded-lg text-[#5B62D6]">
                                    <IconClock className="h-5 w-5" />
                                </span>
                                <span><span className="block text-[8px] font-black uppercase tracking-wide text-[#5A6B8A]">Last Data Refresh</span><span className="text-[10px] font-bold text-[#071B4D]">{systemStatus.lastRefresh}</span></span>
                            </div>
                            <div className="flex items-center justify-center gap-2 border-r border-[#E4ECF5] py-1 text-[9px] text-[#5A6B8A]">
                                <span className="grid h-8 w-8 place-items-center rounded-lg text-[#006BFF]">
                                    <IconCalendarGrid className="h-5 w-5" />
                                </span>
                                <span><span className="block text-[8px] font-black uppercase tracking-wide text-[#5A6B8A]">Next Forecast Update</span><span className="text-[10px] font-bold text-[#071B4D]">{systemStatus.nextForecastUpdate}</span></span>
                            </div>
                            <div className="flex items-center justify-center gap-2 py-1 text-[9px] text-[#5A6B8A]">
                                <span className="grid h-8 w-8 place-items-center rounded-lg text-[#16A34A]">
                                    <IconBrain className="h-5 w-5" />
                                </span>
                                <span><span className="block text-[8px] font-black uppercase tracking-wide text-[#5A6B8A]">AI Model Status</span><span className="text-[10px] font-bold text-[#071B4D]">{systemStatus.aiModelStatus}</span></span>
                            </div>
                            {healthHref && (
                                <Link href={healthHref} className="rounded-[8px] border border-[#BFD7FF] bg-white px-5 py-2 text-[10px] font-black text-[#006BFF] shadow-sm hover:bg-[#EAF3FF]">
                                    System Health →
                                </Link>
                            )}
                        </div>
                    </footer>
                </div>
            </CommandCenterLayout>
        </>
    );
}
