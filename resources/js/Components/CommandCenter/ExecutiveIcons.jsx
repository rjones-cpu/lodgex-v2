function IconShell({ children, className = 'h-10 w-10' }) {
    return (
        <svg
            viewBox="0 0 64 64"
            fill="none"
            className={className}
            aria-hidden
            shapeRendering="geometricPrecision"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {children}
        </svg>
    );
}

export function ExecutiveDashboardIcon({ className = 'h-10 w-10' }) {
    return (
        <IconShell className={className}>
            <rect x="10" y="12" width="44" height="40" rx="10" strokeWidth="4" opacity="0.12" />
            <path d="M18 42V32" strokeWidth="5" />
            <path d="M31 42V24" strokeWidth="5" />
            <path d="M44 42V18" strokeWidth="5" />
            <path d="M17 28c8-1 11-9 18-9 5 0 7 3 12 1" strokeWidth="4" />
        </IconShell>
    );
}

export function PredictiveAnalyticsIcon({ className = 'h-10 w-10' }) {
    return (
        <IconShell className={className}>
            <path d="M10 46h44" strokeWidth="4" opacity="0.12" />
            <path d="M13 40c7 0 8-10 15-10 6 0 7-10 14-10h9" strokeWidth="5" />
            <path d="M44 14h8v8" strokeWidth="4" />
            <circle cx="28" cy="30" r="4" fill="currentColor" stroke="none" />
        </IconShell>
    );
}

export function RiskAlertIcon({ className = 'h-10 w-10' }) {
    return (
        <IconShell className={className}>
            <path
                d="M32 8L52 16V30C52 40.5 43.5 49.5 32 54C20.5 49.5 12 40.5 12 30V16L32 8Z"
                strokeWidth="4"
            />
            <path d="M32 23v14" strokeWidth="5" />
            <circle cx="32" cy="44" r="3.5" fill="currentColor" stroke="none" />
        </IconShell>
    );
}

export function ScenarioPlanningIcon({ className = 'h-10 w-10' }) {
    return (
        <IconShell className={className}>
            <circle cx="32" cy="32" r="8" strokeWidth="4" />
            <circle cx="16" cy="18" r="5" fill="currentColor" stroke="none" />
            <circle cx="50" cy="20" r="5" fill="currentColor" stroke="none" opacity="0.78" />
            <circle cx="17" cy="47" r="5" fill="currentColor" stroke="none" opacity="0.78" />
            <circle cx="49" cy="46" r="5" fill="currentColor" stroke="none" />
            <path d="M20 21 26 27M45 23 38 28M21 44 26 38M44 43 38 37" strokeWidth="4" />
        </IconShell>
    );
}

export function StrategicRecommendationsIcon({ className = 'h-10 w-10' }) {
    return (
        <IconShell className={className}>
            <circle cx="32" cy="32" r="22" strokeWidth="4" opacity="0.12" />
            <path
                d="M32 14 36.5 27.2H50L39 35.1 43.2 49 32 40.7 20.8 49 25 35.1 14 27.2h13.5L32 14Z"
                strokeWidth="4"
            />
        </IconShell>
    );
}

export const EXECUTIVE_ICON_COMPONENTS = {
    'executive-dashboard': ExecutiveDashboardIcon,
    'predictive-analytics': PredictiveAnalyticsIcon,
    'risk-alert-management': RiskAlertIcon,
    'scenario-planning': ScenarioPlanningIcon,
    'strategic-recommendations': StrategicRecommendationsIcon,
};
