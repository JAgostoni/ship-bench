/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0066CC",
        "primary-hover": "#004999",
        "gray-light": "#F5F7FA",
        "gray-medium": "#E1E4E8",
        "gray-dark": "#6A737D",
        success: "#28A745",
        warning: "#D73A49"
      },
      spacing: {
        unit: "8px"
      },
      borderRadius: {
        DEFAULT: "4px"
      }
    }
  },
  plugins: []
};
