import type { Config } from "tailwindcss";

// DarboRitmas prekės ženklo spalvos (iš logotipo ir pardavimo puslapio dizaino).
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0B1B3F", 700: "#16295C" },
        accent: { DEFAULT: "#1456E8", dark: "#0B3FB5", light: "#4C84FF", soft: "#E8EFFF" },
        brand: { red: "#D92D20", "red-light": "#FF5A4D" },
        go: { DEFAULT: "#5bb365", dark: "#3f9a4a", soft: "#f0faf2" },
        surface: "#F4F7FF",
        sky: "#C9D3F0",
        ink: "#0B1B3F",
        muted: "#33436B",
        danger: "#D92D20",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["var(--font-grotesk)", "Space Grotesk", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      borderRadius: { card: "1rem" },
      boxShadow: { card: "0 1px 2px rgba(11,27,63,.08)" },
    },
  },
  plugins: [],
};
export default config;
