/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#08090D',
        surface: {
          primary: '#12141B',
          secondary: '#1B1E28',
          elevated: '#242836'
        },
        brand: {
          green: '#1ED760',
          purple: '#8B5CF6',
          blue: '#3B82F6',
          cyan: '#06B6D4'
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#A1A1AA',
          muted: '#71717A'
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'equalizer-1': 'equalizer 0.8s ease-in-out infinite alternate',
        'equalizer-2': 'equalizer 1.2s ease-in-out infinite alternate',
        'equalizer-3': 'equalizer 0.6s ease-in-out infinite alternate',
        'equalizer-4': 'equalizer 1.0s ease-in-out infinite alternate',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 15px rgba(30, 215, 96, 0.6))' },
          '50%': { opacity: '0.7', filter: 'drop-shadow(0 0 5px rgba(30, 215, 96, 0.3))' },
        },
        equalizer: {
          '0%': { height: '15%' },
          '100%': { height: '100%' }
        }
      }
    },
  },
  plugins: [],
}

