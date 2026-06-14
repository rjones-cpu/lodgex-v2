export const STATUS_STYLES = {
    critical: 'bg-red-100 text-red-600',
    high: 'bg-red-100 text-red-500',
    medium: 'bg-orange-100 text-orange-500',
    low: 'bg-green-100 text-green-600',
    pending: 'bg-orange-100 text-orange-500',
    assigned: 'bg-blue-100 text-lx-blue',
    completed: 'bg-green-100 text-green-600',
    passed: 'bg-green-100 text-green-600',
    yes: 'bg-orange-100 text-orange-500',
};

export function Pill({ value, className = '' }) {
    const key = String(value).toLowerCase().replace(/[^a-z]/g, '');
    const tone = STATUS_STYLES[key] || 'bg-slate-100 text-slate-500';
    return (
        <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-black ${tone} ${className}`}>
            {value}
        </span>
    );
}

function Th({ children }) {
    return <th className="border-b border-lx-line bg-[#fbfdff] p-3 text-left text-xs font-black text-lx-ink-soft">{children}</th>;
}

function Td({ children }) {
    return <td className="border-b border-lx-line p-3 text-xs font-bold text-lx-ink">{children}</td>;
}

export function OverviewPanel({ planningSummary = {} }) {
    return (
        <div className="grid grid-cols-2 gap-3 max-[900px]:grid-cols-1">
            <div className="rounded-xl border border-lx-border bg-[#fbfdff] p-4">
                <h4 className="mb-3 text-sm font-black text-lx-navy">Today&apos;s workload</h4>
                {[
                    ['Total tasks', planningSummary.totalTasks],
                    ['Unassigned', planningSummary.unassignedCount],
                    ['Points', planningSummary.totalPointsToday],
                    ['Minutes', planningSummary.totalMinutesToday],
                ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1 text-xs font-extrabold">
                        <span className="text-slate-500">{k}</span>
                        <span>{v}</span>
                    </div>
                ))}
            </div>
            <div className="rounded-xl border border-lx-border bg-[#fbfdff] p-4">
                <h4 className="mb-3 text-sm font-black text-lx-navy">Labour capacity</h4>
                {[
                    ['Housekeepers scheduled', planningSummary.activeHousekeepers],
                    ['Required today', planningSummary.requiredHousekeepers],
                    ['Shortage', planningSummary.labourShortage],
                    ['Productive minutes', planningSummary.availableProductiveMinutes],
                ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1 text-xs font-extrabold">
                        <span className="text-slate-500">{k}</span>
                        <span className={k === 'Shortage' && v > 0 ? 'text-red-500' : ''}>{v}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function TaskBoardPanel({ rows = [] }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-lx-border">
            <table className="w-full min-w-[800px] border-collapse">
                <thead>
                    <tr>
                        <Th>Room</Th>
                        <Th>Dorm</Th>
                        <Th>Task</Th>
                        <Th>Priority</Th>
                        <Th>Points</Th>
                        <Th>Housekeeper</Th>
                        <Th>Status</Th>
                        <Th>Required by</Th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.id}>
                            <Td>{r.room}</Td>
                            <Td>{r.dorm}</Td>
                            <Td className="capitalize">{r.taskType}</Td>
                            <Td><Pill value={r.priority} /></Td>
                            <Td>{r.points}</Td>
                            <Td>{r.housekeeper}</Td>
                            <Td><Pill value={r.status} /></Td>
                            <Td>{r.requiredBy}</Td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function AssignmentsPanel({ rows = [], tasks = null, housekeepers = null, onEdit = null }) {
    const editable = typeof onEdit === 'function' && Array.isArray(housekeepers);
    return (
        <div className="overflow-x-auto rounded-xl border border-lx-border">
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        <Th>Housekeeper</Th>
                        <Th>Dorms</Th>
                        <Th>Rooms</Th>
                        <Th>Check-outs</Th>
                        <Th>Points</Th>
                        <Th>Minutes</Th>
                        <Th>Status</Th>
                        {editable && <Th>Edit</Th>}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.housekeeperId ?? r.housekeeper} className={r.overload ? 'bg-red-50' : ''}>
                            <Td>{r.housekeeper}</Td>
                            <Td>{r.dorms}</Td>
                            <Td>{r.rooms}</Td>
                            <Td>{r.checkouts}</Td>
                            <Td>{r.points}</Td>
                            <Td>{r.minutes}</Td>
                            <Td>{r.overload ? <Pill value="Overload" /> : <Pill value={r.status} />}</Td>
                            {editable && (
                                <Td>
                                    <button
                                        type="button"
                                        onClick={() => onEdit(r)}
                                        disabled={!r.housekeeperId}
                                        title={r.housekeeperId ? 'Reassign rooms / dorms for this housekeeper' : 'No housekeeper id'}
                                        className="rounded-lg border border-lx-blue px-2.5 py-1 text-[11px] font-black text-lx-blue hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                                    >
                                        ✎ Edit
                                    </button>
                                </Td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function RoomUtilizationContextPanel({ context = {} }) {
    if (!context.url) return null;

    return (
        <div className="mb-4 rounded-xl border border-lx-border bg-[#eef6ff] p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-black text-lx-navy">Room Utilization Manager</h4>
                <a href={context.url} className="text-xs font-black text-lx-blue hover:underline">
                    Open utilization dashboard →
                </a>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-extrabold max-[600px]:grid-cols-1">
                {[
                    ['Vacant dirty', context.vacantDirty],
                    ['Cleanable tonight', context.cleanableTonight],
                    ['Shortage tonight', context.projectedShortageTonight],
                    ['7-day peak risk', context.peakRisk7d],
                ].map(([label, value]) => (
                    <div key={label} className="flex justify-between rounded-lg bg-white/80 px-2.5 py-1.5">
                        <span className="text-slate-500">{label}</span>
                        <span>{value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function ReadinessPanel({ risks = [], unassigned = [], roomUtilization = {} }) {
    return (
        <div>
            <RoomUtilizationContextPanel context={roomUtilization} />
            <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
            <div>
                <h4 className="mb-2 text-sm font-black text-lx-navy">Readiness risks</h4>
                {risks.length === 0 ? (
                    <p className="text-xs text-slate-500">No high-risk rooms flagged.</p>
                ) : (
                    risks.map((r) => (
                        <div key={`${r.room}-${r.dorm}`} className="mb-2 rounded-lg border border-lx-border p-3 text-xs">
                            <strong>{r.room}</strong> ({r.dorm}) — <Pill value={r.priority} /> <Pill value={r.risk} />
                            {roomUtilization.url && (
                                <a href={roomUtilization.url} className="mt-1 block font-black text-lx-blue">
                                    View in Room Utilization →
                                </a>
                            )}
                        </div>
                    ))
                )}
            </div>
            <div>
                <h4 className="mb-2 text-sm font-black text-lx-navy">Unassigned tasks</h4>
                {unassigned.map((r) => (
                    <div key={`${r.room}-${r.taskType}`} className="mb-2 rounded-lg border border-lx-border p-3 text-xs">
                        {r.room} ({r.dorm}) — {r.taskType} by {r.requiredBy}
                    </div>
                ))}
            </div>
            </div>
        </div>
    );
}

export function ScenariosPanel({ presets = [], result = null, onRun }) {
    return (
        <div className="space-y-4">
            <p className="text-xs text-lx-ink">What-if planning — recommendations only.</p>
            <div className="grid gap-2 sm:grid-cols-2">
                {presets.map((preset) => (
                    <button
                        key={preset.key}
                        type="button"
                        onClick={() => onRun(preset.key)}
                        className="cursor-pointer rounded-xl border border-lx-border bg-[#fbfdff] p-3 text-left hover:bg-[#eef6ff]"
                    >
                        <strong className="text-sm text-lx-navy">{preset.label}</strong>
                        <p className="mt-1 text-xs text-slate-500">{preset.description}</p>
                    </button>
                ))}
            </div>
            {result && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                    <strong className="text-lx-navy">{result.title}</strong> <Pill value={result.risk} />
                    <p className="mt-2 text-xs text-lx-ink">{result.recommendation}</p>
                </div>
            )}
        </div>
    );
}

export function ScheduleFeedsPanel({ feeds = [] }) {
    return (
        <div className="space-y-3">
            <p className="text-xs text-lx-ink">Company & master project schedule feeds.</p>
            {feeds.map((feed) => (
                <div key={feed.id} className="rounded-xl border border-lx-border bg-[#fbfdff] p-4 text-xs">
                    <strong className="text-lx-navy">{feed.title}</strong>
                    <p className="mt-1 text-lx-ink">{feed.summary}</p>
                </div>
            ))}
        </div>
    );
}

export function ForecastPanel({ rows = [] }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-lx-border">
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        <Th>Date</Th>
                        <Th>Arrivals</Th>
                        <Th>Departures</Th>
                        <Th>Points</Th>
                        <Th>Required HK</Th>
                        <Th>Available</Th>
                        <Th>Shortage</Th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.date}>
                            <Td>{r.date}</Td>
                            <Td>{r.arrivals}</Td>
                            <Td>{r.departures}</Td>
                            <Td>{r.points}</Td>
                            <Td>{r.required}</Td>
                            <Td>{r.available}</Td>
                            <Td className={r.shortage > 0 ? 'text-red-500' : ''}>{r.shortage}</Td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function InspectionsPanel({ rows = [] }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-lx-border">
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        <Th>Room</Th>
                        <Th>Dorm</Th>
                        <Th>Result</Th>
                        <Th>Score</Th>
                        <Th>Re-clean</Th>
                        <Th>Inspector</Th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i}>
                            <Td>{r.room}</Td>
                            <Td>{r.dorm}</Td>
                            <Td><Pill value={r.result} /></Td>
                            <Td>{r.score ?? '—'}</Td>
                            <Td>{r.reclean ? <Pill value="Yes" /> : 'No'}</Td>
                            <Td>{r.inspector}</Td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function ProductivityPanel({ rows = [] }) {
    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => (
                <div key={r.housekeeper} className="rounded-xl border border-lx-border bg-[#fbfdff] p-4">
                    <strong className="text-sm text-lx-navy">{r.housekeeper}</strong>
                    <p className="mt-1 text-xs text-slate-500">{r.dorm} · {r.skill}</p>
                    <p className="mt-2 text-2xl font-black text-lx-blue">{r.completed}</p>
                    <p className="text-xs font-bold text-slate-500">rooms completed today</p>
                </div>
            ))}
        </div>
    );
}

const CATEGORY_LABELS = {
    labour_shortage: 'Labour shortage',
    workload_overload: 'Workload overload',
    rebalance: 'Rebalance',
    room_readiness: 'Room readiness',
    quality: 'Quality',
    productivity: 'Productivity',
};

export function AiPanel({ recommendations = [], onApprove, onDismiss }) {
    return (
        <div className="space-y-3">
            {recommendations.map((rec) => (
                <div key={rec.id} className="rounded-xl border border-lx-border bg-[#fbfdff] p-4">
                    <div className="flex flex-wrap justify-between gap-2">
                        <strong className="text-lx-navy">{rec.issue}</strong>
                        <div className="flex gap-2">
                            <span className="rounded-lg bg-[#eaf2ff] px-2 py-1 text-xs font-black text-lx-blue">
                                {CATEGORY_LABELS[rec.category] || rec.category}
                            </span>
                            <Pill value={rec.risk} />
                            <Pill value={rec.status} />
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-lx-ink">{rec.recommendation}</p>
                    {rec.status === 'Pending' && (
                        <div className="mt-3 flex gap-2">
                            <button type="button" onClick={() => onApprove(rec.id)} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-black text-white">Approve</button>
                            <button type="button" onClick={() => onDismiss(rec.id)} className="rounded-lg border border-lx-border px-3 py-1.5 text-xs font-black text-slate-600">Dismiss</button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

export function RecentAuditList({ entries = [] }) {
    if (!entries.length) return <p className="text-xs text-slate-500">No activity yet.</p>;
    return (
        <ul className="max-h-40 space-y-2 overflow-y-auto text-xs">
            {entries.map((e) => (
                <li key={e.id} className="rounded-lg border border-lx-border px-2.5 py-2">
                    <div className="flex justify-between font-extrabold text-lx-navy">
                        <span className="capitalize">{e.action}</span>
                        <span className="text-[10px] text-slate-500">{e.at}</span>
                    </div>
                    <p className="line-clamp-2 text-lx-ink">{e.issue}</p>
                </li>
            ))}
        </ul>
    );
}
