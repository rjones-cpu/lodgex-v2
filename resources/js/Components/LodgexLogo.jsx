import { Link } from '@inertiajs/react';

const HEIGHTS = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-11',
    xl: 'h-14',
    '2xl': 'h-16',
};

export default function LodgexLogo({ className = '', size = 'md', href = 'command-center' }) {
    const heightClass = HEIGHTS[size] || HEIGHTS.md;
    const image = (
        <img
            src="/images/lodgex-logo.png"
            alt="LODGEX"
            className={`${heightClass} w-auto max-w-full object-contain ${className}`}
        />
    );

    if (!href) {
        return image;
    }

    return (
        <Link href={route(href)} className={`inline-flex ${heightClass} items-center`}>
            {image}
        </Link>
    );
}
