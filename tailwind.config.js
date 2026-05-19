/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // V2 Font Families
      fontFamily: {
        sans: ['Inter Tight', 'System'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      // V2 Border Radius Scale - updated May 2026
      borderRadius: {
        'sm': '12px',    // Small elements
        'md': '14px',    // Buttons
        'lg': '28px',    // Cards (main card radius)
        'full': '9999px', // Pills, buttons, avatars
      },
      // V2 Spacing Scale (8px grid)
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'base': '16px',
        'lg': '24px',
        'xl': '40px',
        'section': '64px',
      },
      colors: {
        // V2 Design tokens from webapp - May 2026
        background: '#F5F3EF',  // bg from spec
        card: '#FFFFFF',        // Pure white cards
        ink: '#1A1A1A',         // Primary text (updated)
        'ink-soft': '#6B6B6B',  // Muted text (updated)
        rule: 'rgba(0,0,0,0.06)', // Subtle borders

        // Primary yellow (prompts, CTAs)
        primary: {
          DEFAULT: '#F7DA21',
          50: '#FFFDF0',
          100: '#FFFBE0',
          200: '#FFF7C0',
          300: '#FFF3A1',
          400: '#FFEF81',
          500: '#F7DA21',
          600: '#DEC41E',
          700: '#C5AD1A',
          800: '#AC9617',
          900: '#937F14',
        },
        yellow: {
          DEFAULT: '#F7DA21',
          pale: '#FBE893',
        },
        // Functional accent colors
        green: {
          DEFAULT: '#6AAA64',
          pale: '#E8F1E0',
        },
        purple: {
          DEFAULT: '#8E73C9',
          light: '#B8A4DB',
        },
        blue: '#4F8FE0',
        coral: {
          DEFAULT: '#F26E5E',
          light: '#F9A99E',
        },
        sand: '#F2EBDD',
        gold: '#C28F2C',
        teal: '#1A6B5E',
        orange: '#F2A93B',

        // Legacy accent (for backwards compatibility)
        accent: {
          DEFAULT: '#F7DA21',
          light: '#FBE893',
          pale: '#FFFDF0',
        },
        // Circle theme colors
        circle: {
          black: '#000000',
          blue: '#4F8FE0',
          purple: '#8E73C9',
          pink: '#EC4899',
          red: '#F26E5E',
          orange: '#F2A93B',
          green: '#6AAA64',
          teal: '#1A6B5E',
        },
        gray: {
          DEFAULT: '#6B6760',
          50: '#FBFAF7',
          100: '#F5F4F1',
          200: '#EDECEA',
          300: '#D5D4D2',
          400: '#9ca3af',
          500: '#6B6760',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111111',
        },
      },
    },
  },
  plugins: [],
};
