function Icon({ children, className = 'h-[18px] w-[18px]', viewBox = '0 0 24 24' }) {
    return (
        <svg
            viewBox={viewBox}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden
        >
            {children}
        </svg>
    );
}

/** KPI — Lodge Health: heart outline with EKG pulse */
export function IconLodgeHealth({ className }) {
    return (
        <Icon className={className}>
            <path d="M12 21s-6.5-4.2-8.5-8.2C2.2 9.8 3.6 6 7 5.2c1.8-.4 3.4.3 5 2 1.6-1.7 3.2-2.4 5-2 3.4.8 4.8 4.6 3.5 7.8C18.5 16.8 12 21 12 21Z" />
            <path d="M6.5 12.5h1.5l1 2 1.5-3.5 1.5 2.5 1.5-1h1.5" />
        </Icon>
    );
}

/** KPI — Occupancy / Executive building */
export function IconBuilding({ className }) {
    return (
        <Icon className={className}>
            <path d="M4 21V9l8-5 8 5v12" />
            <path d="M9 21v-6h6v6" />
            <path d="M9 10h.01M12 10h.01M15 10h.01M9 14h.01M12 14h.01M15 14h.01" />
        </Icon>
    );
}

/** KPI — Open Risks: shield with cross/plus */
export function IconShieldRisk({ className }) {
    return (
        <Icon className={className}>
            <path d="M12 3 20 7v6c0 5-4 8.5-8 9-4-.5-8-4-8-9V7l8-4Z" />
            <path d="M12 8v8M8 12h8" />
        </Icon>
    );
}

/** KPI — Rooms at Risk: bed */
export function IconBed({ className }) {
    return (
        <Icon className={className}>
            <path d="M3 14V7.5A2.5 2.5 0 0 1 5.5 5h5A2.5 2.5 0 0 1 13 7.5V14" />
            <path d="M3 18v-4h18v4" />
            <path d="M3 18h18M7 14h4" />
        </Icon>
    );
}

/** KPI — HK Readiness: broom with sparkles */
export function IconBroom({ className }) {
    return (
        <Icon className={className}>
            <path d="m14 4 5 5" />
            <path d="M5.5 19.5 13 12l3 3L8.5 22 5.5 19.5Z" />
            <path d="M16.5 6.5 17.5 5.5M19 8.5 20 7.5" />
        </Icon>
    );
}

/** KPI — Labour Coverage: three people */
export function IconPeopleGroup({ className }) {
    return (
        <Icon className={className}>
            <circle cx="9" cy="8" r="2.5" />
            <path d="M4 19c0-2.8 2.2-5 5-5s5 2.2 5 5" />
            <circle cx="17" cy="9" r="2" />
            <path d="M14.5 19c.3-1.8 1.8-3 3.5-3 1.2 0 2.3.5 3 1.5" />
        </Icon>
    );
}

/** KPI — Utility Services: water drop */
export function IconWaterDrop({ className }) {
    return (
        <Icon className={className}>
            <path d="M12 3.5C9 8.5 7 10.8 7 13.5a5 5 0 0 0 10 0c0-2.7-2-5-5-10Z" />
        </Icon>
    );
}

/** KPI — Guest Experience: smiley */
export function IconSmiley({ className }) {
    return (
        <Icon className={className}>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M8.5 10h.01M15.5 10h.01" />
            <path d="M8.5 14.5c1 1.5 2.2 2.2 3.5 2.2s2.5-.7 3.5-2.2" />
        </Icon>
    );
}

/** Command Function — Risk alert triangle */
export function IconAlertTriangle({ className }) {
    return (
        <Icon className={className}>
            <path d="M12 4 21 20H3L12 4Z" />
            <path d="M12 10v4M12 17h.01" />
        </Icon>
    );
}

/** Command Function — Predictive analytics chart */
export function IconChartTrend({ className }) {
    return (
        <Icon className={className}>
            <path d="M4 19V5" />
            <path d="M4 19h16" />
            <path d="M8 15l3-4 3 2 5-7" />
            <path d="M17 6h3v3" />
        </Icon>
    );
}

