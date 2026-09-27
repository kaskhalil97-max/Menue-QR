/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Cairo", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
      },
      colors: {
        sand: {
          50: "#fbf8f2",
          100: "#f5eedd",
          200: "#eae0c4",
          300: "#dbcc9e",
        },
        olive: {
          50: "#f3f6ec",
          100: "#e3ead1",
          200: "#c7d5a7",
          300: "#a4bb79",
          400: "#85a354",
          500: "#6b8a3d",
          600: "#52702e",
          700: "#405824",
          800: "#34461e",
          900: "#26330f",
          950: "#1a2409",
        },
        brick: {
          400: "#d97757",
          500: "#c1543a",
          600: "#a4432c",
          700: "#7e3220",
        },
        gold: {
          400: "#e8b84b",
          500: "#d9a227",
          600: "#b9841a",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(38, 51, 15, 0.06), 0 4px 16px -4px rgba(38, 51, 15, 0.10)",
        floating: "0 8px 24px -6px rgba(38, 51, 15, 0.25)",
      },
    },
  },
  plugins: [],
};
