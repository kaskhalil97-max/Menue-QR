/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        olive: {
          50: "#f4f6ee",
          100: "#e6ebd6",
          200: "#cdd8b0",
          300: "#adbf82",
          400: "#8fa85c",
          500: "#6f8a3f",
          600: "#556c30",
          700: "#425428",
          800: "#374423",
          900: "#2f3a20",
        },
        brick: {
          500: "#c1543a",
          600: "#a4432c",
        },
      },
    },
  },
  plugins: [],
};
