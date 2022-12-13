module.exports = {
  env: {
    browser: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
    "next",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react", "react-hooks", "prettier"],
  rules: {
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/ban-types": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-use-before-define": "off",
    "@typescript-eslint/no-var-requires": "off",
    "react/display-name": "off",
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
  },
};
