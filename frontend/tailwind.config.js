/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          dark: '#1e2030',
          darker: '#171928',
          darkest: '#12141f',
          mid: '#252839',
          light: '#2e3148',
          lighter: '#383c55',
          blurple: '#6c5ce7',
          blurpleHover: '#5a4bd6',
          green: '#00d4aa',
          greenHover: '#00b894',
          red: '#ff4757',
          yellow: '#ffa502',
          white: '#f0f0f5',
          gray: '#8b8fa3',
          text: '#d1d3e0',
          muted: '#6b7094',
          accent: '#00d4aa',
          gradient1: '#6c5ce7',
          gradient2: '#a855f7',
          gradient3: '#00d4aa',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Whitney', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
