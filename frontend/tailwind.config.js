/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-base": "#0f1117",
        "bg-surface": "#1a1d27",
        "bg-elevated": "#22263a",
        "bg-card": "#1e2235",
        "border-dark": "#2d3348",
        "accent-blue": "#4f8ef7",
        "accent-green": "#34d399",
        "accent-amber": "#fbbf24",
        "accent-red": "#f87171",
        "accent-purple": "#a78bfa",
        "text-primary": "#f1f5f9",
        "text-secondary": "#94a3b8",
        "text-muted": "#475569",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 24px rgba(0, 0, 0, 0.4)",
        glow: "0 0 20px rgba(79, 142, 247, 0.15)",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(28px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(var(--tilt, 0deg))" },
          "50%": { transform: "translateY(-16px) rotate(var(--tilt, 0deg))" },
        },
        gradientPan: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4), 0 0 15px rgba(79, 142, 247, 0.1)" },
          "50%": { boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4), 0 0 25px rgba(79, 142, 247, 0.3)" },
        }
      },
      animation: {
        "fade-in-up": "fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-in-right": "slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        float: "float 6s ease-in-out infinite",
        "float-slow": "float 8s ease-in-out infinite",
        "gradient-pan": "gradientPan 6s ease infinite",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
