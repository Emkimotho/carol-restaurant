// tailwind.config.js
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',        // Next.js app folder
    './components/**/*.{js,ts,jsx,tsx}',   // Components folder
    './contexts/**/*.{js,ts,jsx,tsx}',     // Contexts folder
    './services/**/*.{js,ts,jsx,tsx}',     // Services folder
    './utils/**/*.{js,ts,jsx,tsx}',        // Utils folder
    './styles/**/*.css',                  // All CSS files in the styles folder
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary-color)',
        'primary-hover': 'var(--primary-color-hover)',
        secondary: 'var(--secondary-color)',
        'secondary-hover': 'var(--secondary-color-hover)',
        white: 'var(--white)',
        black: 'var(--black)',
        gray: {
          ...defaultTheme.colors.gray,
          hover: 'var(--gray-hover)',
          light: 'var(--light-gray)',
          dark: 'var(--dark-gray)',
        },
        'border-color': 'var(--border-color)',
        'border-color-dark': 'var(--border-color-dark)',
      },
      fontFamily: {
        body: ['var(--font-body)', 'sans-serif'],
        heading: ['var(--font-heading)', 'sans-serif'],
      },
      boxShadow: {
        primary: 'var(--box-shadow-primary)',
        secondary: 'var(--box-shadow-secondary)',
      },
      spacing: {
        navbar: 'var(--navbar-height)',
        container: 'var(--container-width)',
      },
    },
  },
  plugins: [],
};
