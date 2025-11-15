/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Yellow Submarine inspired color palette
        primary: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',  // Submarine yellow
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        submarine: {
          yellow: '#FFD700',
          'dark-yellow': '#FDB913',
          sky: '#67C3F3',
          ocean: '#3B9DD7',
          'deep-blue': '#1E40AF',
          coral: '#FF6B6B',
          'sunset': '#FF8C42',
        },
      },
    },
  },
  plugins: [],
}
