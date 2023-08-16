module.exports = {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      boxShadow: {
        sm: "0 0 0 1px rgb(0 0 0 / 4%)",
        DEFAULT: "0 0 0 1px rgb(0 0 0 / 4%), 0 4px 16px rgb(0 0 0 / 6%)",
        md: "0 0 0 1px rgb(0 0 0 / 4%), 0 2px 6px rgb(0 0 0 / 4%), 0 8px 26px rgb(0 0 0 / 6%)",
        lg: "0 0 0 1px rgb(0 0 0 / 4%), 0 2px 6px rgb(0 0 0 / 6%), 0 8px 26px rgb(0 0 0 / 9%)",
        xl: "0 0 0 1px rgb(0 0 0 / 4%), 0 2px 6px rgb(0 0 0 / 8%), 0 8px 26px rgb(0 0 0 / 12%)",
        "2xl":
          "0 0 0 1px rgb(0 0 0 / 4%), 0 2px 6px rgb(0 0 0 / 8%), 0 8px 26px rgb(0 0 0 / 12%), 0 12px 36px rgb(0 0 0 / 12%)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
