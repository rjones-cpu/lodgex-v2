import { Bell, ChevronDown } from 'lucide-react';
import { Head, usePage } from '@inertiajs/react';

import AppLayout from './AppLayout';
import { AppPageBody, AppPageHeader, AppPageShell } from '../Components/AppPageShell';
import UserAccountMenu from '../Components/AccommodationWorkforce/UserAccountMenu';

function getInitials(name) {
    if (!name) return 'RJ';
    return (
        name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() || '')
            .join('') || 'RJ'
    );
}

export default function WorkforceLayout({
    title,
    subtitle,
    activeHref,
    roleLabel = 'Head Office',
    toolbar = null,
    compact = false,
    children,
}) {
    const { auth } = usePage().props;
    const userName = auth?.user?.name || 'Ralph Jones';
    const userInitials = getInitials(userName);

    return (
        <>
            <Head title={title} />

            <AppLayout activeHref={activeHref}>
                <AppPageShell>
                    <AppPageHeader className="border-b border-slate-200 bg-white/95 backdrop-blur">
                        <div
                            className={`flex flex-col px-3 2xl:flex-row 2xl:items-center 2xl:justify-between ${
                                compact
                                    ? 'gap-2 py-2.5 sm:px-4 sm:py-3'
                                    : 'gap-3 py-3 sm:px-5 sm:py-4'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3 2xl:contents">
                                <div className="min-w-0 2xl:max-w-xl">
                                    <h1
                                        className={`m-0 font-black leading-tight tracking-tight text-slate-950 ${
                                            compact ? 'text-lg sm:text-xl' : 'text-lg sm:text-2xl md:text-[28px]'
                                        }`}
                                    >
                                        {title}
                                    </h1>
                                    {subtitle && (
                                        <p className={`mt-1 font-medium text-slate-500 ${compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'}`}>
                                            {subtitle}
                                        </p>
                                    )}
                                </div>

                                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 2xl:order-last">
                                    <button
                                        type="button"
                                        className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 sm:p-2.5"
                                        aria-label="Notifications"
                                    >
                                        <Bell className="h-5 w-5" />
                                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
                                    </button>
                                    <UserAccountMenu
                                        userName={userName}
                                        userEmail={auth?.user?.email}
                                        userInitials={userInitials}
                                        triggerClassName="flex max-w-[200px] shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-1.5 py-1 shadow-sm sm:max-w-[240px] sm:gap-2.5 sm:px-2 sm:py-1.5"
                                    >
                                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lx-blue text-xs font-black text-white sm:h-10 sm:w-10 sm:text-sm">
                                            {userInitials}
                                        </div>
                                        <div className="hidden min-w-0 pr-1 text-left md:block">
                                            <p className="m-0 truncate text-sm font-bold text-slate-900">{userName}</p>
                                            <p className="m-0 truncate text-xs font-medium text-slate-500">{roleLabel}</p>
                                        </div>
                                        <ChevronDown className="hidden h-4 w-4 shrink-0 text-slate-400 md:block" />
                                    </UserAccountMenu>
                                </div>
                            </div>

                            {toolbar && <div className="min-w-0 w-full 2xl:flex-1 2xl:px-4">{toolbar}</div>}
                        </div>
                    </AppPageHeader>

                    <AppPageBody className={`bg-[#f4f7fb] ${compact ? 'p-3 sm:p-4' : 'p-3 sm:p-5 lg:p-6'}`}>
                        {children}
                    </AppPageBody>
                </AppPageShell>
            </AppLayout>
        </>
    );
}
