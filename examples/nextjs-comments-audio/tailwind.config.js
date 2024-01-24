/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        accent: "#FA233B",
        icon: "#242527",
      },
      textColor: {
        primary: "#F3F3F3",
        secondary: "#9F9FA1",
        tertiary: "#69696B",
        inverse: "#242527",
      },
      backgroundColor: {
        primary: "#242527",
        secondary: "#2A2B2D",
        tertiary: "#343537",
        quaternary: "#404144",
        inverse: "#F3F3F3",
      },
      borderColor: {
        primary: "#343436",
        background: "#242527",
      },
      transitionTimingFunction: {
        "out-back": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
      },
    },
  },
  plugins: [],
};
