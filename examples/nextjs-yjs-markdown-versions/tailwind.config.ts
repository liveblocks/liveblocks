import type { Config } from "tailwindcss";

const config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        "bg-elev": "rgb(var(--bg-elev) / <alpha-value>)",
        "bg-muted": "rgb(var(--bg-muted) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        "border-strong": "rgb(var(--border-strong) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        "text-muted": "rgb(var(--text-muted) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-fg": "rgb(var(--accent-fg) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      transitionTimingFunction: {
        carousel: "cubic-bezier(0.22, 0.78, 0.32, 1)",
      },
      keyframes: {
        // Slide by ONE column (50% of the viewport), not by the full
        // pair. The outgoing pair only moves half a viewport-width so
        // its right column (the previously-editable editor) lands in
        // the left slot, and the incoming pair slides in from one
        // column to the right.
        slideInRight: {
          "0%": { transform: "translateX(50%)" },
          "100%": { transform: "translateX(0)" },
        },
        slideOutLeft: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        slideInRight:
          "slideInRight 420ms cubic-bezier(0.22, 0.78, 0.32, 1) both",
        slideOutLeft:
          "slideOutLeft 420ms cubic-bezier(0.22, 0.78, 0.32, 1) both",
      },
    },
  },
} satisfies Config;

export default config;
