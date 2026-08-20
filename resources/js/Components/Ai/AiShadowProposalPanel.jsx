import { router } from '@inertiajs/react';

export default function AiShadowProposalPanel({
    proposals = [],
    flags = {},
    title = 'Room Inventory Intelligence',
}) {
    const mode = flags.mode || 'shadow';
    const enabled = flags.enabled !== false;
    const capabilities = flags.capabilities?.length
        ? flags.capabilities.join(' · ')
        : 'SL-02 · SL-03';
    const pending = proposals.filter((p) => p.status === 'Pending');

    function approve(id) {
        router.post(route('ai.proposals.approve', id), {}, { preserveScroll: true });
    }

    function dismiss(id) {
        router.post(route('ai.proposals.dismiss', id), {}, { preserveScroll: true });
    }

    return (
        <section className="mb-[18px] rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-sky-50 p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-wide text-indigo-600">
                        LodgeX AI · {mode} · class P · {capabilities}
                    </p>
                    <h3 className="text-base font-black text-slate-900">{title}</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-600">
                        AI recommends. People approve. Rooms are never assigned until a person confirms.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <span className="rounded-lg bg-indigo-100 px-2 py-1 text-[11px] font-black uppercase text-indigo-700">
                        {enabled ? mode : 'off'}
                    </span>
                    <span className="rounded-lg bg-white px-2 py-1 text-[11px] font-black uppercase text-slate-500 ring-1 ring-slate-200">
                        {pending.length} pending
                    </span>
                </div>
            </div>

            {pending.length === 0 ? (
                <p className="text-xs font-semibold text-slate-500">
                    No pending room proposals or conflict flags. Use Propose room on an unassigned reservation
                    to queue a recommendation (ledger + fitness). Vacant Clean is not availability.
                </p>
            ) : (
                <div className="space-y-3">
                    {pending.map((rec) => (
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
                            {rec.explanation ? (
                                <p className="mt-1 text-xs text-slate-500">{rec.explanation}</p>
                            ) : null}
                            <p className="mt-1 text-[11px] font-semibold text-slate-400">Data used: {rec.dataUsed}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => approve(rec.id)}
                                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-black text-white"
                                >
                                    Approve
                                </button>
                                <button
                                    type="button"
                                    onClick={() => dismiss(rec.id)}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-600"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
