import { makeConfig } from "@liveblocks/eslint-config";
import commonRestrictedSyntax from "@liveblocks/eslint-config/restricted-syntax";

export default [
  ...makeConfig(import.meta.dirname),

  {
    rules: {
      "no-restricted-syntax": [
        "error",
        ...commonRestrictedSyntax,
        {
          selector: "TSNonNullExpression",
          message:
            "Non-null assertions mask real problems. Please use `nn(...)` (from src/lib/assert.ts) instead.",
        },
      ],
    },
  },

  {
    files: ["src/__tests__/**"],
    rules: {
      "no-restricted-syntax": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },
];
