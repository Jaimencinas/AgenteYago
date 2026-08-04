import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          400: "#FF6E63",
          500: "#EF4640",
          600: "#E53935",
          700: "#C62828",
        },
        "accent-blue": "#2E5FDE",
        whatsapp: "#25D366",
        carbon: {
          50: "#F6F6F6",
          100: "#EDEDED",
          200: "#DBDBDB",
          300: "#B3B3B3",
          400: "#8C8C8C",
          700: "#3B3B3B",
          800: "#2B2B2B",
          900: "#1A1A1A",
          950: "#121212",
        },
      },
      fontFamily: {
        display: ["'Oswald Variable'", "Oswald", "Arial Narrow", "system-ui", "sans-serif"],
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(229,57,53,.22), 0 8px 40px -8px rgba(229,57,53,.35)",
      },
    },
  },
  plugins: [],
};

export default config;
