import { makeConfig } from "@liveblocks/eslint-config";
import commonRestrictedSyntax from "@liveblocks/eslint-config/restricted-syntax";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  ...makeConfig(),

  {
    plugins: {
      react,
      "react-hooks": reactHooks,
    },

    settings: {
      react: {
        version: "detect",
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
            "ImportDeclaration[source.value='react'] ImportSpecifier[imported.name='use']",
          message: "use is only available on React >=19.",
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
      "react/jsx-key": ["error", { checkFragmentShorthand: true }],
      "react/no-unescaped-entities": "error",
      "react/no-unknown-property": "error",

      // Relax promise rules given how we use them in this project
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-misused-promises": "off",
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
    },
  },
];
