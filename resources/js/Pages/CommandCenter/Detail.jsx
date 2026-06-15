import { VIEW_COMPONENTS } from '../../Components/CommandCenter/CommandCenterDashboardViews';
import { AppPageBody } from '../../Components/AppPageShell';
import CommandCenterLayout from '../../Layouts/CommandCenterLayout';
import { Head, Link, router } from '@inertiajs/react';

function ExecutiveHeaderControls() {
    return (
        <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
                type="button"
                className="rounded-lg bg-lx-blue px-3 py-2 text-xs font-black text-white shadow-lx-soft hover:bg-[#0952b8]"
            >
                Ask Command AI
            </button>
            <button
                type="button"
                className="rounded-lg border border-lx-border bg-white px-3 py-2 text-xs font-black text-lx-navy shadow-lx-soft hover:bg-[#fbfdff]"
            >
                Date Range: Last 7 days
            </button>
            <select
                className="rounded-lg border border-lx-border bg-white px-3 py-2 text-xs font-black text-lx-navy shadow-lx-soft"
                defaultValue="main-lodge"
            >
                <option value="main-lodge">Main Lodge</option>
            </select>
            <Link
                href={route('reports')}
                className="rounded-lg border border-lx-border bg-white px-3 py-2 text-xs font-black text-lx-navy shadow-lx-soft hover:bg-[#fbfdff]"
            >
                Export Report
            </Link>
            <button
                type="button"
                onClick={() => router.reload({ only: ['detail', 'lastUpdated'] })}
                className="rounded-lg border border-lx-border bg-white px-3 py-2 text-xs font-black text-lx-blue shadow-lx-soft hover:bg-[#eef6ff]"
            >
                Refresh Data
            </button>
        </div>
    );
}

export default function CommandCenterDetail({ view, detail = {}, lastUpdated = '' }) {
    const { title, subtitle } = detail;
    const DashboardView = VIEW_COMPONENTS[view];
    const isExecutive = view === 'executive-dashboards';
    // The Smart Lodge Intelligence Hub view owns its own hero (back link,
    // eyebrow, big title) so the standard white header strip would
    // duplicate the title. Suppress it for that one view only — every
    // other detail view continues to render the shared header.
    const isHub = view === 'module-health';

    const header = isHub ? null : (
        <header className="border-b border-lx-border bg-white px-6 py-5">
            <Link href={route('command-center')} className="text-sm font-black text-lx-blue">
                ← Back to Command Center
            </Link>
            <h1 className="mt-3 text-2xl font-black text-lx-navy">{title}</h1>
            {subtitle && <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>}
            {lastUpdated && <p className="mt-1 text-xs font-bold text-lx-ink-soft">Last updated: {lastUpdated}</p>}
            {isExecutive && <ExecutiveHeaderControls />}
        </header>
    );

    return (
        <>
            <Head title={title || 'Command Center'} />

            <CommandCenterLayout activeHref="command-center" header={header}>
                <AppPageBody className="px-6 py-6">
                    <main className="mx-auto max-w-7xl">
                        {DashboardView ? (
                            <DashboardView detail={detail} />
                        ) : (
                            <div className="rounded-2xl border border-lx-border bg-white p-6 shadow-lx-soft">
                                <p className="text-sm font-semibold text-slate-500">This dashboard view is not available yet.</p>
                            </div>
                        )}
                    </main>
                </AppPageBody>
            </CommandCenterLayout>
        </>
    );
}
