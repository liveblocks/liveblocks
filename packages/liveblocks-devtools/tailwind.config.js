const plugin = require("tailwindcss/plugin");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.tsx"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        current: "currentColor",
        light: {
          0: "#fff",
          100: "#f8f9f9",
          200: "#F1F3F4",
          300: "#EBECEE",
          400: "#E1E3E6",
          500: "#D7DADE",
          600: "#CFD2D6",
          700: "#C5C8CD",
          800: "#BABCC0",
          900: "#ADB0B5",
        },
        dark: {
          0: "#17171a",
          100: "#202023",
          200: "#292A2D",
          300: "#35363A",
          400: "#444549",
          500: "#56595C",
          600: "#66686C",
          700: "#75787B",
          800: "#86888C",
          900: "#949598",
        },
      },
      fontSize: {
        "2xs": [
          "0.65rem",
          {
            lineHeight: 1,
          },
        ],
        "3xs": [
          "0.55rem",
          {
            lineHeight: 1,
          },
        ],
      },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities(
        {
          ".scrollbar-hidden": {
            "-ms-overflow-style": "none",
            "scrollbar-width": "none",
            "&::-webkit-scrollbar": {
              display: "none",
            },
          },
          ".scrollbar-auto": {
            "-ms-overflow-style": "auto",
            "scrollbar-width": "auto",
            "&::-webkit-scrollbar": {
              display: "block",
            },
          },
        },
        ["responsive"]
      );
    }),
  ],
};
