import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'Figtree', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                lx: {
                    blue: '#0b66e4',
                    'blue-dark': '#0747a6',
                    navy: '#061a3a',
                    bg: '#f6f9ff',
                    border: '#dbe6f7',
                    line: '#edf2fb',
                    ink: '#17345f',
                    'ink-soft': '#315278',
                    'red-x': '#ef1d26',
                },
            },
            boxShadow: {
                'lx-card': '0 12px 32px rgba(15, 23, 42, 0.08)',
                'lx-soft': '0 8px 20px rgba(15, 23, 42, 0.04)',
                'lx-pop': '0 18px 45px rgba(15, 23, 42, 0.18)',
                'lx-toast': '0 18px 45px rgba(15, 23, 42, 0.22)',
            },
            // Slow orange pulse used by the Pinned dashboard tab when one or
            // more pinned reservations have hit (or passed) their remind-by
            // datetime. The keyframes interpolate the tab's background only
            // — text/border tones stay static so the flash reads as a soft
            // alert rather than a jarring strobe. Pair with
            // `motion-reduce:animate-none` at the call site for accessibility.
            keyframes: {
                'pin-flash': {
                    '0%, 100%': { backgroundColor: '#ffffff' },
                    '50%': { backgroundColor: '#fed7aa' },
                },
            },
            animation: {
                'pin-flash': 'pin-flash 1.8s ease-in-out infinite',
            },
        },
    },

    plugins: [forms],
};
