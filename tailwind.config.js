
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bjj: {
          bg: '#0a0a0a',
          surface: '#1a1a1a',
          surfaceHover: '#2a2a2a',
          accent: '#D4A843',
          accentHover: '#b89035',
          text: '#f3f4f6',
          textMuted: '#9ca3af',
          border: '#333333'
        }
      },
      fontFamily: {
        heading: ['"Bebas Neue"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
