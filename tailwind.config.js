/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        outfit: ['"Plus Jakarta Sans"', 'Outfit', 'sans-serif'],
      },
      colors: {
        // Primary Brand
        primary: {
          DEFAULT: '#003f87',
          light: '#0076d3',
          dark: '#002855',
        },
        accent: '#0076d3',

        // Backgrounds
        bg: {
          light: '#f8fafc',
          dark: '#0f172a',
        },

        // Cards
        card: {
          light: '#ffffff',
          dark: 'rgba(255, 255, 255, 0.08)',
        },

        // Borders
        border: {
          light: '#e2e8f0',
          dark: 'rgba(255, 255, 255, 0.12)',
        },

        // Text
        text: {
          light: '#0f172a',
          dark: '#f8fafc',
        },
        'text-secondary': {
          light: '#64748b',
          dark: '#94a3b8',
        },
        // Legacy/Utility mappings for compatibility
        secondary: '#0076d3',
        'bg-light': '#f8fafc',
        'bg-dark': '#0f172a',
        'card-light': '#ffffff',
        'card-dark': 'rgba(255, 255, 255, 0.08)',
        'text-light': '#0f172a',
        'text-dark': '#f8fafc',
        'text-secondary-light': '#64748b',
        'text-secondary-dark': '#94a3b8',
        'border-light': '#e2e8f0',
        'border-dark': 'rgba(255, 255, 255, 0.12)',
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 25px rgba(0, 0, 0, 0.1)',
        soft: '0 10px 40px -10px rgba(0,0,0,0.08)',
        glow: '0 0 20px rgba(0, 63, 135, 0.4)',
        'button-glow': '0 0 15px rgba(0, 118, 211, 0.5)',
      },
      backgroundImage: {
        'premium-gradient': 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        'button-gradient': 'linear-gradient(135deg, #003f87 0%, #0076d3 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
