import { useCallback, useEffect, useRef, useState } from 'react';

import AddReservationModal from './AddReservationModal';

function LoadingState() {
    return (
        <section className="grid min-h-[60vh] flex-1 place-items-center">
            <div className="flex flex-col items-center gap-3 text-center">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-lx-blue border-t-transparent" />
                <p className="m-0 text-sm font-bold text-lx-ink-soft">Signing you in to the scheduling dashboard…</p>
            </div>
        </section>
    );
}

function ErrorState({ message, onRetry }) {
    return (
        <section className="grid min-h-[60vh] flex-1 place-items-center">
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

function DashboardFrame({ url, lastUpdated, notice, onAddReservation, onReload }) {
    const iframeRef = useRef(null);

    const postToFrame = useCallback(
        (type) => {
            const frame = iframeRef.current;
            if (!frame?.contentWindow) {
                return;
            }

            let targetOrigin;
            try {
                targetOrigin = new URL(url).origin;
            } catch {
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
                    {onAddReservation && (
                        <button
                            type="button"
                            onClick={onAddReservation}
                            className="h-9 rounded-xl bg-lx-blue px-4 text-sm font-bold text-white hover:opacity-90"
                        >
                            + Add Reservation
                        </button>
                    )}
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

export default function SchedulingDashboardEmbed({
    lastUpdated = '',
    reservationAddPath = '/reservations/add',
    singleWorkerAddPath = '/scheduling/coordinator/add-single-worker',
    showAddAction = true,
}) {
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
        } catch (requestError) {
            setError(
                requestError?.response?.data?.message
                    || 'Could not reach the scheduling app. Please try again.',
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const handleReservationAdded = useCallback(() => {
        window.axios
            .post(route('accommodation-workforce.sync-reservations'))
            .catch(() => {});
        loadDashboard();
    }, [loadDashboard]);

    return (
        <div className="flex min-h-[60vh] flex-1 flex-col">
            {loading ? (
                <LoadingState />
            ) : url ? (
                <DashboardFrame
                    url={url}
                    lastUpdated={lastUpdated}
                    notice={notice}
                    onAddReservation={showAddAction ? () => setAddReservationOpen(true) : null}
                    onReload={loadDashboard}
                />
            ) : (
                <ErrorState
                    message={error || 'Could not load the scheduling dashboard.'}
                    onRetry={loadDashboard}
                />
            )}

            <AddReservationModal
                open={addReservationOpen}
                onClose={() => setAddReservationOpen(false)}
                onReservationAdded={handleReservationAdded}
                reservationAddPath={singleWorkerAddPath || reservationAddPath}
            />
        </div>
    );
}
