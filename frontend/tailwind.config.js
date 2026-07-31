/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-base":     "#0f1117",
        "bg-surface":  "#1a1d27",
        "bg-elevated": "#22263a",
        "bg-card":     "#1e2235",
        "border-dark": "#2d3348",
        "accent-blue":   "#4f8ef7",
        "accent-green":  "#34d399",
        "accent-amber":  "#fbbf24",
        "accent-red":    "#f87171",
        "accent-purple": "#a78bfa",
        "text-primary":   "#f1f5f9",
        "text-secondary": "#94a3b8",
        "text-muted":     "#475569",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 24px rgba(0, 0, 0, 0.4)",
        glow: "0 0 20px rgba(79, 142, 247, 0.15)",
      },
    },
  },
  plugins: [],
};
