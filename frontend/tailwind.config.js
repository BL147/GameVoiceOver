/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        studio: {
          900: '#0B0F17',
          800: '#111827',
          750: '#161F33',
          700: '#1F2937',
          600: '#374151',
          500: '#4B5563',
          accent: '#6366F1', // Indigo studio accent
          'accent-hover': '#4F46E5',
          gold: '#F59E0B'
        }
      }
    },
  },
  plugins: [],
}
