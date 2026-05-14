import { makeConfig } from "@liveblocks/eslint-config";
import licenseHeader from "eslint-plugin-license-header";

export default [
  ...makeConfig(),

  {
    plugins: {
      "license-header": licenseHeader,
    },
    rules: {
      "license-header/header": ["error", "./resources/license-header.txt"],

      // -------------------------------
      // Custom syntax we want to forbid
      // -------------------------------
      "no-restricted-syntax": [
        "error",
        // Protocol types should be imported from ~/protocol
        {
          selector:
            "ImportDeclaration[source.value='@liveblocks/core'] > ImportSpecifier[imported.name=/Op$/]",
          message: "Import Op types from `~/protocol`, not core.",
        },
        {
          selector:
            "ImportDeclaration[source.value='@liveblocks/core'] > ImportSpecifier[imported.name=/ClientMsg$/]",
          message: "Import ClientMsg types from `~/protocol`, not core.",
        },
        {
          selector:
            "ImportDeclaration[source.value='@liveblocks/core'] > ImportSpecifier[imported.name=/ServerMsg$/]",
          message: "Import ServerMsg types from `~/protocol`, not core.",
        },
      ],
    },
  },

  // Allow imports from @liveblocks/core in protocol files (they re-export)
  {
    files: ["src/protocol/**"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },

  // Special config for test files
  {
    files: ["test/**", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },
];
