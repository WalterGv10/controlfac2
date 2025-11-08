/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00d1b2",
        bg: "#0f1115",
        surface: "#161a22",
        text: "#e6e9ef",
        muted: "#9aa4b2",
      },
      borderRadius: {
        xl: "1rem",
      },
    },
  },
  plugins: [],
}
