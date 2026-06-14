export const UTILIZATION_METRICS = [
    { label: 'Total Active Rooms', icon: '🏨', value: '1,482', change: '—', direction: 'up' },
    { label: 'In-House', icon: '🛏️', value: '1,124', change: '75.8% occ.', direction: 'up' },
    { label: 'Vacant Clean', icon: '✅', value: '47', change: '↓ 8 vs yesterday', direction: 'down' },
    { label: 'On-Hold', icon: '⏸️', value: '186', change: '↑ 12.5%', direction: 'down' },
    { label: 'Vacant Dirty', icon: '🧹', value: '62', change: '18 due today', direction: 'down' },
    { label: 'Maintenance Hold', icon: '🔧', value: '23', change: '5 overdue', direction: 'down' },
    { label: 'Usable Capacity Tonight', icon: '📊', value: '109', change: 'Shortage: 8', direction: 'down' },
    { label: 'Overflow Risk', icon: '🏨', value: 'High', change: 'Mon May 26', direction: 'down' },
];

export const FORECAST_DAYS = [
    { date: 'May 20', arrivals: 156, departures: 102, net: 54, available: 109, shortage: 0, risk: 'low' },
    { date: 'May 21', arrivals: 178, departures: 118, net: 60, available: 49, shortage: 11, risk: 'medium' },
    { date: 'May 22', arrivals: 192, departures: 134, net: 58, available: -9, shortage: 8, risk: 'high' },
    { date: 'May 23', arrivals: 165, departures: 141, net: 24, available: 15, shortage: 0, risk: 'medium' },
    { date: 'May 24', arrivals: 148, departures: 129, net: 19, available: 34, shortage: 0, risk: 'low' },
    { date: 'May 25', arrivals: 201, departures: 112, net: 89, available: -55, shortage: 22, risk: 'critical' },
    { date: 'May 26', arrivals: 214, departures: 98, net: 116, available: -77, shortage: 31, risk: 'critical' },
];

export const DORM_OCCUPANCY = [
    ['Dorm A', 94, 'red'],
    ['Dorm B', 88, 'orange'],
    ['Dorm C', 82, 'orange'],
    ['Dorm D', 76, 'green'],
    ["Women's Dorm", 71, 'green'],
    ['Dorm E', 68, 'green'],
    ['Dorm F', 61, 'green'],
];

export const SEED_ROOMS = [
    { room: '1103', dorm: 'Dorm B', type: 'Single', status: 'Vacant Clean', worker: null, company: null, holdDays: 0, updated: 'May 20, 09:12 AM' },
    { room: '1107', dorm: 'Dorm C', type: 'Double', status: 'Occupied', worker: 'Carlos Ramirez', company: 'Bechtel Corp', holdDays: 0, updated: 'May 19, 06:45 PM' },
    { room: '1205', dorm: 'Dorm A', type: 'Double', status: 'On-Hold Clean', worker: 'Ethan Brown', company: 'Turner Industrial', holdDays: 9, updated: 'May 20, 08:30 AM' },
    { room: '1208', dorm: 'Dorm A', type: 'Single', status: 'Vacant Dirty', worker: null, company: null, holdDays: 0, updated: 'May 20, 07:15 AM' },
    { room: '1310', dorm: 'Dorm A', type: 'Double', status: 'Occupied', worker: 'Mason Taylor', company: 'Turner Industrial', holdDays: 0, updated: 'May 18, 02:20 PM' },
    { room: '1402', dorm: 'Dorm D', type: 'Single', status: 'Maintenance Hold', worker: null, company: null, holdDays: 0, updated: 'May 17, 11:00 AM', maintenance: 'HVAC — ETA May 22' },
    { room: '1408', dorm: 'Dorm D', type: 'Double', status: 'On-Hold Dirty', worker: 'Nora Fields', company: 'Vertex Services', holdDays: 14, updated: 'May 20, 06:00 AM' },
    { room: '1501', dorm: 'Dorm E', type: 'Single', status: 'Blocked / Reserved', worker: null, company: 'Fluor Enterprises', holdDays: 0, updated: 'May 19, 04:00 PM' },
    { room: '1506', dorm: 'Dorm E', type: 'Double', status: 'Assigned Arrival', worker: 'Alek Patel', company: 'Fluor Enterprises', holdDays: 0, updated: 'May 20, 09:00 AM' },
    { room: '1602', dorm: 'Dorm F', type: 'Single', status: 'Out of Service', worker: null, company: null, holdDays: 0, updated: 'May 10, 09:00 AM' },
    { room: '2104', dorm: "Women's Dorm", type: 'Single', status: 'Vacant Clean', worker: null, company: null, holdDays: 0, updated: 'May 20, 08:45 AM' },
    { room: '2110', dorm: "Women's Dorm", type: 'Single', status: 'On-Hold Clean', worker: 'Sophie Chen', company: 'Bechtel Corp', holdDays: 11, updated: 'May 19, 03:30 PM' },
];

