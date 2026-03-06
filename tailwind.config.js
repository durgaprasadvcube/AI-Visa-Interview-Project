/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#312e81',
                    950: '#1e1b4b',
                },
                accent: {
                    400: '#34d399',
                    500: '#10b981',
                    600: '#059669',
                },
                danger: {
                    400: '#f87171',
                    500: '#ef4444',
                    600: '#dc2626',
                },
                warning: {
                    400: '#fbbf24',
                    500: '#f59e0b',
                },
                surface: {
                    900: '#0f0f1a',
                    800: '#1a1a2e',
                    700: '#22223a',
                    600: '#2d2d4a',
                }
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
                mono: ['var(--font-mono)', 'monospace'],
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeIn 0.5s ease-in-out',
                'slide-up': 'slideUp 0.4s ease-out',
                'bounce-gentle': 'bounceGentle 2s infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                bounceGentle: {
                    '0%, 100%': { transform: 'translateY(-5px)' },
                    '50%': { transform: 'translateY(0)' },
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
            },
        },
    },
    plugins: [],
};
