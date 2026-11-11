import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0a",
        coal: "#121212",
        graphite: "#1c1c1c",
        steel: "#2a2a2a",
        ash: "#8a8a8a",
        bone: "#f4f1ea",
        gold: { DEFAULT: "#c9a24b", light: "#e3c77f", dark: "#9c7a2e" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        fadeUp: { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "none" } },
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: {
        "fade-up": "fadeUp .7s cubic-bezier(.2,.7,.2,1) both",
        "fade-in": "fadeIn .5s ease both",
      },
    },
  },
  plugins: [],
};

export default config;
