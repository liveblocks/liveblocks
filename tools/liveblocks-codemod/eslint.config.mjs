import { makeConfig } from "@liveblocks/eslint-config";

export default [
  ...makeConfig(),

  {
    ignores: ["**/__tests__/**", "**/__testfixtures__/**"],
  },

  {
    rules: {
      // ----------------------------------------------------------------------
      // Overrides from default rule config used in all other projects!
      // ----------------------------------------------------------------------
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },
];
