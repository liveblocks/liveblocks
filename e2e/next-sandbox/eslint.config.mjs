import { dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { fixupConfigRules } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);
const commonRestrictedSyntax = require("@liveblocks/eslint-config/restricted-syntax");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    settings: {
      react: {
        version: "detect",
      },
    },
    ...fixupConfigRules(
      compat.extends(
        "@liveblocks/eslint-config",
        "plugin:react/recommended",
        "plugin:react/jsx-runtime",
        "plugin:react-hooks/recommended"
      )
    ),
    rules: {
      "no-restricted-syntax": ["error", ...commonRestrictedSyntax],
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },
  {
    files: ["test/**"],
    rules: {
      "no-empty-pattern": "off",
    },
  },
];
