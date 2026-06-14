import AppLayout from '../Layouts/AppLayout';
import { AppPageBody, AppPageHeader, AppPageShell } from '../Components/AppPageShell';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function Reports({
    reportTypes = [],
    selectedReport = 'charge-sheets',
    reportDate = '',
    report = {},
    lastUpdated = '',
}) {
    const { flash: sessionFlash } = usePage().props;
    const [reportKey, setReportKey] = useState(selectedReport);
    const [date, setDate] = useState(reportDate);
    const [createName, setCreateName] = useState('');
    const [createType, setCreateType] = useState('charge-sheets');
    const [toast, setToast] = useState('');

    const isCreateForm = report?.isCreateForm || reportKey === 'create-report';
    const creatableTypes = reportTypes.filter((type) => type.key !== 'create-report');

    function flash(message) {
        setToast(message);
        window.clearTimeout(flash._timer);
        flash._timer = window.setTimeout(() => setToast(''), 2400);
    }

    useEffect(() => {
        setReportKey(selectedReport);
        setDate(reportDate);
    }, [selectedReport, reportDate]);

    useEffect(() => {
        if (sessionFlash?.toast) flash(sessionFlash.toast);
    }, [sessionFlash?.toast]);

    function loadReport(nextReport = reportKey, nextDate = date) {
        router.get(
            route('reports'),
            { report: nextReport, date: nextDate },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    function handleReportChange(event) {
        const nextReport = event.target.value;
        setReportKey(nextReport);
        loadReport(nextReport, date);
    }

    function handleDateChange(event) {
        const nextDate = event.target.value;
        setDate(nextDate);
        if (reportKey !== 'create-report') {
            loadReport(reportKey, nextDate);
        }
    }

    function submitCreateReport(event) {
        event.preventDefault();
        router.post(
            route('reports.create'),
            {
                name: createName,
                report: createType,
                date,
            },
            {
                preserveScroll: true,
                onSuccess: () => setCreateName(''),
            },
        );
    }

    return (
        <>
            <Head title="Reports" />

            <AppLayout activeHref="reports">
                <AppPageShell>
                    <AppPageHeader className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-lx-border bg-white px-6 py-4 max-[1100px]:sticky min-[1101px]:static">
                        <div>
                            <h1 className="m-0 text-[26px] tracking-[-0.5px] text-lx-navy">Reports</h1>
                            <p className="mt-0.5 text-[13px] font-semibold text-slate-500">
                                Operational reporting for charge sheets, occupancy, and company movement.
                            </p>
                        </div>
                        <div className="text-xs font-extrabold text-slate-500">
                            Last updated: {lastUpdated || '—'}
                        </div>
                    </AppPageHeader>

                    <AppPageBody>
                        <section className="mb-[18px] flex flex-wrap items-end gap-3 rounded-2xl border border-lx-border bg-white p-4 shadow-lx-soft">
                            <div className="min-w-[220px] flex-1">
                                <label htmlFor="report-type" className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">
                                    Report
                                </label>
                                <select
                                    id="report-type"
                                    value={reportKey}
                                    onChange={handleReportChange}
                                    className="h-[42px] w-full rounded-[10px] border border-lx-border bg-white px-3 text-sm font-bold text-lx-ink"
                                >
                                    {reportTypes.map((type) => (
                                        <option key={type.key} value={type.key}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="min-w-[180px]">
                                <label htmlFor="report-date" className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">
                                    Report Date
                                </label>
                                <input
                                    id="report-date"
                                    type="date"
                                    value={date}
                                    onChange={handleDateChange}
                                    className="h-[42px] w-full rounded-[10px] border border-lx-border bg-white px-3 text-sm font-bold text-lx-ink"
                                />
                            </div>
                            {!isCreateForm && (
                                <button
                                    type="button"
                                    onClick={() => loadReport(reportKey, date)}
                                    className="h-[42px] cursor-pointer rounded-[10px] border-0 bg-lx-blue px-4 text-sm font-black text-white"
                                >
                                    Refresh Report
                                </button>
                            )}
                        </section>

                        {isCreateForm ? (
                            <section className="overflow-hidden rounded-2xl border border-lx-border bg-white shadow-lx-card">
                                <div className="border-b border-lx-border px-5 py-4">
                                    <h2 className="m-0 text-lg font-black text-lx-navy">Create report</h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Name and configure a report, then generate it for the selected date.
                                    </p>
                                </div>
                                <form onSubmit={submitCreateReport} className="grid gap-4 p-5 md:grid-cols-2">
                                    <div className="md:col-span-2">
                                        <label htmlFor="create-name" className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">
                                            Report Name
                                        </label>
                                        <input
                                            id="create-name"
                                            value={createName}
                                            onChange={(e) => setCreateName(e.target.value)}
                                            placeholder="e.g. May 22 Charge Sheet Run"
                                            required
                                            className="h-[42px] w-full rounded-[10px] border border-lx-border px-3 text-sm font-bold text-lx-ink"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="create-type" className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">
                                            Report Type
                                        </label>
                                        <select
                                            id="create-type"
                                            value={createType}
                                            onChange={(e) => setCreateType(e.target.value)}
                                            className="h-[42px] w-full rounded-[10px] border border-lx-border bg-white px-3 text-sm font-bold text-lx-ink"
                                        >
                                            {creatableTypes.map((type) => (
                                                <option key={type.key} value={type.key}>
                                                    {type.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            type="submit"
                                            className="h-[42px] w-full cursor-pointer rounded-[10px] border-0 bg-lx-blue px-4 text-sm font-black text-white"
                                        >
                                            Create Report
                                        </button>
                                    </div>
                                </form>
                            </section>
                        ) : (
                            <section className="overflow-hidden rounded-2xl border border-lx-border bg-white shadow-lx-card">
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-lx-border px-5 py-4">
                                    <div>
                                        <h2 className="m-0 text-lg font-black text-lx-navy">{report.title}</h2>
                                        <p className="mt-1 text-sm text-slate-500">{report.description}</p>
                                    </div>
                                    <div className="text-right text-xs font-bold text-slate-500">
                                        <div>As of {report.asOf}</div>
                                        <div className="mt-1 text-lx-blue">{report.summary}</div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    {report.rows?.length ? (
                                        <table className="w-full min-w-[760px] border-collapse">
                                            <thead>
                                                <tr>
                                                    {report.columns?.map((column) => (
                                                        <th
                                                            key={column.key}
                                                            className="border-b border-lx-line bg-[#fbfdff] p-3 text-left text-xs font-black text-lx-ink-soft"
                                                        >
                                                            {column.label}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {report.rows.map((row, index) => (
                                                    <tr key={`${report.key}-${index}`} className="hover:bg-[#f8fbff]">
                                                        {report.columns?.map((column) => (
                                                            <td
                                                                key={column.key}
                                                                className="border-b border-lx-line p-3 text-[13px] font-bold text-lx-ink"
                                                            >
                                                                {row[column.key] ?? '—'}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="px-5 py-12 text-center text-sm font-bold text-slate-500">
                                            No records found for this report and date.
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}
                    </AppPageBody>
                </AppPageShell>
            </AppLayout>

            {toast && (
                <div className="fixed bottom-6 right-6 z-[2000] rounded-xl bg-lx-navy px-[18px] py-3.5 font-extrabold text-white shadow-lx-toast">
                    {toast}
                </div>
            )}
        </>
    );
}
