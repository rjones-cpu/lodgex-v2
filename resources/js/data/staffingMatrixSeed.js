// Static Staffing Matrix for SL-01C lock-control demo.
// Required quantities are stored per occupancy level. Totals are always calculated.

export const OCCUPANCY_LEVELS = [35, 70, 105, 140, 175, 210, 245];

export const CURRENT_OCCUPANCY = 210;

export const LODGES = [{ id: 'mountain-view', name: 'Mountain View Lodge' }];

export const SHIFT_DEFINITIONS = [
    { id: 'day', name: 'Day', window: '06:00 – 18:00', description: 'Kitchen, housekeeping, front desk, and maintenance coverage.' },
    { id: 'night', name: 'Night', window: '18:00 – 06:00', description: 'Night kitchen, overnight janitorial, and night clerk coverage.' },
    { id: 'any', name: 'Any', window: 'Flexible', description: 'Position can be assigned to either shift as occupancy requires.' },
];

export const DEPARTMENT_THEME = {
    'kitchen-day': { icon: 'utensils', totalClass: 'text-violet-700', iconClass: 'bg-violet-100 text-violet-700' },
    'kitchen-night': { icon: 'moon', totalClass: 'text-violet-700', iconClass: 'bg-violet-100 text-violet-700' },
    housekeeping: { icon: 'bed', totalClass: 'text-emerald-700', iconClass: 'bg-emerald-100 text-emerald-700' },
    janitorial: { icon: 'sparkles', totalClass: 'text-emerald-700', iconClass: 'bg-emerald-100 text-emerald-700' },
    'front-desk': { icon: 'desk', totalClass: 'text-orange-600', iconClass: 'bg-orange-100 text-orange-700' },
    maintenance: { icon: 'wrench', totalClass: 'text-blue-700', iconClass: 'bg-blue-100 text-blue-700' },
};

export function departmentTheme(department) {
    return (
        DEPARTMENT_THEME[department?.id] || {
            icon: department?.icon || 'desk',
            totalClass: 'text-slate-700',
            iconClass: 'bg-slate-100 text-slate-600',
        }
    );
}

export function emptyRequirements(levels = OCCUPANCY_LEVELS) {
    return levels.map(() => 0);
}

export function resolveOccupancyLevel(occupancy, levels = OCCUPANCY_LEVELS) {
    const sorted = [...levels].sort((a, b) => a - b);
    return sorted.find((level) => occupancy <= level) ?? sorted[sorted.length - 1];
}

export function cloneMatrix(departments) {
    return departments.map((department) => ({
        ...department,
        positions: department.positions.map((position) => ({
            ...position,
            requirements: [...position.requirements],
        })),
    }));
}

export function departmentTotalAt(department, levelIndex) {
    return department.positions.reduce((sum, position) => sum + (position.requirements[levelIndex] || 0), 0);
}

export function matrixTotalAt(departments, levelIndex) {
    return departments.reduce((sum, department) => sum + departmentTotalAt(department, levelIndex), 0);
}

export function ratioTotalAt(departments, levelIndex) {
    return departments.reduce(
        (sum, department) =>
            sum +
            department.positions
                .filter((position) => position.type === 'ratio')
                .reduce((inner, position) => inner + (position.requirements[levelIndex] || 0), 0),
        0,
    );
}

export function changedCells(published, draft) {
    const changes = [];
    draft.forEach((department, deptIndex) => {
        department.positions.forEach((position, posIndex) => {
            position.requirements.forEach((value, levelIndex) => {
                const previous = published[deptIndex]?.positions[posIndex]?.requirements[levelIndex];
                if (previous !== value) {
                    changes.push({
                        department: department.name,
                        position: position.name,
                        level: OCCUPANCY_LEVELS[levelIndex],
                        previous,
                        next: value,
                    });
                }
            });
        });
    });
    return changes;
}