export const ON_HOLD_REVIEW = [
    { room: '1205', dorm: 'Dorm A', worker: 'Ethan Brown', company: 'Turner Industrial', holdDays: 9, returnDate: 'May 28, 2025', policy: '7 days', overPolicy: true, releaseEligible: true, risk: 'Medium' },
    { room: '1408', dorm: 'Dorm D', worker: 'Nora Fields', company: 'Vertex Services', holdDays: 14, returnDate: 'Unknown', policy: '7 days', overPolicy: true, releaseEligible: true, risk: 'High' },
    { room: '2110', dorm: "Women's Dorm", worker: 'Sophie Chen', company: 'Bechtel Corp', holdDays: 11, returnDate: 'Jun 01, 2025', policy: '7 days', overPolicy: true, releaseEligible: false, risk: 'Medium' },
    { room: '1304', dorm: 'Dorm A', worker: 'Debbie Marie', company: 'DMS', holdDays: 6, returnDate: 'May 24, 2025', policy: '7 days', overPolicy: false, releaseEligible: false, risk: 'Low' },
    { room: '1807', dorm: 'Dorm C', worker: 'Mark Davis', company: 'Fluor Enterprises', holdDays: 8, returnDate: 'May 27, 2025', policy: '7 days', overPolicy: true, releaseEligible: true, risk: 'Medium' },
];

export const RELEASE_CANDIDATES = [
    { room: '1408', dorm: 'Dorm D', reason: 'On-hold 14 days, no return date confirmed', recovery: '1 room', approval: 'WFA Coordinator + Lodge Manager', risk: 'High' },
    { room: '1205', dorm: 'Dorm A', reason: 'Worker departed May 20; hold not released', recovery: '1 room', approval: 'Lodge Manager', risk: 'Medium' },
    { room: '1807', dorm: 'Dorm C', reason: 'Return date passed; contractor no-show pattern', recovery: '1 room', approval: 'WFA Coordinator', risk: 'Medium' },
    { room: '2201', dorm: 'Dorm F', reason: 'Duplicate hold — same worker in 1107', recovery: '1 room', approval: 'Lodge Manager', risk: 'Low' },
];

export const OVERFLOW_OPTIONS = [
    { date: 'May 22', shortage: 8, internalRecovery: 6, hotelRooms: 2, cost: '$340/night', recommendation: 'Release 6 on-holds before hotel overflow', risk: 'High' },
    { date: 'May 25', shortage: 22, internalRecovery: 14, hotelRooms: 8, cost: '$2,720/night', recommendation: 'Escalate to Lodge Manager — multi-day pressure', risk: 'Critical' },
    { date: 'May 26', shortage: 31, internalRecovery: 18, hotelRooms: 13, cost: '$4,420/night', recommendation: 'Trigger overflow planning meeting', risk: 'Critical' },
];

export const HOUSEKEEPING_PRIORITY = [
    { room: '1208', dorm: 'Dorm A', status: 'Vacant Dirty', arrivalToday: true, priority: 'Critical', eta: '11:30 AM' },
    { room: '1408', dorm: 'Dorm D', status: 'On-Hold Dirty', arrivalToday: false, priority: 'High', eta: '2:00 PM' },
    { room: '1503', dorm: 'Dorm E', status: 'Vacant Dirty', arrivalToday: true, priority: 'Critical', eta: '10:45 AM' },
    { room: '1312', dorm: 'Dorm A', status: 'Vacant Dirty', arrivalToday: true, priority: 'High', eta: '12:15 PM' },
    { room: '2108', dorm: "Women's Dorm", status: 'Vacant Dirty', arrivalToday: false, priority: 'Medium', eta: '3:30 PM' },
];

export const MAINTENANCE_IMPACT = [
    { room: '1402', dorm: 'Dorm D', issue: 'HVAC failure', eta: 'May 22', overdue: false, capacityImpact: '1 room' },
    { room: '1602', dorm: 'Dorm F', issue: 'Plumbing — extended repair', eta: 'Jun 05', overdue: true, capacityImpact: '1 room' },
    { room: '1705', dorm: 'Dorm E', issue: 'Electrical inspection', eta: 'May 21', overdue: true, capacityImpact: '1 room' },
    { room: '1811', dorm: 'Dorm C', issue: 'Window seal / moisture', eta: 'May 23', overdue: false, capacityImpact: '1 room' },
];

