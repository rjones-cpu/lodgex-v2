import {
    AiPanel,
    AssignmentsPanel,
    ForecastPanel,
    HousekeepersPanel,
    InspectionsPanel,
    OverviewPanel,
    ProductivityPanel,
    ReadinessPanel,
    RecentAuditList,
    ScheduleFeedsPanel,
    ScenariosPanel,
    TaskBoardPanel,
} from '../Components/HousekeepingPlanning/Panels';
import AssignmentEditorModal from '../Components/HousekeepingPlanning/AssignmentEditorModal';
import AppLayout from '../Layouts/AppLayout';
import { AppPageBody, AppPageHeader, AppPageShell } from '../Components/AppPageShell';
import { HK_TABS } from '../data/housekeepingPlanningSeed';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import {
    BarChart3,
    Brush,
    Users,
    BedDouble,
    LineChart,
    ShieldCheck,
    ClipboardCheck,
    Bot,
    Sparkles,
    CalendarDays,
    ClipboardList,
} from 'lucide-react';

// Maps each Housekeeping Planning tab to its lucide icon for the icon + label tab bar.
const HK_TAB_ICONS = {
    overview: BarChart3,
    tasks: Brush,
    assignments: Users,
    readiness: BedDouble,
    forecast: LineChart,
    inspections: ShieldCheck,
    productivity: ClipboardCheck,
    ai: Bot,
    scenarios: Sparkles,
    schedule: CalendarDays,
    housekeepers: ClipboardList,
};

