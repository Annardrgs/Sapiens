// Arquivo: tailwind.config.js (Modificado)

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            // ADICIONADO: Paleta de cores customizada do painel financeiro
            colors: {
              bkg: '#0D1117',
              surface: '#161B22',
              primary: '#58A6FF',
              secondary: '#F0F6FC',
              subtle: '#8B949E',
              border: '#30363D',
              success: '#3FB950',
              danger: '#F85149',
            },
            // ADICIONADO: Fonte customizada do painel financeiro
            fontFamily: {
              sans: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}