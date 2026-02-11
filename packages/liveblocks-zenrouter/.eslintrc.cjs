module.exports = {
  root: true,
  extends: ["@liveblocks/eslint-config"],

  rules: {
    // Disable these for this library specifically
    "@typescript-eslint/ban-types": "off",
    "@typescript-eslint/no-explicit-any": "off",
  },

  overrides: [
    {
      files: ["test/**", "*.test.ts", "*.test.tsx"],

      // Special config for test files
      rules: {
        "@typescript-eslint/explicit-module-boundary-types": "off",

        // Allow using `any` in unit tests
        "@typescript-eslint/no-unsafe-argument": "off",
        "@typescript-eslint/no-unsafe-assignment": "off",
      },
    },
  ],
};
