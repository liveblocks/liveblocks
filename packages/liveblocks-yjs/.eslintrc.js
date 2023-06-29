const commonRestrictedSyntax = require("@liveblocks/eslint-config/restricted-syntax");

module.exports = {
  root: true,
  extends: ["@liveblocks/eslint-config"],
  rules: {
    // -------------------------------
    // Custom syntax we want to forbid
    // -------------------------------
    "no-restricted-syntax": ["error", ...commonRestrictedSyntax],

    // ----------------------------------------------------------------------
    // Overrides from default rule config used in all other projects!
    // ----------------------------------------------------------------------
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    eqeqeq: "off",

    // ----------------------------------------------------------------------
    // Extra rules for this project specifically
    // ----------------------------------------------------------------------
    /* None yet 😇 ! */
  },

  overrides: [
    {
      files: ["src/__tests__/**"],

      // Special config for test files
      rules: {
        // Ideally, enable these lint rules again later, as they are useful
        // to catch bugs
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        // "@typescript-eslint/no-unsafe-call": "off",
        // "@typescript-eslint/no-unsafe-member-access": "off",
        // "@typescript-eslint/no-unsafe-return": "off",
      },
    },
  ],
};
