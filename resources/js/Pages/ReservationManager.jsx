import AppLayout from '../Layouts/AppLayout';
import { AppPageBody, AppPageHeader, AppPageShell } from '../Components/AppPageShell';
import {
    AiAssistantPanel,
    ApprovalWorkflowPanel,
    ArrivalsDeparturesPanel,
    CompanyAllotmentsPanel,
    ExceptionMonitoringPanel,
    ForecastChartPanel,
    ForecastSummaryPanel,
    MetricCard,
    RoomAllocationPanel,
} from '../Components/ReservationManager/Panels';
import {
    AI_ASSISTANT_ITEMS,
    APPROVAL_QUEUE,
    ARRIVALS_DEPARTURES,
    COMPANY_ALLOTMENTS,
    EXCEPTION_MONITORING,
    FORECAST_DAYS,
    FORECAST_SUMMARY,
    PRIMARY_METRICS,
    ROOM_ALLOCATION,
    SECONDARY_METRICS,
} from '../data/reservationManagerSeed';
import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';

function getInitials(name) {
    if (!name) return 'JD';
    return (
        name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((n) => n[0]?.toUpperCase() || '')
            .join('') || 'JD'
    );
}

export default function ReservationManager({
    primaryMetrics = PRIMARY_METRICS,
    secondaryMetrics = SECONDARY_METRICS,
    arrivalsDepartures = ARRIVALS_DEPARTURES,
    approvalQueue = APPROVAL_QUEUE,
    exceptionMonitoring = EXCEPTION_MONITORING,
    forecastDays = FORECAST_DAYS,
    aiAssistant = AI_ASSISTANT_ITEMS,
    roomAllocation = ROOM_ALLOCATION,
    companyAllotments = COMPANY_ALLOTMENTS,
    forecastSummary = FORECAST_SUMMARY,
    lastUpdated = '',
    siteName = 'Boon Lodge • Main Site',
    selectedDate = 'May 21, 2025',
}) {
    const { auth } = usePage().props;
    const userName = auth?.user?.name || 'John Doe';
    const userInitials = getInitials(userName);
    const [aiQuery, setAiQuery] = useState('');

    return (
        <>
            <Head title="Reservation Manager" />

            <AppLayout activeHref="reservations">
                <AppPageShell>
                    <AppPageHeader className="border-b border-lx-border bg-lx-navy text-white">
                        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-xl">
                                    📅
                                </div>
                                <div>
                                    <h1 className="m-0 text-xl font-black md:text-2xl">Reservation Manager</h1>
                                    <p className="m-0 mt-0.5 text-sm text-white/75">
                                        Manage bookings, arrivals, departures, no-shows, extensions, and company
                                        allotments.
                                    </p>
                                    <p className="m-0 mt-1 text-xs font-bold text-white/60">
                                        Child Module •{' '}
                                        <Link href={route('command-center')} className="text-sky-300 hover:underline">
                                            Smart Lodge Command Center
                                        </Link>
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative hidden lg:block">
                                    <input
                                        value={aiQuery}
                                        onChange={(e) => setAiQuery(e.target.value)}
                                        placeholder="Ask Reservation AI..."
                                        className="h-10 w-[260px] rounded-xl border border-white/20 bg-white/10 px-4 pr-9 text-sm text-white placeholder:text-white/50 outline-none"
                                    />
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                                        ✨
                                    </span>
                                </div>
                                <select
                                    className="h-10 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-bold text-white"
                                    defaultValue={siteName}
                                >
                                    <option>{siteName}</option>
                                </select>
                                <button
                                    type="button"
                                    className="h-10 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-bold"
                                >
                                    📅 {selectedDate}
                                </button>
                                <span className="relative text-xl">
                                    🔔
                                    <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[10px] font-black">
                                        6
                                    </span>
                                </span>
                                <div className="grid h-9 w-9 place-items-center rounded-full bg-lx-blue text-sm font-black">
                                    {userInitials}
                                </div>
                            </div>
                        </div>
                    </AppPageHeader>

                    <AppPageBody className="p-6">
                        {lastUpdated && (
                            <p className="mb-4 text-xs font-bold text-lx-ink-soft">Last updated: {lastUpdated}</p>
                        )}

                        <section className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                            {primaryMetrics.map((m) => (
                                <MetricCard key={m.label} metric={m} />
                            ))}
                        </section>

                        <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                            {secondaryMetrics.map((m) => (
                                <MetricCard key={m.label} metric={m} compact />
                            ))}
                        </section>

                        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
                            <div className="grid gap-4">
                                <ArrivalsDeparturesPanel rows={arrivalsDepartures} />
                                <ApprovalWorkflowPanel rows={approvalQueue} />
                                <ExceptionMonitoringPanel items={exceptionMonitoring} />
                                <ForecastChartPanel days={forecastDays} />
                            </div>
                            <div className="grid gap-4">
                                <AiAssistantPanel items={aiAssistant} />
                                <RoomAllocationPanel stats={roomAllocation} />
                                <CompanyAllotmentsPanel rows={companyAllotments} />
                                <ForecastSummaryPanel summary={forecastSummary} />
                            </div>
                        </section>
                    </AppPageBody>
                </AppPageShell>
            </AppLayout>
        </>
    );
}
