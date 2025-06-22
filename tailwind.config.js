/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          500: '#6366f1',
          600: '#5b6cff',
          700: '#4f46e5',
          900: '#312e81',
        },
        kaspa: {
          blue: '#5B6CFF',
          purple: '#6366F1',
          dark: '#1a1a2e',
          darker: '#16213e',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'kaspa-gradient': 'linear-gradient(135deg, #5B6CFF 0%, #6366F1 100%)',
      },
    },
  },
  plugins: [],
}
