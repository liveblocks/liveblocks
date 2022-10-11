module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    // Each project's individual/local tsconfig.json defines the behavior
    // of the parser
    project: ["./tsconfig.json"],
  },

  plugins: [
    "@typescript-eslint",
    "eslint-plugin-import",
    "eslint-plugin-simple-import-sort",
  ],

  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],

  // Rules that are enabled for _all_ packages by default
};
