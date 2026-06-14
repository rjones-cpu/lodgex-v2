import { APP_NAV_ITEMS } from '../data/appNavItems';
import LodgexLogo from './LodgexLogo';
import { Link } from '@inertiajs/react';

function navHref(item) {
    if (!item.href) return null;
    return route(item.href);
}

function SidebarIcon({ label, isActive }) {
    const iconProps = {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.85,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        className: 'h-4 w-4',
        'aria-hidden': true,
    };

    const icons = {
        'Command Center': (
            <>
                <path d="M12 3.5 19.5 8v8L12 20.5 4.5 16V8L12 3.5Z" />
                <circle cx="12" cy="12" r="3.2" />
                <path d="M12 9.8v4.4" />
            </>
        ),
        Reservations: (
            <>
                <rect x="4" y="5" width="16" height="15" rx="4" />
                <path d="M8 3v4M16 3v4M4 10h16M8 14h2M13 14h3M8 17h2" />
            </>
        ),
        'Reservation Operations': (
            <>
                <rect x="4.5" y="4.5" width="6.5" height="6.5" rx="1.7" />
                <rect x="13" y="4.5" width="6.5" height="6.5" rx="1.7" />
                <rect x="4.5" y="13" width="6.5" height="6.5" rx="1.7" />
                <path d="M14 16.25h5.5M16.75 13.5v5.5" />
            </>
        ),
        'Room Utilization': (
            <>
                <path d="M4 11V7.5A2.5 2.5 0 0 1 6.5 5h4A2.5 2.5 0 0 1 13 7.5V11" />
                <path d="M4 18v-7h16a2 2 0 0 1 2 2v5" />
                <path d="M2 18h20M7 14h3" />
            </>
        ),
        Reports: (
            <>
                <path d="M7 3h7l4 4v14H7z" />
                <path d="M14 3v5h5M10 13h6M10 17h4" />
            </>
        ),
        Forecasting: (
            <>
                <path d="M4 19V5M4 19h17" />
                <path d="M7 15l4-4 3 3 6-7" />
                <path d="M17 7h3v3" />
            </>
        ),
        'Housekeeping Planning': (
            <>
                <path d="m15.5 3.5 5 5" />
                <path d="M13.5 5.5 18.5 10.5" />
                <path d="M4 20c4.2-.3 7.7-2.4 10.2-6.2l-3.8-3.8C6.7 12.5 4.5 15.9 4 20Z" />
            </>
        ),
        Maintenance: (
            <>
                <path d="M14.5 5.5 18 2l4 4-3.5 3.5" />
                <path d="M13 7 5 15l-2 6 6-2 8-8" />
                <path d="m7 17 2 2" />
            </>
        ),
        Companies: (
            <>
                <path d="M4 21V7l8-4 8 4v14" />
                <path d="M9 21v-7h6v7M8 9h.01M12 9h.01M16 9h.01" />
            </>
        ),
        'Accommodation Workforce': (
            <>
                <circle cx="9" cy="8" r="3" />
                <path d="M3.5 20a5.5 5.5 0 0 1 11 0M17 11a3 3 0 1 0 0-6M17 14a5 5 0 0 1 4 4" />
            </>
        ),
        'Room Inventory': (
            <>
                <path d="M4 11V7.5A2.5 2.5 0 0 1 6.5 5h4A2.5 2.5 0 0 1 13 7.5V11" />
                <path d="M4 18v-7h16a2 2 0 0 1 2 2v5" />
                <path d="M2 18h20M7 14h3" />
            </>
        ),
        Messaging: (
            <>
                <path d="M4 6.5A3.5 3.5 0 0 1 7.5 3h9A3.5 3.5 0 0 1 20 6.5v5A3.5 3.5 0 0 1 16.5 15H11l-5 4v-4.3A3.5 3.5 0 0 1 4 11.5v-5Z" />
                <path d="M8 8h8M8 11h5" />
            </>
        ),
        'Audit Trail': (
            <>
                <path d="M7 3h7l4 4v14H7z" />
                <path d="M14 3v5h5M10 13h6M10 17h4" />
            </>
        ),
        Policies: (
            <>
                <path d="M12 3 20 7v6c0 5-4 8.5-8 9-4-.5-8-4-8-9V7l8-4Z" />
                <path d="m8.7 12.4 2.1 2.2 4.5-4.6" />
            </>
        ),
        Settings: (
            <>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21a2 2 0 0 1-4 0v-.09a1.7 1.7 0 0 0-1-1.51 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 0 1 0-4h.09a1.7 1.7 0 0 0 1.51-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1 1.51 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.2.63.78 1 1.55 1H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z" />
            </>
        ),
    };

    return (
        <span
            className={`relative grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-[9px] border transition ${
                isActive
                    ? 'border-white/25 bg-white/15 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]'
                    : 'border-transparent bg-white text-lx-blue group-hover:border-[#dce8f5] group-hover:bg-[#f7fbff]'
            }`}
        >
            <svg {...iconProps}>{icons[label] || icons.Settings}</svg>
        </span>
    );
}

function SidebarNavItem({ item, activeHref }) {
    const isActive = item.href === activeHref;
    const className = `group mb-2 flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[11px] font-bold transition ${
        isActive ? 'bg-[#006BFF] text-white shadow-[0_10px_18px_rgba(11,102,228,0.22)]' : 'text-[#27415F] hover:bg-[#f0f6ff]'
    }`;
    const content = (
        <>
            <SidebarIcon label={item.label} isActive={isActive} />
            <span className="leading-tight">{item.label}</span>
        </>
    );

    const href = navHref(item);
    if (href) {
        return (
            <Link key={item.label} href={href} className={className}>
                {content}
            </Link>
        );
    }

    return (
        <div key={item.label} className={`${className} cursor-default opacity-60`} title="Coming soon">
            {content}
        </div>
    );
}

export default function AppSidebar({ activeHref = null, forceVisible = false }) {
    return (
        <aside
            className={`sticky top-0 z-30 flex h-screen min-[1101px]:h-full min-[1101px]:max-h-full w-[224px] shrink-0 flex-col border-r border-lx-border bg-white px-4 py-5 ${
                forceVisible ? '' : 'max-[1100px]:hidden'
            }`}
        >
            <div className="mb-6 flex h-7 shrink-0 items-center">
                <LodgexLogo />
            </div>
            <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
                {APP_NAV_ITEMS.map((item) => (
                    <SidebarNavItem key={item.label} item={item} activeHref={activeHref} />
                ))}
            </nav>
            <div className="shrink-0 pt-4 text-[12px] font-bold text-lx-ink-soft">
                ‹ Collapse
            </div>
        </aside>
    );
}
