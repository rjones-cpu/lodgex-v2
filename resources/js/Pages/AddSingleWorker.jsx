import AppLayout from '../Layouts/AppLayout';
import { AppPageBody, AppPageHeader, AppPageShell } from '../Components/AppPageShell';
import { Head, Link } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';

function LoadingState() {
    return (
        <section className="grid flex-1 place-items-center">
            <div className="flex flex-col items-center gap-3 text-center">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-lx-blue border-t-transparent" />
                <p className="m-0 text-sm font-bold text-lx-ink-soft">Signing you in to the scheduling app…</p>
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

function WorkerFrame({ url, onReload }) {
    return (
        <section className="flex min-h-0 flex-1 flex-col">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="m-0 text-sm font-black text-lx-navy">Add Single Worker</p>
                    <p className="m-0 text-xs font-bold text-lx-ink-soft">Scheduling coordinator</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={onReload}
                        className="h-9 rounded-xl border border-lx-border bg-white px-3 text-sm font-bold text-lx-navy hover:bg-lx-blue/5"
                    >
                        ↻ Reload
                    </button>
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 rounded-xl border border-lx-border bg-white px-3 text-sm font-bold leading-9 text-lx-blue hover:bg-lx-blue/5"
                    >
                        Open in new tab ↗
                    </a>
                </div>
            </div>

            <div className="min-h-[70vh] flex-1 overflow-hidden rounded-2xl border border-lx-border bg-white">
                <iframe
                    title="Add single worker"
                    src={url}
                    className="h-full min-h-[70vh] w-full"
                    referrerPolicy="no-referrer-when-downgrade"
                />
            </div>
        </section>
    );
}

export default function AddSingleWorker({
    lastUpdated = '',
    singleWorkerAddPath = '/scheduling/coordinator/add-single-worker',
}) {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadWorkerForm = useCallback(async () => {
        setLoading(true);
        setError('');
        setUrl('');

        try {
            // Reuse the existing AccommodationWorkforce login-handoff endpoint; it accepts
            // an arbitrary `redirect` so we can land in the Add Single Worker page.
            const { data } = await window.axios.post(route('accommodation-workforce.login-url'), {
                redirect: singleWorkerAddPath,
                embed: true,
                scheduling: false,
            });

            if (data?.url) {
                setUrl(data.url);
            } else {
                setError('Could not open the Add Single Worker form.');
            }
        } catch (e) {
            setError(
                e?.response?.data?.message
                    || 'Could not reach the scheduling app. Please try again.',
            );
        } finally {
            setLoading(false);
        }
    }, [singleWorkerAddPath]);

    useEffect(() => {
        loadWorkerForm();
    }, [loadWorkerForm]);

    return (
        <>
            <Head title="Add Single Worker" />

            <AppLayout activeHref="add-single-worker">
                <AppPageShell>
                    <AppPageHeader className="border-b border-lx-border bg-lx-navy text-white">
                        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-xl">
                                    🧑‍💼
                                </div>
                                <div>
                                    <h1 className="m-0 text-xl font-black md:text-2xl">Add Single Worker</h1>
                                    <p className="m-0 mt-0.5 text-sm text-white/75">
                                        Scheduling coordinator form, signed in automatically.
                                    </p>
                                    <p className="m-0 mt-1 text-xs font-bold text-white/60">
                                        Child Module •{' '}
                                        <Link href={route('accommodation-workforce')} className="text-sky-300 hover:underline">
                                            Accommodation Workforce
                                        </Link>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </AppPageHeader>

                    <AppPageBody className="flex min-h-0 flex-col p-6">
                        {lastUpdated && (
                            <p className="mb-4 text-xs font-bold text-lx-ink-soft">Last updated: {lastUpdated}</p>
                        )}

                        {loading ? (
                            <LoadingState />
                        ) : url ? (
                            <WorkerFrame url={url} onReload={loadWorkerForm} />
                        ) : (
                            <ErrorState
                                message={error || 'Could not load the Add Single Worker form.'}
                                onRetry={loadWorkerForm}
                            />
                        )}
                    </AppPageBody>
                </AppPageShell>
            </AppLayout>
        </>
    );
}
