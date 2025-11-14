/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // New tropical color palette inspired by HafaGPT icon
        coral: {
          50: '#FEF3F1',
          100: '#FCE7E3',
          200: '#F9CFC7',
          300: '#F5A598',
          400: '#F17B6A',
          500: '#E85D4B',  // Main coral - from icon circle
          600: '#D84639',
          700: '#B83730',
          800: '#96302E',
          900: '#7B2B2C',
        },
        teal: {
          50: '#F0F9F9',
          100: '#D9F1F1',
          200: '#B8E6E6',
          300: '#88D5D6',
          400: '#6BC3C4',
          500: '#5DAFB0',  // Main teal - from icon robot
          600: '#4A8E8F',
          700: '#3D7273',
          800: '#355D5E',
          900: '#304E4F',
        },
        cream: {
          50: '#FEFDFB',
          100: '#FFF8F0',  // Light mode surface
          200: '#F5E6D3',  // Light mode background - from icon
          300: '#E8D4BC',
          400: '#D9BFA0',
          500: '#C9A883',
          600: '#B18E68',
          700: '#8F7050',
          800: '#6F5540',
          900: '#584436',
        },
        brown: {
          50: '#F7F3F0',
          100: '#E8DED6',
          200: '#D4BFB0',
          300: '#B89B85',
          400: '#9D7A5F',
          500: '#76593E',
          600: '#5A4430',
          700: '#453428',  // Dark mode surfaces
          800: '#3A2A1D',  // Main brown - from icon outlines
          900: '#2A1F1A',  // Dark mode background
        },
        // Keep ocean for backward compatibility but add hibiscus
        ocean: {
          500: '#5DAFB0',  // Map to teal
          600: '#4A8E8F',
        },
        hibiscus: {
          400: '#F17B6A',
          500: '#E96757',  // Hibiscus flower red
          600: '#D8574A',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
