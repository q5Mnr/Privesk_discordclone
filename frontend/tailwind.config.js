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
          dark: '#111a33',
          darker: '#0c1426',
          darkest: '#070d1c',
          mid: '#16223f',
          light: '#20305a',
          lighter: '#2c4272',
          blurple: '#2f80ed',
          blurpleHover: '#1f6fe0',
          green: '#2dd4bf',
          greenHover: '#14b8a6',
          red: '#f43f5e',
          yellow: '#fbbf24',
          white: '#eaf6ff',
          gray: '#8fb3d9',
          text: '#cfe6ff',
          muted: '#5f7ea8',
          accent: '#22d3ee',
          gradient1: '#3b82f6',
          gradient2: '#22d3ee',
          gradient3: '#67e8f9',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Whitney', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
