export function AppPageShell({ children, className = '' }) {
    return <main className={`app-viewport-shell min-w-0 ${className}`.trim()}>{children}</main>;
}

export function AppPageHeader({ children, className = '' }) {
    return <header className={`app-viewport-header ${className}`.trim()}>{children}</header>;
}

export function AppPageBody({ children, className = 'p-6' }) {
    // min-w-0 prevents intrinsic min-content (e.g. a `min-w-[1080px]` table)
    // from forcing the page wider than the viewport and clipping the right
    // edge / right-rail aside on laptop widths.
    return <div className={`app-viewport-body min-w-0 ${className}`.trim()}>{children}</div>;
}
