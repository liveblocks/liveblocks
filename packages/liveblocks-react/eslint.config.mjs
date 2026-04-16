import { makeConfig } from "@liveblocks/eslint-config";
import commonRestrictedSyntax from "@liveblocks/eslint-config/restricted-syntax";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  ...makeConfig(),

  {
    plugins: {
      "react-hooks": reactHooks,
    },

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

      // TODO: New rules in typescript-eslint v8's recommendedTypeChecked
      // that weren't in v7. Disabled during the v8 migration to keep it
      // clean, but we should revisit and enable these later.
      "@typescript-eslint/only-throw-error": "off",
      "@typescript-eslint/prefer-promise-reject-errors": "off",

      // ----------------------------------------------------------------------
      // Extra rules for this project specifically
      // ----------------------------------------------------------------------

      // Enforce React best practices
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },

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
];
