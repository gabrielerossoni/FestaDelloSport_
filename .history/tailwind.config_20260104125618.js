/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./privacy.html", "./js/**/*.js"],
  theme: {
    extend: {
      fontFamily: {
        montserrat: ["Montserrat", "sans-serif"],
        playfair: ["Playfair Display", "serif"],
      },
    },
  },
  plugins: [],
};
