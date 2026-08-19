import { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';

import WorkforceLayout from '../../Layouts/WorkforceLayout';
import { cn, formatCount } from '../../Components/Workforce/WorkforceWidgets';
import {
    DEPARTMENTS,
    WORKFORCE_REPORTS,
    departmentTotals,
    grandTotals,
} from '../../data/workforceSeed';

export default function Reports() {
    const [selected, setSelected] = useState(WORKFORCE_REPORTS[0].key);
    const [toast, setToast] = useState('');
    const report = WORKFORCE_REPORTS.find((item) => item.key === selected) || WORKFORCE_REPORTS[0];
    const totals = grandTotals();

    function flash(message) {
        setToast(message);
        window.clearTimeout(flash._timer);
        flash._timer = window.setTimeout(() => setToast(''), 2200);
    }

    return (
        <WorkforceLayout
            title="Workforce Reports"
            subtitle="Static preview packs for gap, occupancy, and position coverage."
            activeHref="workforce.reports"
            toolbar={
                <button
                    type="button"
                    onClick={() => flash(`${report.name} queued for export`)}
                    className="inline-flex items-center gap-2 rounded-xl bg-lx-blue px-3 py-2 text-sm font-black text-white shadow-sm hover:bg-[#0952b8]"
                >
                    <Download className="h-4 w-4" />
                    Export Report
                </button>
            }
        >
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="space-y-2">
                    {WORKFORCE_REPORTS.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => setSelected(item.key)}
                            className={cn(
                                'w-full rounded-2xl border px-4 py-3 text-left shadow-sm transition',
                                selected === item.key
                                    ? 'border-lx-blue bg-white ring-2 ring-blue-100'
                                    : 'border-slate-200 bg-white hover:border-blue-200',
                            )}
                        >
                            <p className="m-0 text-sm font-black text-slate-900">{item.name}</p>
                            <p className="mt-1 m-0 text-xs font-medium text-slate-500">{item.description}</p>
                            <p className="mt-2 m-0 text-[11px] font-bold uppercase tracking-wide text-lx-blue">{item.cadence}</p>
                        </button>
                    ))}
                </aside>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
                        <FileSpreadsheet className="h-5 w-5 text-lx-blue" />
                        <div>
                            <h2 className="m-0 text-base font-black text-slate-950">{report.name}</h2>
                            <p className="m-0 text-xs font-semibold text-slate-500">Week of Aug 15–21, 2026 · demo data</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr className="bg-[#f8fbff] text-[11px] font-black uppercase tracking-wide text-slate-500">
                                    <th className="px-4 py-3 text-left">Department</th>
                                    <th className="px-4 py-3 text-center">Required</th>
                                    <th className="px-4 py-3 text-center">Filled</th>
                                    <th className="px-4 py-3 text-center">Gap</th>
                                    <th className="px-4 py-3 text-center">Fill rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {DEPARTMENTS.map((department) => {
                                    const week = departmentTotals(department).week;
                                    const rate = week.req ? Math.round((week.filled / week.req) * 1000) / 10 : 0;
                                    return (
                                        <tr key={department.id} className="border-t border-slate-100 text-sm">
                                            <td className="px-4 py-3 font-bold text-slate-800">{department.name}</td>
                                            <td className="px-4 py-3 text-center font-semibold text-slate-600">{formatCount(week.req)}</td>
                                            <td className="px-4 py-3 text-center font-semibold text-slate-600">{formatCount(week.filled)}</td>
                                            <td className="px-4 py-3 text-center font-black text-red-600">{week.gap}</td>
                                            <td className="px-4 py-3 text-center font-bold text-slate-700">{rate}%</td>
                                        </tr>
                                    );
                                })}
                                <tr className="border-t border-slate-200 bg-[#eef4ff] text-sm font-black text-slate-900">
                                    <td className="px-4 py-3">All positions</td>
                                    <td className="px-4 py-3 text-center">{totals.week.req}</td>
                                    <td className="px-4 py-3 text-center">{totals.week.filled}</td>
                                    <td className="px-4 py-3 text-center text-red-600">{totals.week.gap}</td>
                                    <td className="px-4 py-3 text-center">
                                        {Math.round((totals.week.filled / totals.week.req) * 1000) / 10}%
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {toast && (
                <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-lx-toast">
                    {toast}
                </div>
            )}
        </WorkforceLayout>
    );
}
