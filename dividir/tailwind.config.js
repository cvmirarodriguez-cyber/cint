/** @type {import('tailwindcss').Config} */
// Los colores salen de variables CSS (src/index.css) para cambiar entre modo claro y oscuro.
const v = (n) => `rgb(var(--${n}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['selector', '[data-tema="oscuro"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Tight"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        papel: { DEFAULT: v('papel'), claro: v('papel-claro'), oscuro: v('papel-oscuro') },
        linea: v('linea'),
        tinta: { DEFAULT: v('tinta'), 700: v('tinta-700'), 500: v('tinta-500'), 400: v('tinta-400'), 300: v('tinta-300') },
        verde: { DEFAULT: v('verde'), 600: v('verde-600'), 100: v('verde-100') },
        ambar: { DEFAULT: v('ambar'), 100: v('ambar-100') },
        bloque: { DEFAULT: v('bloque'), texto: v('bloque-texto') },
        mp: { DEFAULT: '#009ee3', 600: '#0089c6' },
      },
    },
  },
  plugins: [],
};
