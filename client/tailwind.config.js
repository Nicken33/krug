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
          dark: '#1e1f22',
          sidebar: '#2b2d31',
          chat: '#313338',
          input: '#383a40',
          hover: '#35373c',
          brand: '#5865f2',
          green: '#23a55a',
          red: '#f23f43'
        }
      }
    },
  },
  plugins: [],
}
