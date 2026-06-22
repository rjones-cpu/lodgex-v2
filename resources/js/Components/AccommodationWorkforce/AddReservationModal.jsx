import { useCallback, useEffect, useState } from 'react';

export default function AddReservationModal({ open, onClose, onReservationAdded, reservationAddPath = '/reservations/add' }) {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loadReservationForm = useCallback(async () => {
        setLoading(true);
        setError('');
        setUrl('');

        try {
            const { data } = await window.axios.post(route('accommodation-workforce.login-url'), {
                redirect: reservationAddPath,
                embed: true,
                scheduling: false,
            });

            if (data?.url) {
                setUrl(data.url);
            } else {
                setError('Could not open the add reservation form.');
            }
        } catch (e) {
            setError(
                e?.response?.data?.message
                    || 'Could not reach the reservation app. Please try again.',
            );
        } finally {
            setLoading(false);
        }
    }, [reservationAddPath]);

    useEffect(() => {
        if (open) {
            loadReservationForm();
        } else {
            setUrl('');
            setError('');
            setLoading(false);
        }
    }, [open, loadReservationForm]);

    useEffect(() => {
        if (!open) return undefined;

        function onKeyDown(event) {
            if (event.key === 'Escape') {
                onClose?.();
            }
        }

        document.addEventListener('keydown', onKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    useEffect(() => {
        if (!open) return undefined;

        function onMessage(event) {
            if (event?.data?.type === 'lodgex:reservation-added') {
                // Brief delay so the success message in the iframe is visible first,
                // then close the modal and refresh the workforce widget.
                window.setTimeout(() => {
                    onReservationAdded?.();
                    onClose?.();
                }, 1200);
            }
        }

        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [open, onClose, onReservationAdded]);

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-900/60 p-3 md:p-6">
            <div className="flex min-h-0 w-full max-w-[96vw] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-lx-border px-4 py-3 md:px-5">
                    <div>
                        <h2 className="m-0 text-base font-black text-lx-navy md:text-lg">Add Single Worker</h2>
                        <p className="m-0 text-xs font-bold text-lx-ink-soft">
                            Add a worker to the Accommodation Workforce schedule — all steps open here.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid h-9 w-9 place-items-center rounded-xl border border-lx-border text-lg font-bold text-lx-navy hover:bg-lx-blue/5"
                        aria-label="Close add reservation"
                    >
                        ×
                    </button>
                </div>

                <div className="relative min-h-0 flex-1 bg-slate-50">
                    {loading && (
                        <div className="absolute inset-0 z-10 grid place-items-center bg-white/80">
                            <div className="flex flex-col items-center gap-3">
                                <span className="h-8 w-8 animate-spin rounded-full border-2 border-lx-blue border-t-transparent" />
                                <p className="m-0 text-sm font-bold text-lx-ink-soft">Loading add reservation…</p>
                            </div>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="grid h-full place-items-center p-6">
                            <div className="flex max-w-md flex-col items-center gap-3 text-center">
                                <p className="m-0 text-sm font-bold text-red-700">{error}</p>
                                <button
                                    type="button"
                                    onClick={loadReservationForm}
                                    className="h-9 rounded-xl bg-lx-blue px-4 text-sm font-bold text-white hover:opacity-90"
                                >
                                    Try again
                                </button>
                            </div>
                        </div>
                    )}

                    {url && !error && (
                        <iframe
                            title="Add reservation"
                            src={url}
                            className="h-full min-h-[70vh] w-full border-0 bg-white"
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
