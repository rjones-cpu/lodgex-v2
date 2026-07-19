import { Head, Link } from '@inertiajs/react';

/**
 * Printable per-housekeeper publish sheet.
 * Format follows docs/Housekeeping_Workload_Publish_Form (PDF).
 * Sections:
 *   1. Cover page  — workload date, shift, totals, how-to-use
 *   2. Master roster page — every task across every housekeeper
 *   3. One sheet per housekeeper — workload sheet with signature lines
 */

function fmtPoints(n) {
    const num = Number(n) || 0;
    return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

function priorityClass(p) {
    switch (p) {
        case 'Critical': return 'bg-red-100 text-red-700 border-red-300';
        case 'High': return 'bg-orange-100 text-orange-700 border-orange-300';
        case 'Medium': return 'bg-amber-50 text-amber-700 border-amber-300';
        case 'Low': return 'bg-slate-100 text-slate-700 border-slate-300';
        default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
}

function SummaryStat({ label, value, hint }) {
    return (
        <div className="rounded-lg border border-slate-300 bg-white px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
            <div className="mt-0.5 text-xl font-black text-slate-900">{value}</div>
            {hint && <div className="text-[10px] font-semibold text-slate-500">{hint}</div>}
        </div>
    );
}

function SheetHeader({ title, subtitle }) {
    return (
        <div className="mb-3 flex flex-col gap-2 border-b-2 border-slate-900 pb-2 sm:flex-row sm:items-baseline sm:justify-between">
            <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">LodgeX · Smart Lodge</div>
                <h2 className="text-lg font-black text-slate-900">{title}</h2>
                {subtitle && <div className="text-xs text-slate-600">{subtitle}</div>}
            </div>
            <div className="shrink-0 text-left text-[10px] text-slate-500 sm:text-right">
                <div>Housekeeping Workload Publish Form</div>
                <div>Printed sheet — supervisor distribute one per housekeeper</div>
            </div>
        </div>
    );
}

function TaskTable({ rows, includeHousekeeperColumn = false }) {
    return (
        <div className="overflow-x-auto overscroll-x-contain rounded border border-slate-300 [scrollbar-width:thin] print:overflow-visible">
            <table className="w-full min-w-[900px] border-collapse text-[11px] print:min-w-0">
                <thead>
                    <tr className="bg-slate-100 text-left text-[10px] font-bold uppercase tracking-wide text-slate-700">
                        <th className="border-b border-slate-300 px-2 py-1.5">Seq</th>
                        {includeHousekeeperColumn && (
                            <th className="border-b border-slate-300 px-2 py-1.5">Housekeeper</th>
                        )}
                        <th className="border-b border-slate-300 px-2 py-1.5">Room #</th>
                        <th className="border-b border-slate-300 px-2 py-1.5">Dorm</th>
                        <th className="border-b border-slate-300 px-2 py-1.5">Room Status</th>
                        <th className="border-b border-slate-300 px-2 py-1.5">Task Type</th>
                        <th className="border-b border-slate-300 px-2 py-1.5">Priority</th>
                        <th className="border-b border-slate-300 px-2 py-1.5">Required By</th>
                        <th className="border-b border-slate-300 px-2 py-1.5 text-right">Points</th>
                        <th className="border-b border-slate-300 px-2 py-1.5 text-right">Est. Min</th>
                        <th className="border-b border-slate-300 px-2 py-1.5">Task Status</th>
                        <th className="border-b border-slate-300 px-2 py-1.5">Completed</th>
                        <th className="border-b border-slate-300 px-2 py-1.5">Inspect</th>
                        <th className="border-b border-slate-300 px-2 py-1.5">Re-Clean</th>
                        <th className="border-b border-slate-300 px-2 py-1.5 w-[120px]">Notes</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={includeHousekeeperColumn ? 15 : 14} className="px-3 py-4 text-center text-slate-500">
                                No tasks assigned.
                            </td>
                        </tr>
                    )}
                    {rows.map((r, i) => (
                        <tr key={`${r.seq}-${r.room}-${i}`} className="even:bg-slate-50 print:even:bg-white">
                            <td className="border-b border-slate-200 px-2 py-1 text-center font-bold text-slate-700">{r.seq || i + 1}</td>
                            {includeHousekeeperColumn && (
                                <td className="border-b border-slate-200 px-2 py-1 font-semibold text-slate-800">{r.housekeeper}</td>
                            )}
                            <td className="border-b border-slate-200 px-2 py-1 font-bold text-slate-900">{r.room}</td>
                            <td className="border-b border-slate-200 px-2 py-1 text-slate-700">{r.dorm}</td>
                            <td className="border-b border-slate-200 px-2 py-1 text-slate-700">{r.roomStatus}</td>
                            <td className="border-b border-slate-200 px-2 py-1 text-slate-800">{r.taskType}</td>
                            <td className="border-b border-slate-200 px-2 py-1">
                                <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold ${priorityClass(r.priority)}`}>
                                    {r.priority}
                                </span>
                            </td>
                            <td className="border-b border-slate-200 px-2 py-1 text-slate-700">{r.requiredBy}</td>
                            <td className="border-b border-slate-200 px-2 py-1 text-right font-semibold text-slate-800">{fmtPoints(r.points)}</td>
                            <td className="border-b border-slate-200 px-2 py-1 text-right text-slate-700">{r.minutes || ''}</td>
                            <td className="border-b border-slate-200 px-2 py-1 text-slate-700">{r.status}</td>
                            <td className="border-b border-slate-200 px-2 py-1 text-center text-slate-400">☐</td>
                            <td className="border-b border-slate-200 px-2 py-1 text-center font-bold text-slate-700">{r.inspect}</td>
                            <td className="border-b border-slate-200 px-2 py-1 text-center text-slate-400">☐</td>
                            <td className="border-b border-slate-200 px-2 py-1 text-slate-700">{r.notes}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function SignatureBlock() {
    return (
        <div className="mt-6 grid grid-cols-1 gap-6 text-[11px] sm:grid-cols-3">
            <div>
                <div className="border-b border-slate-900 pb-6"></div>
                <div className="mt-1 font-bold text-slate-700">Housekeeper Signature</div>
            </div>
            <div>
                <div className="border-b border-slate-900 pb-6"></div>
                <div className="mt-1 font-bold text-slate-700">Supervisor Review</div>
            </div>
            <div>
                <div className="border-b border-slate-900 pb-6"></div>
                <div className="mt-1 font-bold text-slate-700">Time Submitted</div>
            </div>
        </div>
    );
}

export default function HousekeepingPublishSheet({ cover, sheets = [], masterRoster = [] }) {
    const handlePrint = () => window.print();

    return (
        <>
            <Head title={`Publish Sheets — ${cover.workloadDate}`} />

            {/* Toolbar — hidden on print */}
            <div className="sticky top-0 z-50 border-b border-slate-200 bg-white px-4 py-3 shadow-sm print:hidden sm:px-6">
                <div className="mx-auto flex max-w-[1100px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <div className="text-xs font-bold uppercase tracking-wide text-lx-blue">Smart Lodge Command Center</div>
                        <h1 className="text-base font-black text-lx-navy sm:text-lg">Publish Assignment Sheets — {cover.workloadDateLong}</h1>
                        <p className="text-xs text-slate-500">
                            {cover.housekeeperCount} housekeeper{cover.housekeeperCount === 1 ? '' : 's'} · {cover.taskCount} tasks · Generated {cover.generatedAt}
                        </p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <Link
                            href={route('housekeeping-planning')}
                            className="rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-center text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                            ← Back to Planning
                        </Link>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="rounded-[10px] bg-lx-blue px-4 py-2 text-xs font-black text-white shadow hover:bg-lx-blue-dark"
                        >
                            🖨️ Print / Save as PDF
                        </button>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-[1100px] bg-slate-100 py-6 print:bg-white print:py-0">
                {/* ───────── Cover Page ───────── */}
                <section className="mx-3 mb-6 break-after-page rounded bg-white p-4 shadow sm:mx-4 sm:p-8 print:m-0 print:rounded-none print:p-6 print:shadow-none">
                    <SheetHeader title="Housekeeping Workload Publish Form" subtitle="Daily assignment sheets — printable cover summary" />

                    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <SummaryStat label="Workload Date" value={cover.workloadDate} hint={cover.workloadDateLong} />
                        <SummaryStat label="Shift" value={cover.shift} />
                        <SummaryStat label="Housekeepers" value={cover.housekeeperCount} hint="Assigned today" />
                        <SummaryStat label="Total Rooms" value={cover.totalRooms} />
                        <SummaryStat label="Total Points" value={fmtPoints(cover.totalPoints)} />
                        <SummaryStat label="Est. Minutes" value={cover.totalMinutes} hint={`${(cover.totalMinutes / 60).toFixed(1)} hrs`} />
                        <SummaryStat label="Check-Outs" value={cover.totalCheckouts} hint="Turnovers" />
                        <SummaryStat label="Generated" value={cover.generatedAt} />
                    </div>

                    <div className="mt-6">
                        <h3 className="mb-2 text-sm font-black text-slate-900">Purpose</h3>
                        <p className="text-xs leading-relaxed text-slate-700">
                            Use this printable form when the system publishes housekeeping workload. Each housekeeper receives a dedicated
                            sheet showing their assigned rooms, task type, priority, required-by time, points, estimated minutes, task
                            status, completion time, inspection, re-clean, and notes.
                        </p>
                    </div>

                    <div className="mt-4">
                        <h3 className="mb-2 text-sm font-black text-slate-900">How to Use</h3>
                        <ol className="list-decimal space-y-1 pl-5 text-xs leading-relaxed text-slate-700">
                            <li>System publishes the workload into the workload table.</li>
                            <li>Supervisor reviews room sequence, workload points, required-by times, and exceptions.</li>
                            <li>Print or distribute one sheet per housekeeper.</li>
                            <li>Housekeepers mark task status, completion time, inspection required, re-clean required, and notes.</li>
                            <li>Supervisor reviews completed sheets and updates the system.</li>
                        </ol>
                    </div>

                    <div className="mt-6 rounded border border-slate-300 bg-slate-50 p-3 text-[10px] text-slate-600 print:border-slate-400">
                        <strong className="text-slate-800">Default workload limits:</strong>
                        {' '}Max rooms/day: 29 · Max check-outs/day: 10 · Max points/day: 36 · Max shift: 11 hrs.
                        Adjustable per client/project in Workload Rules.
                    </div>
                </section>

                {/* ───────── Master Roster (Page 2 of PDF) ───────── */}
                <section className="mx-3 mb-6 break-after-page rounded bg-white p-4 shadow sm:mx-4 sm:p-6 print:m-0 print:rounded-none print:p-6 print:shadow-none">
                    <SheetHeader
                        title="System Published Housekeeping Workload"
                        subtitle={`Master roster — ${cover.workloadDate} · ${cover.shift} · ${masterRoster.length} tasks`}
                    />
                    <TaskTable rows={masterRoster} includeHousekeeperColumn />
                </section>

                {/* ───────── One sheet per housekeeper ───────── */}
                {sheets.map((sheet, idx) => (
                    <section
                        key={sheet.housekeeperId ?? `hk-${idx}`}
                        className={`mx-3 mb-6 rounded bg-white p-4 shadow sm:mx-4 sm:p-6 print:m-0 print:rounded-none print:p-6 print:shadow-none ${
                            idx < sheets.length - 1 ? 'break-after-page' : ''
                        }`}
                    >
                        <SheetHeader title="Housekeeping Daily Workload Sheet" subtitle={`${sheet.housekeeper} · ${cover.workloadDate}`} />

                        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <SummaryStat label="Housekeeper" value={sheet.housekeeper} hint={sheet.shift} />
                            <SummaryStat label="Date" value={cover.workloadDate} hint={cover.workloadDateLong} />
                            <SummaryStat label="Primary Dorm" value={sheet.primaryDorm} hint={`Assigned: ${sheet.assignedDorms}`} />
                            <SummaryStat label="Total Rooms" value={sheet.totalRooms} />
                            <SummaryStat label="Total Points" value={fmtPoints(sheet.totalPoints)} />
                            <SummaryStat
                                label="Est. Minutes"
                                value={sheet.totalMinutes}
                                hint={`${(sheet.totalMinutes / 60).toFixed(1)} hrs`}
                            />
                            <SummaryStat label="Check-Outs" value={sheet.totalCheckouts} hint="Turnovers" />
                            <SummaryStat
                                label="Workload Status"
                                value={sheet.overload ? 'OVERLOAD' : 'OK'}
                                hint={sheet.overload ? 'Exceeds limits — review' : 'Within limits'}
                            />
                        </div>

                        <TaskTable rows={sheet.tasks} />

                        <SignatureBlock />
                    </section>
                ))}

                {sheets.length === 0 && (
                    <section className="mx-3 mb-6 rounded bg-white p-6 text-center shadow sm:mx-4 sm:p-8 print:m-0 print:rounded-none print:shadow-none">
                        <div className="text-sm font-bold text-slate-700">No assignments published for {cover.workloadDate}.</div>
                        <div className="mt-1 text-xs text-slate-500">
                            Click "Publish Assignments" on the planning board first, then return here.
                        </div>
                    </section>
                )}
            </div>

            {/* Print-only page settings: tighter margins for letter/A4 landscape-friendly tables */}
            <style>{`
                @media print {
                    @page { size: A4 landscape; margin: 10mm; }
                    body { background: white !important; }
                }
            `}</style>
        </>
    );
}
