const commonRestrictedSyntax = require("@liveblocks/eslint-config/restricted-syntax");

module.exports = {
  root: true,
  extends: ["@liveblocks/eslint-config"],
  plugins: ["react-hooks"],
  rules: {
    // -------------------------------
    // Custom syntax we want to forbid
    // -------------------------------
    "no-restricted-syntax": [
      "error",
      ...commonRestrictedSyntax,
      {
        selector:
          "ImportDeclaration[source.value='react'] ImportSpecifier[imported.name='use']",
        message: "use is only available on React >=19.",
      },
      {
        selector:
          "ImportDeclaration[source.value='react'] ImportSpecifier[imported.name='useLayoutEffect']",
        message:
          "useLayoutEffect triggers a warning when executed on the server on React <=18.2.0. Import it from './lib/use-layout-effect' instead.",
      },
    ],

    // ----------------------------------------------------------------------
    // Overrides from default rule config used in all other projects!
    // ----------------------------------------------------------------------
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/unbound-method": "off",

    // ----------------------------------------------------------------------
    // Extra rules for this project specifically
    // ----------------------------------------------------------------------

    // Enforce React best practices
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "error",
  },

  overrides: [
    {
      files: ["src/**/__tests__/**"],

      rules: {
        // Ideally, enable these lint rules again later, as they are useful to
        // catch bugs
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
        "@typescript-eslint/no-unsafe-return": "off",
        "@typescript-eslint/unbound-method": "off",
        "@typescript-eslint/no-floating-promises": "off",
        "@typescript-eslint/require-await": "off", // Fine in test mocks
      },
    },
  ],
};
