/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Archivo', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
        },
        bone: {
          DEFAULT: 'rgb(var(--bone) / <alpha-value>)',
          200: 'rgb(var(--bone-200) / <alpha-value>)',
          400: 'rgb(var(--bone-400) / <alpha-value>)',
          500: 'rgb(var(--bone-500) / <alpha-value>)',
          600: 'rgb(var(--bone-600) / <alpha-value>)',
        },
        obra: {
          DEFAULT: 'rgb(var(--obra) / <alpha-value>)',
          300: 'rgb(var(--obra-300) / <alpha-value>)',
          600: 'rgb(var(--obra-600) / <alpha-value>)',
        },
        hivis: 'rgb(var(--hivis) / <alpha-value>)',
        ok: 'rgb(var(--ok) / <alpha-value>)',
        alerta: 'rgb(var(--alerta) / <alpha-value>)',
        // white se intercambia automáticamente: claro en modo oscuro, oscuro en modo claro
        white: 'rgb(var(--overlay) / <alpha-value>)',
      },
      boxShadow: {
        slab: 'var(--shadow-slab)',
        glow: '0 0 0 1px rgba(255,95,31,.45), 0 10px 40px -10px rgba(255,95,31,.55)',
      },
      keyframes: {
        scan: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100%)' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
      },
      animation: {
        scan: 'scan 3.5s linear infinite',
        marquee: 'marquee 30s linear infinite',
      },
    },
  },
  plugins: [],
};
