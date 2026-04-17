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
      ],

      // Enforce React best practices
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
];
