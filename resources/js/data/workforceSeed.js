// Static Workforce demo data. Swap this module for live feeds later without
// changing page layout. KPI cards read the selected day's row from this list.

export const CAMP_CAPACITY = 245;

export const FORECAST_DAYS = [
    { key: '2026-08-15', label: 'Aug 15', weekday: 'Sat' },
    { key: '2026-08-16', label: 'Aug 16', weekday: 'Sun' },
    { key: '2026-08-17', label: 'Aug 17', weekday: 'Mon' },
    { key: '2026-08-18', label: 'Aug 18', weekday: 'Tue' },
    { key: '2026-08-19', label: 'Aug 19', weekday: 'Wed' },
    { key: '2026-08-20', label: 'Aug 20', weekday: 'Thu' },
    { key: '2026-08-21', label: 'Aug 21', weekday: 'Fri' },
];

export function initialForecastDayIndex(date = new Date()) {
    const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
    const index = FORECAST_DAYS.findIndex((day) => day.key === key);
    return index >= 0 ? index : 0;
}

export const OCCUPANCY_FORECAST = [
    { date: 'Aug 15', occupancy: 210 },
    { date: 'Aug 16', occupancy: 218 },
    { date: 'Aug 17', occupancy: 225 },
    { date: 'Aug 18', occupancy: 232 },
    { date: 'Aug 19', occupancy: 240 },
    { date: 'Aug 20', occupancy: 236 },
    { date: 'Aug 21', occupancy: 228 },
];

function series(req, filled) {
    return req.map((value, index) => ({
        req: value,
        filled: filled[index],
        gap: filled[index] - value,
    }));
}

export const DEPARTMENTS = [
    {
        id: 'kitchen-day',
        name: 'Kitchen — Day Shift',
        icon: 'utensils',
        positions: [
            { id: 'chef', name: 'Chef', excludedFromRatio: true, days: series([1, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 1]) },
            { id: 'first-cook', name: '1st Cook', days: series([2, 2, 2, 2, 2, 2, 2], [2, 2, 2, 2, 2, 2, 2]) },
            { id: 'second-cook-day', name: '2nd Cook', days: series([2, 2, 2, 2, 3, 2, 2], [2, 2, 2, 2, 3, 2, 2]) },
            { id: 'dish-day', name: 'Dishwashing', days: series([3, 3, 3, 3, 3, 3, 3], [3, 3, 3, 3, 3, 3, 3]) },
        ],
    },
    {
        id: 'kitchen-night',
        name: 'Kitchen — Night Shift',
        icon: 'moon',
        positions: [
            { id: 'baker', name: 'Baker / Night Supervisor', days: series([1, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 1]) },
            { id: 'baker-helper', name: "Baker's Helper", days: series([1, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 1]) },
            { id: 'breakfast-cook', name: 'Breakfast Cook', days: series([2, 2, 2, 2, 2, 2, 2], [2, 2, 2, 2, 2, 2, 2]) },
            { id: 'second-cook-night', name: '2nd Cook', days: series([2, 2, 2, 2, 2, 2, 2], [2, 1, 2, 1, 2, 2, 0]) },
            { id: 'dish-night', name: 'Dishwashing', days: series([2, 2, 2, 2, 2, 2, 2], [1, 2, 1, 2, 2, 0, 2]) },
        ],
    },
    {
        id: 'housekeeping',
        name: 'Housekeeping',
        icon: 'bed',
        positions: [
            { id: 'housekeepers', name: 'Housekeepers', days: series([5, 5, 6, 7, 7, 7, 6], [3, 3, 3, 4, 4, 5, 4]) },
        ],
    },
    {
        id: 'janitorial',
        name: 'Janitorial',
        icon: 'sparkles',
        positions: [
            { id: 'jan-day', name: 'Janitorial (Day)', days: series([2, 2, 2, 2, 2, 2, 2], [2, 2, 2, 2, 2, 2, 2]) },
            { id: 'jan-night', name: 'Janitorial (Night)', days: series([1, 2, 2, 2, 2, 2, 1], [1, 2, 2, 2, 1, 2, 1]) },
        ],
    },
    {
        id: 'front-desk',
        name: 'Front Desk & Admin',
        icon: 'desk',
        positions: [
            { id: 'front-desk', name: 'Front Desk', days: series([2, 2, 2, 2, 2, 2, 2], [2, 2, 2, 2, 2, 2, 2]) },
            { id: 'camp-manager', name: 'Camp Manager', excludedFromRatio: true, days: series([1, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 1]) },
        ],
    },
    {
        id: 'maintenance',
        name: 'Maintenance',
        icon: 'wrench',
        positions: [
            { id: 'maint-lead', name: 'Lead', excludedFromRatio: true, days: series([1, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 1]) },
            { id: 'maint-second', name: '2nd', excludedFromRatio: true, days: series([2, 2, 2, 2, 2, 2, 2], [2, 2, 2, 2, 2, 2, 2]) },
        ],
    },
];

