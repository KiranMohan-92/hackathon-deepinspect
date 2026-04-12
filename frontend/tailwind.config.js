/** @type {import('tailwindcss').Config} */
const withAlpha = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        white: withAlpha("--color-white"),
        black: withAlpha("--color-black"),
        void: withAlpha("--color-void"),
        "void-light": withAlpha("--color-void-light"),
        "void-lighter": withAlpha("--color-void-lighter"),
        accent: {
          DEFAULT: withAlpha("--color-accent"),
          dim: withAlpha("--color-accent-dim"),
          muted: "rgb(var(--color-accent) / 0.15)",
          glow: "rgb(var(--color-accent) / 0.3)",
        },
        glass: {
          DEFAULT: "rgb(var(--color-glass) / 0.85)",
          light: "rgb(var(--color-glass-light) / 0.75)",
          heavy: "rgb(var(--color-glass-heavy) / 0.92)",
          border: "rgb(var(--color-white) / 0.06)",
          "border-hover": "rgb(var(--color-white) / 0.12)",
        },
        severity: {
          critical: "#ff1744",
          "critical-bg": "rgba(255, 23, 68, 0.12)",
          "critical-glow": "rgba(255, 23, 68, 0.4)",
          high: "#ff6d00",
          "high-bg": "rgba(255, 109, 0, 0.12)",
          "high-glow": "rgba(255, 109, 0, 0.4)",
          medium: "#ffab00",
          "medium-bg": "rgba(255, 171, 0, 0.12)",
          "medium-glow": "rgba(255, 171, 0, 0.4)",
          ok: "#00e676",
          "ok-bg": "rgba(0, 230, 118, 0.12)",
          "ok-glow": "rgba(0, 230, 118, 0.4)",
        },
        surface: {
          1: "rgb(var(--color-white) / 0.03)",
          2: "rgb(var(--color-white) / 0.05)",
          3: "rgb(var(--color-white) / 0.08)",
        },
        dim: withAlpha("--color-dim"),
        muted: withAlpha("--color-muted"),
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ['"Outfit"', "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.7rem", { lineHeight: "1rem" }],
        "3xs": ["0.6rem", { lineHeight: "0.85rem" }],
      },
      backdropBlur: {
        glass: "12px",
        "glass-heavy": "20px",
      },
      boxShadow: {
        glass: "0 0 0 1px rgb(var(--color-white) / 0.06), 0 4px 24px rgb(var(--color-shadow) / 0.24)",
        "glass-hover": "0 0 0 1px rgb(var(--color-white) / 0.12), 0 8px 32px rgb(var(--color-shadow) / 0.24)",
        "glow-cyan": "0 0 20px rgba(0, 229, 255, 0.3), 0 0 60px rgba(0, 229, 255, 0.1)",
        "glow-red": "0 0 20px rgba(255, 23, 68, 0.3), 0 0 60px rgba(255, 23, 68, 0.1)",
        "glow-orange": "0 0 20px rgba(255, 109, 0, 0.3), 0 0 60px rgba(255, 109, 0, 0.1)",
        "glow-amber": "0 0 20px rgba(255, 171, 0, 0.3), 0 0 60px rgba(255, 171, 0, 0.1)",
        "glow-green": "0 0 20px rgba(0, 230, 118, 0.3), 0 0 60px rgba(0, 230, 118, 0.1)",
        "inner-glow": "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
      },
      borderRadius: {
        glass: "12px",
      },
      animation: {
        "scan-line": "scanLine 2.5s ease-in-out infinite",
        "risk-glow": "riskGlow 2s ease-in-out infinite",
        breathe: "breathe 3s ease-in-out infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-in-right": "slideInRight 0.35s ease-out",
        "slide-in-left": "slideInLeft 0.35s ease-out",
        shimmer: "shimmer 2s linear infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        scanLine: {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { transform: "translateY(100%)", opacity: "0" },
        },
        riskGlow: {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