/** Command Function — Strategic recommendations star */
export function IconStarBadge({ className }) {
    return (
        <Icon className={className}>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5 13.4 11H17l-2.8 2 1 3.5L12 14.8 8.4 16.5l1-3.5L6.6 11h3.6L12 7.5Z" />
        </Icon>
    );
}

/** Command Function — Scenario planning funnel */
export function IconFunnel({ className }) {
    return (
        <Icon className={className}>
            <path d="M5 5h14l-5 7v5l-4 2v-7L5 5Z" />
            <circle cx="9" cy="8" r="0.9" fill="currentColor" stroke="none" />
            <circle cx="12" cy="7.5" r="0.9" fill="currentColor" stroke="none" />
            <circle cx="14.5" cy="9" r="0.9" fill="currentColor" stroke="none" />
        </Icon>
    );
}

/** Command Function — Scenario planning nodes (legacy alias) */
export function IconNetworkNodes({ className }) {
    return <IconFunnel className={className} />;
}

/** Module — Calendar (events / reservations) */
export function IconCalendar({ className }) {
    return (
        <Icon className={className}>
            <rect x="4" y="5" width="16" height="15" rx="2" />
            <path d="M8 3v4M16 3v4M4 10h16" />
        </Icon>
    );
}

/** Module — Calendar with check (reservations) */
export function IconCalendarCheck({ className }) {
    return (
        <Icon className={className}>
            <rect x="4" y="5" width="16" height="15" rx="2" />
            <path d="M8 3v4M16 3v4M4 10h16" />
            <path d="m9 14 2 2 4-4" />
        </Icon>
    );
}

/** Module — Package box (consumables) */
export function IconPackage({ className }) {
    return (
        <Icon className={className}>
            <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z" />
            <path d="M12 12 20 7.5M12 12v9M12 12 4 7.5" />
        </Icon>
    );
}

/** Module — Person */
export function IconPerson({ className }) {
    return (
        <Icon className={className}>
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
        </Icon>
    );
}

/** Module — Laptop (portal) */
export function IconLaptop({ className }) {
    return (
        <Icon className={className}>
            <rect x="4" y="6" width="16" height="10" rx="2" />
            <path d="M2 18h20M8 20h8" />
        </Icon>
    );
}

/** Module — Fork and knife */
export function IconDining({ className }) {
    return (
        <Icon className={className}>
            <path d="M8 4v8a2 2 0 0 0 4 0V4M10 4v16" />
            <path d="M16 4v7c0 1.7 1.3 3 3 3v6" />
        </Icon>
    );
}

/** Module — Message bubble */
export function IconMessage({ className }) {
    return (
        <Icon className={className}>
            <path d="M4 6.5A3.5 3.5 0 0 1 7.5 3h9A3.5 3.5 0 0 1 20 6.5v5A3.5 3.5 0 0 1 16.5 15H11l-4 3.5V15H7.5A3.5 3.5 0 0 1 4 11.5v-5Z" />
        </Icon>
    );
}

/** Module — Bar chart (guest experience analytics) */
export function IconBarChart({ className }) {
    return (
        <Icon className={className}>
            <path d="M4 19V5M4 19h16" />
            <rect x="7" y="12" width="3" height="5" rx=".5" />
            <rect x="12" y="9" width="3" height="8" rx=".5" />
            <rect x="17" y="6" width="3" height="11" rx=".5" />
        </Icon>
    );
}

/** Capability / header — Monitor */
export function IconMonitor({ className }) {
    return (
        <Icon className={className}>
            <rect x="3" y="5" width="18" height="12" rx="2" />
            <path d="M8 20h8M12 17v3" />
        </Icon>
    );
}

/** Capability — Bell */
export function IconBell({ className }) {
    return (
        <Icon className={className}>
            <path d="M15 17H9M18 17H6l1.2-1.5A4 4 0 0 0 8 11.5V9a4 4 0 1 1 8 0v2.5a4 4 0 0 0-.2 1.5L18 17Z" />
            <path d="M10 20a2 2 0 0 0 4 0" />
        </Icon>
    );
}

