/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Primary amber/orange theme from spec
        primary: {
          DEFAULT: '#FFBF00',
          50: '#FFF8E1',
          100: '#FFECB3',
          200: '#FFE082',
          300: '#FFD54F',
          400: '#FFCA28',
          500: '#FFBF00',
          600: '#E6AC00',
          700: '#CC9800',
          800: '#B38600',
          900: '#997300',
        },
        accent: {
          DEFAULT: '#FF7900',
          light: '#F2CF7E',
          pale: '#FFF8E1',
        },
        // Circle theme colors
        circle: {
          black: '#000000',
          blue: '#3B82F6',
          purple: '#8B5CF6',
          pink: '#EC4899',
          red: '#EF4444',
          orange: '#F97316',
          green: '#10B981',
          teal: '#14B8A6',
        },
        gray: {
          DEFAULT: '#6b7280',
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
    },
  },
  plugins: [],
};
