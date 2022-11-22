const plugin = require("tailwindcss/plugin");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.tsx"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        current: "currentColor",
        brand: {
          light: "#9f8dfc",
          dark: "#5746af",
        },
        light: {
          0: "#fff",
          100: "#f8f9f9",
          200: "#f1f3f4",
          300: "#ebecee",
          400: "#e1e3e6",
          500: "#d7dade",
          600: "#cfd2d6",
          700: "#c5c8cd",
          800: "#babcc0",
          900: "#adb0b5",
        },
        dark: {
          0: "#17171a",
          100: "#202023",
          200: "#292a2d",
          300: "#35363a",
          400: "#444549",
          500: "#56595c",
          600: "#66686c",
          700: "#75787b",
          800: "#86888c",
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
