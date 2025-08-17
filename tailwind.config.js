/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif','system-ui','Inter','Segoe UI','Roboto','sans-serif'],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.06)",
      },
      backgroundImage: {
        shelf:
          "radial-gradient(ellipse at 50% -20%, rgba(0,0,0,.08), transparent 60%), linear-gradient(0deg, rgba(0,0,0,.06), rgba(0,0,0,.06))",
      },
    },
  },
  plugins: [],
}