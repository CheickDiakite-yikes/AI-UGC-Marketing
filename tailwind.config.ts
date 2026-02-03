import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./*.tsx", // Include root-level TSX files like App.tsx and Workspace.tsx
    ],
    theme: {
        extend: {
            colors: {
                neo: {
                    pink: '#FF90E8',
                    cyan: '#80F0F0',
                    lime: '#D0F042',
                    yellow: '#FFFD82',
                    black: '#1A1A1A',
                    white: '#FFFFFF',
                }
            },
            boxShadow: {
                'neo': '4px 4px 0px 0px #1A1A1A',
                'neo-sm': '2px 2px 0px 0px #1A1A1A',
                'neo-lg': '8px 8px 0px 0px #1A1A1A',
            },
            fontFamily: {
                sans: ['var(--font-sans)', 'Space Grotesk', 'system-ui', 'sans-serif'],
                display: ['var(--font-display)', 'Syne', 'system-ui', 'sans-serif'],
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'wiggle': 'wiggle 1s ease-in-out infinite',
                'marquee': 'marquee 25s linear infinite',
                'pop-in': 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                'slide-up': 'slideUp 0.8s ease-out forwards',
                'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
                'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
                'ping-slow': 'pingSlow 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                'shimmer': 'shimmer 3s ease-in-out infinite',
                'text-reveal': 'textReveal 1s ease-out forwards',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                wiggle: {
                    '0%, 100%': { transform: 'rotate(-3deg)' },
                    '50%': { transform: 'rotate(3deg)' },
                },
                marquee: {
                    '0%': { transform: 'translateX(0%)' },
                    '100%': { transform: 'translateX(-100%)' },
                },
                popIn: {
                    '0%': { opacity: '0', transform: 'scale(0.5)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(40px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                pulseSoft: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.85' },
                },
                pingSlow: {
                    '0%': { transform: 'scale(1)', opacity: '1' },
                    '75%, 100%': { transform: 'scale(1.5)', opacity: '0' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% center' },
                    '100%': { backgroundPosition: '200% center' },
                },
                textReveal: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                }
            }
        },
    },
    plugins: [],
};
export default config;
