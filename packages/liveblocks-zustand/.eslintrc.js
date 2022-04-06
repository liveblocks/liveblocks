module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { project: ["./tsconfig.json"] },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  rules: {
    // ----------------------------------------------------------------------
    // NOTE: Only temporarily turned off!
    // These checks are still GOOD IDEAS to re-enable later on, but for right
    // now they're too noisy to enable.
    // ----------------------------------------------------------------------
    // "@typescript-eslint/ban-ts-comment": "off",
    // "@typescript-eslint/no-explicit-any": "off",
    // "@typescript-eslint/no-non-null-asserted-optional-chain": "off",
    // "@typescript-eslint/no-non-null-assertion": "off",

    // -------------------------------
    // Not interested in these checks:
    // -------------------------------
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-inferrable-types": "off",
    "no-constant-condition": "off",

    // ------------------------
    // Customized default rules
    // ------------------------
    "@typescript-eslint/no-unused-vars": [
      "warn",
      // Unused variables are fine if they start with an underscore
      { argsIgnorePattern: "^_.*", varsIgnorePattern: "^_.*" },
    ],

    // -------------------------------
    // Custom syntax we want to forbid
    // -------------------------------
    "no-restricted-syntax": [
      "error",
      // {
      //   selector: "PrivateIdentifier",
      //   message:
      //     "Avoid private identifiers to reduce bundle size. Instead of using `#foo`, prefer using `private _foo`.",
      // },
      // {
      //   selector: "ForOfStatement",
      //   message:
      //     "Avoid for..of loops in libraries, because they generate unneeded Babel iterator runtime support code in the bundle",
      // },
      // {
      //   selector: "ForInStatement",
      //   message:
      //     "for..in loops are never what you want. Loop over Object.keys() instead.",
      // },
    ],
  },
};
