/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#A47DAB', // Lilás solicitado
          hover: '#8E6595',
          light: '#F5EFF6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'sans-serif'],
      }
    },
  },
  plugins: [],
}