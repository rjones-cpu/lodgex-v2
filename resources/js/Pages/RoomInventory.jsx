import AppLayout from '../Layouts/AppLayout';
import { AppPageBody, AppPageShell } from '../Components/AppPageShell';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Building2,
    MapPin,
    Crown,
    Users,
    RadioTower,
    Plus,
    RotateCcw,
    ShieldCheck,
    ClipboardList,
    Calculator,
    Search,
    Pencil,
    Trash2,
    Ban,
    ListChecks,
    RotateCw,
    X,
} from 'lucide-react';

/**
 * Room Inventory — redesigned UI (per provided mockup) wired to the real
 * Inertia/Laravel backend.
 *
 * Notes on integration choices:
 *   - Uses the shared AppLayout/AppSidebar (the mockup's standalone sidebar is
 *     intentionally dropped — lodgex-v2 has a global sidebar already).
 *   - Out-of-service form + list are preserved from the prior page and
 *     restyled to match the new look (the mockup omitted them).
 *   - Backend field names (snake_case) are used directly in forms.
 */

const LOCATION_TYPE_LABELS = {
    dorm: 'Dorm',
    floor: 'Floor',
    wellsite: 'Wellsite',
};

const REASON_LABELS = {
    maintenance: 'Maintenance',
    storage: 'Storage',
    medic_room: 'Medic room',
    other: 'Other',
};

const CATEGORY_LABELS = {
    executive: 'Executive',
    senior_executive: 'Senior Executive',
    wellsite: 'Wellsite',
};

function formatNumber(value) {
    return Number(value || 0).toLocaleString();
}

function categoryForRoomNumber(roomNumber, exec, senior) {
    if (roomNumber <= exec) return 'executive';
    if (roomNumber <= exec + senior) return 'senior_executive';
    return 'wellsite';
}

function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

const blankLocationForm = {
    name: '',
    location_type: 'dorm',
    total_rooms: '',
    rooms_executive: '',
    rooms_senior_executive: '',
    rooms_wellsite: '',
};

