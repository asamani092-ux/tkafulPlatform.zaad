/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 
          50: "#fdf2f4", 
          100: "#f7e8ea", 
          500: "#7C2330", 
          600: "#711f2c", 
          700: "#6B1E2A" 
        }
      },
      fontFamily: { 
        cairo: ['"Cairo"', 'sans-serif'] 
      },
      transitionTimingFunction: {
        'in-expo': 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
        'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
      },
      keyframes: {
        fadeIn: { 
          '0%': { opacity: 0 }, 
          '100%': { opacity: 1 } 
        },
        slideUp: { 
          '0%': { transform: 'translateY(10px)', opacity: 0 }, 
          '100%': { transform: 'translateY(0)', opacity: 1 } 
        },
        pulseSoft: { 
          '0%, 100%': { opacity: 1 }, 
          '50%': { opacity: .8 } 
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.6s ease-out',
        slideUp: 'slideUp 0.6s ease-out',
        pulseSoft: 'pulseSoft 2s ease-in-out infinite',
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem"
      },
      boxShadow: {
        soft: "0 2px 10px rgba(0,0,0,0.06)"
      }
    },
  },
  plugins: [],
}