export const CONTRACTOR_ALLOTMENTS = [
    { contractor: 'Bechtel Corp', allotted: 420, used: 398, variance: -22, noShows: 8, trend: 'under' },
    { contractor: 'Turner Industrial', allotted: 380, used: 412, variance: 32, noShows: 4, trend: 'over' },
    { contractor: 'Fluor Enterprises', allotted: 290, used: 245, variance: -45, noShows: 12, trend: 'under' },
    { contractor: 'AECOM', allotted: 180, used: 176, variance: -4, noShows: 6, trend: 'on-track' },
    { contractor: 'Vertex Services', allotted: 120, used: 98, variance: -22, noShows: 3, trend: 'under' },
];

export const AI_RECOMMENDATIONS = [
    {
        id: 1,
        issue: 'Projected shortage of 8 rooms on May 22',
        risk: 'High',
        dataUsed: 'Arrivals 192, departures 134, on-holds 186, vacant clean 47',
        recommendation: 'Review 10 on-holds with return date >7 days out. Releasing 8 rooms may avoid hotel overflow.',
        approval: 'WFA Coordinator + Lodge Manager',
        nextAction: 'Generate release candidate list and send for approval',
        status: 'Pending',
    },
    {
        id: 2,
        issue: 'Turner Industrial over allotment by 32 rooms',
        risk: 'Medium',
        dataUsed: 'Allotment 380, in-house 412, 7-day forecast +18 net',
        recommendation: 'Request contractor forecast update; hold new arrivals until allotment reconciled.',
        approval: 'Lodge Manager',
        nextAction: 'Notify Turner Industrial WFA contact',
        status: 'Pending',
    },
    {
        id: 3,
        issue: '5 maintenance holds overdue return-to-service',
        risk: 'Medium',
        dataUsed: 'Maintenance module, ETA dates, capacity forecast',
        recommendation: 'Escalate rooms 1602, 1705 to maintenance supervisor; recover 2 rooms by May 23.',
        approval: 'Maintenance Supervisor',
        nextAction: 'Send maintenance escalation list',
        status: 'Approved',
    },
    {
        id: 4,
        issue: '62 vacant dirty rooms — 18 needed for same-day arrivals',
        risk: 'High',
        dataUsed: 'Housekeeping workload, arrival schedule 156 today',
        recommendation: 'Prioritize cleans in Dorm A and Dorm E for rooms 1208, 1503, 1312.',
        approval: 'Housekeeping Lead',
        nextAction: 'Publish housekeeping priority list',
        status: 'Pending',
    },
];

export const UTILIZATION_TABS = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'status', label: 'Room Status', icon: '🛏️' },
    { key: 'forecast', label: 'Forecast', icon: '📈' },
    { key: 'onhold', label: 'On-Hold Review', icon: '⏸️' },
    { key: 'release', label: 'Release Candidates', icon: '🔓' },
    { key: 'overflow', label: 'Overflow', icon: '🏨' },
    { key: 'housekeeping', label: 'Housekeeping', icon: '🧹' },
    { key: 'maintenance', label: 'Maintenance', icon: '🔧' },
    { key: 'allotment', label: 'Contractors', icon: '🏢' },
    { key: 'ai', label: 'AI Advisor', icon: '🤖' },
    { key: 'approvals', label: 'Approvals', icon: '✅' },
];

export const NAV_ITEMS = [
    { label: 'Command Center', icon: '⚙️', href: 'command-center' },
    { label: 'Reservations', icon: '📅', href: 'reservations' },
    { label: 'Reservation Operations', icon: '▦', href: 'dashboard' },
    { label: 'Room Utilization', icon: '📊', href: 'room-utilization', active: true },
    { label: 'Reports', icon: '📋', href: null },
    { label: 'Forecasting', icon: '📈', href: null },
    { label: 'Housekeeping Planning', icon: '🧹', href: 'housekeeping-planning' },
    { label: 'Maintenance', icon: '🔧', href: null },
    { label: 'Companies', icon: '🏢', href: null },
    { label: 'Accommodation Staff', icon: '👥', href: null },
    { label: 'Policies', icon: '☑️', href: null },
    { label: 'Settings', icon: '⚙️', href: null },
];
