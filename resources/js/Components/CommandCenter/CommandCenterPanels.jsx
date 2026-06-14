import { Link } from '@inertiajs/react';
import { EXECUTIVE_ICON_COMPONENTS } from './ExecutiveIcons';

const EXECUTIVE_COLORS = {
    blue: {
        icon: 'bg-[#0b78e3] text-white',
        btn: 'border-[#bcd8f4] text-[#0b66e4] hover:bg-[#eef6ff]',
    },
    green: {
        icon: 'bg-[#0bb273] text-white',
        btn: 'border-[#bfead7] text-[#0d8e63] hover:bg-[#eefbf4]',
    },
    orange: {
        icon: 'bg-[#ff7a1a] text-white',
        btn: 'border-[#ffd3aa] text-[#e46c00] hover:bg-[#fff8ef]',
    },
    purple: {
        icon: 'bg-[#6d36d9] text-white',
        btn: 'border-[#d8c9ff] text-[#6d36d9] hover:bg-[#f5f0ff]',
    },
    teal: {
        icon: 'bg-[#0c8da0] text-white',
        btn: 'border-[#bde4ea] text-[#0c7f91] hover:bg-[#eefbfb]',
    },
};

const AI_TOPIC_COLORS = {
    blue: {
        pill: 'border-white/35 bg-white/5 text-white hover:bg-white/10',
        dot: 'bg-[#62c7ff]',
    },
    green: {
        pill: 'border-white/35 bg-white/5 text-white hover:bg-white/10',
        dot: 'bg-[#40d98e]',
    },
    orange: {
        pill: 'border-white/35 bg-white/5 text-white hover:bg-white/10',
        dot: 'bg-[#ffb45e]',
    },
    purple: {
        pill: 'border-white/35 bg-white/5 text-white hover:bg-white/10',
        dot: 'bg-[#b994ff]',
    },
    teal: {
        pill: 'border-white/35 bg-white/5 text-white hover:bg-white/10',
        dot: 'bg-[#4ee0d0]',
    },
};

const TREND_ICON_SCHEMES = {
    blue: {
        tile: 'border-[#b9daf8] bg-gradient-to-br from-[#f2f9ff] via-white to-[#d9edff] text-[#0b66e4]',
        glow: 'bg-[#0b66e4]/8',
        stroke: '#0b66e4',
    },
    green: {
        tile: 'border-[#bdebd5] bg-gradient-to-br from-[#effcf6] via-white to-[#d8f7e8] text-[#0d9f6e]',
        glow: 'bg-[#0d9f6e]/8',
        stroke: '#0d9f6e',
    },
    orange: {
        tile: 'border-[#ffd0a1] bg-gradient-to-br from-[#fff7ed] via-white to-[#ffe5ca] text-[#f97316]',
        glow: 'bg-[#f97316]/9',
        stroke: '#f97316',
    },
    purple: {
        tile: 'border-[#d8c8ff] bg-gradient-to-br from-[#f6f1ff] via-white to-[#eadfff] text-[#7c3aed]',
        glow: 'bg-[#7c3aed]/8',
        stroke: '#7c3aed',
    },
    teal: {
        tile: 'border-[#bce7ee] bg-gradient-to-br from-[#effcff] via-white to-[#d8f4f8] text-[#0c8da0]',
        glow: 'bg-[#0c8da0]/8',
        stroke: '#0c8da0',
    },
    slate: {
        tile: 'border-[#d8e1ec] bg-gradient-to-br from-[#f8fbff] via-white to-[#edf3f9] text-[#27415f]',
        glow: 'bg-[#27415f]/6',
        stroke: '#27415f',
    },
};

const TREND_ICON_SIZES = {
    sm: {
        tile: 'h-9 w-9 rounded-xl',
        glyph: 'h-5 w-5',
        spark: 'h-3.5 w-6',
    },
    md: {
        tile: 'h-11 w-11 rounded-2xl',
        glyph: 'h-6 w-6',
        spark: 'h-4 w-7',
    },
    lg: {
        tile: 'h-[52px] w-[52px] rounded-[20px]',
        glyph: 'h-7 w-7',
        spark: 'h-4 w-8',
    },
    xl: {
        tile: 'h-14 w-14 rounded-[22px]',
        glyph: 'h-8 w-8',
        spark: 'h-5 w-9',
    },
};

