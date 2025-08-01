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
          keyframes: {
            'fade-in-down': {
              '0%': { opacity: '0', transform: 'translateY(-10px)' },
              '100%': { opacity: '1', transform: 'translateY(0)' },
            },
            'fade-out-up': {
              'from': { opacity: '1', transform: 'translateY(0)' },
              'to': { opacity: '0', transform: 'translateY(-10px)' },
            }
          },
          animation: {
            'fade-in-down': 'fade-in-down 0.3s ease-out forwards',
            'fade-out-up': 'fade-out-up 0.3s ease-in forwards',
          }
      },
  },
    plugins: [],
}