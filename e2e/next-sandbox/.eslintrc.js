const commonRestrictedSyntax = require("@liveblocks/eslint-config/restricted-syntax");

module.exports = {
  root: true,
  extends: ["@liveblocks/eslint-config"],
  rules: {
    // -------------------------------
    // Custom syntax we want to forbid
    // -------------------------------
    "no-restricted-syntax": ["error", ...commonRestrictedSyntax],
    // {
    //   selector:
    //     "CallExpression[callee.object.name='JSON'][callee.property.name='parse']",
    //   message:
    //     "Using `JSON.parse()` is type-unsafe. Prefer using the `tryParseJson()` utility method (from `src/utils`).",
    // },
    // {
    //   selector: "TSNonNullExpression",
    //   message:
    //     "Non-null assertions mask real problems. Please use `nn(...)` (from src/assert.ts) instead.",
    // },

    // ----------------------------------------------------------------------
    // Overrides from default rule config used in all other projects!
    // ----------------------------------------------------------------------
    "@typescript-eslint/explicit-module-boundary-types": "off", // Not really needed as we're not working on a library here

    // ----------------------------------------------------------------------
    // Extra rules for this project specifically
    // ----------------------------------------------------------------------
    // (Nothing yet.)
  },
  overrides: [
    {
      files: ["test/**"],

      // Special config for test files
      rules: {
        // Disabling nags about {} unpacking, which is apparently needed for Playwright
        "no-empty-pattern": "off",

        // "no-restricted-syntax": "off",
        // "@typescript-eslint/explicit-module-boundary-types": "off",
        // Ideally, we should remove these overrides, since they are still
        // useful to catch bugs
        // "@typescript-eslint/no-unsafe-argument": "off",
        // "@typescript-eslint/no-unsafe-assignment": "off",
        // "@typescript-eslint/no-unsafe-call": "off",
        // "@typescript-eslint/no-unsafe-member-access": "off",
      },
    },
  ],
};
