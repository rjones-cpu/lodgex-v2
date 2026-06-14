export const STATUS_STYLES = {
    occupied: 'bg-blue-100 text-lx-blue',
    vacantclean: 'bg-green-100 text-green-600',
    vacantdirty: 'bg-orange-100 text-orange-500',
    onholdclean: 'bg-violet-100 text-violet-600',
    onholddirty: 'bg-violet-100 text-violet-600',
    maintenancehold: 'bg-red-100 text-red-500',
    outofservice: 'bg-slate-200 text-slate-600',
    blockedreserved: 'bg-orange-100 text-orange-500',
    assignedarrival: 'bg-blue-100 text-lx-blue',
    high: 'bg-red-100 text-red-500',
    medium: 'bg-orange-100 text-orange-500',
    low: 'bg-green-100 text-green-600',
    critical: 'bg-red-100 text-red-500',
    pending: 'bg-orange-100 text-orange-500',
    approved: 'bg-green-100 text-green-600',
    dismissed: 'bg-slate-200 text-slate-600',
    superseded: 'bg-slate-200 text-slate-500',
    yes: 'bg-orange-100 text-orange-500',
};

const CATEGORY_LABELS = {
    overflow: 'Overflow',
    release: 'Release',
    waste: 'Waste',
    allotment: 'Allotment',
    housekeeping: 'Housekeeping',
    maintenance: 'Maintenance',
    data_quality: 'Data quality',
};

export function categoryLabel(category) {
    if (!category) return 'General';
    return CATEGORY_LABELS[category] || category.replace(/_/g, ' ');
}

export const RISK_STYLES = {
    low: 'text-green-600',
    medium: 'text-orange-500',
    high: 'text-red-500',
    critical: 'text-red-600 font-black',
};

function statusKey(value) {
    return String(value).toLowerCase().replace(/[^a-z]/g, '');
}

