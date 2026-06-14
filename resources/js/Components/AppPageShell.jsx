export function AppPageShell({ children, className = '' }) {
    return <main className={`app-viewport-shell min-w-0 ${className}`.trim()}>{children}</main>;
}

export function AppPageHeader({ children, className = '' }) {
    return <header className={`app-viewport-header ${className}`.trim()}>{children}</header>;
}

export function AppPageBody({ children, className = 'p-6' }) {
    return <div className={`app-viewport-body ${className}`.trim()}>{children}</div>;
}
