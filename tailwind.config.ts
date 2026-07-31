import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // C-Discover brand palette — deep corporate navy
        brand: {
          50: "#f0f4f8",
          100: "#dbe4ee",
          200: "#b3c5d9",
          300: "#85a1bd",
          400: "#5a7a9c",
          500: "#3d5c7d",
          600: "#2b4560",
          700: "#1f3349",
          800: "#16253a",
          900: "#0f1b2a",
          950: "#0a121c",
        },
        // Accent — warm gold used sparingly for premium highlights
        gold: {
          50: "#fbf7ee",
          100: "#f5ebd1",
          200: "#e9d19f",
          300: "#dbb56a",
          400: "#cd9d47",
          500: "#b9852f",
          600: "#976825",
          700: "#785122",
          800: "#634321",
          900: "#54391f",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
