import AppLayout from './AppLayout';

export default function CommandCenterLayout({
    activeHref = 'command-center',
    header,
    children,
    showSidebar = true,
    forceSidebar = false,
}) {
    if (!showSidebar) {
        return (
            <div className="grid h-screen grid-cols-1 overflow-hidden bg-lx-bg text-slate-900">
                <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
                    {header}
                    {children}
                </div>
            </div>
        );
    }

    return (
        <AppLayout
            activeHref={activeHref}
            forceSidebar={forceSidebar}
            className="min-h-screen"
            mainClassName="flex min-h-0 min-w-0 flex-col"
        >
            {header}
            {children}
        </AppLayout>
    );
}