export function averageDays(days) {
    const count = days.length || 1;
    const req = days.reduce((sum, day) => sum + day.req, 0) / count;
    const filled = days.reduce((sum, day) => sum + day.filled, 0) / count;
    return {
        req: Math.round(req * 10) / 10,
        filled: Math.round(filled * 10) / 10,
        gap: Math.round((filled - req) * 10) / 10,
    };
}

export function sumDays(days) {
    return days.reduce(
        (totals, day) => ({
            req: totals.req + day.req,
            filled: totals.filled + day.filled,
            gap: totals.gap + day.gap,
        }),
        { req: 0, filled: 0, gap: 0 },
    );
}

export function departmentTotals(department) {
    const days = FORECAST_DAYS.map((_, index) =>
        department.positions.reduce(
            (totals, position) => ({
                req: totals.req + position.days[index].req,
                filled: totals.filled + position.days[index].filled,
                gap: totals.gap + position.days[index].gap,
            }),
            { req: 0, filled: 0, gap: 0 },
        ),
    );
    return { days, avg: averageDays(days), week: sumDays(days) };
}

export function grandTotals(departments = DEPARTMENTS) {
    const days = FORECAST_DAYS.map((_, index) =>
        departments.reduce(
            (totals, department) => {
                const day = departmentTotals(department).days[index];
                return {
                    req: totals.req + day.req,
                    filled: totals.filled + day.filled,
                    gap: totals.gap + day.gap,
                };
            },
            { req: 0, filled: 0, gap: 0 },
        ),
    );
    return { days, avg: averageDays(days), week: sumDays(days) };
}

export function staffingGapsFromRequirements(departments = DEPARTMENTS) {
    const totals = grandTotals(departments);
    return FORECAST_DAYS.map((day, index) => ({
        date: day.label,
        key: day.key,
        gap: Math.max(0, -(totals.days[index]?.gap ?? 0)),
        req: totals.days[index]?.req ?? 0,
        filled: totals.days[index]?.filled ?? 0,
    }));
}

function pct(part, whole) {
    if (!whole) return 0;
    return Math.round((part / whole) * 1000) / 10;
}

