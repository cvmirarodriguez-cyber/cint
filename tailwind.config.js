/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Archivo', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: { DEFAULT: '#0c0d0f', 900: '#0c0d0f', 800: '#121417', 700: '#181b1f', 600: '#20242a', 500: '#2b3038' },
        bone: { DEFAULT: '#ECE9E2', 200: '#d9d5cc', 400: '#a7a49d', 500: '#8a8882', 600: '#6a6965' },
        obra: { DEFAULT: '#FF5F1F', 300: '#FF8A55', 600: '#E04A0E' },
        hivis: '#FFC21A',
        ok: '#5BD68F',
        alerta: '#FF4141',
      },
      boxShadow: {
        slab: '0 1px 0 0 rgba(255,255,255,.06) inset, 0 -1px 0 0 rgba(0,0,0,.5) inset, 0 20px 40px -20px rgba(0,0,0,.8), 0 2px 6px rgba(0,0,0,.4)',
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
