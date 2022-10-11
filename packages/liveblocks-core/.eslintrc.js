const commonRestrictedSyntax = require("@liveblocks/eslint-config/restricted-syntax");

const rulesDirPlugin = require("eslint-plugin-rulesdir");
rulesDirPlugin.RULES_DIR = "./rules";

module.exports = {
  root: true,
  plugins: ["eslint-plugin-rulesdir"],
  extends: ["@liveblocks/eslint-config"],
  rules: {
    // -------------------------------
    // Custom syntax we want to forbid
    // -------------------------------
    "no-restricted-syntax": [
      "error",
      ...commonRestrictedSyntax,
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
    ],

    // ----------------------------------------------------------------------
    // Overrides from default rule config used in all other projects!
    // ----------------------------------------------------------------------
    "@typescript-eslint/no-explicit-any": "off",

    // ----------------------------------------------------------------------
    // Extra rules for this project specifically
    // ----------------------------------------------------------------------

    // Always use fancy console logging (with the Liveblocks logo in there)
    "rulesdir/console-must-be-fancy": "error",
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
