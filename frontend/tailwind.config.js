/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', 'cursive'],
        body: ['"Barlow"', 'sans-serif'],
        condensed: ['"Barlow Condensed"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      colors: {
        forge: {
          bg: 'rgb(var(--forge-bg) / <alpha-value>)',
          surface: 'rgb(var(--forge-surface) / <alpha-value>)',
          surface2: 'rgb(var(--forge-surface2) / <alpha-value>)',
          border: 'rgb(var(--forge-border) / <alpha-value>)',
          amber: 'rgb(var(--forge-amber) / <alpha-value>)',
          'amber-dim': 'rgb(var(--forge-amber-dim) / <alpha-value>)',
          fire: 'rgb(var(--forge-fire) / <alpha-value>)',
          text: 'rgb(var(--forge-text) / <alpha-value>)',
          dim: 'rgb(var(--forge-dim) / <alpha-value>)',
          muted: 'rgb(var(--forge-muted) / <alpha-value>)',
        },
      },
      keyframes: {
        'card-in': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(245,158,11,0.4)' },
          '50%': { boxShadow: '0 0 20px rgba(245,158,11,0.8)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'badge-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'fire-flicker': {
          '0%, 100%': { transform: 'scale(1) rotate(-2deg)' },
          '50%': { transform: 'scale(1.1) rotate(2deg)' },
        },
        'marquee': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'card-in': 'card-in 0.4s ease forwards',
        'pulse-glow': 'pulse-glow 2s ease infinite',
        'slide-in': 'slide-in 0.3s ease forwards',
        'badge-pulse': 'badge-pulse 2s ease infinite',
        'fire-flicker': 'fire-flicker 1.5s ease infinite',
        'marquee': 'marquee 20s linear infinite',
      },
    },
  },
  plugins: [],
}