function TrendIconTile({ children, scheme = 'blue', size = 'md', trend = 'up', className = '' }) {
    const colors = TREND_ICON_SCHEMES[scheme] || TREND_ICON_SCHEMES.blue;
    const sizes = TREND_ICON_SIZES[size] || TREND_ICON_SIZES.md;
    const path = trend === 'down' ? 'M2 3.5 8 8.5 13 5.5 20 11' : 'M2 11 8 6 13 8.5 20 2.5';

    return (
        <div
            className={`relative grid shrink-0 place-items-center overflow-hidden border shadow-[0_3px_8px_rgba(15,23,42,0.05)] ${sizes.tile} ${colors.tile} ${className}`}
        >
            <div className={`absolute -right-2 -top-2 h-8 w-8 rounded-full blur-sm ${colors.glow}`} aria-hidden />
            <div className={`absolute bottom-1.5 right-1.5 ${sizes.spark}`} aria-hidden>
                <svg viewBox="0 0 22 14" fill="none" className="h-full w-full">
                    <path d={path} stroke={colors.stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                </svg>
            </div>
            <span className="relative z-10">{children}</span>
        </div>
    );
}

function AiRobotIcon() {
    return (
        <div className="ai-robot-icon relative h-[106px] w-[120px] shrink-0">
            <span className="pointer-events-none absolute left-0 top-8 text-[14px] leading-none text-white/95" aria-hidden>✦</span>
            <span className="pointer-events-none absolute left-2 top-[49px] text-[8px] leading-none text-white/70" aria-hidden>✦</span>
            <span className="pointer-events-none absolute right-2 top-7 text-[9px] leading-none text-[#44c4ff]/70" aria-hidden>✦</span>
            <svg
                viewBox="0 0 120 106"
                className="relative h-full w-full"
                aria-hidden
            >
                <defs>
                    <radialGradient id="aiBody" cx="42%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="70%" stopColor="#eef5ff" />
                        <stop offset="100%" stopColor="#d9e7f8" />
                    </radialGradient>
                    <linearGradient id="aiFace" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#041f5f" />
                        <stop offset="100%" stopColor="#021448" />
                    </linearGradient>
                    <radialGradient id="aiEye" cx="35%" cy="30%" r="62%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="30%" stopColor="#9cd6ff" />
                        <stop offset="65%" stopColor="#3c87ff" />
                        <stop offset="100%" stopColor="#1e40af" />
                    </radialGradient>
                    <radialGradient id="aiEyeHalo" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.56" />
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="aiBadge" cx="38%" cy="30%" r="65%">
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#2563eb" />
                    </radialGradient>
                    <radialGradient id="aiAntOrb" cx="35%" cy="30%" r="65%">
                        <stop offset="0%" stopColor="#baf5ff" />
                        <stop offset="100%" stopColor="#39d5ff" />
                    </radialGradient>
                </defs>

                <line x1="54" y1="10" x2="54" y2="24" stroke="white" strokeWidth="2.7" strokeLinecap="round" />
                <circle cx="54" cy="8" r="5.8" fill="url(#aiAntOrb)" />
                <circle cx="52" cy="6.3" r="2" fill="white" opacity="0.9" />

                <ellipse cx="52" cy="60" rx="40" ry="34" fill="url(#aiBody)" />
                <ellipse cx="14" cy="60" rx="6.2" ry="12.5" fill="url(#aiBody)" />
                <ellipse cx="90" cy="60" rx="6.2" ry="12.5" fill="url(#aiBody)" />
                <ellipse cx="52" cy="88" rx="26" ry="8.6" fill="#0b255f" opacity="0.23" />

                <rect x="24.5" y="40.5" width="55" height="36" rx="14" fill="url(#aiFace)" />
                <circle cx="41.5" cy="58.5" r="12.2" fill="url(#aiEyeHalo)" />
                <circle cx="62.5" cy="58.5" r="12.2" fill="url(#aiEyeHalo)" />
                <circle cx="41.5" cy="58.5" r="6.8" fill="url(#aiEye)" />
                <circle cx="62.5" cy="58.5" r="6.8" fill="url(#aiEye)" />
                <circle cx="39.5" cy="56.5" r="1.5" fill="white" opacity="0.92" />
                <circle cx="60.5" cy="56.5" r="1.5" fill="white" opacity="0.92" />

                <circle cx="72" cy="85" r="17.2" fill="url(#aiBadge)" />
                <text
                    x="72" y="89.3"
                    textAnchor="middle"
                    fontSize="10.5"
                    fontWeight="900"
                    fill="white"
                    fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
                >AI</text>
            </svg>
        </div>
    );
}

export function CommandAiAgent({ quickActions = [], query = '', onQueryChange }) {
    return (
        <section className="command-ai-agent relative min-h-[110px] min-w-0 overflow-hidden rounded-[12px] border border-[#0d3c8f] bg-[#03113A] px-5 py-3 shadow-[0_12px_24px_rgba(3,17,58,0.28)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_18%,rgba(80,180,255,0.28),transparent_22%),radial-gradient(circle_at_92%_50%,rgba(111,78,255,0.24),transparent_24%)]" aria-hidden />
            <div className="relative grid h-full grid-cols-1 items-center gap-4 min-[700px]:grid-cols-[430px_1fr] min-[700px]:gap-4 xl:grid-cols-[470px_1fr]">
                <div className="flex items-center gap-3.5">
                    <AiRobotIcon />
                    <div className="min-w-0 text-white">
                        <div className="ai-agent-title whitespace-nowrap text-[16px] font-black leading-[1.08]">Hello! I’m your Command AI.</div>
                        <div className="mt-1 text-[11px] font-semibold leading-snug text-white/88">
                            Ask me anything about occupancy, risks, labour, housekeeping, guest experience, utilities, or forecasts.
                        </div>
                    </div>
                </div>
                <div className="min-w-0">
                    <div className="relative">
                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C3AED]">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                                <circle cx="11" cy="11" r="7" />
                                <path d="m16 16 4 4" />
                            </svg>
                        </span>
                        <input
                            value={query}
                            onChange={(e) => onQueryChange?.(e.target.value)}
                            placeholder="Ask anything about your lodge operations..."
                            className="ai-agent-input h-10 w-full rounded-full border border-white/20 bg-white py-2.5 pl-11 pr-14 text-[11px] font-semibold text-slate-800 shadow-[0_12px_26px_rgba(0,0,0,0.22)] outline-none placeholder:text-slate-400 focus:border-[#8fbfff]"
                        />
                        <button
                            type="button"
                            className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-[#6d36ff] text-lg font-black text-white shadow-md"
                            aria-label="Submit query"
                        >
                            →
                        </button>
                    </div>
                    <div className="ai-agent-pills mt-2 flex min-w-0 gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {quickActions.map((action) => {
                            const colors = AI_TOPIC_COLORS[action.color] || AI_TOPIC_COLORS.purple;

                            return (
                                <button
                                    key={action.label}
                                    type="button"
                                    title={action.topic ? `${action.topic}: ${action.label}` : action.label}
                                    onClick={() => onQueryChange?.(action.label)}
                                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-[9px] font-bold shadow-sm ${colors.pill}`}
                                >
                                    <span className={`h-1 w-1 shrink-0 rounded-full ${colors.dot}`} />
                                    {action.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}

function routeHref(item) {
    if (!item?.route) return null;
    if (item.routeParams) {
        return route(item.route, item.routeParams);
    }
    return route(item.route);
}

function TrendBadge({ trend }) {
    if (!trend) return null;
    const isUp = trend.direction === 'up';
    const isDown = trend.direction === 'down';
    const isGood = trend.tone === 'good';
    const isBad = trend.tone === 'bad';

    let color = 'border-slate-200 bg-slate-50 text-slate-500';
    if (isGood) color = 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (isBad) color = 'border-red-200 bg-red-50 text-red-700';

    const arrow = isUp ? '↗' : isDown ? '↘' : '→';

    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-black ${color}`}>
            <span className="text-[10px] leading-none">{arrow}</span>
            {trend.text}
        </span>
    );
}

function ModuleGlyph({ module, className = 'h-6 w-6' }) {
    const svgProps = {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.9,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        className,
        'aria-hidden': true,
    };

    switch (module?.id) {
        case 'reservations':
        case 'events':
            return (
                <svg {...svgProps}>
                    <rect x="4" y="5" width="16" height="15" rx="4" />
                    <path d="M8 3v4M16 3v4M4 10h16" />
                    <path d="M8 14h2M13 14h3M8 17h2" />
                </svg>
            );
        case 'room-utilization':
            return (
                <svg {...svgProps}>
                    <path d="M4 11V7.5A2.5 2.5 0 0 1 6.5 5h4A2.5 2.5 0 0 1 13 7.5V11" />
                    <path d="M4 18v-7h16a2 2 0 0 1 2 2v5" />
                    <path d="M2 18h20M7 14h3" />
                </svg>
            );
        case 'consumables':
            return (
                <svg {...svgProps}>
                    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
                    <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
                    <path d="m8 5.5 8 4.5" />
                </svg>
            );
        case 'housekeeping':
            return (
                <svg {...svgProps}>
                    <path d="m16 3 5 5M14 5l5 5" />
                    <path d="M4 20c4.5-.4 8.2-2.6 10.8-6.7l-4.1-4.1C6.6 11.8 4.4 15.5 4 20Z" />
                    <path d="M8.5 14.5 11 17M6.5 17.5l1 1" />
                </svg>
            );
        case 'labour':
            return (
                <svg {...svgProps}>
                    <path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20" />
                    <circle cx="10" cy="8" r="4" />
                    <path d="M20 20v-1a3 3 0 0 0-2.5-3M16.5 4.5a3.5 3.5 0 0 1 0 7" />
                </svg>
            );
        case 'guest-profile':
            return (
                <svg {...svgProps}>
                    <circle cx="12" cy="8" r="4" />
                    <path d="M5 20a7 7 0 0 1 14 0" />
                    <path d="M17 5.5 19 4l1 2.4" />
                </svg>
            );
        case 'portal':
            return (
                <svg {...svgProps}>
                    <rect x="3" y="5" width="18" height="12" rx="3" />
                    <path d="M8 21h8M12 17v4M8 10h8M8 13h4" />
                </svg>
            );
        case 'food-preference':
            return (
                <svg {...svgProps}>
                    <path d="M5 4v16M9 4v16M5 9h4" />
                    <path d="M15 4v8a3 3 0 0 0 3 3h1v5" />
                    <path d="M15 4h4" />
                </svg>
            );
        case 'communication':
            return (
                <svg {...svgProps}>
                    <path d="M4 6.5A3.5 3.5 0 0 1 7.5 3h9A3.5 3.5 0 0 1 20 6.5v5A3.5 3.5 0 0 1 16.5 15H11l-5 4v-4.3A3.5 3.5 0 0 1 4 11.5v-5Z" />
                    <path d="M8 8h8M8 11h5" />
                </svg>
            );
        case 'concerns':
            return (
                <svg {...svgProps}>
                    <path d="m12 3 10 18H2L12 3Z" />
                    <path d="M12 9v5M12 17h.01" />
                </svg>
            );
        case 'ai-recommendations':
            return (
                <svg {...svgProps}>
                    <path d="M9 4.5A3 3 0 0 0 6 7.5v1A3 3 0 0 0 4 11.3 3.2 3.2 0 0 0 7.2 14.5H9" />
                    <path d="M15 4.5a3 3 0 0 1 3 3v1a3 3 0 0 1 2 2.8 3.2 3.2 0 0 1-3.2 3.2H15" />
                    <path d="M9 4.5v15M15 4.5v15M9 10h6M9 15h6" />
                </svg>
            );
        case 'experience':
            return (
                <svg {...svgProps}>
                    <path d="M4 19V5M4 19h17" />
                    <rect x="7" y="11" width="3" height="5" rx="1" />
                    <rect x="12" y="8" width="3" height="8" rx="1" />
                    <rect x="17" y="5" width="3" height="11" rx="1" />
                </svg>
            );
        default:
            return <span className="text-2xl leading-none">{module?.icon}</span>;
    }
}

function moduleIconScheme(module, fallback = 'blue') {
    if (module?.highlight || module?.trend?.tone === 'bad') return 'orange';
    if (module?.id === 'ai-recommendations') return 'purple';
    if (module?.id === 'experience' || module?.id === 'communication') return 'teal';
    if (module?.id === 'labour' || module?.id === 'guest-profile') return 'green';
    return fallback;
}

function moduleTrendDirection(module) {
    if (module?.highlight || module?.trend?.tone === 'bad') return 'down';
    return 'up';
}

const SUMMARY_ACCENTS = {
    blue: { icon: 'text-[#006BFF]', value: 'text-[#071B4D]', tile: 'border-[#BFD7FF] bg-[#EAF3FF]' },
    green: { icon: 'text-[#16A34A]', value: 'text-[#071B4D]', tile: 'border-emerald-200 bg-emerald-50' },
    red: { icon: 'text-[#EF4444]', value: 'text-[#EF4444]', tile: 'border-red-200 bg-red-50' },
    orange: { icon: 'text-[#F97316]', value: 'text-[#F97316]', tile: 'border-orange-200 bg-orange-50' },
    teal: { icon: 'text-[#0891B2]', value: 'text-[#071B4D]', tile: 'border-teal-200 bg-teal-50' },
    purple: { icon: 'text-[#6D28D9]', value: 'text-[#071B4D]', tile: 'border-violet-200 bg-violet-50' },
};

const FUNCTION_THEMES = {
    blue: { border: 'border-[#BFD7FF]', bg: 'bg-[#EAF3FF]/40', btn: 'border-[#006BFF] text-[#006BFF] hover:bg-[#EAF3FF]' },
    green: { border: 'border-emerald-200', bg: 'bg-emerald-50/50', btn: 'border-emerald-600 text-emerald-700 hover:bg-emerald-50' },
    orange: { border: 'border-orange-200', bg: 'bg-orange-50/50', btn: 'border-orange-500 text-orange-600 hover:bg-orange-50' },
    purple: { border: 'border-violet-200', bg: 'bg-violet-50/50', btn: 'border-violet-600 text-violet-700 hover:bg-violet-50' },
    teal: { border: 'border-teal-200', bg: 'bg-teal-50/50', btn: 'border-teal-600 text-teal-700 hover:bg-teal-50' },
};

const FOOTER_TONES = {
    good: 'text-emerald-700',
    warning: 'text-amber-700',
    danger: 'text-red-700',
};

function SummaryMetricIcon({ iconKey, className = 'h-5 w-5' }) {
    const svgProps = {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.9,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        className,
        'aria-hidden': true,
    };

    switch (iconKey) {
        case 'health':
            return (
                <svg {...svgProps}>
                    <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10Z" />
                </svg>
            );
        case 'occupancy':
            return (
                <svg {...svgProps}>
                    <path d="M4 21V7l8-4 8 4v14" />
                    <path d="M9 21v-7h6v7" />
                </svg>
            );
        case 'risk':
            return (
                <svg {...svgProps}>
                    <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z" />
                </svg>
            );
        case 'rooms-at-risk':
            return (
                <svg {...svgProps}>
                    <path d="M4 11V7.5A2.5 2.5 0 0 1 6.5 5h4A2.5 2.5 0 0 1 13 7.5V11" />
                    <path d="M4 18v-7h16a2 2 0 0 1 2 2v5" />
                </svg>
            );
        case 'housekeeping':
            return (
                <svg {...svgProps}>
                    <path d="m16 3 5 5M14 5l5 5" />
                    <path d="M4 20c4.5-.4 8.2-2.6 10.8-6.7l-4.1-4.1" />
                </svg>
            );
        case 'labour':
            return (
                <svg {...svgProps}>
                    <circle cx="9" cy="8" r="3" />
                    <path d="M3.5 20a5.5 5.5 0 0 1 11 0M17 11a3 3 0 1 0 0-6M17 14a5 5 0 0 1 4 4" />
                </svg>
            );
        case 'utility':
            return (
                <svg {...svgProps}>
                    <path d="M12 2.5 8 12h3l-1 9.5L16 12h-3l1-9.5Z" />
                </svg>
            );
        case 'guest-experience':
            return (
                <svg {...svgProps}>
                    <circle cx="12" cy="12" r="8" />
                    <path d="M8.5 10h.01M15.5 10h.01M8.5 14a4.5 4.5 0 0 0 7 0" />
                </svg>
            );
        default:
            return null;
    }
}

export function CommandSummaryCard({ metric }) {
    const href = routeHref(metric);
    const accent = SUMMARY_ACCENTS[metric.accent] || SUMMARY_ACCENTS.blue;
    const inner = (
        <div className="flex min-h-[92px] min-w-[118px] flex-col items-center justify-center rounded-xl border border-[#dfe8f2] bg-white px-2 py-3 text-center shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
            <span className={`grid h-8 w-8 place-items-center rounded-lg border ${accent.tile} ${accent.icon}`}>
                <SummaryMetricIcon iconKey={metric.iconKey} className="h-4 w-4" />
            </span>
            <div className="mt-2 text-[9px] font-extrabold uppercase tracking-wide text-[#5A6B8A]">{metric.title}</div>
            <div className={`mt-1 text-lg font-black leading-none ${accent.value}`}>{metric.value}</div>
            <div className="mt-1 text-[9px] font-semibold text-[#5A6B8A]">{metric.status}</div>
        </div>
    );

    if (href) {
        return <Link href={href} className="block transition hover:-translate-y-0.5">{inner}</Link>;
    }
    return inner;
}

export function CommandFunctionCard({ card }) {
    const theme = FUNCTION_THEMES[card.color] || FUNCTION_THEMES.blue;
    const href = routeHref(card);
    const IconComponent = card.iconKey ? EXECUTIVE_ICON_COMPONENTS[card.iconKey] : null;

    return (
        <div className={`flex min-h-[148px] min-w-0 flex-col rounded-2xl border p-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)] ${theme.border} ${theme.bg}`}>
            <div className="flex items-start gap-3">
                <TrendIconTile scheme={card.color || 'blue'} size="md">
                    {IconComponent ? <IconComponent className="h-6 w-6" /> : <span className="text-lg">{card.icon}</span>}
                </TrendIconTile>
                <div className="min-w-0 flex-1">
                    <h3 className="m-0 text-sm font-black text-[#071B4D]">{card.title}</h3>
                    <p className="mt-2 text-xs font-extrabold text-[#071B4D]">{card.primaryMetric}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-[#5A6B8A]">{card.secondaryMetric}</p>
                </div>
            </div>
            {href ? (
                <Link href={href} className={`mt-auto inline-flex w-fit rounded-lg border bg-white px-4 py-1.5 text-[11px] font-black shadow-sm ${theme.btn}`}>
                    {card.ctaLabel} →
                </Link>
            ) : (
                <span className={`mt-auto inline-flex w-fit rounded-lg border bg-white px-4 py-1.5 text-[11px] font-black shadow-sm ${theme.btn}`}>
                    {card.ctaLabel} →
                </span>
            )}
        </div>
    );
}

export function ExecutiveCard({ card }) {
    return <CommandFunctionCard card={card} />;
}

export const OCCUPANCY_MODULE_GRID_CLASS = 'grid grid-cols-3 auto-rows-fr gap-2.5';
export const GUEST_MODULE_GRID_CLASS = 'grid grid-cols-4 auto-rows-fr gap-2.5';

export function OccupancyModuleCard({ module }) {
    const href = routeHref(module);
    const scheme = moduleIconScheme(module, 'blue');
    const trend = moduleTrendDirection(module);

    return (
        <div className="relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-[#dfe8f2] bg-white px-3 py-2.5 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
            <div className="flex min-h-0 items-start gap-3">
                <TrendIconTile scheme={scheme} size="md" trend={trend}>
                    <ModuleGlyph module={module} className="h-6 w-6" />
                </TrendIconTile>
                <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-[11px] font-black leading-tight text-[#17365f]">{module.title}</div>
                    <div className="mt-1 truncate text-[9px] font-bold text-[#45617f]">{module.metricLabel}</div>
                </div>
            </div>
            <div className="mt-auto">
                <div className="text-[22px] font-black leading-none tracking-tight text-[#082d57]">{module.metricValue}</div>
                {module.secondaryMetric && (
                    <div className="mt-1 text-[9px] font-bold text-[#45617f]">{module.secondaryMetric}</div>
                )}
                {module.tertiaryMetric && (
                    <div className="mt-0.5 text-[9px] font-bold text-[#45617f]">{module.tertiaryMetric}</div>
                )}
                <div className="mt-1">
                    {module.footerStatus ? (
                        <span className={`inline-flex items-center gap-1 text-[9px] font-black ${FOOTER_TONES[module.footerTone] || FOOTER_TONES.good}`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {module.footerStatus}
                        </span>
                    ) : module.statusLabel ? (
                        <span
                            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-black ${
                                module.statusTone === 'good'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-200 bg-slate-50 text-slate-500'
                            }`}
                        >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {module.statusLabel}
                        </span>
                    ) : (
                        <TrendBadge trend={module.trend} />
                    )}
                </div>
            </div>
            {href ? (
                <Link href={href} className="pt-1 text-[9px] font-black text-[#0b78e3]">
                    View Details →
                </Link>
            ) : (
                <span className="pt-1 text-[9px] font-black text-[#0b78e3]">View Details →</span>
            )}
        </div>
    );
}

export function GuestModuleCard({ module }) {
    const href = routeHref(module);
    const isConcern = module.highlight;
    const scheme = moduleIconScheme(module, 'teal');
    const trend = moduleTrendDirection(module);

    return (
        <div className="relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-[#dfe8f2] bg-white px-3 py-2.5 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
            <div className="flex min-h-0 items-start gap-2.5">
                <TrendIconTile scheme={scheme} size="md" trend={trend}>
                    <ModuleGlyph module={module} className="h-6 w-6" />
                </TrendIconTile>
                <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-[10px] font-black leading-tight text-[#17365f]">{module.title}</div>
                    <div className="mt-1 truncate text-[9px] font-bold text-[#45617f]">{module.metricLabel}</div>
                </div>
            </div>
            <div className="mt-auto">
                <div className={`text-[22px] font-black leading-none tracking-tight ${isConcern ? 'text-red-600' : 'text-[#17365f]'}`}>
                    {module.metricValue}
                </div>
                {module.secondaryMetric && (
                    <div className="mt-1 text-[9px] font-bold text-[#45617f]">{module.secondaryMetric}</div>
                )}
                {module.footerStatus && (
                    <div className="mt-1">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-black ${FOOTER_TONES[module.footerTone] || FOOTER_TONES.good}`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {module.footerStatus}
                        </span>
                    </div>
                )}
            </div>
            {href ? (
                <Link href={href} className="pt-1 text-[9px] font-black text-[#0c8da0]">
                    View Details →
                </Link>
            ) : (
                <span className="pt-1 text-[9px] font-black text-[#0c8da0]">View Details →</span>
            )}
        </div>
    );
}

function OutputGlyph({ item, className = 'h-7 w-7' }) {
    const title = item?.title || '';
    const svgProps = {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        className,
        'aria-hidden': true,
    };

    if (title.includes('Dashboard')) {
        return (
            <svg {...svgProps}>
                <rect x="4" y="5" width="16" height="12" rx="2" />
                <path d="M8 20h8M12 17v3M8 9h8M8 13h4" />
            </svg>
        );
    }
    if (title.includes('Alert')) {
        return (
            <svg {...svgProps}>
                <path d="M15 17H9M18 10a6 6 0 0 0-12 0c0 7-2 7-2 7h16s-2 0-2-7" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
        );
    }
    if (title.includes('Demand')) {
        return (
            <svg {...svgProps}>
                <path d="M4 19V5M4 19h17M7 15l4-4 3 3 6-7" />
                <path d="M17 7h3v3" />
            </svg>
        );
    }
    if (title.includes('Labour')) {
        return (
            <svg {...svgProps}>
                <circle cx="9" cy="8" r="3" />
                <path d="M3.5 20a5.5 5.5 0 0 1 11 0M17 11a3 3 0 1 0 0-6M17 14a5 5 0 0 1 4 4" />
            </svg>
        );
    }
    if (title.includes('Guest')) {
        return (
            <svg {...svgProps}>
                <circle cx="12" cy="12" r="8" />
                <path d="M8.5 10h.01M15.5 10h.01M8.5 14a4.5 4.5 0 0 0 7 0" />
            </svg>
        );
    }
    if (title.includes('Cost')) {
        return (
            <svg {...svgProps}>
                <circle cx="12" cy="12" r="8" />
                <path d="M12 7v10M15 9.5c-.7-.8-1.7-1.1-3-1.1-1.7 0-2.8.8-2.8 2s1 1.8 2.8 2 3 .8 3 2-1.2 2.1-3 2.1c-1.4 0-2.6-.4-3.4-1.3" />
            </svg>
        );
    }
    return (
        <svg {...svgProps}>
            <path d="M7 3h7l4 4v14H7z" />
            <path d="M14 3v5h5M10 13h6M10 17h4" />
        </svg>
    );
}

function outputIconScheme(item) {
    const title = item?.title || '';
    if (title.includes('Alert')) return 'orange';
    if (title.includes('Guest')) return 'teal';
    if (title.includes('Labour')) return 'purple';
    if (title.includes('Cost')) return 'green';
    if (title.includes('Report')) return 'slate';
    return 'blue';
}

export function CapabilityStripItem({ item, showDivider = false }) {
    return (
        <div className={`flex min-w-[140px] flex-1 items-center gap-3 px-4 py-3 ${showDivider ? 'border-l border-[#dfe8f2]' : ''}`}>
            <TrendIconTile scheme={outputIconScheme(item)} size="sm">
                <OutputGlyph item={item} className="h-5 w-5" />
            </TrendIconTile>
            <div className="min-w-0 text-left">
                <div className="truncate text-[10px] font-black text-[#071B4D]">{item.title}</div>
                <div className="truncate text-[9px] font-semibold text-[#5A6B8A]">{item.description}</div>
            </div>
        </div>
    );
}

export function IntelligenceOutputItem({ item }) {
    return <CapabilityStripItem item={item} />;
}

function EnginePanelIcon({ icon }) {
    const isGuest = icon === 'guest';
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden>
            {isGuest ? (
                <>
                    <circle cx="12" cy="8" r="4" />
                    <path d="M5 20a7 7 0 0 1 14 0" />
                </>
            ) : (
                <>
                    <path d="M4 21V7l8-4 8 4v14" />
                    <path d="M9 21v-7h6v7" />
                </>
            )}
        </svg>
    );
}

export function IntelligenceEnginePanel({ title, subtitle, accent, icon, lastUpdated, gridClass, children }) {
    const accentStyles = {
        blue: {
            border: 'border-[#BFD7FF]',
            bg: 'bg-white',
            title: 'text-[#006BFF]',
            link: 'text-[#006BFF]',
        },
        teal: {
            border: 'border-teal-200',
            bg: 'bg-white',
            title: 'text-[#0891B2]',
            link: 'text-[#0891B2]',
        },
    }[accent === 'purple' ? 'teal' : accent];

    return (
        <div className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border p-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)] ${accentStyles.border} ${accentStyles.bg}`}>
            <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <TrendIconTile scheme={accent === 'purple' ? 'teal' : 'blue'} size="md">
                        <EnginePanelIcon icon={icon} />
                    </TrendIconTile>
                    <div className="min-w-0">
                        <h2 className={`m-0 truncate text-sm font-black tracking-wide ${accentStyles.title}`}>{title}</h2>
                        <p className="m-0 truncate text-[11px] font-semibold text-[#5A6B8A]">{subtitle}</p>
                    </div>
                </div>
                {lastUpdated && (
                    <span className="shrink-0 text-[10px] font-semibold text-[#5A6B8A]">Last updated: {lastUpdated}</span>
                )}
            </div>
            <div className={`command-center-engine-grid min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto ${gridClass}`}>{children}</div>
        </div>
    );
}
