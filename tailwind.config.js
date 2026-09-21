module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './presentations/**/*.html',
    './presentations/**/*.js',
    './shared/**/*.js'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      colors: {
        teal: {
          400: '#4fdbc8',
          500: '#6bd8cb'
        },
        primary: '#0f766e',
        secondary: '#6d28d9'
      }
    }
  }
};
