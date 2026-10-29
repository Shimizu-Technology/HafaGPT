/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  future: {
    // Touch devices fire :hover on tap and keep it; hover styles only apply
    // where a real pointer can hover.
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        // Small semantic contract. Existing palette aliases remain compatible.
        action: 'rgb(var(--action) / <alpha-value>)',
        'action-hover': 'rgb(var(--action-hover) / <alpha-value>)',
        'on-action': 'rgb(var(--on-action) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-subtle': 'rgb(var(--surface-subtle) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        'focus-role': 'rgb(var(--focus-role) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        'danger-hover': 'rgb(var(--danger-hover) / <alpha-value>)',
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
          950: '#451517',
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
          950: '#173334',
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
          950: '#1C1512',
          900: '#2A1F1A',  // Dark mode background
        },
        // Keep ocean for backward compatibility but add hibiscus
        ocean: {
          50: '#F0F9F9', 100: '#D9F1F1', 200: '#B8E6E6',
          300: '#88D5D6', 400: '#6BC3C4', 500: '#5DAFB0',
          600: '#4A8E8F', 700: '#3D7273', 800: '#355D5E',
          900: '#304E4F', 950: '#173334',
        },
        hibiscus: {
          50: '#FEF3F1',
          100: '#FCE7E3',
          200: '#F9CFC7',
          300: '#F5A598',
          400: '#F17B6A',
          500: '#E96757',  // Hibiscus flower red
          600: '#D8574A',
          700: '#B83730',
          800: '#96302E',
          900: '#7B2B2C',
          950: '#451517',
        },
      },
      // Motion contract: strong ease-out for UI that responds or enters,
      // strong ease-in-out for things moving on screen. Built-in CSS curves
      // feel sluggish. Durations stay under 300ms for interface feedback.
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.23, 1, 0.32, 1)',
        out: 'cubic-bezier(0.23, 1, 0.32, 1)',
        'in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',
        drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      // `scale` is the press-feedback property (see index.css). Including it
      // keeps press feedback smooth on elements that set their own transition.
      transitionProperty: {
        DEFAULT: 'color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter, scale',
        colors: 'color, background-color, border-color, text-decoration-color, fill, stroke, scale',
        opacity: 'opacity, scale',
        shadow: 'box-shadow, scale',
        transform: 'transform, scale',
      },
    },
  },
  plugins: [],
};
