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
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          500: '#2563eb',
          600: '#1d4ed8', // SVCE Official Royal Blue
          700: '#1e40af', // SVCE Deep Blue
          800: '#1e3a8a',
          900: '#172554',
        },
        svceOrange: {
          DEFAULT: '#f97316', // SVCE Official Laurel Leaf Orange
          light: '#fff7ed',
          dark: '#ea580c',
          border: '#ffedd5'
        },
        success: {
          DEFAULT: '#16A34A',
          light: '#DCFCE7',
          dark: '#15803D'
        },
        warning: {
          DEFAULT: '#D97706',
          light: '#FEF3C7',
          dark: '#B45309'
        },
        danger: {
          DEFAULT: '#DC2626',
          light: '#FEE2E2',
          dark: '#B91C1C'
        },
        erpBg: '#F8FAFC'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'erp': '8px',
      }
    },
  },
  plugins: [],
}
