const colors = require('tailwindcss/colors')

module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      fontFamily: {
        sans: 'Inter, sans-serif'
      },
      colors: {
        gray: {
          ...colors.zinc,
          50: colors.gray[50],
          100: colors.gray[100],
          200: colors.gray[200],
          850: '#202022'
        },
      }
    }
  },
  variants: {
    extend: {
      transitionProperty: ['hover', 'focus']
    }
  },
  plugins: [],
}
