import AppLayout from '../Layouts/AppLayout';
import { AppPageBody, AppPageHeader, AppPageShell } from '../Components/AppPageShell';
import { Head, Link } from '@inertiajs/react';

// Demo data for the forecasting widgets. These widgets were relocated here from
// the Reservation Operations queue; the data is currently static and can be
// wired to live sources as those feeds become available.
const APPROVAL_TREND = [
    { h: 45, tone: 'green' },
    { h: 52, tone: 'green' },
    { h: 68, tone: 'green' },
    { h: 42, tone: 'orange' },
    { h: 72, tone: 'green' },
    { h: 62, tone: 'green' },
    { h: 86, tone: 'green' },
];

const NOSHOW_TREND = [38, 55, 72, 48, 80, 44, 62];

const DORMS = [
    ['Dorm A', 92, 'green'],
    ['Dorm B', 88, 'green'],
    ['Dorm C', 76, 'green'],
    ['Dorm D', 74, 'orange'],
    ["Women’s Dorm", 66, 'orange'],
    ['Dorm E', 58, 'orange'],
    ['Dorm F', 51, 'red'],
];

const EXTENSION_QUEUE = [
    ['Carlos Ramirez', 'Bechtel Corp', 'High'],
    ['Noah Wilson', 'Bechtel Corp', 'Medium'],
    ['Mason Taylor', 'Turner Industrial', 'Medium'],
    ['Nora Fields', 'Vertex Services', 'Medium'],
    ['Debbie Marie Group', 'DMS', 'Low'],
];

const BAR_TONE = {
    green: 'bg-green-600',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
};

const PROGRESS_TONE = {
    green: 'bg-green-600',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
};

const PRIORITY_TONE = {
    High: 'bg-red-100 text-red-500',
    Medium: 'bg-orange-100 text-orange-500',
    Low: 'bg-green-100 text-green-600',
};

function Pill({ value }) {
    const tone = PRIORITY_TONE[value] || 'bg-slate-100 text-slate-500';
    return (
        <span className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-black ${tone}`}>
            {value}
        </span>
    );
}

export default function Forecasting() {
    return (
        <>
            <Head title="Forecasting" />

            <AppLayout activeHref="forecasting">
                <AppPageShell>
                    <AppPageHeader className="border-b border-lx-border bg-white">
                        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf2ff] text-xl">
                                    📈
                                </div>
                                <div>
                                    <h1 className="m-0 text-xl font-black text-lx-navy md:text-2xl">Forecasting</h1>
                                    <p className="m-0 mt-0.5 text-sm text-lx-ink-soft">
                                        Approval, utilization, extension, walk-in and no-show trends.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </AppPageHeader>

                    <AppPageBody className="p-6">
                        <div className="grid grid-cols-5 gap-3.5 max-[1450px]:grid-cols-2">
                            <div className="min-h-[210px] rounded-2xl border border-lx-border bg-white p-4 shadow-lx-soft">
                                <h4 className="mb-3 flex justify-between text-sm font-black text-lx-navy">
                                    Approval Trend (7 Days) <span>ⓘ</span>
                                </h4>
                                <div className="flex h-[125px] items-end gap-2.5 pt-3.5">
                                    {APPROVAL_TREND.map((b, i) => (
                                        <div
                                            key={i}
                                            className={`flex-1 rounded-t-md ${BAR_TONE[b.tone]}`}
                                            style={{ height: `${b.h}%` }}
                                        />
                                    ))}
                                </div>
                                <a className="text-xs font-black text-lx-blue">View full report</a>
                            </div>

                            <div className="min-h-[210px] rounded-2xl border border-lx-border bg-white p-4 shadow-lx-soft">
                                <h4 className="mb-3 flex justify-between text-sm font-black text-lx-navy">
                                    Room Utilization by Dorm / Zone <span>ⓘ</span>
                                </h4>
                                <div>
                                    {DORMS.map(([name, pct, tone]) => (
                                        <div key={name} className="my-3">
                                            <div className="mb-1.5 flex justify-between text-xs font-extrabold text-lx-ink">
                                                <span>{name}</span>
                                                <span>{pct}%</span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                                                <div className={`h-full rounded-full ${PROGRESS_TONE[tone]}`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Link href={route('room-utilization')} className="text-xs font-black text-lx-blue">
                                    View all utilization
                                </Link>
                            </div>

                            <div className="min-h-[210px] rounded-2xl border border-lx-border bg-white p-4 shadow-lx-soft">
                                <h4 className="mb-3 flex justify-between text-sm font-black text-lx-navy">
                                    Extension Queue
                                    <span className="rounded-full bg-[#eaf2ff] px-2.5 py-1 text-xs text-lx-blue">28</span>
                                </h4>
                                <div className="grid gap-2">
                                    {EXTENSION_QUEUE.map(([name, company, prio]) => (
                                        <div key={name} className="flex justify-between text-xs text-lx-ink">
                                            <span>
                                                {name}
                                                <br />
                                                <small>{company}</small>
                                            </span>
                                            <Pill value={prio} />
                                        </div>
                                    ))}
                                </div>
                                <a className="text-xs font-black text-lx-blue">View all extensions</a>
                            </div>

                            <div className="min-h-[210px] rounded-2xl border border-lx-border bg-white p-4 shadow-lx-soft">
                                <h4 className="mb-3 flex justify-between text-sm font-black text-lx-navy">
                                    Walk-In Activity
                                    <span className="rounded-full bg-[#eaf2ff] px-2.5 py-1 text-xs text-lx-blue">24</span>
                                </h4>
                                <div
                                    className="mx-auto my-3 grid h-[112px] w-[112px] place-items-center rounded-full"
                                    style={{
                                        background:
                                            'conic-gradient(#0b66e4 0 58%, #7c3aed 58% 83%, #f97316 83% 100%)',
                                    }}
                                >
                                    <div className="grid h-[72px] w-[72px] place-items-center rounded-full bg-white text-center text-xs font-black text-lx-navy">
                                        24
                                        <br />
                                        <small>Today</small>
                                    </div>
                                </div>
                                <div className="flex justify-between text-xs text-lx-ink">
                                    <span>vs Yesterday</span>
                                    <strong className="text-red-500">↑ 14.3%</strong>
                                </div>
                                <a className="text-xs font-black text-lx-blue">View walk-in list</a>
                            </div>

                            <div className="min-h-[210px] rounded-2xl border border-lx-border bg-white p-4 shadow-lx-soft">
                                <h4 className="mb-3 flex justify-between text-sm font-black text-lx-navy">
                                    No-Show Trend (7 Days) <span>ⓘ</span>
                                </h4>
                                <div className="flex h-[125px] items-end gap-2.5 pt-3.5">
                                    {NOSHOW_TREND.map((h, i) => (
                                        <div key={i} className="flex-1 rounded-t-md bg-red-500" style={{ height: `${h}%` }} />
                                    ))}
                                </div>
                                <a className="text-xs font-black text-lx-blue">View no-shows report</a>
                            </div>
                        </div>
                    </AppPageBody>
                </AppPageShell>
            </AppLayout>
        </>
    );
}