/** Capability — Dollar circle */
export function IconDollar({ className }) {
    return (
        <Icon className={className}>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7v10" />
            <path d="M15 9.5c-.6-.9-1.6-1.4-3-1.4-1.8 0-2.9.8-2.9 2s1.1 1.8 2.9 2c1.8.2 2.9.8 2.9 2s-1.2 2.1-3 2.1c-1.4 0-2.6-.5-3.4-1.4" />
        </Icon>
    );
}

/** Capability — Document */
export function IconDocument({ className }) {
    return (
        <Icon className={className}>
            <path d="M8 3h6l4 4v14H8V3Z" />
            <path d="M14 3v5h5M10 13h6M10 17h4" />
        </Icon>
    );
}

/** Header — Calendar grid */
export function IconCalendarGrid({ className }) {
    return (
        <Icon className={className}>
            <rect x="4" y="5" width="16" height="15" rx="2" />
            <path d="M8 3v4M16 3v4M4 10h16" />
            <path d="M8 14h2M14 14h2M8 17h2M14 17h2" />
        </Icon>
    );
}

/** Footer — Clock */
export function IconClock({ className }) {
    return (
        <Icon className={className}>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 8v4l2.5 2.5" />
        </Icon>
    );
}

/** Footer — Brain / AI */
export function IconBrain({ className }) {
    return (
        <Icon className={className}>
            <path d="M8 5c-2 0-3.5 1.5-3.5 3.5 0 1 .4 1.9 1.2 2.5C4.8 12.2 4 13.5 4 15c0 2.2 1.8 4 4 4h1" />
            <path d="M16 5c2 0 3.5 1.5 3.5 3.5 0 1-.4 1.9-1.2 2.5 1.7.2 2.7 1.5 2.7 3 0 2.2-1.8 4-4 4h-1" />
            <path d="M9 5c0 2 1 3.5 3 3.5s3-1.5 3-3.5M12 8.5V20" />
        </Icon>
    );
}

export const SUMMARY_ICON_MAP = {
    health: IconLodgeHealth,
    occupancy: IconBuilding,
    risk: IconShieldRisk,
    'rooms-at-risk': IconBed,
    housekeeping: IconBroom,
    labour: IconPeopleGroup,
    utility: IconWaterDrop,
    'guest-experience': IconSmiley,
};

export const FUNCTION_ICON_MAP = {
    'risk-alert-management': IconAlertTriangle,
    'executive-dashboards': IconBuilding,
    'executive-dashboard': IconBuilding,
    'predictive-analytics': IconChartTrend,
    'strategic-recommendations': IconStarBadge,
    'scenario-planning': IconFunnel,
};

export const MODULE_ICON_MAP = {
    reservations: IconCalendarCheck,
    'room-utilization': IconBed,
    housekeeping: IconBroom,
    labour: IconPeopleGroup,
    consumables: IconPackage,
    'guest-profile': IconPerson,
    portal: IconLaptop,
    concerns: IconAlertTriangle,
    'food-preference': IconDining,
    communication: IconMessage,
    events: IconCalendar,
    experience: IconBarChart,
};

export function capabilityIconForTitle(title = '') {
    if (title.includes('Dashboard')) return IconMonitor;
    if (title.includes('Alert')) return IconBell;
    if (title.includes('Demand') || title.includes('Forecast')) return IconChartTrend;
    if (title.includes('Labour') || title.includes('Housekeeping')) return IconPeopleGroup;
    if (title.includes('Guest')) return IconSmiley;
    if (title.includes('Cost')) return IconDollar;
    if (title.includes('Report')) return IconDocument;
    return IconMonitor;
}

export function SummaryIcon({ iconKey, className }) {
    const Component = SUMMARY_ICON_MAP[iconKey] || IconBuilding;
    return <Component className={className} />;
}

export function FunctionIcon({ iconKey, className }) {
    const Component = FUNCTION_ICON_MAP[iconKey] || IconBuilding;
    return <Component className={className} />;
}

export function ModuleIcon({ moduleId, className }) {
    const Component = MODULE_ICON_MAP[moduleId] || IconBuilding;
    return <Component className={className} />;
}

export function CapabilityIcon({ title, className }) {
    const Component = capabilityIconForTitle(title);
    return <Component className={className} />;
}