export const PUBLISHED_MATRIX = [
    {
        id: 'kitchen-day',
        name: 'Kitchen — Day Shift',
        code: 'KIT-D',
        icon: 'utensils',
        positions: [
            { id: 'chef', name: 'Chef', code: 'CHF', shift: 'Day', type: 'fixed', critical: true, excludedFromRatio: true, requirements: [1, 1, 1, 1, 1, 1, 1] },
            { id: 'first-cook', name: '1st Cook', code: 'C1D', shift: 'Day', type: 'ratio', critical: false, requirements: [1, 1, 1, 2, 2, 2, 2] },
            { id: 'second-cook-day', name: '2nd Cook', code: 'C2D', shift: 'Day', type: 'ratio', critical: false, requirements: [1, 1, 1, 2, 2, 2, 3] },
            { id: 'dish-day', name: 'Dishwashing', code: 'DSH-D', shift: 'Day', type: 'ratio', critical: false, requirements: [1, 2, 2, 2, 3, 3, 4] },
        ],
    },
    {
        id: 'kitchen-night',
        name: 'Kitchen — Night Shift',
        code: 'KIT-N',
        icon: 'moon',
        positions: [
            { id: 'baker', name: 'Baker / Night Supervisor', code: 'BKR', shift: 'Night', type: 'fixed', critical: true, requirements: [1, 1, 1, 1, 1, 1, 1] },
            { id: 'baker-helper', name: "Baker's Helper", code: 'BKH', shift: 'Night', type: 'ratio', critical: false, requirements: [0, 1, 1, 1, 1, 1, 1] },
            { id: 'breakfast-cook', name: 'Breakfast Cook', code: 'BRK', shift: 'Night', type: 'ratio', critical: false, requirements: [1, 1, 1, 2, 2, 2, 2] },
            { id: 'second-cook-night', name: '2nd Cook', code: 'C2N', shift: 'Night', type: 'ratio', critical: false, requirements: [1, 1, 1, 2, 2, 2, 2] },
            { id: 'dish-night', name: 'Dishwashing', code: 'DSH-N', shift: 'Night', type: 'ratio', critical: false, requirements: [1, 1, 1, 2, 2, 2, 3] },
        ],
    },
    {
        id: 'housekeeping',
        name: 'Housekeeping',
        code: 'HK',
        icon: 'bed',
        positions: [
            { id: 'housekeepers', name: 'Housekeepers', code: 'HSK', shift: 'Day', type: 'ratio', critical: true, requirements: [1, 2, 3, 4, 4, 5, 7] },
        ],
    },
    {
        id: 'janitorial',
        name: 'Janitorial',
        code: 'JAN',
        icon: 'sparkles',
        positions: [
            { id: 'jan-day', name: 'Janitorial (Day)', code: 'JAN-D', shift: 'Day', type: 'ratio', critical: false, requirements: [1, 1, 1, 2, 2, 2, 2] },
            { id: 'jan-night', name: 'Janitorial (Night)', code: 'JAN-N', shift: 'Night', type: 'ratio', critical: false, requirements: [0, 1, 1, 1, 1, 1, 2] },
        ],
    },
    {
        id: 'front-desk',
        name: 'Front Desk & Admin',
        code: 'FDA',
        icon: 'desk',
        positions: [
            { id: 'front-desk', name: 'Front Desk', code: 'FD', shift: 'Day', type: 'ratio', critical: false, requirements: [1, 1, 1, 2, 2, 2, 2] },
            { id: 'camp-manager', name: 'Camp Manager', code: 'CM', shift: 'Day', type: 'fixed', critical: true, excludedFromRatio: true, requirements: [1, 1, 1, 1, 1, 1, 1] },
        ],
    },
    {
        id: 'maintenance',
        name: 'Maintenance',
        code: 'MNT',
        icon: 'wrench',
        positions: [
            { id: 'maint-lead', name: 'Lead', code: 'MNT-L', shift: 'Day', type: 'fixed', critical: true, excludedFromRatio: true, requirements: [1, 1, 1, 1, 1, 1, 1] },
            { id: 'maint-second', name: '2nd', code: 'MNT-2', shift: 'Day', type: 'fixed', critical: false, excludedFromRatio: true, requirements: [1, 1, 1, 2, 2, 2, 2] },
        ],
    },
];

export const MATRIX_META = {
    lodgeId: 'mountain-view',
    lodgeName: 'Mountain View Lodge',
    name: 'Standard Camp Staffing Model',
    description: 'Approved lodge operations matrix for kitchen, housekeeping, janitorial, front desk, and maintenance.',
    version: '3.2',
    effectiveDate: '2026-06-01',
    lastPublished: 'Jun 1, 2026 9:14 AM',
    lastModified: 'Jun 1, 2026 9:14 AM',
    publishedBy: 'Ralph Jones',
};

export const INITIAL_LOCK = {
    isLocked: true,
    lockedBy: 'Ralph Jones',
    lockedAt: 'Jun 1, 2026 9:14 AM',
    lockReason: 'Approved staffing model for summer operations.',
    unlockedBy: null,
    unlockedAt: null,
    unlockReason: null,
    whoMayEdit: 'Head Office only',
    relockAt: null,
    draftOwner: null,
};

export const VERSION_HISTORY = [
    { version: '3.2', status: 'Active', effectiveDate: 'Jun 1, 2026', publishedBy: 'Ralph Jones', publishedAt: 'Jun 1, 2026', summary: 'Summer operations lock.' },
    { version: '3.1', status: 'Archived', effectiveDate: 'Mar 1, 2026', publishedBy: 'Ralph Jones', publishedAt: 'Feb 26, 2026', summary: 'Night dishwashing +1 at 175+.' },
    { version: '3.0', status: 'Archived', effectiveDate: 'Jan 6, 2026', publishedBy: 'Head Office', publishedAt: 'Jan 4, 2026', summary: 'Initial 2026 published model.' },
];

export const CHANGE_REQUESTS = [
    {
        number: 'CR-1042',
        requestedBy: 'Elena Rossi',
        date: 'Aug 14, 2026',
        priority: 'High',
        reason: 'Housekeeping workload increase',
        status: 'Submitted',
        description: 'Increase housekeepers from 5 to 6 at occupancy 210.',
    },
];

export const TEMPORARY_OVERRIDES = [
    {
        id: 'ovr-1',
        position: 'Housekeepers',
        shift: 'Day',
        start: 'Aug 18, 2026',
        end: 'Aug 21, 2026',
        base: 5,
        override: 6,
        reason: 'Peak occupancy turnaround',
        status: 'Approved',
    },
];

export const INITIAL_AUDIT = [
    { id: 'AUD-310', action: 'Matrix locked', user: 'Ralph Jones', role: 'Head Office Admin', at: 'Jun 1, 2026 9:14 AM', reason: 'Approved staffing model for summer operations.' },
    { id: 'AUD-309', action: 'Version 3.2 published', user: 'Ralph Jones', role: 'Head Office Admin', at: 'Jun 1, 2026 9:12 AM', reason: 'Summer operations lock.' },
];
