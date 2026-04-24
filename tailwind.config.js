/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050505",
        "glass-border": "rgba(255, 255, 255, 0.1)",
        "glass-bg": "rgba(10, 10, 10, 0.4)",
      },
      fontFamily: {
        sans: ['Geist Variable', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
