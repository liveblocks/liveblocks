import { makeConfig } from "@liveblocks/eslint-config";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  ...makeConfig(),

  {
    plugins: {
      "react-hooks": reactHooks,
    },

    rules: {
      // ----------------------------------------------------------------------
      // Overrides from default rule config used in all other projects!
      // ----------------------------------------------------------------------
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-explicit-any": "off",

      // TODO: New rules in typescript-eslint v8's recommendedTypeChecked
      // that weren't in v7. Disabled during the v8 migration to keep it
      // clean, but we should revisit and enable these later.
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/restrict-template-expressions": "off",

      // ----------------------------------------------------------------------
      // Extra rules for this project specifically
      // ----------------------------------------------------------------------

      // Enforce React best practices
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
];