export function buildDaySnapshot(dayIndex, departments = DEPARTMENTS, totalsByDay = null) {
    const safeIndex = Math.min(Math.max(dayIndex, 0), FORECAST_DAYS.length - 1);
    const totals = (totalsByDay || grandTotals(departments)).days[safeIndex];
    const occupancy = OCCUPANCY_FORECAST[safeIndex]?.occupancy ?? 0;
    const housekeepers = (departments.find((department) => department.id === 'housekeeping') || DEPARTMENTS.find((department) => department.id === 'housekeeping'))
        ?.positions.find((position) => position.id === 'housekeepers')
        ?.days[safeIndex];
    const hkFilled = housekeepers?.filled || 0;
    const open = Math.max(0, totals.req - totals.filled);
    const surplus = Math.max(0, totals.filled - totals.req);
    const filledPercent = pct(totals.filled, totals.req);
    const openPercent = pct(open, totals.req);
    const surplusPercent = pct(surplus, totals.req);

    return {
        day: FORECAST_DAYS[safeIndex],
        dayIndex: safeIndex,
        occupancy: {
            people: occupancy,
            capacity: CAMP_CAPACITY,
            percent: pct(occupancy, CAMP_CAPACITY),
        },
        filled: {
            count: totals.filled,
            percent: filledPercent,
        },
        required: {
            count: totals.req,
            open,
            percent: openPercent,
        },
        gap: {
            count: Math.abs(totals.gap),
            percent: pct(Math.abs(totals.gap), totals.req),
        },
        housekeeping: {
            roomsPerHousekeeper: hkFilled ? Math.round(occupancy / hkFilled) : 0,
            targetMin: 28,
            targetMax: 32,
        },
        summary: {
            filled: totals.filled,
            open,
            surplus,
            total: totals.req,
            filledPercent: `${filledPercent}%`,
            openPercent: `${openPercent}%`,
            surplusPercent: `${surplusPercent}%`,
        },
        shortages: departments
            .flatMap((department) =>
                department.positions
                    .map((position) => {
                        const gap = position.days[safeIndex].gap;
                        return {
                            id: `${position.id}-${FORECAST_DAYS[safeIndex].key}`,
                            name: position.name,
                            department: department.name,
                            gap,
                            severity: gap <= -3 ? 'action' : 'monitor',
                        };
                    })
                    .filter((row) => row.gap < 0),
            )
            .sort((a, b) => a.gap - b.gap)
            .slice(0, 4),
    };
}

const DEFAULT_SNAPSHOT = buildDaySnapshot(0);

export const WORKFORCE_KPIS = DEFAULT_SNAPSHOT;

export const STAFFING_SUMMARY = DEFAULT_SNAPSHOT.summary;

export const TOP_SHORTAGES = [
    { id: 'housekeepers', name: 'Housekeepers', department: 'Housekeeping', gap: -3, severity: 'action' },
    { id: 'dish-night', name: 'Dishwashing (Night)', department: 'Kitchen — Night Shift', gap: -2, severity: 'monitor' },
    { id: 'second-cook-night', name: '2nd Cook (Night)', department: 'Kitchen — Night Shift', gap: -2, severity: 'monitor' },
    { id: 'jan-night', name: 'Janitorial (Night)', department: 'Janitorial', gap: -1, severity: 'monitor' },
];

export const SHORTAGE_ALERTS = [
    {
        id: 'hk-peak',
        title: 'Housekeeping crew below target on peak nights',
        detail: 'Required 7, filled 4 on Aug 18–19. Rooms per housekeeper will sit above the 28–32 target.',
        department: 'Housekeeping',
        severity: 'action',
        date: 'Aug 18–19',
        gap: -3,
    },
    {
        id: 'dish-thu',
        title: 'No night dishwasher scheduled Thursday',
        detail: 'Dishwashing (Night) is unfilled on Aug 20. Kitchen close will slip without a call-in.',
        department: 'Kitchen — Night Shift',
        severity: 'action',
        date: 'Aug 20',
        gap: -2,
    },
    {
        id: 'cook-fri',
        title: 'Night 2nd Cook uncovered Friday',
        detail: 'Both night 2nd cook slots are open on Aug 21. Breakfast prep will start short.',
        department: 'Kitchen — Night Shift',
        severity: 'action',
        date: 'Aug 21',
        gap: -2,
    },
    {
        id: 'jan-wed',
        title: 'Night janitorial monitor',
        detail: 'Janitorial (Night) drops to 1 of 2 required on Aug 19.',
        department: 'Janitorial',
        severity: 'monitor',
        date: 'Aug 19',
        gap: -1,
    },
    {
        id: 'occupancy-wed',
        title: 'Occupancy approaches capacity Wednesday',
        detail: 'Forecast 240 of 245 beds on Aug 19. Staffing ratios tighten if arrivals land as booked.',
        department: 'Camp',
        severity: 'monitor',
        date: 'Aug 19',
        gap: 0,
    },
];

