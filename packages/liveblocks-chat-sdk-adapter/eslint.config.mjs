import { makeConfig } from "@liveblocks/eslint-config";
import commonRestrictedSyntax from "@liveblocks/eslint-config/restricted-syntax";

export default [
  ...makeConfig(),

  {
    rules: {
      // -------------------------------
      // Custom syntax we want to forbid
      // -------------------------------
      "no-restricted-syntax": ["error", ...commonRestrictedSyntax],
    },
  },
];
