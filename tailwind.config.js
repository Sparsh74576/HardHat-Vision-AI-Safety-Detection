/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f3f6fb',
          100: '#e3ecf7',
          200: '#c2d2ea',
          300: '#93b0d6',
          400: '#5d85ba',
          500: '#3a639c',
          600: '#2c4d7d',
          700: '#223c63',
          800: '#152844',
          900: '#0d1a2e',
          950: '#070f1d',
        },
        steel: {
          400: '#aebfd4',
          500: '#8395b0',
          600: '#5d7090',
        },
        accent: {
          DEFAULT: '#f6b138',
          soft: '#fbd583',
          deep: '#c8861a',
        },
        success: '#1f9d55',
        warning: '#e0a800',
        danger: '#dc2626',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(7, 15, 29, 0.08), 0 8px 24px -8px rgba(7, 15, 29, 0.18)',
        glow: '0 0 0 1px rgba(246, 177, 56, 0.4), 0 8px 24px -6px rgba(246, 177, 56, 0.35)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out both',
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