export const STAFFING_ROSTER = [
    { id: 1, name: 'Marie Dubois', position: 'Chef', department: 'Kitchen — Day Shift', shift: 'Day', status: 'Scheduled', days: [true, true, true, true, true, true, false] },
    { id: 2, name: 'James Okonkwo', position: '1st Cook', department: 'Kitchen — Day Shift', shift: 'Day', status: 'Scheduled', days: [true, true, true, true, true, true, true] },
    { id: 3, name: 'Priya Nair', position: '1st Cook', department: 'Kitchen — Day Shift', shift: 'Day', status: 'Scheduled', days: [true, true, true, true, true, false, true] },
    { id: 4, name: 'Luis Herrera', position: '2nd Cook', department: 'Kitchen — Day Shift', shift: 'Day', status: 'Scheduled', days: [true, true, true, true, true, true, true] },
    { id: 5, name: 'Hannah Cole', position: '2nd Cook', department: 'Kitchen — Day Shift', shift: 'Day', status: 'Scheduled', days: [true, true, true, true, true, true, true] },
    { id: 6, name: 'Owen Blake', position: 'Dishwashing', department: 'Kitchen — Day Shift', shift: 'Day', status: 'Scheduled', days: [true, true, true, true, true, true, true] },
    { id: 7, name: 'Sofia Mendes', position: 'Baker / Night Supervisor', department: 'Kitchen — Night Shift', shift: 'Night', status: 'Scheduled', days: [true, true, true, true, true, true, true] },
    { id: 8, name: 'Noah Grant', position: '2nd Cook', department: 'Kitchen — Night Shift', shift: 'Night', status: 'Open', days: [true, false, true, false, true, true, false] },
    { id: 9, name: 'Amina Farah', position: 'Housekeeper', department: 'Housekeeping', shift: 'Day', status: 'Scheduled', days: [true, true, true, true, true, true, true] },
    { id: 10, name: 'Chris Patel', position: 'Housekeeper', department: 'Housekeeping', shift: 'Day', status: 'Scheduled', days: [true, true, true, true, false, true, true] },
    { id: 11, name: 'Elena Rossi', position: 'Housekeeper', department: 'Housekeeping', shift: 'Day', status: 'Scheduled', days: [false, false, true, true, true, true, true] },
    { id: 12, name: 'Open slot', position: 'Housekeeper', department: 'Housekeeping', shift: 'Day', status: 'Open', days: [false, false, false, false, false, false, false] },
    { id: 13, name: 'Tom Nguyen', position: 'Janitorial (Night)', department: 'Janitorial', shift: 'Night', status: 'Scheduled', days: [true, true, true, true, false, true, true] },
    { id: 14, name: 'Rachel Kim', position: 'Front Desk', department: 'Front Desk & Admin', shift: 'Day', status: 'Scheduled', days: [true, true, true, true, true, true, true] },
    { id: 15, name: 'David Shore', position: 'Camp Manager', department: 'Front Desk & Admin', shift: 'Day', status: 'Scheduled', days: [true, true, true, true, true, true, true] },
    { id: 16, name: 'Marcus Lee', position: 'Lead', department: 'Maintenance', shift: 'Day', status: 'Scheduled', days: [true, true, true, true, true, true, true] },
];

export const WORKFORCE_REPORTS = [
    {
        key: 'gap-summary',
        name: 'Staffing Gap Summary',
        description: 'Required vs filled by department for the selected week.',
        cadence: 'Weekly',
    },
    {
        key: 'occupancy-vs-workforce',
        name: 'Occupancy vs Workforce',
        description: 'Camp occupancy plotted against required lodge positions.',
        cadence: 'Daily',
    },
    {
        key: 'hk-workload',
        name: 'Housekeeping Workload',
        description: 'Rooms per housekeeper versus the 28–32 target band.',
        cadence: 'Daily',
    },
    {
        key: 'position-coverage',
        name: 'Position Coverage',
        description: 'Day-by-day coverage for every kitchen, HK, and night role.',
        cadence: 'Weekly',
    },
];
