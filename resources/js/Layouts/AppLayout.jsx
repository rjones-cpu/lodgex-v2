import AppSidebar from '../Components/AppSidebar';

export default function AppLayout({
    activeHref = null,
    children,
    forceSidebar = false,
    className = '',
    mainClassName = 'min-w-0',
}) {
    return (
        <div
            className={`grid min-h-screen bg-[#F6F8FC] text-slate-900 min-[1101px]:h-screen min-[1101px]:grid-rows-1 min-[1101px]:overflow-hidden ${
                forceSidebar
                    ? 'grid-cols-[224px_1fr]'
                    : 'grid-cols-[224px_1fr] max-[1100px]:grid-cols-1'
            } ${className}`.trim()}
        >
            <AppSidebar activeHref={activeHref} forceVisible={forceSidebar} />
            <div className={`min-[1101px]:flex min-[1101px]:min-h-0 min-[1101px]:flex-col ${mainClassName}`.trim()}>
                {children}
            </div>
        </div>
    );
}
