import { Head, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { AppPageBody, AppPageHeader, AppPageShell } from '../Components/AppPageShell';
import AppLayout from '../Layouts/AppLayout';

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

const WEEKDAYS = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
];

function YesNoToggle({ value, onChange, yesLabel = 'Yes', noLabel = 'No' }) {
    return (
        <div className="inline-flex overflow-hidden rounded-[10px] border border-lx-border">
            <button
                type="button"
                onClick={() => onChange(true)}
                className={`cursor-pointer px-5 py-2.5 text-sm font-black transition ${
                    value ? 'bg-green-600 text-white' : 'bg-white text-lx-ink hover:bg-[#f6faff]'
                }`}
            >
                {yesLabel}
            </button>
            <button
                type="button"
                onClick={() => onChange(false)}
                className={`cursor-pointer border-l border-lx-border px-5 py-2.5 text-sm font-black transition ${
                    !value ? 'bg-red-600 text-white' : 'bg-white text-lx-ink hover:bg-[#f6faff]'
                }`}
            >
                {noLabel}
            </button>
        </div>
    );
}

function PolicySection({ icon, title, description, children }) {
    return (
        <section className="overflow-hidden rounded-[24px] border border-lx-border bg-white shadow-lx-card">
            <div className="border-b border-lx-border px-6 py-5">
                <div className="flex items-center gap-2">
                    <span aria-hidden className="text-lg">
                        {icon}
                    </span>
                    <h2 className="text-lg font-black text-lx-navy">{title}</h2>
                </div>
                {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
            </div>
            <div className="space-y-6 px-6 py-6">{children}</div>
        </section>
    );
}

function FieldLabel({ htmlFor, children }) {
    return (
        <label
            htmlFor={htmlFor}
            className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500"
        >
            {children}
        </label>
    );
}

function OnHoldExemptDorms({ options = [], selected = [], onChange, disabled = false }) {
    function toggle(dorm) {
        if (selected.includes(dorm)) {
            onChange(selected.filter((d) => d !== dorm));
            return;
        }
        onChange([...selected, dorm]);
    }

    return (
        <div className={disabled ? 'pointer-events-none opacity-40' : ''}>
            <FieldLabel>Exempt dorms</FieldLabel>
            <p className="mb-2 text-sm text-slate-500">
                Guests assigned to these dorms bypass on-hold limits and restrictions.
            </p>
            <div className="max-h-[220px] overflow-y-auto rounded-[10px] border border-lx-border bg-white">
                {options.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">No dorms found in room inventory.</p>
                ) : (
                    options.map((dorm) => {
                        const isBypassing = selected.includes(dorm);

                        return (
                            <label
                                key={dorm}
                                className={`flex cursor-pointer items-center gap-3 border-b px-4 py-3 last:border-0 ${
                                    isBypassing
                                        ? 'border-green-200 bg-green-50 hover:bg-green-100'
                                        : 'border-lx-border hover:bg-[#f6faff]'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={isBypassing}
                                    onChange={() => toggle(dorm)}
                                    className="h-4 w-4 rounded border-lx-border text-green-600"
                                />
                                <div className="min-w-0 flex-1">
                                    <span
                                        className={`text-sm font-bold ${
                                            isBypassing ? 'text-green-800' : 'text-lx-ink'
                                        }`}
                                    >
                                        {dorm}
                                    </span>
                                    {isBypassing ? (
                                        <p className="mt-0.5 text-xs font-semibold text-green-700">
                                            Dorm is bypassing on-hold policy
                                        </p>
                                    ) : null}
                                </div>
                            </label>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function OnHoldExemptGuests({ guests = [], onChange, disabled = false }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef(null);

    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            setResults([]);
            setSearching(false);
            return undefined;
        }

        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const url = `${route('policies.guest-search')}?${new URLSearchParams({ q: trimmed })}`;
                const response = await fetch(url, {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'same-origin',
                });
                if (!response.ok) {
                    setResults([]);
                    return;
                }
                const payload = await response.json();
                setResults(Array.isArray(payload.results) ? payload.results : []);
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => clearTimeout(debounceRef.current);
    }, [query]);

    function addGuest(name) {
        const normalized = String(name || '').trim();
        if (!normalized) return;
        const exists = guests.some((guest) => guest.toLowerCase() === normalized.toLowerCase());
        if (exists) return;
        onChange([...guests, normalized]);
        setQuery('');
        setResults([]);
    }

    function removeGuest(name) {
        onChange(guests.filter((guest) => guest !== name));
    }

    const visibleResults = results.filter(
        (row) => !guests.some((guest) => guest.toLowerCase() === row.name.toLowerCase()),
    );

    return (
        <div className={disabled ? 'pointer-events-none opacity-40' : ''}>
            <FieldLabel htmlFor="on-hold-exempt-guest-search">Exempt guests</FieldLabel>
            <p className="mb-2 text-sm text-slate-500">
                Search reservations and schedule feed names. Exempt guests bypass on-hold limits
                and restrictions.
            </p>
            <div className="relative max-w-md">
                <input
                    id="on-hold-exempt-guest-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search guest name (min. 2 characters)..."
                    className="h-[46px] w-full rounded-[10px] border border-lx-border px-3 text-sm font-bold text-lx-ink"
                />
                {query.trim().length >= 2 ? (
                    <div className="absolute z-10 mt-1 max-h-[220px] w-full overflow-y-auto rounded-[10px] border border-lx-border bg-white shadow-lx-card">
                        {searching ? (
                            <p className="p-3 text-sm text-slate-500">Searching...</p>
                        ) : visibleResults.length === 0 ? (
                            <p className="p-3 text-sm text-slate-500">No matching guests found.</p>
                        ) : (
                            visibleResults.map((row) => (
                                <button
                                    key={`${row.name}-${row.source}`}
                                    type="button"
                                    onClick={() => addGuest(row.name)}
                                    className="flex w-full cursor-pointer items-center justify-between border-b border-lx-border px-4 py-3 text-left last:border-0 hover:bg-[#f6faff]"
                                >
                                    <span className="text-sm font-bold text-lx-ink">{row.name}</span>
                                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        {row.source === 'schedule' ? 'Schedule' : 'Reservations'}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                ) : null}
            </div>
            {guests.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                    {guests.map((guest) => (
                        <span
                            key={guest}
                            className="inline-flex items-center gap-2 rounded-full border border-lx-border bg-[#f6faff] px-3 py-1.5 text-sm font-bold text-lx-ink"
                        >
                            {guest}
                            <button
                                type="button"
                                onClick={() => removeGuest(guest)}
                                className="cursor-pointer text-slate-400 hover:text-red-600"
                                aria-label={`Remove ${guest}`}
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            ) : (
                <p className="mt-2 text-sm text-slate-400">No exempt guests selected.</p>
            )}
        </div>
    );
}

const DEFAULT_POLICY = {
    onHold: {
        enabled: true,
        maxHoldDays: 7,
        dormRestriction: '',
        exemptDorms: [],
        exemptGuests: [],
    },
    noShow: { cutoffTime: '07:00', releaseRequiresApproval: true },
    walkIn: {
        allowed: true,
        requireSupervisorApproval: true,
        allowOneNight: true,
        requireReason: true,
    },
    approval: { autoApprovalEnabled: false, sameDayRequiresApproval: true },
    extensions: {
        submissionCutoffDay: 0,
        submissionCutoffTime: '12:00',
        hotelOverflowDecisionCutoffTime: '16:00',
    },
    cancellation: { autoReleaseEnabled: true },
    forecast: { horizonDays: 14 },
};

export default function Policies({ policy = DEFAULT_POLICY, dormOptions = [], definitions = [] }) {
    const { auth, flash: sessionFlash } = usePage().props;
    const userName = auth?.user?.name || 'John Doe';
    const userInitials = getInitials(userName);

    const { data, setData, put, processing, recentlySuccessful } = useForm({
        on_hold_enabled: policy.onHold?.enabled ?? true,
        max_hold_days: policy.onHold?.maxHoldDays ?? 7,
        on_hold_dorm_restriction: policy.onHold?.dormRestriction ?? '',
        on_hold_exempt_dorms: policy.onHold?.exemptDorms ?? [],
        on_hold_exempt_guests: policy.onHold?.exemptGuests ?? [],
        no_show_cutoff_time: policy.noShow?.cutoffTime ?? '07:00',
        no_show_release_requires_approval: policy.noShow?.releaseRequiresApproval ?? true,
        walk_ins_allowed: policy.walkIn?.allowed ?? true,
        walk_ins_require_supervisor_approval: policy.walkIn?.requireSupervisorApproval ?? true,
        walk_ins_allow_one_night: policy.walkIn?.allowOneNight ?? true,
        walk_ins_require_reason: policy.walkIn?.requireReason ?? true,
        auto_approval_enabled: policy.approval?.autoApprovalEnabled ?? false,
        same_day_reservations_require_approval: policy.approval?.sameDayRequiresApproval ?? true,
        extension_submission_cutoff_day: policy.extensions?.submissionCutoffDay ?? 0,
        extension_submission_cutoff_time: policy.extensions?.submissionCutoffTime ?? '12:00',
        hotel_overflow_decision_cutoff_time:
            policy.extensions?.hotelOverflowDecisionCutoffTime ?? '16:00',
        cancellation_auto_release_enabled: policy.cancellation?.autoReleaseEnabled ?? true,
        forecast_horizon_days: policy.forecast?.horizonDays ?? 14,
    });

    const [toast, setToast] = useState('');
    const toastTimeoutRef = useRef(null);

    function flash(message) {
        if (!message) return;
        setToast(message);
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = setTimeout(() => setToast(''), 3200);
    }

    useEffect(() => {
        if (sessionFlash?.toast) flash(sessionFlash.toast);
        return () => clearTimeout(toastTimeoutRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionFlash?.toast]);

    function submit(e) {
        e.preventDefault();
        put(route('policies.update'), { preserveScroll: true });
    }

    return (
        <>
            <Head title="Policies" />

            <AppLayout activeHref="policies">
                <AppPageShell>
                    <AppPageHeader className="sticky top-0 z-20 flex h-[78px] items-center justify-between border-b border-lx-border bg-white px-6 max-[1100px]:sticky min-[1101px]:static">
                        <div>
                            <h1 className="m-0 text-[26px] tracking-[-0.5px] text-lx-navy">Policies</h1>
                            <p className="mt-0.5 text-[13px] font-semibold text-slate-500">
                                Configurable lodge rules for reservations, utilization, and AI
                                workflows.
                            </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <div className="grid h-[38px] w-[38px] place-items-center rounded-full bg-lx-blue font-black text-white">
                                {userInitials}
                            </div>
                            <div className="text-xs">
                                <strong>{userName}</strong>
                                <br />
                                <span className="text-slate-500">Scheduling Manager</span>
                            </div>
                        </div>
                    </AppPageHeader>

                    <AppPageBody>
                        <form onSubmit={submit} className="max-w-[860px] space-y-6">
                            <PolicySection
                                icon="⏸️"
                                title="On-Hold Policy"
                                description="Control whether companies may place rooms on hold, how long holds may last, and optional dorm restrictions."
                            >
                                <div>
                                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                                        Allow rooms to be placed on hold?
                                    </p>
                                    <YesNoToggle
                                        value={data.on_hold_enabled}
                                        onChange={(v) => setData('on_hold_enabled', v)}
                                    />
                                </div>
                                <div className={data.on_hold_enabled ? '' : 'pointer-events-none opacity-40'}>
                                    <FieldLabel htmlFor="max-hold-days">
                                        Maximum days a room may be on hold
                                    </FieldLabel>
                                    <div className="flex items-center gap-3">
                                        <input
                                            id="max-hold-days"
                                            type="number"
                                            min={1}
                                            max={365}
                                            value={data.max_hold_days}
                                            disabled={!data.on_hold_enabled}
                                            onChange={(e) =>
                                                setData(
                                                    'max_hold_days',
                                                    e.target.value === '' ? '' : Number(e.target.value),
                                                )
                                            }
                                            className="h-[46px] w-[140px] rounded-[10px] border border-lx-border px-3 text-sm font-bold text-lx-ink"
                                        />
                                        <span className="text-sm font-bold text-slate-500">days</span>
                                    </div>
                                </div>
                                <div className={data.on_hold_enabled ? '' : 'pointer-events-none opacity-40'}>
                                    <FieldLabel htmlFor="on-hold-dorm">
                                        Optional dorm restriction (project example)
                                    </FieldLabel>
                                    <input
                                        id="on-hold-dorm"
                                        type="text"
                                        value={data.on_hold_dorm_restriction}
                                        placeholder="e.g. B Dorm — leave blank for all dorms"
                                        onChange={(e) => setData('on_hold_dorm_restriction', e.target.value)}
                                        className="h-[46px] w-full max-w-md rounded-[10px] border border-lx-border px-3 text-sm font-bold text-lx-ink"
                                    />
                                </div>
                                <OnHoldExemptDorms
                                    options={dormOptions}
                                    selected={data.on_hold_exempt_dorms}
                                    onChange={(next) => setData('on_hold_exempt_dorms', next)}
                                    disabled={!data.on_hold_enabled}
                                />
                                <OnHoldExemptGuests
                                    guests={data.on_hold_exempt_guests}
                                    onChange={(next) => setData('on_hold_exempt_guests', next)}
                                    disabled={!data.on_hold_enabled}
                                />
                            </PolicySection>

                            <PolicySection
                                icon="🚫"
                                title="No-Show & Late Arrival"
                                description="Define when an expected arrival becomes a no-show and whether releasing the room requires approval."
                            >
                                <div>
                                    <FieldLabel htmlFor="no-show-cutoff">No-show cutoff time</FieldLabel>
                                    <input
                                        id="no-show-cutoff"
                                        type="time"
                                        value={data.no_show_cutoff_time}
                                        onChange={(e) => setData('no_show_cutoff_time', e.target.value)}
                                        className="h-[46px] rounded-[10px] border border-lx-border px-3 text-sm font-bold text-lx-ink"
                                    />
                                    <p className="mt-2 text-sm text-slate-500">
                                        Workers who fail to check in by this time on the day after
                                        arrival are classified as no-shows unless a valid delay note
                                        exists.
                                    </p>
                                </div>
                                <div>
                                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                                        Releasing a no-show room requires approval?
                                    </p>
                                    <YesNoToggle
                                        value={data.no_show_release_requires_approval}
                                        onChange={(v) =>
                                            setData('no_show_release_requires_approval', v)
                                        }
                                    />
                                </div>
                            </PolicySection>

                            <PolicySection
                                icon="🚶"
                                title="Walk-In / Exception Rules"
                                description="Walk-ins are exceptions and should follow configured approval and documentation rules."
                            >
                                <div>
                                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                                        Allow walk-ins?
                                    </p>
                                    <YesNoToggle
                                        value={data.walk_ins_allowed}
                                        onChange={(v) => setData('walk_ins_allowed', v)}
                                    />
                                </div>
                                <div className={data.walk_ins_allowed ? '' : 'pointer-events-none opacity-40'}>
                                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                                        Supervisor approval required?
                                    </p>
                                    <YesNoToggle
                                        value={data.walk_ins_require_supervisor_approval}
                                        onChange={(v) =>
                                            setData('walk_ins_require_supervisor_approval', v)
                                        }
                                    />
                                </div>
                                <div className={data.walk_ins_allowed ? '' : 'pointer-events-none opacity-40'}>
                                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                                        Allow one-night walk-in placement?
                                    </p>
                                    <YesNoToggle
                                        value={data.walk_ins_allow_one_night}
                                        onChange={(v) => setData('walk_ins_allow_one_night', v)}
                                    />
                                </div>
                                <div className={data.walk_ins_allowed ? '' : 'pointer-events-none opacity-40'}>
                                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                                        Exception reason required?
                                    </p>
                                    <YesNoToggle
                                        value={data.walk_ins_require_reason}
                                        onChange={(v) => setData('walk_ins_require_reason', v)}
                                    />
                                </div>
                            </PolicySection>

                            <PolicySection
                                icon="✅"
                                title="Approval Rules"
                                description="Control auto-approval and same-day reservation handling."
                            >
                                <div>
                                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                                        Enable auto-approval when all rules pass?
                                    </p>
                                    <YesNoToggle
                                        value={data.auto_approval_enabled}
                                        onChange={(v) => setData('auto_approval_enabled', v)}
                                    />
                                </div>
                                <div>
                                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                                        Same-day / late reservations require human approval?
                                    </p>
                                    <YesNoToggle
                                        value={data.same_day_reservations_require_approval}
                                        onChange={(v) =>
                                            setData('same_day_reservations_require_approval', v)
                                        }
                                    />
                                </div>
                            </PolicySection>

                            <PolicySection
                                icon="📅"
                                title="Extensions & Hotel Overflow Timing"
                                description="Project-configurable cutoffs for extension submissions and hotel overflow decisions."
                            >
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <FieldLabel htmlFor="extension-day">
                                            Extension submission cutoff day
                                        </FieldLabel>
                                        <select
                                            id="extension-day"
                                            value={data.extension_submission_cutoff_day}
                                            onChange={(e) =>
                                                setData(
                                                    'extension_submission_cutoff_day',
                                                    Number(e.target.value),
                                                )
                                            }
                                            className="h-[46px] w-full rounded-[10px] border border-lx-border px-3 text-sm font-bold text-lx-ink"
                                        >
                                            {WEEKDAYS.map((d) => (
                                                <option key={d.value} value={d.value}>
                                                    {d.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <FieldLabel htmlFor="extension-time">
                                            Extension submission cutoff time
                                        </FieldLabel>
                                        <input
                                            id="extension-time"
                                            type="time"
                                            value={data.extension_submission_cutoff_time}
                                            onChange={(e) =>
                                                setData('extension_submission_cutoff_time', e.target.value)
                                            }
                                            className="h-[46px] w-full rounded-[10px] border border-lx-border px-3 text-sm font-bold text-lx-ink"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <FieldLabel htmlFor="hotel-overflow-time">
                                        Hotel overflow decision cutoff time
                                    </FieldLabel>
                                    <input
                                        id="hotel-overflow-time"
                                        type="time"
                                        value={data.hotel_overflow_decision_cutoff_time}
                                        onChange={(e) =>
                                            setData(
                                                'hotel_overflow_decision_cutoff_time',
                                                e.target.value,
                                            )
                                        }
                                        className="h-[46px] rounded-[10px] border border-lx-border px-3 text-sm font-bold text-lx-ink"
                                    />
                                </div>
                            </PolicySection>

                            <PolicySection
                                icon="↩️"
                                title="Cancellation Rules"
                                description="How cancelled reservations release capacity back to the lodge."
                            >
                                <div>
                                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                                        Auto-release rooms after cancellation when safe?
                                    </p>
                                    <YesNoToggle
                                        value={data.cancellation_auto_release_enabled}
                                        onChange={(v) =>
                                            setData('cancellation_auto_release_enabled', v)
                                        }
                                    />
                                </div>
                            </PolicySection>

                            <PolicySection
                                icon="📈"
                                title="Forecast Horizon"
                                description="Operating forecast window used for schedule-based room planning."
                            >
                                <FieldLabel htmlFor="forecast-horizon">
                                    Forecast horizon (days)
                                </FieldLabel>
                                <input
                                    id="forecast-horizon"
                                    type="number"
                                    min={7}
                                    max={90}
                                    value={data.forecast_horizon_days}
                                    onChange={(e) =>
                                        setData(
                                            'forecast_horizon_days',
                                            e.target.value === '' ? '' : Number(e.target.value),
                                        )
                                    }
                                    className="h-[46px] w-[140px] rounded-[10px] border border-lx-border px-3 text-sm font-bold text-lx-ink"
                                />
                            </PolicySection>

                            {definitions.map((block) => (
                                <section
                                    key={block.title}
                                    className="rounded-[24px] border border-slate-200 bg-slate-50 px-6 py-5"
                                >
                                    <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">
                                        {block.title}
                                    </h2>
                                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                                        {block.items.map((item) => (
                                            <li key={item} className="leading-relaxed">
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ))}

                            <div className="flex items-center justify-end gap-3 rounded-[24px] border border-lx-border bg-[#fbfdff] px-6 py-4">
                                {recentlySuccessful ? (
                                    <span className="text-sm font-bold text-green-600">Saved</span>
                                ) : null}
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="cursor-pointer rounded-[10px] border-0 bg-lx-blue px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {processing ? 'Saving…' : 'Save All Policies'}
                                </button>
                            </div>
                        </form>
                    </AppPageBody>
                </AppPageShell>
            </AppLayout>

            {toast ? (
                <div className="fixed bottom-6 left-1/2 z-[4000] -translate-x-1/2 rounded-xl bg-lx-navy px-5 py-3 text-sm font-bold text-white shadow-lx-pop">
                    {toast}
                </div>
            ) : null}
        </>
    );
}
