/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Tight"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        papel: { DEFAULT: '#f3f1ec', claro: '#fdfcf9', oscuro: '#e9e6df' },
        linea: '#e3dfd6',
        tinta: { DEFAULT: '#0e0e0c', 700: '#2b2a27', 500: '#5c5a55', 400: '#8a877f', 300: '#b9b5ac' },
        verde: { DEFAULT: '#0b6e4f', 600: '#095c42', 100: '#e4f1ea' },
        ambar: { DEFAULT: '#b45309', 100: '#fdf0dc' },
        mp: { DEFAULT: '#009ee3', 600: '#0089c6' },
      },
    },
  },
  plugins: [],
};
