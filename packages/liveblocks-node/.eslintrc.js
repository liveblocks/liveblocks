module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { project: ["./tsconfig.json"] },
  plugins: [
    "@typescript-eslint",
    "eslint-plugin-import",
    "eslint-plugin-simple-import-sort",
  ],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  rules: {
    // -------------------------------
    // Not interested in these checks:
    // -------------------------------
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-inferrable-types": "off",

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
    "@typescript-eslint/no-unused-vars": [
      "warn",
      // Unused variables are fine if they start with an underscore
      { argsIgnorePattern: "^_.*", varsIgnorePattern: "^_.*" },
    ],

    // --------------------------------------------------------------
    // "The Code is the To-Do List"
    // https://www.executeprogram.com/blog/the-code-is-the-to-do-list
    // --------------------------------------------------------------
    "no-warning-comments": ["error", { terms: ["xxx"], location: "anywhere" }],

    // -------------------------------
    // Custom syntax we want to forbid
    // -------------------------------
    "object-shorthand": "error",
    "no-restricted-syntax": [
      "error",
      {
        selector: "PrivateIdentifier",
        message:
          "Avoid private identifiers to reduce bundle size. Instead of using `#foo`, prefer using `private _foo`.",
      },
      // {
      //   selector: "ForOfStatement",
      //   message:
      //     "Avoid for..of loops in libraries, because they generate unneeded Babel iterator runtime support code in the bundle",
      // },
      // {
      //   selector: "ForInStatement",
      //   message:
      //     "for..in loops are never what you want. Loop over Object.keys() instead.",
      // },
    ],
  },
};
