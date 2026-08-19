import { usePage } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import SchedulingDashboardEmbed from '../../Components/AccommodationWorkforce/SchedulingDashboardEmbed';
import AddScheduleModal from '../../Components/Workforce/AddScheduleModal';
import ChangeRequestsView from '../../Components/Workforce/ChangeRequestsView';
import ScheduleCalendarView from '../../Components/Workforce/ScheduleCalendarView';
import ScheduleListView from '../../Components/Workforce/ScheduleListView';
import WorkforceLayout from '../../Layouts/WorkforceLayout';

const SCHEDULE_VIEWS = [
    { id: 'board', label: 'Board View' },
    { id: 'list', label: 'List View' },
    { id: 'calendar', label: 'Calendar View' },
    { id: 'change-requests', label: 'Change Requests' },
];

export default function Schedule({
    availability = { available: false, message: 'Scheduling is unavailable.' },
    lastUpdated = '',
    scheduleOptions = {},
    schedules = [],
    changeRequests = [],
    campDashboardUrl = null,
}) {
    const [addScheduleOpen, setAddScheduleOpen] = useState(false);
    const [activeView, setActiveView] = useState('board');
    const { flash } = usePage().props;

    return (
        <WorkforceLayout
            title="Schedule"
            subtitle="Manage worker schedules, shifts, assignments, and change requests."
            activeHref="workforce.schedule"
            compact
            toolbar={(
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => setAddScheduleOpen(true)}
                        disabled={!availability.available}
                        className="inline-flex items-center gap-2 rounded-xl bg-lx-blue px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Plus className="h-4 w-4" />
                        Add Schedule
                    </button>
                </div>
            )}
        >
            {flash?.toast && (
                <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                    {flash.toast}
                </p>
            )}

            {!availability.available && (
                <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                    {availability.message}
                </p>
            )}

            <nav
                className="mb-4 flex gap-5 overflow-x-auto border-b border-slate-200 bg-white px-4"
                aria-label="Schedule views"
            >
                {SCHEDULE_VIEWS.map((view) => {
                    const isActive = activeView === view.id;

                    return (
                        <button
                            key={view.id}
                            type="button"
                            onClick={() => setActiveView(view.id)}
                            aria-current={isActive ? 'page' : undefined}
                            className={`shrink-0 border-b-2 px-1 py-3 text-sm font-bold transition ${
                                isActive
                                    ? 'border-lx-blue text-lx-blue'
                                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                            }`}
                        >
                            {view.label}
                        </button>
                    );
                })}
            </nav>

            {activeView === 'board' && (
                <SchedulingDashboardEmbed
                    lastUpdated={lastUpdated}
                    showAddAction={false}
                />
            )}

            {activeView === 'list' && (
                <ScheduleListView schedules={schedules} />
            )}

            {activeView === 'calendar' && (
                <ScheduleCalendarView schedules={schedules} />
            )}

            {activeView === 'change-requests' && (
                <ChangeRequestsView
                    requests={changeRequests}
                    campDashboardUrl={campDashboardUrl}
                />
            )}

            <AddScheduleModal
                open={addScheduleOpen}
                options={scheduleOptions}
                onClose={() => setAddScheduleOpen(false)}
            />
        </WorkforceLayout>
    );
}
