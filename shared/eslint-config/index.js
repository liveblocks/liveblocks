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
  rules: {
    "@typescript-eslint/no-explicit-any": "error",

    // -------------------------------
    // Not interested in these checks:
    // -------------------------------
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-inferrable-types": "off",
    "no-constant-condition": "off",
    "@typescript-eslint/no-non-null-assertion": "off", // Because we have a custom no-restricted-syntax rule for this

    // -----------------------------
    // Enable auto-fixes for imports
    // -----------------------------
    "import/no-duplicates": "error",
    "@typescript-eslint/consistent-type-imports": "error",
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",

    // ------------------------
    // Customized default rules
    // ------------------------
    eqeqeq: ["error", "always"],
    quotes: ["error", "double", "avoid-escape"],
    "object-shorthand": "error",
    "@typescript-eslint/explicit-module-boundary-types": "error",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      // Unused variables are fine if they start with an underscore
      { args: "all", argsIgnorePattern: "^_.*", varsIgnorePattern: "^_.*" },
    ],

    // --------------------------------------------------------------
    // "The Code is the To-Do List"
    // https://www.executeprogram.com/blog/the-code-is-the-to-do-list
    // --------------------------------------------------------------
    "no-warning-comments": ["error", { terms: ["xxx"], location: "anywhere" }],
  },
};
