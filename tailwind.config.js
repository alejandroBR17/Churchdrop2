/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./main.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./types.ts"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        neutral: {50:'#f5f7fb',100:'#edf1f7',200:'#dce3ed',300:'#bdc8d8',400:'#8795aa',500:'#65758c',600:'#4d5c73',700:'#34435a',800:'#243247',900:'#142034',950:'#0b1424'},
        univer: {
          blue: '#2563eb',     // Azul Royal (Primary)
          blueDark: '#1e3a8a', // Azul Profundo (Backgrounds/Headers)
          gold: '#fbbf24',     // Dourado (Accent)
          black: '#0a0a0a',    // Preto Profundo
          gray: '#171717',     // Cinza Escuro
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pull-down': 'pullDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pullDown: {
            '0%': { transform: 'translateY(-20px)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}