import AppLayout from '../Layouts/AppLayout';
import { AppPageBody, AppPageHeader, AppPageShell } from '../Components/AppPageShell';
import AddReservationModal from '../Components/AccommodationWorkforce/AddReservationModal';
import UserAccountMenu from '../Components/AccommodationWorkforce/UserAccountMenu';
import { Head, Link, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

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

function LoadingState() {
    return (
        <section className="grid flex-1 place-items-center">
            <div className="flex flex-col items-center gap-3 text-center">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-lx-blue border-t-transparent" />
                <p className="m-0 text-sm font-bold text-lx-ink-soft">Signing you in to the scheduling dashboard…</p>
            </div>
        </section>
    );
}

function ErrorState({ message, onRetry }) {
    return (
        <section className="grid flex-1 place-items-center">
            <div className="flex max-w-md flex-col items-center gap-3 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-red-50 text-2xl">⚠️</span>
                <p className="m-0 text-sm font-bold text-red-700">{message}</p>
                <button
                    type="button"
                    onClick={onRetry}
                    className="h-9 rounded-xl bg-lx-blue px-4 text-sm font-bold text-white hover:opacity-90"
                >
                    Try again
                </button>
            </div>
        </section>
    );
}

function DashboardFrame({ url, lastUpdated, notice, onReload }) {
    const iframeRef = useRef(null);

    // Bridge to the embedded scheduling dashboard: these messages trigger the
    // dashboard's existing "Reset all changes" / "publish all" handlers, so the
    // schedule-update logic lives in one place (camp-reservations) and is not
    // duplicated here. Posts only to the iframe's own origin.
    const postToFrame = useCallback(
        (type) => {
            const frame = iframeRef.current;
            if (!frame || !frame.contentWindow) {
                return;
            }

            let targetOrigin;
            try {
                targetOrigin = new URL(url).origin;
            } catch (e) {
                return;
            }

            frame.contentWindow.postMessage({ type }, targetOrigin);
        },
        [url],
    );

    return (
        <section className="flex min-h-0 flex-1 flex-col">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="m-0 text-xs font-bold text-lx-ink-soft">
                    {lastUpdated ? `Last updated: ${lastUpdated}` : ''}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => postToFrame('lodgex:reset-all-changes')}
                        className="h-9 rounded-xl border border-lx-border bg-white px-3 text-sm font-bold text-lx-navy hover:bg-lx-blue/5"
                    >
                        Reset All Changes
                    </button>
                    <button
                        type="button"
                        onClick={() => postToFrame('lodgex:publish-all')}
                        className="h-9 rounded-xl bg-lx-blue px-4 text-sm font-bold text-white hover:opacity-90"
                    >
                        Publish All
                    </button>
                    <button
                        type="button"
                        onClick={onReload}
                        className="h-9 rounded-xl border border-lx-border bg-white px-3 text-sm font-bold text-lx-navy hover:bg-lx-blue/5"
                    >
                        ↻ Reload
                    </button>
                </div>
            </div>

            {notice && (
                <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                    {notice}
                </p>
            )}

            <div className="min-h-[60vh] flex-1 overflow-hidden rounded-2xl border border-lx-border bg-white">
                <iframe
                    ref={iframeRef}
                    title="Scheduling dashboard"
                    src={url}
                    className="h-full min-h-[60vh] w-full"
                    referrerPolicy="no-referrer-when-downgrade"
                />
            </div>
        </section>
    );
}

export default function AccommodationWorkforce({
    lastUpdated = '',
    reservationAddPath = '/reservations/add',
    singleWorkerAddPath = '/scheduling/coordinator/add-single-worker',
}) {
    const { auth } = usePage().props;
    const userName = auth?.user?.name || 'John Doe';
    const userInitials = getInitials(userName);
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [addReservationOpen, setAddReservationOpen] = useState(false);

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError('');
        setNotice('');
        try {
            const { data } = await window.axios.post(route('accommodation-workforce.login-url'), { embed: true });
            if (data?.url) {
                setUrl(data.url);
            } else {
                setError('Could not load the scheduling dashboard.');
            }
        } catch (e) {
            setError(
                e?.response?.data?.message
                    || 'Could not reach the scheduling app. Please try again.',
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    // After a worker is added, mirror it into Reservation Operations right away
    // (fail-soft: the dashboard also syncs on load) and refresh the widget.
    const handleReservationAdded = useCallback(() => {
        window.axios
            .post(route('accommodation-workforce.sync-reservations'))
            .catch(() => {});
        loadDashboard();
    }, [loadDashboard]);

    return (
        <>
            <Head title="Accommodation Workforce" />

            <AppLayout activeHref="accommodation-workforce">
                <AppPageShell>
                    <AppPageHeader className="border-b border-lx-border bg-lx-navy text-white">
                        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-xl">
                                    👥
                                </div>
                                <div>
                                    <h1 className="m-0 text-xl font-black md:text-2xl">Accommodation Workforce</h1>
                                    <p className="m-0 mt-1 text-xs font-bold text-white/60">
                                        Child Module •{' '}
                                        <Link href={route('command-center')} className="text-sky-300 hover:underline">
                                            Smart Lodge Command Center
                                        </Link>
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                {!loading && url && (
                                    <button
                                        type="button"
                                        onClick={() => setAddReservationOpen(true)}
                                        className="h-9 rounded-xl bg-white px-4 text-sm font-bold text-lx-navy hover:bg-white/90"
                                    >
                                        + Add Reservation
                                    </button>
                                )}
                                <span className="relative text-xl">🔔</span>
                                <UserAccountMenu
                                    userName={userName}
                                    userEmail={auth?.user?.email}
                                    userInitials={userInitials}
                                />
                            </div>
                        </div>
                    </AppPageHeader>

                    <AppPageBody className="flex min-h-0 flex-col p-6">
                        {loading ? (
                            <LoadingState />
                        ) : url ? (
                            <DashboardFrame
                                url={url}
                                lastUpdated={lastUpdated}
                                notice={notice}
                                onReload={loadDashboard}
                            />
                        ) : (
                            <ErrorState message={error || 'Could not load the scheduling dashboard.'} onRetry={loadDashboard} />
                        )}
                    </AppPageBody>
                </AppPageShell>
            </AppLayout>

            <AddReservationModal
                open={addReservationOpen}
                onClose={() => setAddReservationOpen(false)}
                onReservationAdded={handleReservationAdded}
                reservationAddPath={singleWorkerAddPath || reservationAddPath}
            />
        </>
    );
}
