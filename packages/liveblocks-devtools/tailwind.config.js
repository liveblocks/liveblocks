const plugin = require("tailwindcss/plugin");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.tsx"],
  darkMode: "class",
  theme: {
    colors: {
      current: "currentColor",
      transparent: "transparent",
      black: "#000",
      white: "#fff",
      brand: {
        400: "#8d7bf4",
        500: "#6050bd",
      },
      red: {
        400: "#fb7185",
        500: "#f43f5e",
      },
      green: {
        400: "#a3e635",
        500: "#84cc16",
      },
      blue: {
        400: "#60a5fa",
        500: "#3b82f6",
      },
      orange: {
        400: "#fbbf24",
        500: "#f59e0b",
      },
      teal: {
        400: "#2dd4bf",
        500: "#14b8a6",
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
    extend: {
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
    plugin(({ addVariant }) => {
      addVariant("tree-focus", ".tree:focus-within &");
    }),
  ],
};
