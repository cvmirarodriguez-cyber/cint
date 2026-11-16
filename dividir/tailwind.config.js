/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Inter', 'sans-serif'],
      },
      colors: {
        crema: { DEFAULT: '#fffbeb', 100: '#fef3c7', 200: '#fde68a' },
        hoja: { DEFAULT: '#14532d', 600: '#166534', 500: '#16a34a', 100: '#dcfce7' },
        aji: { DEFAULT: '#f97316', 600: '#ea580c', 100: '#ffedd5' },
        tinta: { DEFAULT: '#1c1917', 500: '#57534e', 400: '#78716c', 300: '#a8a29e' },
      },
      boxShadow: { ticket: '0 1px 0 #e7e5e4, 0 10px 30px -12px rgba(28,25,23,.25)' },
    },
  },
  plugins: [],
};
