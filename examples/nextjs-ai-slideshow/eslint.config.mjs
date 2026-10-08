import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      ".next/**",
      ".next-*/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "coverage/**",
      ".lb-dev/**",
    ],
  },
  {
    // components/ai-elements is vendored from the AI Elements registry and is
    // re-synced wholesale (`npx ai-elements add`). Local edits would be lost
    // on the next sync, so its upstream style is accepted as-is.
    files: ["components/ai-elements/**"],
    linterOptions: { reportUnusedDisableDirectives: "off" },
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/static-components": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@next/next/no-img-element": "off",
    },
  },
];

export default config;
