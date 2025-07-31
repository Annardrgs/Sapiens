/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
          colors: {
            bkg: 'var(--color-bkg)',
            surface: 'var(--color-surface)',
            primary: 'var(--color-primary)',
            secondary: 'var(--color-secondary)',
            subtle: 'var(--color-subtle)',
            border: 'var(--color-border)',
            success: 'var(--color-success)',
            danger: 'var(--color-danger)',
            warning: 'var(--color-warning)',
          },
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
          },
      },
  },
    plugins: [],
}