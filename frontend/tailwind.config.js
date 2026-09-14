import zaadPreset from "@zaad/design-system/tailwind.preset";

/** @type {import('tailwindcss').Config} */
export default {
  presets: [zaadPreset],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ألوان دلالية عبر توكنات النظام — بلا قيم صريحة في التطبيق
        brand: {
          gray: "var(--tmkeen-brand-gray)",
        },
        surface: {
          DEFAULT: "var(--tmkeen-surface)",
          muted: "var(--tmkeen-surface-muted)",
          border: "var(--tmkeen-surface-border)",
        },
        primary: {
          DEFAULT: "var(--tmkeen-primary)",
          dark: "var(--tmkeen-primary-dark)",
          light: "var(--tmkeen-primary-light)",
        },
        secondary: {
          DEFAULT: "var(--tmkeen-secondary)",
          dark: "var(--tmkeen-secondary-dark)",
          light: "var(--tmkeen-secondary-light)",
        },
      },
      fontFamily: {
        sans: ["var(--font-arabic)"],
        cairo: ["var(--font-arabic)"],
      },
      maxWidth: {
        page: "var(--tmkeen-page-max-width)",
      },
      borderRadius: {
        lg: "var(--tmkeen-radius-lg)",
        xl: "var(--tmkeen-radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      boxShadow: {
        soft: "var(--shadow-sm)",
        focus: "var(--shadow-focus)",
      },
      minHeight: {
        touch: "var(--touch-min)",
      },
      transitionTimingFunction: {
        standard: "var(--ease-standard)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        slideUp: {
          "0%": { transform: "translateY(var(--space-2))", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
      },
      animation: {
        fadeIn: "fadeIn var(--duration-slow) var(--ease-decelerate)",
        slideUp: "slideUp var(--duration-slow) var(--ease-decelerate)",
      },
    },
  },
  plugins: [],
};
