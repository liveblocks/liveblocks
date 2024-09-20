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
          "ImportDeclaration[source.value='react'] ImportSpecifier[imported.name='useSyncExternalStore']",
        message:
          "useSyncExternalStore is only available on React >=18. Import it from 'use-sync-external-store/shim/index.js' instead.",
      },
      {
        selector:
          "ImportDeclaration[source.value='react'] ImportSpecifier[imported.name='useId']",
        message: "useId is only available on React >=18.",
      },
      {
        selector:
          "ImportDeclaration[source.value='react'] ImportSpecifier[imported.name='useTransition']",
        message: "useTransition is only available on React >=18.",
      },
      {
        selector:
          "ImportDeclaration[source.value='react'] ImportSpecifier[imported.name='useDeferredValue']",
        message: "useDeferredValue is only available on React >=18.",
      },
      {
        selector:
          "ImportDeclaration[source.value='react'] ImportSpecifier[imported.name='useInsertionEffect']",
        message: "useInsertionEffect is only available on React >=18.",
      },
    ],

    // Enforce React best practices
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "error",
  },
};