export default function RoomInventory({
    locations = [],
    outOfService = [],
    stats = {},
    locationTypes = [],
    reasons = [],
    roomCategories = [],
}) {
    const { flash: sessionFlash, errors: pageErrors = {} } = usePage().props;

    const [toast, setToast] = useState('');
    const [search, setSearch] = useState('');
    const [editingLocation, setEditingLocation] = useState(null);
    const toastTimer = useRef(null);

    function flashToast(message) {
        setToast(message);
        if (toastTimer.current) window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(''), 2400);
    }

    useEffect(() => {
        if (sessionFlash?.toast) flashToast(sessionFlash.toast);
    }, [sessionFlash?.toast]);

    useEffect(() => () => toastTimer.current && window.clearTimeout(toastTimer.current), []);

    const totals = useMemo(
        () =>
            locations.reduce(
                (acc, loc) => {
                    acc.totalRooms += Number(loc.total_rooms || 0);
                    acc.executive += Number(loc.rooms_executive || 0);
                    acc.seniorExecutive += Number(loc.rooms_senior_executive || 0);
                    acc.wellsite += Number(loc.rooms_wellsite || 0);
                    return acc;
                },
                { totalRooms: 0, executive: 0, seniorExecutive: 0, wellsite: 0 },
            ),
        [locations],
    );

    const filteredLocations = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return locations;
        return locations.filter(
            (loc) =>
                String(loc.name).toLowerCase().includes(q) ||
                String(LOCATION_TYPE_LABELS[loc.location_type] || loc.location_type)
                    .toLowerCase()
                    .includes(q),
        );
    }, [locations, search]);

    return (
        <>
            <Head title="Room Inventory" />

            <AppLayout activeHref="room-inventory">
                <AppPageShell>
                    <AppPageBody className="p-0">
                        {/* Hero */}
                        <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-white via-blue-50/40 to-white">
                            <div className="pointer-events-none absolute right-8 top-6 hidden opacity-80 xl:block">
                                <div className="h-20 w-64 rounded-full bg-blue-100 blur-2xl" />
                            </div>

                            <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
                                <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
                                    <div>
                                        <h1 className="text-4xl font-black tracking-tight text-slate-950">
                                            Room Inventory
                                        </h1>
                                        <p className="mt-2 text-base text-slate-600">
                                            Build dorms, floors, and wellsites for your reservation system.
                                        </p>
                                    </div>

                                    <div className="hidden rounded-3xl bg-blue-600/10 px-6 py-4 text-blue-900 xl:block">
                                        <p className="text-sm font-bold">Inventory Setup</p>
                                        <p className="text-sm text-blue-800/70">
                                            Create room structure before reservation use.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                                    <SummaryCard
                                        title="Total Rooms"
                                        value={formatNumber(totals.totalRooms)}
                                        subtitle="In inventory"
                                        icon={Building2}
                                        accent="bg-indigo-50 text-indigo-700"
                                    />
                                    <SummaryCard
                                        title="Total Locations"
                                        value={formatNumber(locations.length)}
                                        subtitle="Locations built"
                                        icon={MapPin}
                                        accent="bg-cyan-50 text-cyan-700"
                                    />
                                    <SummaryCard
                                        title="Executive"
                                        value={formatNumber(totals.executive)}
                                        subtitle="Rooms"
                                        icon={Crown}
                                        accent="bg-amber-50 text-amber-600"
                                    />
                                    <SummaryCard
                                        title="Senior Executive"
                                        value={formatNumber(totals.seniorExecutive)}
                                        subtitle="Rooms"
                                        icon={Users}
                                        accent="bg-violet-50 text-violet-700"
                                    />
                                    <SummaryCard
                                        title="Wellsites"
                                        value={formatNumber(totals.wellsite)}
                                        subtitle="Rooms"
                                        icon={RadioTower}
                                        accent="bg-emerald-50 text-emerald-700"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
                            {Object.keys(pageErrors).length > 0 && (
                                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    <ul className="list-inside list-disc">
                                        {Object.values(pageErrors).map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
                                <BuildLocationSection locationTypes={locationTypes} />
                                <InventoryRules />
                            </div>

                            <CurrentInventory
                                locations={filteredLocations}
                                search={search}
                                setSearch={setSearch}
                                onEdit={setEditingLocation}
                            />

                            <OutOfServicePanels
                                locations={locations}
                                outOfService={outOfService}
                                reasons={reasons}
                                roomCategories={roomCategories}
                                totalOutOfService={stats.total_out_of_service}
                            />
                        </div>
                    </AppPageBody>
                </AppPageShell>
            </AppLayout>

            {editingLocation && (
                <EditLocationModal
                    location={editingLocation}
                    locationTypes={locationTypes}
                    onClose={() => setEditingLocation(null)}
                />
            )}

            {toast && (
                <div className="fixed bottom-6 right-6 z-[2000] rounded-xl bg-blue-700 px-[18px] py-3.5 font-extrabold text-white shadow-xl">
                    {toast}
                </div>
            )}
        </>
    );
}

function SummaryCard({ title, value, subtitle, icon: Icon, accent }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center gap-4">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${accent}`}>
                    <Icon className="h-7 w-7" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-slate-500">{title}</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
                    <p className="text-sm text-slate-500">{subtitle}</p>
                </div>
            </div>
        </div>
    );
}

function InventoryRules() {
    const rules = [
        {
            icon: ClipboardList,
            title: 'Build locations first.',
            description: 'Create dorms, floors, or wellsites before adding them to reservations.',
        },
        {
            icon: Calculator,
            title: 'Room totals must match.',
            description: "Room type counts should equal the location's total room count.",
        },
        {
            icon: Building2,
            title: 'Use Dorm for buildings.',
            description: 'Standard camp buildings should be added as Dorm locations.',
        },
        {
            icon: RadioTower,
            title: 'Use Wellsite for remote rooms.',
            description: 'Remote accommodations should be added as Wellsite locations.',
        },
    ];

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-950">Inventory Rules</h2>
                    <p className="text-sm text-slate-500">Room-building guidance</p>
                </div>
            </div>

            <div className="space-y-5">
                {rules.map((rule) => {
                    const Icon = rule.icon;
                    return (
                        <div key={rule.title} className="flex gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">{rule.title}</p>
                                <p className="mt-1 text-sm leading-5 text-slate-500">{rule.description}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function BuildLocationSection({ locationTypes }) {
    const form = useForm(blankLocationForm);

    const counts = locationCounts(form.data);

    function submit() {
        if (counts.isIncomplete) return;
        form.post(route('room-inventory.locations.store'), {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    }

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
                    <Plus className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-950">Build New Location</h2>
                    <p className="text-sm text-slate-500">
                        Create a dorm, floor, or wellsite and define its room structure.
                    </p>
                </div>
            </div>

            <LocationFormFields data={form.data} setData={form.setData} locationTypes={locationTypes} counts={counts} />

            <div className="mt-6 flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={submit}
                    disabled={counts.isIncomplete || form.processing}
                    className="inline-flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                    <Plus className="h-4 w-4" />
                    Add Location
                </button>

                <button
                    type="button"
                    onClick={() => form.reset()}
                    className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                </button>
            </div>
        </section>
    );
}

/**
 * Shared name/type/total + room-type breakdown fields used by both the
 * "Build New Location" section and the edit modal.
 */
function LocationFormFields({ data, setData, locationTypes, counts }) {
    return (
        <>
            <div className="grid gap-5 md:grid-cols-3">
                <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">Location Name</label>
                    <input
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder="e.g., North Dorm 2"
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                </div>

                <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">Location Type</label>
                    <select
                        value={data.location_type}
                        onChange={(e) => setData('location_type', e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                        {locationTypes.map((t) => (
                            <option key={t} value={t}>
                                {LOCATION_TYPE_LABELS[t] || t}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">Total Rooms</label>
                    <input
                        type="number"
                        min="0"
                        value={data.total_rooms}
                        onChange={(e) => setData('total_rooms', e.target.value)}
                        placeholder="0"
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                </div>
            </div>

            <div className="my-6 h-px bg-slate-200" />

            <div>
                <div className="mb-4">
                    <h3 className="text-base font-black text-slate-950">Room Type Breakdown</h3>
                    <p className="mt-1 text-sm text-slate-500">
                        Enter the number of rooms by type. The room type total must equal the location total.
                    </p>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                    <BreakdownInput
                        label="Executive"
                        icon={Crown}
                        iconClass="bg-amber-50 text-amber-600"
                        value={data.rooms_executive}
                        onChange={(v) => setData('rooms_executive', v)}
                    />
                    <BreakdownInput
                        label="Senior Executive"
                        icon={Users}
                        iconClass="bg-violet-50 text-violet-700"
                        value={data.rooms_senior_executive}
                        onChange={(v) => setData('rooms_senior_executive', v)}
                    />
                    <BreakdownInput
                        label="Wellsite"
                        icon={RadioTower}
                        iconClass="bg-emerald-50 text-emerald-700"
                        value={data.rooms_wellsite}
                        onChange={(v) => setData('rooms_wellsite', v)}
                    />
                </div>

                <div
                    className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                        counts.isOverTotal
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : counts.isMatched
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-blue-200 bg-blue-50 text-blue-700'
                    }`}
                >
                    <span className="font-bold">Room count:</span> {counts.typed} / {counts.total || 0}
                    {counts.isOverTotal
                        ? ' — room type total exceeds total rooms.'
                        : counts.isMatched
                          ? ' — ready to save.'
                          : ' — room type total must equal total rooms.'}
                </div>
            </div>
        </>
    );
}

function BreakdownInput({ label, icon: Icon, iconClass, value, onChange }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-bold text-slate-600">{label}</label>
            <div className="flex h-12 overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
                <div className={`flex w-12 items-center justify-center border-r border-slate-200 ${iconClass}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <input
                    type="number"
                    min="0"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="0"
                    className="w-full px-4 text-sm outline-none"
                />
            </div>
        </div>
    );
}

function CurrentInventory({ locations, search, setSearch, onEdit }) {
    function destroy(loc) {
        if (!window.confirm(`Remove "${loc.name}"?`)) return;
        router.delete(route('room-inventory.locations.destroy', loc.id), { preserveScroll: true });
    }

    return (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-950">Current Inventory</h2>
                        <p className="text-sm text-slate-500">All locations and their room type breakdown.</p>
                    </div>
                </div>

                <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search locations..."
                        className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 md:w-80"
                    />
                </div>
            </div>

            <div className="overflow-x-auto p-4">
                <table className="w-full min-w-[860px] border-separate border-spacing-0">
                    <thead>
                        <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-500">
                            <th className="rounded-l-xl bg-slate-50 px-4 py-3">Name</th>
                            <th className="bg-slate-50 px-4 py-3">Type</th>
                            <th className="bg-slate-50 px-4 py-3 text-center">Total Rooms</th>
                            <th className="bg-slate-50 px-4 py-3 text-center">Executive</th>
                            <th className="bg-slate-50 px-4 py-3 text-center">Sr. Executive</th>
                            <th className="bg-slate-50 px-4 py-3 text-center">Wellsite</th>
                            <th className="rounded-r-xl bg-slate-50 px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {locations.map((loc) => (
                            <tr key={loc.id} className="group">
                                <td className="border-b border-slate-100 px-4 py-4 font-bold text-slate-900">
                                    {loc.name}
                                </td>
                                <td className="border-b border-slate-100 px-4 py-4">
                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                        {LOCATION_TYPE_LABELS[loc.location_type] || loc.location_type}
                                    </span>
                                </td>
                                <td className="border-b border-slate-100 px-4 py-4 text-center font-semibold">
                                    {formatNumber(loc.total_rooms)}
                                </td>
                                <td className="border-b border-slate-100 px-4 py-4 text-center">
                                    {formatNumber(loc.rooms_executive)}
                                </td>
                                <td className="border-b border-slate-100 px-4 py-4 text-center">
                                    {formatNumber(loc.rooms_senior_executive)}
                                </td>
                                <td className="border-b border-slate-100 px-4 py-4 text-center">
                                    {formatNumber(loc.rooms_wellsite)}
                                </td>
                                <td className="border-b border-slate-100 px-4 py-4">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onEdit(loc)}
                                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
                                        >
                                            <Pencil className="h-4 w-4" />
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => destroy(loc)}
                                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {locations.length === 0 && (
                            <tr>
                                <td colSpan="7" className="px-4 py-12 text-center text-sm text-slate-500">
                                    No locations found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function EditLocationModal({ location, locationTypes, onClose }) {
    const form = useForm({
        name: location.name ?? '',
        location_type: location.location_type ?? 'dorm',
        total_rooms: String(location.total_rooms ?? ''),
        rooms_executive: String(location.rooms_executive ?? ''),
        rooms_senior_executive: String(location.rooms_senior_executive ?? ''),
        rooms_wellsite: String(location.rooms_wellsite ?? ''),
    });

    const counts = locationCounts(form.data);

    function submit() {
        if (counts.isIncomplete) return;
        form.put(route('room-inventory.locations.update', location.id), {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    }

    return (
        <div className="fixed inset-0 z-[1500] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8">
            <div className="my-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
                            <Pencil className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-950">Edit Location</h2>
                            <p className="text-sm text-slate-500">Update room structure for {location.name}.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <LocationFormFields data={form.data} setData={form.setData} locationTypes={locationTypes} counts={counts} />

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={counts.isIncomplete || form.processing}
                        className="inline-flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

function OutOfServicePanels({ locations, outOfService, reasons, roomCategories, totalOutOfService }) {
    return (
        <div className="mt-6 grid gap-6 xl:grid-cols-[420px_1fr]">
            <OutOfServiceForm
                locations={locations}
                outOfService={outOfService}
                reasons={reasons}
                roomCategories={roomCategories}
            />
            <OutOfServiceList outOfService={outOfService} totalOutOfService={totalOutOfService} />
        </div>
    );
}

function OutOfServiceForm({ locations, outOfService, reasons, roomCategories }) {
    const form = useForm({
        room_inventory_location_id: '',
        room_identifier: '',
        room_category: roomCategories[0] || 'executive',
        reason: reasons[0] || 'maintenance',
        other_note: '',
    });

    const selectedLocation = useMemo(
        () => locations.find((l) => String(l.id) === String(form.data.room_inventory_location_id)) || null,
        [locations, form.data.room_inventory_location_id],
    );

    const blockedRoomNumbers = useMemo(() => {
        if (!selectedLocation) return new Set();
        return new Set(
            outOfService
                .filter((r) => r.location_id === selectedLocation.id)
                .map((r) => String(r.room_identifier).trim()),
        );
    }, [outOfService, selectedLocation]);

    const availableRoomNumbers = useMemo(() => {
        if (!selectedLocation) return [];
        const out = [];
        for (let i = 1; i <= Number(selectedLocation.total_rooms || 0); i++) {
            if (!blockedRoomNumbers.has(String(i))) out.push(i);
        }
        return out;
    }, [selectedLocation, blockedRoomNumbers]);

    useEffect(() => {
        if (!selectedLocation) return;
        const num = Number(form.data.room_identifier);
        if (!num) return;
        const exec = Number(selectedLocation.rooms_executive || 0);
        const senior = Number(selectedLocation.rooms_senior_executive || 0);
        const next = categoryForRoomNumber(num, exec, senior);
        if (next !== form.data.room_category) form.setData('room_category', next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedLocation, form.data.room_identifier]);

    useEffect(() => {
        if (form.data.room_identifier) form.setData('room_identifier', '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.data.room_inventory_location_id]);

    function submit() {
        form.post(route('room-inventory.oos.store'), {
            preserveScroll: true,
            onSuccess: () => form.reset('room_identifier', 'other_note'),
        });
    }

    const showOtherNote = form.data.reason === 'other';
    const fieldClass =
        'h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <Ban className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-950">Mark Room Out of Service</h2>
                    <p className="text-sm text-slate-500">Out-of-service rooms are not available for assignment.</p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">Location</label>
                    <select
                        value={form.data.room_inventory_location_id}
                        onChange={(e) => form.setData('room_inventory_location_id', e.target.value)}
                        className={fieldClass}
                    >
                        <option value="">Select location</option>
                        {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                                {loc.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">Room</label>
                    <select
                        value={form.data.room_identifier}
                        onChange={(e) => form.setData('room_identifier', e.target.value)}
                        disabled={!selectedLocation || availableRoomNumbers.length === 0}
                        className={fieldClass}
                    >
                        <option value="">
                            {!selectedLocation
                                ? 'Select location first'
                                : availableRoomNumbers.length === 0
                                  ? 'No rooms available at this location'
                                  : 'Select room number'}
                        </option>
                        {availableRoomNumbers.map((n) => (
                            <option key={n} value={n}>
                                {n}
                            </option>
                        ))}
                    </select>
                    {selectedLocation && (
                        <p className="mt-1.5 text-xs text-slate-500">
                            Showing 1–{selectedLocation.total_rooms} for {selectedLocation.name}
                            {blockedRoomNumbers.size > 0
                                ? ` (${blockedRoomNumbers.size} already out of service hidden)`
                                : ''}
                            .
                        </p>
                    )}
                </div>

                <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">Room Category</label>
                    <select
                        value={form.data.room_category}
                        onChange={(e) => form.setData('room_category', e.target.value)}
                        className={fieldClass}
                    >
                        {roomCategories.map((c) => (
                            <option key={c} value={c}>
                                {CATEGORY_LABELS[c] || c}
                            </option>
                        ))}
                    </select>
                    <p className="mt-1.5 text-xs text-slate-500">
                        Set automatically from location + room number (Exec, then Senior Exec, then Wellsite).
                    </p>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">Reason</label>
                    <select
                        value={form.data.reason}
                        onChange={(e) => form.setData('reason', e.target.value)}
                        className={fieldClass}
                    >
                        {reasons.map((r) => (
                            <option key={r} value={r}>
                                {REASON_LABELS[r] || r}
                            </option>
                        ))}
                    </select>
                </div>

                {showOtherNote && (
                    <div>
                        <label className="mb-2 block text-sm font-bold text-slate-600">
                            Explain <span className="text-red-600">*</span>
                        </label>
                        <textarea
                            value={form.data.other_note}
                            onChange={(e) => form.setData('other_note', e.target.value)}
                            rows={2}
                            placeholder="Describe the reason for taking this room out of service."
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        />
                    </div>
                )}

                <button
                    type="button"
                    onClick={submit}
                    disabled={form.processing || !form.data.room_identifier}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-bold text-amber-950 shadow-lg shadow-amber-500/25 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                    <Ban className="h-4 w-4" />
                    Add to Out-of-Service List
                </button>
            </div>
        </section>
    );
}

function OutOfServiceList({ outOfService, totalOutOfService }) {
    function returnToService(id) {
        if (!window.confirm('Return this room to service?')) return;
        router.post(route('room-inventory.oos.return', id), {}, { preserveScroll: true });
    }

    const count = totalOutOfService ?? outOfService.length;

    return (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-6">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <ListChecks className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-950">Rooms Out of Service</h2>
                        <p className="text-sm text-slate-500">Active holds across all locations.</p>
                    </div>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-black text-amber-700">
                    {formatNumber(count)}
                </span>
            </div>

            <div className="overflow-x-auto p-4">
                <table className="w-full min-w-[720px] border-separate border-spacing-0">
                    <thead>
                        <tr className="text-left text-xs font-black uppercase tracking-wide text-slate-500">
                            <th className="rounded-l-xl bg-slate-50 px-4 py-3">Room</th>
                            <th className="bg-slate-50 px-4 py-3">Category</th>
                            <th className="bg-slate-50 px-4 py-3">Location</th>
                            <th className="bg-slate-50 px-4 py-3">Reason</th>
                            <th className="bg-slate-50 px-4 py-3">Since</th>
                            <th className="rounded-r-xl bg-slate-50 px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {outOfService.map((row) => (
                            <tr key={row.id}>
                                <td className="border-b border-slate-100 px-4 py-4 font-bold text-slate-900">
                                    {row.room_identifier}
                                </td>
                                <td className="border-b border-slate-100 px-4 py-4">
                                    {CATEGORY_LABELS[row.room_category] || row.room_category}
                                </td>
                                <td className="border-b border-slate-100 px-4 py-4 text-slate-600">
                                    {row.location_name || '—'}
                                </td>
                                <td className="border-b border-slate-100 px-4 py-4">
                                    <div className="font-semibold text-slate-700">
                                        {REASON_LABELS[row.reason] || row.reason}
                                    </div>
                                    {row.reason === 'other' && row.other_note && (
                                        <div className="mt-0.5 text-xs text-slate-500">{row.other_note}</div>
                                    )}
                                </td>
                                <td className="border-b border-slate-100 px-4 py-4 text-xs text-slate-500">
                                    {formatDateTime(row.created_at)}
                                </td>
                                <td className="border-b border-slate-100 px-4 py-4">
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => returnToService(row.id)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                                        >
                                            <RotateCw className="h-4 w-4" />
                                            Return
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {outOfService.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-4 py-12 text-center text-sm text-slate-500">
                                    No rooms are out of service.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

/**
 * Shared validation for the location forms: typed total must equal the
 * location total (matches the redesign's UX) and not exceed it.
 */
function locationCounts(data) {
    const typed =
        Number(data.rooms_executive || 0) +
        Number(data.rooms_senior_executive || 0) +
        Number(data.rooms_wellsite || 0);
    const total = Number(data.total_rooms || 0);
    const isOverTotal = typed > total;
    const isMatched = total > 0 && typed === total;
    const isIncomplete = !data.name || !data.location_type || total <= 0 || typed !== total;

    return { typed, total, isOverTotal, isMatched, isIncomplete };
}
