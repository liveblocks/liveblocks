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
        quaternary: "#3B3C3F",
        inverse: "#F3F3F3",
      },
      borderColor: {
        primary: "#343436",
        background: "#242527",
      },
      boxShadow: {
        popover: "rgba(0,0,0,0.09) 0px 3px 12px",
      },
      transitionTimingFunction: {
        "out-back": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};
