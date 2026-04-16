import { makeConfig } from "@liveblocks/eslint-config";
import commonRestrictedSyntax from "@liveblocks/eslint-config/restricted-syntax";

import consoleMustBeFancy from "./rules/console-must-be-fancy.cjs";

export default [
  ...makeConfig(),

  {
    plugins: {
      local: {
        rules: {
          "console-must-be-fancy": consoleMustBeFancy,
        },
      },
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
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/unbound-method": "off",

      // TODO: New rules in typescript-eslint v8's recommendedTypeChecked
      // that weren't in v7. Disabled during the v8 migration to keep it
      // clean, but we should revisit and enable these later.
      "@typescript-eslint/only-throw-error": "off",
      "@typescript-eslint/prefer-promise-reject-errors": "off",
      "@typescript-eslint/no-duplicate-type-constituents": "off",
      "@typescript-eslint/no-unused-expressions": "off",

      // ----------------------------------------------------------------------
      // Extra rules for this project specifically
      // ----------------------------------------------------------------------

      // Always use fancy console logging (with the Liveblocks logo in there)
      "local/console-must-be-fancy": "error",
    },
  },

  {
    files: ["src/**/__tests__/**", "e2e/**"],

    // Special config for test files
    rules: {
      "no-restricted-syntax": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",

      // Ideally, we should remove these overrides, since they are still
      // useful to catch bugs
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",

      // No need for fancy console logging in tests
      "local/console-must-be-fancy": "off",
    },
  },
];
