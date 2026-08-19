import {
    AlertTriangle,
    ArrowRight,
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    CircleX,
    Clock3,
    Download,
    ExternalLink,
    Filter,
    Search,
    UserRound,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const PAGE_SIZE = 8;

const STATUS_STYLES = {
    Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
    Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    Rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
};

function MetricCard({ label, value, detail, icon: Icon, tone }) {
    const tones = {
        amber: 'bg-amber-50 text-amber-600',
        orange: 'bg-orange-50 text-orange-600',
        green: 'bg-emerald-50 text-emerald-600',
        red: 'bg-rose-50 text-rose-600',
        blue: 'bg-blue-50 text-blue-600',
    };

    return (
        <article className="flex min-w-0 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
            <div className="min-w-0">
                <p className="m-0 truncate text-[11px] font-bold text-slate-600">{label}</p>
                <p className="m-0 mt-1 text-2xl font-black leading-none text-slate-950">{value}</p>
                <p className="m-0 mt-2 truncate text-[10px] font-semibold text-slate-400">{detail}</p>
            </div>
            <span className={`ml-3 grid h-9 w-9 shrink-0 place-items-center rounded-full ${tones[tone]}`}>
                <Icon className="h-4 w-4" />
            </span>
        </article>
    );
}

function StatusPill({ value }) {
    return (
        <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-black ring-1 ring-inset ${STATUS_STYLES[value] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
            {value}
        </span>
    );
}

function Worker({ row }) {
    return (
        <div className="flex min-w-[150px] items-center gap-2.5">
            <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-black text-white"
                style={{ backgroundColor: row.color || '#0b66e4' }}
            >
                {row.initials || 'WR'}
            </span>
            <div className="min-w-0">
                <p className="m-0 truncate text-xs font-black text-slate-900">{row.worker}</p>
                <p className="m-0 mt-0.5 truncate text-[10px] font-semibold text-slate-400">{row.company || '—'}</p>
            </div>
        </div>
    );
}

function RequestDetails({ row, campDashboardUrl, onClose }) {
    const note = row.notes?.[0]?.text;
    const openWorkflow = () => {
        if (campDashboardUrl) {
            window.open(campDashboardUrl, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <aside className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="m-0 text-xs font-black text-slate-900">
                            CR-{String(row.modificationRequestId || row.id).replace(/\D/g, '').padStart(5, '0')}
                        </p>
                        <StatusPill value={row.requestStatus || 'Pending'} />
                    </div>
                    <p className="m-0 mt-1 text-[10px] font-semibold text-slate-400">
                        Submitted {row.requestedAt || '—'}
                    </p>
                </div>
                <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close request details">
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="space-y-4 px-4 py-4">
                <Worker row={row} />

                <div>
                    <p className="m-0 text-[10px] font-black uppercase tracking-wide text-slate-400">Requested change</p>
                    <p className="m-0 mt-1 text-sm font-black leading-5 text-slate-900">{row.status || 'Schedule modification'}</p>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <div>
                        <p className="m-0 text-[9px] font-black uppercase tracking-wide text-slate-400">Current</p>
                        <p className="m-0 mt-1 text-xs font-black text-slate-800">Published schedule</p>
                        <p className="m-0 mt-1 text-[10px] font-medium text-slate-500">Active assignment</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-lx-blue" />
                    <div>
                        <p className="m-0 text-[9px] font-black uppercase tracking-wide text-slate-400">Requested</p>
                        <p className="m-0 mt-1 text-xs font-black text-lx-blue">Pending update</p>
                        <p className="m-0 mt-1 text-[10px] font-medium text-slate-500">Awaiting review</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Detail label="Request type" value={formatRequestType(row.requestType)} />
                    <Detail label="Requested by" value={row.requestedBy || '—'} />
                    <Detail label="Booking ID" value={row.bookingId ? `#${row.bookingId}` : '—'} />
                    <Detail label="Schedule ID" value={row.modScheduleId ? `#${row.modScheduleId}` : '—'} />
                </div>

                <div>
                    <p className="m-0 text-[10px] font-black uppercase tracking-wide text-slate-400">Reason / notes</p>
                    <p className="m-0 mt-1.5 rounded-lg bg-slate-50 p-3 text-xs font-medium leading-5 text-slate-600">
                        {note || 'No additional notes were submitted with this request.'}
                    </p>
                </div>

                <div className="border-t border-slate-200 pt-4">
                    <p className="m-0 text-[10px] font-black uppercase tracking-wide text-slate-400">Audit timeline</p>
                    <div className="mt-3 flex gap-3">
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-lx-blue ring-4 ring-blue-50" />
                        <div>
                            <p className="m-0 text-xs font-black text-slate-800">Request submitted</p>
                            <p className="m-0 mt-0.5 text-[10px] font-medium text-slate-400">
                                {row.requestedBy || 'Requester'} · {row.requestedAt || '—'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-200 bg-slate-50/70 p-3">
                <button
                    type="button"
                    onClick={openWorkflow}
                    disabled={!campDashboardUrl || !row.canOpen}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-45"
                >
                    <CircleX className="h-3.5 w-3.5" />
                    Review / Reject
                </button>
                <button
                    type="button"
                    onClick={openWorkflow}
                    disabled={!campDashboardUrl || !row.canOpen}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
                >
                    <Check className="h-3.5 w-3.5" />
                    Review / Approve
                </button>
                <button
                    type="button"
                    onClick={openWorkflow}
                    disabled={!campDashboardUrl}
                    className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                >
                    Open manager workflow
                    <ExternalLink className="h-3.5 w-3.5" />
                </button>
            </div>
        </aside>
    );
}

function Detail({ label, value }) {
    return (
        <div>
            <p className="m-0 text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</p>
            <p className="m-0 mt-1 truncate text-xs font-bold text-slate-700">{value}</p>
        </div>
    );
}

function formatRequestType(value) {
    if (!value) return 'Schedule change';
    return String(value).replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function ChangeRequestsView({ requests = [], campDashboardUrl = null }) {
    const [department, setDepartment] = useState('all');
    const [status, setStatus] = useState('all');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [filtersOpen, setFiltersOpen] = useState(true);
    const [selectedId, setSelectedId] = useState(requests[0]?.id || null);
    const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

    const companies = useMemo(
        () => [...new Set(requests.map((item) => item.company).filter((value) => value && value !== '—'))].sort(),
        [requests],
    );
    const filteredRequests = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return requests.filter((item) => (
            (department === 'all' || item.company === department)
            && (status === 'all' || (item.requestStatus || 'Pending') === status)
            && (!needle || [
                item.worker,
                item.company,
                item.status,
                item.requestedBy,
                item.modificationRequestId,
            ].some((value) => String(value || '').toLowerCase().includes(needle)))
        ));
    }, [department, query, requests, status]);

    const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const visibleRequests = filteredRequests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const selected = requests.find((item) => item.id === selectedId) || null;
    const pendingCount = requests.filter((item) => (item.requestStatus || 'Pending') === 'Pending').length;
    const approvedCount = requests.filter((item) => item.requestStatus === 'Approved').length;
    const rejectedCount = requests.filter((item) => item.requestStatus === 'Rejected').length;

    useEffect(() => {
        setPage(1);
    }, [department, query, status]);

    useEffect(() => {
        if (selectedId && !requests.some((item) => item.id === selectedId)) {
            setSelectedId(requests[0]?.id || null);
        }
    }, [requests, selectedId]);

    const selectRequest = (row) => {
        setSelectedId(row.id);
        setMobilePanelOpen(true);
    };
    const exportRequests = () => {
        const escapeCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
        const rows = filteredRequests.map((row) => [
            row.modificationRequestId,
            row.worker,
            row.company,
            formatRequestType(row.requestType),
            row.status,
            row.requestedAt,
            row.requestStatus || 'Pending',
        ]);
        const csv = [
            ['Request ID', 'Worker', 'Company', 'Request Type', 'Requested Change', 'Submitted', 'Status'],
            ...rows,
        ].map((row) => row.map(escapeCell).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'schedule-change-requests.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard label="Pending Requests" value={pendingCount} detail="Awaiting manager review" icon={Clock3} tone="amber" />
                <MetricCard label="Open This Week" value={requests.length} detail="Current request queue" icon={CalendarDays} tone="orange" />
                <MetricCard label="Approved This Week" value={approvedCount} detail="Completed requests" icon={CheckCircle2} tone="green" />
                <MetricCard label="Rejected" value={rejectedCount} detail="Declined requests" icon={CircleX} tone="red" />
                <MetricCard label="Conflicts Detected" value={0} detail="No conflicts reported" icon={AlertTriangle} tone="blue" />
            </section>

            <div className={`mt-3 grid grid-cols-1 gap-4 ${selected ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
                <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-200 p-3 lg:flex-row lg:items-end lg:justify-between">
                        <div className={`${filtersOpen ? 'grid' : 'hidden'} flex-1 grid-cols-1 gap-2 sm:grid-cols-3 lg:max-w-2xl`}>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-black text-slate-500">Company</span>
                                <select value={department} onChange={(event) => setDepartment(event.target.value)} className="h-9 w-full rounded-lg border-slate-200 py-1 text-xs font-semibold text-slate-700">
                                    <option value="all">All companies</option>
                                    {companies.map((company) => <option key={company} value={company}>{company}</option>)}
                                </select>
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-black text-slate-500">Status</span>
                                <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 w-full rounded-lg border-slate-200 py-1 text-xs font-semibold text-slate-700">
                                    <option value="all">All statuses</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-black text-slate-500">Search</span>
                                <span className="relative block">
                                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search requests..." className="h-9 w-full rounded-lg border-slate-200 py-1 pl-9 pr-3 text-xs font-semibold text-slate-700 placeholder:text-slate-400" />
                                </span>
                            </label>
                        </div>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setFiltersOpen((value) => !value)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-600 hover:bg-slate-50">
                                <Filter className="h-3.5 w-3.5" />
                                Filters
                            </button>
                            <button type="button" onClick={exportRequests} disabled={filteredRequests.length === 0} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45">
                                <Download className="h-3.5 w-3.5" />
                                Export
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[920px] border-collapse">
                            <thead className="bg-slate-50/80">
                                <tr className="border-b border-slate-200 text-left">
                                    {['Request ID', 'Worker', 'Request type', 'Requested change', 'Submitted', 'Status', 'Actions'].map((label) => (
                                        <th key={label} className="px-3 py-3 text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {visibleRequests.map((row) => {
                                    const isSelected = row.id === selectedId;
                                    return (
                                        <tr key={row.id} className={`border-b border-slate-100 transition hover:bg-blue-50/40 ${isSelected ? 'bg-blue-50/60' : ''}`}>
                                            <td className="whitespace-nowrap px-3 py-3 text-[10px] font-black text-slate-500">
                                                CR-{String(row.modificationRequestId || row.id).replace(/\D/g, '').padStart(5, '0')}
                                            </td>
                                            <td className="px-3 py-3"><Worker row={row} /></td>
                                            <td className="px-3 py-3 text-xs font-bold text-slate-700">{formatRequestType(row.requestType)}</td>
                                            <td className="max-w-[180px] px-3 py-3">
                                                <p className="m-0 truncate text-xs font-black text-slate-800">{row.status || 'Schedule modification'}</p>
                                                <p className="m-0 mt-1 truncate text-[10px] font-medium text-slate-400">Submitted by {row.requestedBy || '—'}</p>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-3 text-[10px] font-semibold text-slate-500">{row.requestedAt || '—'}</td>
                                            <td className="px-3 py-3"><StatusPill value={row.requestStatus || 'Pending'} /></td>
                                            <td className="px-3 py-3">
                                                <button type="button" onClick={() => selectRequest(row)} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-lx-blue" aria-label={`View ${row.worker}'s request`}>
                                                    <ExternalLink className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {visibleRequests.length === 0 && (
                        <div className="grid min-h-64 place-items-center px-6 py-10 text-center">
                            <div>
                                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
                                    <UserRound className="h-5 w-5" />
                                </span>
                                <p className="m-0 mt-3 text-sm font-black text-slate-800">No change requests found</p>
                                <p className="m-0 mt-1 text-xs font-medium text-slate-400">New schedule requests will appear here for review.</p>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-3 border-t border-slate-200 px-3 py-3 text-[10px] font-semibold text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                            Showing {visibleRequests.length ? ((currentPage - 1) * PAGE_SIZE) + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filteredRequests.length)} of {filteredRequests.length} requests
                        </span>
                        <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="grid h-8 min-w-8 place-items-center rounded-lg bg-lx-blue px-2 font-black text-white">{currentPage}</span>
                            <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40">
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </section>

                {selected && (
                    <div className="hidden min-w-0 xl:block">
                        <RequestDetails row={selected} campDashboardUrl={campDashboardUrl} onClose={() => setSelectedId(null)} />
                    </div>
                )}
            </div>

            {selected && mobilePanelOpen && (
                <div className="fixed inset-0 z-50 xl:hidden">
                    <button type="button" className="absolute inset-0 bg-slate-950/40" onClick={() => setMobilePanelOpen(false)} aria-label="Close request details" />
                    <div className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto bg-[#f4f7fb] p-3 shadow-2xl">
                        <RequestDetails row={selected} campDashboardUrl={campDashboardUrl} onClose={() => setMobilePanelOpen(false)} />
                    </div>
                </div>
            )}
        </>
    );
}
