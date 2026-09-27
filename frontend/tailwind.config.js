/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef4ff",
          100: "#d9e6ff",
          300: "#a3c0ff",
          500: "#3d6bff",
          600: "#2a52e0",
          700: "#1f3fb0",
          900: "#152a75",
        },
      },
    },
  },
  plugins: [],
};