export default function HousekeepingPlanningManager({
    metrics = [],
    planningSummary = {},
    tasks = [],
    assignments = [],
    housekeepers = [],
    housekeepersRoster = [],
    forecasts = [],
    inspections = [],
    productivity = [],
    aiRecommendations = [],
    recentAudit = [],
    roomUtilization = {},
    scheduleFeeds = [],
    scenarioPresets = [],
    lastUpdated = '',
}) {
    const { flash: sessionFlash } = usePage().props;
    const [activeTab, setActiveTab] = useState('overview');
    const [recommendations, setRecommendations] = useState(aiRecommendations);
    const [scenarioResult, setScenarioResult] = useState(null);
    const [toast, setToast] = useState('');
    const toastRef = useRef(null);
    const [editorHk, setEditorHk] = useState(null);
    const [editorSaving, setEditorSaving] = useState(false);

    function flash(message) {
        setToast(message);
        if (toastRef.current) clearTimeout(toastRef.current);
        toastRef.current = setTimeout(() => setToast(''), 2400);
    }

    useEffect(() => {
        if (sessionFlash?.toast) flash(sessionFlash.toast);
    }, [sessionFlash?.toast]);

    useEffect(() => {
        if (sessionFlash?.scenarioResult) setScenarioResult(sessionFlash.scenarioResult);
    }, [sessionFlash?.scenarioResult]);

    useEffect(() => {
        setRecommendations(aiRecommendations);
    }, [aiRecommendations]);

    function approveRecommendation(id) {
        router.post(route('housekeeping-planning.recommendations.approve', id), {}, {
            preserveScroll: true,
            onSuccess: () => setRecommendations((rows) => rows.map((r) => (r.id === id ? { ...r, status: 'Approved' } : r))),
        });
    }

    function dismissRecommendation(id) {
        router.post(route('housekeeping-planning.recommendations.dismiss', id), {}, {
            preserveScroll: true,
            onSuccess: () => setRecommendations((rows) => rows.filter((r) => r.id !== id)),
        });
    }

    function publishAssignments() {
        router.post(route('housekeeping-planning.assignments.publish'), {}, { preserveScroll: true });
    }

    function openAssignmentEditor(row) {
        const hk = housekeepers.find((h) => h.id === row.housekeeperId);
        if (!hk) {
            flash('This housekeeper is no longer on the active workforce roster. Refresh to rebuild the board.');
            return;
        }
        setEditorHk(hk);
    }

    function saveAssignmentChanges(changes) {
        if (!changes?.length) { setEditorHk(null); return; }
        setEditorSaving(true);
        router.post(
            route('housekeeping-planning.assignments.reassign'),
            { changes },
            {
                preserveScroll: true,
                onFinish: () => setEditorSaving(false),
                onSuccess: () => setEditorHk(null),
            },
        );
    }

    function runScenario(key) {
        router.post(route('housekeeping-planning.scenarios.run'), { scenario: key }, { preserveScroll: true });
    }

    const tabLabel = HK_TABS.find((t) => t.key === activeTab)?.label || 'Overview';

    return (
        <>
            <Head title="Housekeeping Planning & Workload" />
            <AppLayout activeHref="housekeeping-planning">
                <AppPageShell>
                    <AppPageHeader className="sticky top-0 z-20 shrink-0 border-b border-lx-border bg-white px-3 py-3 sm:px-[18px] sm:py-[18px] max-[1100px]:sticky min-[1101px]:static min-[1101px]:border-b-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wide text-lx-blue">Smart Lodge Command Center</p>
                            <h1 className="text-xl font-black text-lx-navy sm:text-2xl">Housekeeping Planning & Workload</h1>
                            <p className="text-xs text-slate-500">Updated {lastUpdated}</p>
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                            <button type="button" onClick={publishAssignments} className="cursor-pointer rounded-[10px] bg-lx-blue px-4 py-2.5 text-sm font-black text-white">
                                Publish Assignments
                            </button>
                            <Link
                                href={route('housekeeping-planning.publish-sheet')}
                                target="_blank"
                                rel="noopener"
                                className="cursor-pointer rounded-[10px] border border-lx-blue bg-white px-4 py-2.5 text-center text-sm font-black text-lx-blue hover:bg-blue-50"
                            >
                                🖨️ Open Publish Sheets
                            </Link>
                        </div>
                    </div>
                    </AppPageHeader>

                    <AppPageBody className="px-3 pb-3 sm:px-[18px] sm:pb-[18px]">
                    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {metrics.map((m) => (
                            <div key={m.label} className="rounded-2xl border border-lx-border bg-white p-4 shadow-lx-soft">
                                <div className="text-2xl">{m.icon}</div>
                                <div className="mt-2 text-2xl font-black text-lx-navy">{m.value}</div>
                                <p className="text-xs font-bold text-slate-500">{m.label}</p>
                                <p className="text-xs font-extrabold text-lx-ink">{m.change}</p>
                            </div>
                        ))}
                    </div>

                    <section className="grid grid-cols-1 gap-[18px] min-w-0 xl:grid-cols-[minmax(0,1fr)_300px]">
                        <div className="min-w-0 rounded-2xl border border-lx-border bg-white shadow-lx-card">
                            <div className="-mx-px flex gap-2 overflow-x-auto overscroll-x-contain border-b border-lx-border px-3 py-3 [scrollbar-width:thin]">
                                {HK_TABS.map((t) => {
                                    const Icon = HK_TAB_ICONS[t.key] ?? BarChart3;
                                    const isActive = activeTab === t.key;
                                    return (
                                        <button
                                            key={t.key}
                                            type="button"
                                            onClick={() => setActiveTab(t.key)}
                                            aria-pressed={isActive}
                                            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2.5 text-xs font-bold transition sm:px-4 ${
                                                isActive
                                                    ? 'border-lx-blue bg-lx-blue text-white shadow-sm'
                                                    : 'border-lx-border bg-white text-lx-ink hover:border-lx-blue/40 hover:bg-[#f0f6ff]'
                                            }`}
                                        >
                                            <Icon
                                                className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-lx-blue'}`}
                                                strokeWidth={2.4}
                                            />
                                            <span>{t.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="border-b border-lx-border px-3 py-3 sm:px-[18px] sm:py-4">
                                <h2 className="text-base font-black text-lx-navy">{tabLabel}</h2>
                            </div>
                            <div className="min-w-0 p-3 sm:p-[18px]">
                                {activeTab === 'overview' && <OverviewPanel planningSummary={planningSummary} />}
                                {activeTab === 'tasks' && <TaskBoardPanel rows={tasks} />}
                                {activeTab === 'assignments' && (
                                    <AssignmentsPanel
                                        rows={assignments}
                                        tasks={tasks}
                                        housekeepers={housekeepers}
                                        onEdit={openAssignmentEditor}
                                    />
                                )}
                                {activeTab === 'readiness' && (
                                    <ReadinessPanel
                                        risks={planningSummary.readinessRisks}
                                        unassigned={planningSummary.unassignedTasks}
                                        roomUtilization={roomUtilization}
                                    />
                                )}
                                {activeTab === 'scenarios' && (
                                    <ScenariosPanel presets={scenarioPresets} result={scenarioResult} onRun={runScenario} />
                                )}
                                {activeTab === 'schedule' && <ScheduleFeedsPanel feeds={scheduleFeeds} />}
                                {activeTab === 'housekeepers' && <HousekeepersPanel rows={housekeepersRoster} />}
                                {activeTab === 'forecast' && <ForecastPanel rows={forecasts} />}
                                {activeTab === 'inspections' && <InspectionsPanel rows={inspections} />}
                                {activeTab === 'productivity' && <ProductivityPanel rows={productivity} />}
                                {activeTab === 'ai' && (
                                    <AiPanel recommendations={recommendations} onApprove={approveRecommendation} onDismiss={dismissRecommendation} />
                                )}
                            </div>
                        </div>

                        <aside className="min-w-0 rounded-2xl border border-lx-border bg-white p-3 shadow-lx-card sm:p-[18px] xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-150px)] xl:overflow-y-auto">
                            <strong className="text-base text-lx-navy">AI Housekeeping Assistant</strong>
                            <p className="mt-1 text-xs text-slate-500">Recommend before acting — approval required</p>
                            <div className="mt-4">
                                <h4 className="mb-2 text-xs font-black uppercase text-slate-500">Top recommendations</h4>
                                <AiPanel
                                    recommendations={recommendations.slice(0, 2)}
                                    onApprove={approveRecommendation}
                                    onDismiss={dismissRecommendation}
                                />
                            </div>
                            <div className="mt-4">
                                <h4 className="mb-2 text-xs font-black uppercase text-slate-500">Recent activity</h4>
                                <RecentAuditList entries={recentAudit} />
                            </div>
                        </aside>
                    </section>
                    </AppPageBody>
                </AppPageShell>
            </AppLayout>
            {toast && (
                <div className="fixed bottom-6 left-4 right-4 z-[2000] mx-auto max-w-md rounded-xl bg-lx-navy px-[18px] py-3.5 text-center font-extrabold text-white shadow-lx-toast sm:left-auto sm:right-6 sm:mx-0 sm:text-left">
                    {toast}
                </div>
            )}
            <AssignmentEditorModal
                open={!!editorHk}
                housekeeper={editorHk}
                allHousekeepers={housekeepers}
                allTasks={tasks}
                isSaving={editorSaving}
                onClose={() => !editorSaving && setEditorHk(null)}
                onSave={saveAssignmentChanges}
            />
        </>
    );
}
