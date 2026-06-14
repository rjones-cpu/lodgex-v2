export const HK_NAV_ITEMS = [
    { label: 'Command Center', icon: '⚙️', href: 'command-center' },
    { label: 'Reservations', icon: '📅', href: 'reservations' },
    { label: 'Reservation Operations', icon: '▦', href: 'dashboard' },
    { label: 'Room Utilization', icon: '📊', href: 'room-utilization' },
    { label: 'Housekeeping', icon: '🧹', href: 'housekeeping-planning', active: true },
    { label: 'Reports', icon: '📋', href: null },
    { label: 'Settings', icon: '⚙️', href: null },
];

export const HK_TABS = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'tasks', label: 'Task Board', icon: '🧹' },
    { key: 'assignments', label: 'Assignments', icon: '👥' },
    { key: 'readiness', label: 'Room Readiness', icon: '🛏️' },
    { key: 'forecast', label: 'Labour Forecast', icon: '📈' },
    { key: 'inspections', label: 'Inspections', icon: '✅' },
    { key: 'productivity', label: 'Productivity', icon: '📉' },
    { key: 'ai', label: 'AI Assistant', icon: '🤖' },
    { key: 'scenarios', label: 'Scenarios', icon: '🔮' },
    { key: 'schedule', label: 'Schedule Feeds', icon: '📅' },
];

export const SCHEDULE_SOURCE_LABELS = {
    company_schedule: 'Company schedule',
    master_project_schedule: 'Master project schedule',
};
