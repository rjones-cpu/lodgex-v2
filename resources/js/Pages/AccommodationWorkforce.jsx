import { Head, Link, usePage } from '@inertiajs/react';

import { AppPageBody, AppPageHeader, AppPageShell } from '../Components/AppPageShell';
import SchedulingDashboardEmbed from '../Components/AccommodationWorkforce/SchedulingDashboardEmbed';
import UserAccountMenu from '../Components/AccommodationWorkforce/UserAccountMenu';
import AppLayout from '../Layouts/AppLayout';

function getInitials(name) {
    if (!name) return 'JD';
    return (
        name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() || '')
            .join('') || 'JD'
    );
}

export default function AccommodationWorkforce({
    lastUpdated = '',
    reservationAddPath = '/reservations/add',
    singleWorkerAddPath = '/scheduling/coordinator/add-single-worker',
}) {
    const { auth } = usePage().props;
    const userName = auth?.user?.name || 'John Doe';
    const userInitials = getInitials(userName);

    return (
        <>
            <Head title="Accommodation Workforce" />

            <AppLayout activeHref="accommodation-workforce">
                <AppPageShell>
                    <AppPageHeader className="border-b border-lx-border bg-lx-navy text-white">
                        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-xl">
                                    👥
                                </div>
                                <div>
                                    <h1 className="m-0 text-xl font-black md:text-2xl">Accommodation Workforce</h1>
                                    <p className="m-0 mt-1 text-xs font-bold text-white/60">
                                        Child Module •{' '}
                                        <Link href={route('command-center')} className="text-sky-300 hover:underline">
                                            Smart Lodge Command Center
                                        </Link>
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="relative text-xl">🔔</span>
                                <UserAccountMenu
                                    userName={userName}
                                    userEmail={auth?.user?.email}
                                    userInitials={userInitials}
                                />
                            </div>
                        </div>
                    </AppPageHeader>

                    <AppPageBody className="flex min-h-0 flex-col p-6">
                        <SchedulingDashboardEmbed
                            lastUpdated={lastUpdated}
                            reservationAddPath={reservationAddPath}
                            singleWorkerAddPath={singleWorkerAddPath}
                        />
                    </AppPageBody>
                </AppPageShell>
            </AppLayout>
        </>
    );
}
