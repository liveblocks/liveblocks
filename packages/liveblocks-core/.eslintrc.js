const rulesDirPlugin = require("eslint-plugin-rulesdir");
rulesDirPlugin.RULES_DIR = "./rules";

module.exports = {
  root: true,
  plugins: ["eslint-plugin-rulesdir"],
  extends: ["@liveblocks/eslint-config"],
  rules: {
    // ----------------------------------------------------------------------
    // NOTE: Only temporarily turned off!
    // These checks are still GOOD IDEAS to re-enable later on, but for right
    // now they're too noisy to enable.
    // ----------------------------------------------------------------------
    "@typescript-eslint/no-explicit-any": "off",

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

    // -------------------------------
    // Custom syntax we want to forbid
    // -------------------------------
    "rulesdir/console-must-be-fancy": "error",
    "no-restricted-syntax": [
      "error",
      {
        selector: "PrivateIdentifier",
        message:
          "Avoid private identifiers to reduce bundle size. Instead of using `#foo`, prefer using `private _foo`.",
      },
      {
        selector:
          "CallExpression[callee.object.name='JSON'][callee.property.name='parse']",
        message:
          "Using `JSON.parse()` is type-unsafe. Prefer using the `tryParseJson()` utility method (from `src/utils`).",
      },
      {
        selector: "TSNonNullExpression",
        message:
          "Non-null assertions mask real problems. Please use `nn(...)` (from src/assert.ts) instead.",
      },
      {
        selector: 'TSTypeReference[typeName.name="AbstractCrdt"]',
        message: "Don't refer to AbstractCrdt as a type. Use LiveNode instead.",
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
  overrides: [
    {
      files: ["src/__tests__/**"],

      // Special config for test files
      rules: {
        "no-restricted-syntax": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",
      },
    },
  ],
};
