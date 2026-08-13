import { makeConfig } from "@liveblocks/eslint-config";
import commonRestrictedSyntax from "@liveblocks/eslint-config/restricted-syntax";

export default [
  ...makeConfig(),
  {
    rules: {
      "no-restricted-syntax": ["error", ...commonRestrictedSyntax],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-misused-promises": "off",
    },
  },
  {
    files: ["src/**/__tests__/**"],
    rules: {
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-floating-promises": "off",
    },
  },
];
