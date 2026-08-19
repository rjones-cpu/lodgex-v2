import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

import Modal from '../Modal';

const WEEKDAYS = [
    { id: 1, label: 'Mon' },
    { id: 2, label: 'Tue' },
    { id: 3, label: 'Wed' },
    { id: 4, label: 'Thu' },
    { id: 5, label: 'Fri' },
    { id: 6, label: 'Sat' },
    { id: 7, label: 'Sun' },
];

const inputClass =
    'w-full rounded-xl border-slate-200 text-sm font-semibold text-slate-800 shadow-sm focus:border-blue-400 focus:ring-blue-400';

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addDays(date, days) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
}

function Field({ label, error, children }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-slate-500">
                {label}
            </span>
            {children}
            {error && <span className="mt-1 block text-xs font-bold text-red-600">{error}</span>}
        </label>
    );
}

export default function AddScheduleModal({ open, options, onClose }) {
    const today = useMemo(() => new Date(), []);
    const defaults = useMemo(
        () => ({
            first_name: '',
            last_name: '',
            company_id: options.companies?.[0]?.id || '',
            province_id: options.provinces?.[0]?.id || '',
            department: options.positions?.[0]?.department || '',
            position_id: options.positions?.[0]?.id || '',
            shift_id: options.shifts?.[0]?.id || '',
            room_type_id: options.roomTypes?.[0]?.id || '',
            dorm_id: options.dorms?.[0]?.id || '',
            room_id: '',
            arrival_date: formatDate(today),
            departure_date: formatDate(addDays(today, 14)),
            project_departure_date: formatDate(addDays(today, 42)),
            workdays: [1, 2, 3, 4, 5],
            notes: '',
        }),
        [options, today],
    );
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm(defaults);
    const departments = useMemo(
        () => [...new Set((options.positions || []).map((position) => position.department))],
        [options.positions],
    );
    const positions = (options.positions || []).filter((position) => position.department === data.department);
    const [rooms, setRooms] = useState([]);
    const [roomsLoading, setRoomsLoading] = useState(false);
    const [roomsError, setRoomsError] = useState('');

    async function loadRooms(dormId) {
        if (!dormId) {
            setRooms([]);
            setData('room_id', '');
            return;
        }

        setRoomsLoading(true);
        setRoomsError('');
        setData('room_id', '');
        try {
            const { data: response } = await window.axios.get(route('workforce.schedule.rooms'), {
                params: { dorm_id: dormId },
            });
            setRooms(response?.rooms || []);
        } catch (requestError) {
            setRooms([]);
            setRoomsError(
                requestError?.response?.data?.message
                    || 'Could not load available rooms.',
            );
        } finally {
            setRoomsLoading(false);
        }
    }

    useEffect(() => {
        if (open && data.dorm_id) {
            loadRooms(data.dorm_id);
        }
    }, [open]);

    function close() {
        if (processing) return;
        clearErrors();
        onClose();
    }

    function changeDepartment(department) {
        const firstPosition = (options.positions || []).find((position) => position.department === department);
        setData((currentData) => ({
            ...currentData,
            department,
            position_id: firstPosition?.id || '',
        }));
    }

    function changeDorm(dormId) {
        setData((currentData) => ({
            ...currentData,
            dorm_id: dormId,
            room_id: '',
        }));
        loadRooms(dormId);
    }

    function toggleWorkday(day) {
        setData(
            'workdays',
            data.workdays.includes(day)
                ? data.workdays.filter((selectedDay) => selectedDay !== day)
                : [...data.workdays, day].sort(),
        );
    }

    function submit(event) {
        event.preventDefault();
        post(route('workforce.schedule.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    }

    return (
        <Modal show={open} maxWidth="5xl" closeable={!processing} onClose={close}>
            <form onSubmit={submit}>
                <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
                    <h2 className="m-0 text-xl font-black text-slate-950">Add Schedule</h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                        Create a catering worker reservation and published camp rotation.
                    </p>
                </div>

                <div className="max-h-[70vh] space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
                    {errors.schedule && (
                        <p className="m-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                            {errors.schedule}
                        </p>
                    )}

                    <section>
                        <h3 className="mb-3 text-sm font-black text-slate-900">Worker details</h3>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <Field label="First name" error={errors.first_name}>
                                <input
                                    value={data.first_name}
                                    onChange={(event) => setData('first_name', event.target.value)}
                                    className={inputClass}
                                    required
                                />
                            </Field>
                            <Field label="Last name" error={errors.last_name}>
                                <input
                                    value={data.last_name}
                                    onChange={(event) => setData('last_name', event.target.value)}
                                    className={inputClass}
                                    required
                                />
                            </Field>
                            <Field label="Company" error={errors.company_id}>
                                <select
                                    value={data.company_id}
                                    onChange={(event) => setData('company_id', event.target.value)}
                                    className={inputClass}
                                    required
                                >
                                    {(options.companies || []).map((company) => (
                                        <option key={company.id} value={company.id}>{company.name}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Province" error={errors.province_id}>
                                <select
                                    value={data.province_id}
                                    onChange={(event) => setData('province_id', event.target.value)}
                                    className={inputClass}
                                    required
                                >
                                    {(options.provinces || []).map((province) => (
                                        <option key={province.id} value={province.id}>
                                            {province.name}{province.code ? ` (${province.code})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                    </section>

                    <section>
                        <h3 className="mb-3 text-sm font-black text-slate-900">Role and accommodation</h3>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <Field label="Department" error={errors.department}>
                                <select
                                    value={data.department}
                                    onChange={(event) => changeDepartment(event.target.value)}
                                    className={inputClass}
                                    required
                                >
                                    {departments.map((department) => (
                                        <option key={department} value={department}>{department}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Position" error={errors.position_id}>
                                <select
                                    value={data.position_id}
                                    onChange={(event) => setData('position_id', event.target.value)}
                                    className={inputClass}
                                    required
                                >
                                    {positions.map((position) => (
                                        <option key={position.id} value={position.id}>{position.name}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Shift" error={errors.shift_id}>
                                <select
                                    value={data.shift_id}
                                    onChange={(event) => setData('shift_id', event.target.value)}
                                    className={inputClass}
                                    required
                                >
                                    {(options.shifts || []).map((shift) => (
                                        <option key={shift.id} value={shift.id}>{shift.name}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Room type" error={errors.room_type_id}>
                                <select
                                    value={data.room_type_id}
                                    onChange={(event) => setData('room_type_id', event.target.value)}
                                    className={inputClass}
                                    required
                                >
                                    {(options.roomTypes || []).map((roomType) => (
                                        <option key={roomType.id} value={roomType.id}>{roomType.name}</option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                    </section>

                    <section>
                        <h3 className="mb-3 text-sm font-black text-slate-900">Room assignment</h3>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <Field label="Location">
                                <input
                                    value={options.location?.name || ''}
                                    className={`${inputClass} bg-slate-50`}
                                    readOnly
                                />
                            </Field>
                            <Field label="Dorm" error={errors.dorm_id}>
                                <select
                                    value={data.dorm_id}
                                    onChange={(event) => changeDorm(event.target.value)}
                                    className={inputClass}
                                    required
                                >
                                    <option value="">Select Dorm</option>
                                    {(options.dorms || []).map((dorm) => (
                                        <option key={dorm.id} value={dorm.id}>
                                            {dorm.name} ({dorm.availableCount})
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Room" error={errors.room_id || roomsError}>
                                <select
                                    value={data.room_id}
                                    onChange={(event) => setData('room_id', event.target.value)}
                                    className={inputClass}
                                    disabled={!data.dorm_id || roomsLoading}
                                    required
                                >
                                    <option value="">
                                        {roomsLoading ? 'Loading rooms…' : 'Select Room'}
                                    </option>
                                    {rooms.map((room) => (
                                        <option key={room.id} value={room.id}>{room.label}</option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                    </section>

                    <section>
                        <h3 className="mb-3 text-sm font-black text-slate-900">Rotation dates</h3>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <Field label="Arrival date" error={errors.arrival_date}>
                                <input
                                    type="date"
                                    value={data.arrival_date}
                                    onChange={(event) => setData('arrival_date', event.target.value)}
                                    className={inputClass}
                                    required
                                />
                            </Field>
                            <Field label="First rotation departure" error={errors.departure_date}>
                                <input
                                    type="date"
                                    value={data.departure_date}
                                    min={data.arrival_date}
                                    onChange={(event) => setData('departure_date', event.target.value)}
                                    className={inputClass}
                                    required
                                />
                            </Field>
                            <Field label="Project departure" error={errors.project_departure_date}>
                                <input
                                    type="date"
                                    value={data.project_departure_date}
                                    min={data.departure_date}
                                    onChange={(event) => setData('project_departure_date', event.target.value)}
                                    className={inputClass}
                                    required
                                />
                            </Field>
                        </div>

                        <div className="mt-4">
                            <Field label="Weekly workdays" error={errors.workdays}>
                                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                                    {WEEKDAYS.map((day) => {
                                        const selected = data.workdays.includes(day.id);
                                        return (
                                            <button
                                                key={day.id}
                                                type="button"
                                                onClick={() => toggleWorkday(day.id)}
                                                className={`rounded-xl border px-2 py-2 text-xs font-black transition ${
                                                    selected
                                                        ? 'border-blue-600 bg-blue-600 text-white'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                                                }`}
                                            >
                                                {day.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </Field>
                        </div>
                    </section>

                    <Field label="Notes" error={errors.notes}>
                        <textarea
                            value={data.notes}
                            onChange={(event) => setData('notes', event.target.value)}
                            rows={3}
                            maxLength={2000}
                            className={inputClass}
                            placeholder="Optional scheduling notes"
                        />
                    </Field>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
                    <button
                        type="button"
                        onClick={close}
                        disabled={processing}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={processing || data.workdays.length === 0}
                        className="rounded-xl bg-lx-blue px-5 py-2 text-sm font-black text-white shadow-sm disabled:opacity-50"
                    >
                        {processing ? 'Adding…' : 'Add to Schedule'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
