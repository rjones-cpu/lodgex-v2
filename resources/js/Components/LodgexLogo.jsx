import { Link } from '@inertiajs/react';

const HEIGHTS = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-11',
    xl: 'h-[34px]',
};

export default function LodgexLogo({ className = '', size = 'md', href = 'command-center' }) {
    const image = (
        <img
            src="/images/lodgex-logo.png"
            alt="LODGEX"
            className={`${HEIGHTS[size] || HEIGHTS.md} w-auto max-w-full object-contain object-left ${className}`}
        />
    );

    if (!href) {
        return image;
    }

    return (
        <Link href={route(href)} className="inline-flex h-9 items-center">
            {image}
        </Link>
    );
}
