// const commonRestrictedSyntax = require("@liveblocks/eslint-config/restricted-syntax");

module.exports = {
  root: true,
  extends: ["@liveblocks/eslint-config"],
  rules: {
    // -------------------------------
    // Custom syntax we want to forbid
    // -------------------------------
    // "no-restricted-syntax": ["error", ...commonRestrictedSyntax],

    // ----------------------------------------------------------------------
    // Overrides from default rule config used in all other projects!
    // ----------------------------------------------------------------------
    "@typescript-eslint/explicit-module-boundary-types": "off",

    // ----------------------------------------------------------------------
    // Extra rules for this project specifically
    // ----------------------------------------------------------------------
    /* None yet 😇 ! */
  },
};
