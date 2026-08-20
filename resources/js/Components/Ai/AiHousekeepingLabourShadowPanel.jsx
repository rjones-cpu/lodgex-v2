import { router } from '@inertiajs/react';

function LimitChip({ label, used, limit, over }) {
    return (
        <span
            className={`rounded-lg px-2 py-1 text-[11px] font-black uppercase ${
                over ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
            }`}
        >
            {label} {used}/{limit}
        </span>
    );
}

function ProposalList({ proposals = [] }) {
    if (!proposals.length) {
        return (
            <p className="text-xs font-semibold text-slate-500">
                No pending labelled drafts. Refresh drafts below. Approve acknowledges only — it does not publish a board.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {proposals.map((rec) => (
                <div key={rec.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap justify-between gap-2">
                        <strong className="min-w-0 text-sm text-slate-900">{rec.issue}</strong>
                        <div className="flex flex-wrap gap-2">
                            <span className="rounded-lg bg-[#eaf2ff] px-2 py-1 text-xs font-black text-blue-700">
                                {(rec.capabilityIds || [rec.capabilityId]).filter(Boolean).join(' · ')}
                            </span>
                            {rec.action ? (
                                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
                                    {rec.action}
                                </span>
                            ) : null}
                            <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-black capitalize text-amber-700">
                                {rec.risk}
                            </span>
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">{rec.recommendation}</p>
                    {rec.explanation ? <p className="mt-1 text-xs text-slate-500">{rec.explanation}</p> : null}
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">Data used: {rec.dataUsed}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => router.post(route('ai.proposals.approve', rec.id), {}, { preserveScroll: true })}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-black text-white"
                        >
                            Approve
                        </button>
                        <button
                            type="button"
                            onClick={() => router.post(route('ai.proposals.dismiss', rec.id), {}, { preserveScroll: true })}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function AiHousekeepingLabourShadowPanel({
    workload = {},
    labour = {},
}) {
    const workloadFlags = workload.flags || {};
    const labourFlags = labour.flags || {};
    const draft = workload.draft;
    const forecast = labour.forecast;
    const limits = draft?.versusLimits || {};
    const pools = forecast?.pools || {};
    const windows = forecast?.windows || [];
    const horizons = forecast?.horizons || [];

    return (
        <section className="mb-[18px] rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50 via-white to-indigo-50 p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-wide text-teal-700">
                        LodgeX AI · {workloadFlags.mode || 'shadow'} · class P · SL-04 · SL-11
                    </p>
                    <h3 className="text-base font-black text-slate-900">Housekeeping Workload + Labour Forecast</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-600">
                        Shadow drafts only. People approve. This is not a published assignment board. Auto-publish is OFF.
                        Overtime stays Lodge Manager only.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => router.post(route('housekeeping-planning.ai.draft-workload'), {}, { preserveScroll: true })}
                        className="rounded-lg bg-teal-700 px-3 py-1.5 text-[11px] font-black uppercase text-white"
                    >
                        Refresh workload draft
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            router.post(route('housekeeping-planning.ai.draft-labour-forecast'), {}, { preserveScroll: true })
                        }
                        className="rounded-lg border border-teal-700 px-3 py-1.5 text-[11px] font-black uppercase text-teal-800"
                    >
                        Refresh labour forecast
                    </button>
                </div>
            </div>

            {draft ? (
                <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[11px] font-black uppercase text-slate-500">
                        SL-04 draft clean list · {draft.workDate} · profile {draft.ruleProfile?.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                        Limits from {draft.limitsSource} (baseline examples 29 / 10 COs / 36 pts / 11 h are not the only truth).
                        Forecast {draft.forecastCount} · executable {draft.executableCount} · blocked {draft.blockedCount}.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <LimitChip label="Rooms" used={limits.rooms?.used} limit={limits.rooms?.limit} over={limits.rooms?.over} />
                        <LimitChip
                            label="COs"
                            used={limits.check_outs?.used}
                            limit={limits.check_outs?.limit}
                            over={limits.check_outs?.over}
                        />
                        <LimitChip label="Pts" used={limits.points?.used} limit={limits.points?.limit} over={limits.points?.over} />
                        <LimitChip label="Hours" used={limits.hours?.used} limit={limits.hours?.limit} over={limits.hours?.over} />
                    </div>
                    {(draft.blockedExecutable || []).slice(0, 5).map((row) => (
                        <p key={`${row.room_id}-blocked`} className="mt-1 text-[11px] text-amber-700">
                            {row.room_number}: {row.blocked_reason}
                        </p>
                    ))}
                </div>
            ) : (
                <p className="mb-4 text-xs font-semibold text-slate-500">Housekeeping Workload is off or has no draft yet.</p>
            )}

            {forecast ? (
                <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[11px] font-black uppercase text-slate-500">
                        SL-11 labour forecast · required {forecast.requiredWorkers} vs available {forecast.availableWorkers} ·{' '}
                        {forecast.shortage > 0 ? `shortage ${forecast.shortage}` : `surplus ${forecast.surplus}`} · risk{' '}
                        {forecast.readinessRisk}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                        Binding constraint: {forecast.bindingConstraint || 'n/a'}. Daily average is not enough. Check-Out-to-Ready-Time
                        windows below. Pools stay separate.
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                        {horizons.map((h) => (
                            <div key={h.horizon} className="rounded-lg bg-slate-50 p-2">
                                <p className="text-[10px] font-black uppercase text-slate-500">{h.horizon}</p>
                                <p className="text-sm font-black text-slate-900">{h.peakRequired}</p>
                                <p className="text-[10px] text-slate-500">peak {h.peakDate}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {windows.map((w) => (
                            <span key={w.label} className="rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700">
                                {w.label} {w.from}–{w.to}: {w.required_workers} ({w.binding_constraint})
                            </span>
                        ))}
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-5">
                        {Object.entries(pools).map(([name, pool]) => (
                            <div key={name} className="rounded-lg border border-slate-100 p-2">
                                <p className="text-[10px] font-black uppercase text-slate-500">{name.replace('_', ' ')}</p>
                                <p className="text-xs font-bold text-slate-800">
                                    {pool.required}/{pool.available}
                                    {pool.shortage > 0 ? ` · short ${pool.shortage}` : ''}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <p className="mb-4 text-xs font-semibold text-slate-500">Labour Forecast is off or has no draft yet.</p>
            )}

            <ProposalList proposals={[...(workload.proposals || []), ...(labour.proposals || [])]} />
        </section>
    );
}
