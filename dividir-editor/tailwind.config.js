import animate from "tailwindcss-animate";

// Colores de Dividir: salen de variables CSS (src/index.css) para el modo claro y oscuro.
const v = (n) => `rgb(var(--${n}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  // El tema se elige con data-tema en <html> (claro / oscuro / automático).
  darkMode: ["selector", '[data-tema="oscuro"]'],
  content: ["./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      opacity: Object.fromEntries(Array.from({ length: 101 }, (_, i) => [i, `${i / 100}`])),
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      colors: {
        // Kit shadcn/ui del template (pantallas de autenticación, avisos)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Dividir
        papel: { DEFAULT: v("papel"), claro: v("papel-claro"), oscuro: v("papel-oscuro") },
        linea: v("linea"),
        tinta: { DEFAULT: v("tinta"), 700: v("tinta-700"), 500: v("tinta-500"), 400: v("tinta-400"), 300: v("tinta-300") },
        verde: { DEFAULT: v("verde"), 600: v("verde-600"), 100: v("verde-100") },
        ambar: { DEFAULT: v("ambar"), 100: v("ambar-100") },
        bloque: { DEFAULT: v("bloque"), texto: v("bloque-texto") },
        mp: { DEFAULT: "#009ee3", 600: "#0089c6" },
      },
      fontFamily: {
        sans: ['"Inter Tight"', "system-ui", "sans-serif"],
        heading: ["var(--font-heading)"],
        body: ["var(--font-body)"],
        display: ["var(--font-display)"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
      animation: { "accordion-down": "accordion-down 0.2s ease-out", "accordion-up": "accordion-up 0.2s ease-out" },
    },
  },
  plugins: [animate],
};