export function Pill({ value, className = '' }) {
    const key = statusKey(value);
    const tone = STATUS_STYLES[key] || 'bg-slate-100 text-slate-500';
    return (
        <span className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-black ${tone} ${className}`}>
            {value}
        </span>
    );
}

function Th({ children, className = '' }) {
    return (
        <th className={`border-b border-lx-line bg-[#fbfdff] p-3 text-left text-xs font-black text-lx-ink-soft ${className}`}>
            {children}
        </th>
    );
}

function Td({ children, className = '' }) {
    return <td className={`border-b border-lx-line p-3 align-middle text-[13px] text-lx-ink ${className}`}>{children}</td>;
}

export function OverviewPanel({ statusEngine = {} }) {
    const checklist = [
        `${statusEngine.assignableNow ?? 0} vacant clean rooms (assignable now)`,
        `${statusEngine.vacantDirty ?? 0} vacant dirty — ${statusEngine.cleanableForTonight ?? 0} cleanable tonight`,
        `${statusEngine.onHold ?? 0} on-hold rooms (${statusEngine.overPolicyHolds ?? 0} over policy)`,
        `${statusEngine.maintenanceHold ?? 0} maintenance holds (${statusEngine.overdueMaintenance ?? 0} overdue)`,
        `${statusEngine.conflictCount ?? 0} status/data conflicts detected`,
    ];
    return (
        <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-lx-border bg-[#fbfdff] p-4">
                <h4 className="mb-3 text-sm font-black text-lx-navy">Tonight&apos;s Capacity Snapshot</h4>
                <div className="grid gap-2 text-[13px]">
                    {[
                        ['Assignable now (vacant clean)', String(statusEngine.assignableNow ?? 0)],
                        ['Cleanable for tonight', String(statusEngine.cleanableForTonight ?? 0)],
                        ['Usable capacity tonight', String(statusEngine.usableCapacityTonight ?? 0)],
                        ['On-hold rooms', String(statusEngine.onHold ?? 0)],
                        ['On-hold over policy', String(statusEngine.overPolicyHolds ?? 0)],
                        ['Projected shortage', `${statusEngine.projectedShortageTonight ?? 0} rooms`],
                    ].map(([k, v]) => (
                        <div key={k} className="flex justify-between font-extrabold">
                            <span className="text-slate-500">{k}</span>
                            <span className="text-lx-ink">{v}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="rounded-xl border border-lx-border bg-[#fbfdff] p-4">
                <h4 className="mb-3 text-sm font-black text-lx-navy">Before Hotel Overflow — Checklist</h4>
                <ul className="m-0 list-none space-y-2 p-0 text-xs text-lx-ink">
                    {checklist.map((line) => (
                        <li key={line}>
                            <span className="mr-2 text-green-600">●</span>
                            {line}
                        </li>
                    ))}
                </ul>
            </div>
            {(statusEngine.projectedShortageTonight ?? 0) > 0 && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 md:col-span-2">
                    <h4 className="mb-2 text-sm font-black text-orange-600">Capacity Alert</h4>
                    <p className="m-0 text-[13px] text-lx-ink">
                        Projected shortage of <strong>{statusEngine.projectedShortageTonight} rooms</strong> tonight.
                        Usable capacity is <strong>{statusEngine.usableCapacityTonight}</strong> (
                        {statusEngine.assignableNow} assignable + {statusEngine.cleanableForTonight} cleanable). Review
                        on-holds before hotel overflow. <strong>Approval required</strong> for releases.
                    </p>
                </div>
            )}
            {(statusEngine.conflicts?.length ?? 0) > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 md:col-span-2">
                    <h4 className="mb-2 text-sm font-black text-red-600">
                        Status Conflicts ({statusEngine.conflictCount})
                    </h4>
                    <ul className="m-0 max-h-[140px] list-none space-y-2 overflow-y-auto p-0 text-xs text-lx-ink">
                        {statusEngine.conflicts.slice(0, 5).map((c) => (
                            <li key={`${c.code}-${c.room}-${c.dorm}`}>
                                <strong>
                                    {c.room} ({c.dorm})
                                </strong>
                                : {c.message}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export function StatusPanel({ rows }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse">
                <thead>
                    <tr>
                        <Th>Room</Th>
                        <Th>Dorm</Th>
                        <Th>Type</Th>
                        <Th>Status</Th>
                        <Th>Worker</Th>
                        <Th>Company</Th>
                        <Th>Hold Days</Th>
                        <Th>Available</Th>
                        <Th>Last Updated</Th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr
                            key={`${r.room}-${r.dorm}`}
                            className={`hover:bg-[#f8fbff] ${r.hasDataIssue ? 'bg-red-50/50' : ''}`}
                        >
                            <Td className="font-extrabold">{r.room}</Td>
                            <Td>{r.dorm}</Td>
                            <Td>{r.type}</Td>
                            <Td>
                                <Pill value={r.status} />
                            </Td>
                            <Td>{r.worker || '—'}</Td>
                            <Td>{r.company || '—'}</Td>
                            <Td>{r.holdDays || '—'}</Td>
                            <Td>{r.isAvailable ? <Pill value="Yes" /> : 'No'}</Td>
                            <Td>{r.updated}</Td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function ForecastOutlookCards({ outlook = {} }) {
    const windows = [
        { key: '3d', label: '3-Day' },
        { key: '7d', label: '7-Day' },
        { key: '14d', label: '14-Day' },
        { key: '30d', label: '30-Day' },
    ];

    return (
        <div className="mb-4 grid grid-cols-4 gap-3 max-[1100px]:grid-cols-2">
            {windows.map(({ key, label }) => {
                const o = outlook[key] || {};
                return (
                    <div
                        key={key}
                        className="rounded-xl border border-lx-border bg-[#fbfdff] p-3 text-xs"
                    >
                        <div className="font-black text-lx-navy">{label} Outlook</div>
                        <div className="mt-2 flex justify-between text-lx-ink">
                            <span>Max shortage</span>
                            <strong>{o.maxShortage ?? 0}</strong>
                        </div>
                        <div className="mt-1 flex justify-between text-lx-ink">
                            <span>Peak risk</span>
                            <span className={`font-black uppercase ${RISK_STYLES[o.peakRisk] || ''}`}>
                                {o.peakRisk ?? 'low'}
                            </span>
                        </div>
                        <div className="mt-1 flex justify-between text-slate-500">
                            <span>Confidence</span>
                            <span>{o.avgConfidence ?? '—'}%</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export function ForecastPanel({ days = [], outlook = {} }) {
    return (
        <div>
            <ForecastOutlookCards outlook={outlook} />
            <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse">
                    <thead>
                        <tr>
                            <Th>Date</Th>
                            <Th>Arrivals</Th>
                            <Th>Departures</Th>
                            <Th>Net</Th>
                            <Th>Occupied</Th>
                            <Th>Available</Th>
                            <Th>Shortage</Th>
                            <Th>Overflow</Th>
                            <Th>Risk</Th>
                            <Th>Confidence</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {days.map((d) => (
                            <tr key={d.dateIso || d.date} className="hover:bg-[#f8fbff]">
                                <Td className="font-extrabold">{d.date}</Td>
                                <Td>{d.arrivals}</Td>
                                <Td>{d.departures}</Td>
                                <Td>{d.net > 0 ? `+${d.net}` : d.net}</Td>
                                <Td>{d.projectedOccupancy ?? '—'}</Td>
                                <Td className={d.available < 0 ? 'font-black text-red-500' : ''}>
                                    {d.available}
                                </Td>
                                <Td>{d.shortage > 0 ? d.shortage : '—'}</Td>
                                <Td>{d.overflowRooms > 0 ? d.overflowRooms : '—'}</Td>
                                <Td>
                                    <span className={`text-xs font-black uppercase ${RISK_STYLES[d.risk]}`}>
                                        {d.risk}
                                    </span>
                                </Td>
                                <Td>
                                    <span className="text-xs font-extrabold text-lx-ink" title={d.source}>
                                        {d.confidenceLabel} ({d.confidence}%)
                                    </span>
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function ContractorOccupancyPanel({ rows = [] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] border-collapse">
                <thead>
                    <tr>
                        <Th>Contractor</Th>
                        <Th>In-House Tonight</Th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.contractor} className="hover:bg-[#f8fbff]">
                            <Td className="font-extrabold">{r.contractor}</Td>
                            <Td>{r.inHouse}</Td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function OnHoldPanel({ rows = [] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
                <thead>
                    <tr>
                        <Th>Room</Th>
                        <Th>Dorm</Th>
                        <Th>Worker</Th>
                        <Th>Company</Th>
                        <Th>Hold Days</Th>
                        <Th>Return Date</Th>
                        <Th>Policy</Th>
                        <Th>Over Policy</Th>
                        <Th>Release Eligible</Th>
                        <Th>Risk</Th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.room} className="hover:bg-[#f8fbff]">
                            <Td className="font-extrabold">{r.room}</Td>
                            <Td>{r.dorm}</Td>
                            <Td>{r.worker}</Td>
                            <Td>{r.company}</Td>
                            <Td>{r.holdDays}</Td>
                            <Td>{r.returnDate}</Td>
                            <Td>{r.policy}</Td>
                            <Td>{r.overPolicy ? <Pill value="Yes" /> : 'No'}</Td>
                            <Td>{r.releaseEligible ? <Pill value="Yes" /> : 'No'}</Td>
                            <Td>
                                <Pill value={r.risk} />
                            </Td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function ReleasePanel({ rows = [] }) {
    return (
        <div className="space-y-3">
            {rows.map((r) => (
                <div key={r.room} className="rounded-xl border border-lx-border bg-[#fbfdff] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <strong className="text-lx-navy">
                                Room {r.room} — {r.dorm}
                            </strong>
                            <p className="mt-1 text-[13px] text-lx-ink">{r.reason}</p>
                        </div>
                        <Pill value={r.risk} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs font-extrabold text-slate-500">
                        <span>Recovery: {r.recovery}</span>
                        <span>Approval: {r.approval}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function OverflowPanel({ rows = [] }) {
    return (
        <div className="space-y-3">
            {rows.map((r) => (
                <div
                    key={r.date}
                    className={`rounded-xl border p-4 ${
                        r.risk === 'Critical' ? 'border-red-200 bg-red-50' : 'border-lx-border bg-[#fbfdff]'
                    }`}
                >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-lx-navy">{r.date}</strong>
                        <Pill value={r.risk} />
                    </div>
                    <div className="mt-2 grid gap-1 text-[13px] text-lx-ink md:grid-cols-2">
                        <span>Shortage: {r.shortage} rooms</span>
                        <span>Internal recovery potential: {r.internalRecovery}</span>
                        <span>Hotel rooms needed: {r.hotelRooms}</span>
                        <span>Est. cost: {r.cost}</span>
                    </div>
                    <p className="mt-2 text-xs font-extrabold text-lx-blue">{r.recommendation}</p>
                </div>
            ))}
        </div>
    );
}

export function HousekeepingPanel({ rows = [] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse">
                <thead>
                    <tr>
                        <Th>Room</Th>
                        <Th>Dorm</Th>
                        <Th>Status</Th>
                        <Th>Arrival Today</Th>
                        <Th>Priority</Th>
                        <Th>ETA Clean</Th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.room} className="hover:bg-[#f8fbff]">
                            <Td className="font-extrabold">{r.room}</Td>
                            <Td>{r.dorm}</Td>
                            <Td>
                                <Pill value={r.status} />
                            </Td>
                            <Td>{r.arrivalToday ? 'Yes' : 'No'}</Td>
                            <Td>
                                <Pill value={r.priority} />
                            </Td>
                            <Td>{r.eta}</Td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function MaintenancePanel({ rows = [] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse">
                <thead>
                    <tr>
                        <Th>Room</Th>
                        <Th>Dorm</Th>
                        <Th>Issue</Th>
                        <Th>ETA Return</Th>
                        <Th>Overdue</Th>
                        <Th>Capacity Impact</Th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.room} className="hover:bg-[#f8fbff]">
                            <Td className="font-extrabold">{r.room}</Td>
                            <Td>{r.dorm}</Td>
                            <Td>{r.issue}</Td>
                            <Td>{r.eta}</Td>
                            <Td>{r.overdue ? <Pill value="Yes" /> : 'No'}</Td>
                            <Td>{r.capacityImpact}</Td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function AllotmentPanel({ rows = [] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse">
                <thead>
                    <tr>
                        <Th>Contractor</Th>
                        <Th>Allotted</Th>
                        <Th>In Use</Th>
                        <Th>Variance</Th>
                        <Th>No-Shows</Th>
                        <Th>Trend</Th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.contractor} className="hover:bg-[#f8fbff]">
                            <Td className="font-extrabold">{r.contractor}</Td>
                            <Td>{r.allotted}</Td>
                            <Td>{r.used}</Td>
                            <Td className={r.variance > 0 ? 'font-black text-red-500' : 'text-green-600'}>
                                {r.variance > 0 ? `+${r.variance}` : r.variance}
                            </Td>
                            <Td>{r.noShows}</Td>
                            <Td className="capitalize">{r.trend}</Td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function AiPanel({ recommendations, onSelect, onApprove, onDismiss }) {
    return (
        <div className="space-y-3">
            {recommendations.map((rec) => (
                <div
                    key={rec.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(rec.id)}
                    onKeyDown={(e) => e.key === 'Enter' && onSelect(rec.id)}
                    className="cursor-pointer rounded-xl border border-lx-border bg-[#fbfdff] p-4 hover:bg-[#eef6ff]"
                >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <strong className="text-lx-navy">{rec.issue}</strong>
                        <div className="flex flex-wrap gap-2">
                            {rec.category && (
                                <span className="inline-flex items-center rounded-lg bg-[#eaf2ff] px-2.5 py-1 text-xs font-black text-lx-blue">
                                    {categoryLabel(rec.category)}
                                </span>
                            )}
                            <Pill value={rec.risk} />
                            <Pill value={rec.status} />
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-lx-ink">
                        <span className="font-extrabold text-slate-500">Recommendation: </span>
                        {rec.recommendation}
                    </p>
                    <p className="mt-1 text-xs text-lx-ink">
                        <span className="font-extrabold text-slate-500">Approval: </span>
                        {rec.approval}
                    </p>
                    {rec.status === 'Pending' && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onApprove(rec.id);
                                }}
                                className="cursor-pointer rounded-lg bg-green-600 px-3 py-1.5 text-xs font-black text-white"
                            >
                                Approve
                            </button>
                            {onDismiss && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDismiss(rec.id);
                                    }}
                                    className="cursor-pointer rounded-lg border border-lx-border bg-white px-3 py-1.5 text-xs font-black text-slate-600"
                                >
                                    Dismiss
                                </button>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

const APPROVAL_TYPE_LABELS = {
    room_release: 'Room release',
    walk_in: 'Walk-in',
    hotel_overflow: 'Hotel overflow',
    allotment_change: 'Allotment change',
};

export function ApprovalsPanel({ approvals = [], onApprove, onReject }) {
    if (!approvals.length) {
        return <p className="text-sm text-slate-500">No pending operational approvals.</p>;
    }

    return (
        <div className="space-y-3">
            {approvals.map((item) => (
                <div key={item.id} className="rounded-xl border border-lx-border bg-[#fbfdff] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <strong className="text-lx-navy">{item.title}</strong>
                        <div className="flex flex-wrap gap-2">
                            <span className="inline-flex rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-black text-violet-600">
                                {APPROVAL_TYPE_LABELS[item.type] || item.type}
                            </span>
                            <Pill value={item.risk} />
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-lx-ink">{item.summary}</p>
                    <p className="mt-1 text-xs text-lx-ink">
                        <span className="font-extrabold text-slate-500">Approval: </span>
                        {item.approval}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => onApprove(item.id)}
                            className="cursor-pointer rounded-lg bg-green-600 px-3 py-1.5 text-xs font-black text-white"
                        >
                            Approve
                        </button>
                        <button
                            type="button"
                            onClick={() => onReject(item.id)}
                            className="cursor-pointer rounded-lg border border-lx-border bg-white px-3 py-1.5 text-xs font-black text-slate-600"
                        >
                            Reject
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function RecentAuditList({ entries = [] }) {
    if (!entries.length) {
        return <p className="text-xs text-slate-500">No advisor activity yet.</p>;
    }

    return (
        <ul className="max-h-40 space-y-2 overflow-y-auto text-xs">
            {entries.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-lx-border bg-[#fbfdff] px-2.5 py-2">
                    <div className="flex justify-between gap-2 font-extrabold text-lx-navy">
                        <span className="capitalize">{entry.action}</span>
                        <span className="text-[10px] font-bold text-slate-500">{entry.at}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-lx-ink">{entry.issue}</p>
                    {entry.category && (
                        <span className="mt-1 inline-block text-[10px] font-bold text-lx-blue">
                            {categoryLabel(entry.category)}
                        </span>
                    )}
                </li>
            ))}
        </ul>
    );
}

export function TopAiPreview({ recommendations = [], onViewAll }) {
    return (
        <>
            {recommendations.slice(0, 3).map((rec) => (
                <div key={rec.id} className="mb-3 rounded-xl border border-lx-border bg-[#fbfdff] p-3 text-xs">
                    <div className="flex justify-between gap-2">
                        <strong className="text-lx-navy">{rec.issue}</strong>
                        <Pill value={rec.risk} />
                    </div>
                    <p className="mt-1.5 text-lx-ink">{rec.nextAction}</p>
                </div>
            ))}
            <button type="button" onClick={onViewAll} className="text-xs font-black text-lx-blue">
                View all recommendations →
            </button>
        </>
    );
}
