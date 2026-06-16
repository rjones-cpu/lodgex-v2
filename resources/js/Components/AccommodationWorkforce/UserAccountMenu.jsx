import { Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

/**
 * Fixed-position account menu for module headers inside app-viewport-shell.
 * The shared Dropdown uses absolute positioning and gets clipped by
 * overflow-hidden on the viewport shell.
 */
export default function UserAccountMenu({ userName, userEmail, userInitials, triggerClassName, children }) {
    const [open, setOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState({ top: 0, right: 0 });
    const triggerRef = useRef(null);

    useEffect(() => {
        if (!open || !triggerRef.current) {
            return undefined;
        }

        function updatePosition() {
            const rect = triggerRef.current.getBoundingClientRect();
            setMenuStyle({
                top: rect.bottom + 8,
                right: Math.max(8, window.innerWidth - rect.right),
            });
        }

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [open]);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        function onKeyDown(event) {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        }

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open]);

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen((value) => !value)}
                className={triggerClassName || 'grid h-9 w-9 place-items-center rounded-full bg-lx-blue text-sm font-black text-white'}
                aria-label="Account menu"
                aria-expanded={open}
                aria-haspopup="menu"
            >
                {children || userInitials}
            </button>

            {open && (
                <>
                    <div
                        className="fixed inset-0 z-[200]"
                        onClick={() => setOpen(false)}
                        aria-hidden="true"
                    />
                    <div
                        role="menu"
                        className="fixed z-[210] w-48 overflow-hidden rounded-xl border border-lx-border bg-white py-1 shadow-xl"
                        style={menuStyle}
                    >
                        <div className="border-b border-gray-100 px-4 py-2.5">
                            <p className="m-0 text-sm font-bold text-lx-navy">{userName}</p>
                            {userEmail && <p className="m-0 text-xs text-lx-ink-soft">{userEmail}</p>}
                        </div>
                        <Link
                            href={route('profile.edit')}
                            className="block px-4 py-2 text-sm font-semibold text-lx-navy hover:bg-lx-blue/5"
                            onClick={() => setOpen(false)}
                        >
                            Profile
                        </Link>
                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="block w-full px-4 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                            onClick={() => setOpen(false)}
                        >
                            Log Out
                        </Link>
                    </div>
                </>
            )}
        </>
    );
}
