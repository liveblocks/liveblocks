module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { project: ["./tsconfig.json"] },
  plugins: [
    "@typescript-eslint",
    "eslint-plugin-import",
    "eslint-plugin-simple-import-sort",
  ],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  rules: {
    // ----------------------------------------------------------------------
    // NOTE: Only temporarily turned off!
    // These checks are still GOOD IDEAS to re-enable later on, but for right
    // now they're too noisy to enable.
    // ----------------------------------------------------------------------
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-non-null-assertion": "off",

    // -------------------------------
    // Not interested in these checks:
    // -------------------------------
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-inferrable-types": "off",
    "no-constant-condition": "off",

    // -----------------------------
    // Enable auto-fixes for imports
    // -----------------------------
    "import/no-duplicates": "error",
    "@typescript-eslint/consistent-type-imports": "error",
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",

    // ------------------------
    // Customized default rules
    // ------------------------
    "@typescript-eslint/no-unused-vars": [
      "warn",
      // Unused variables are fine if they start with an underscore
      { args: "all", argsIgnorePattern: "^_.*", varsIgnorePattern: "^_.*" },
    ],

    // -------------------------------
    // Custom syntax we want to forbid
    // -------------------------------
    "no-restricted-syntax": [
      "error",
      {
        selector: "PrivateIdentifier",
        message:
          "Avoid private identifiers to reduce bundle size. Instead of using `#foo`, prefer using `private _foo`.",
      },
      {
        selector:
          'TSTypeReference[typeName.name="LiveObject"][typeParameters.params.length != 1]',
        message:
          "In library code, never write `LiveObject` without explicit type params! Type parameter defaults are only meant for end users.",
      },
      {
        selector:
          'TSTypeReference[typeName.name="LiveMap"][typeParameters.params.length != 2]',
        message:
          "In library code, never write `LiveMap` without explicit type params! Type parameter defaults are only meant for end users.",
      },
      {
        selector:
          'TSTypeReference[typeName.name="LiveList"][typeParameters.params.length != 1]',
        message:
          "In library code, never write `LiveList` without explicit type params! Type parameter defaults are only meant for end users.",
      },
      {
        selector:
          'TSTypeReference[typeName.name="LiveRegister"][typeParameters.params.length != 1]',
        message:
          "In library code, never write `LiveRegister` without explicit type params! Type parameter defaults are only meant for end users.",
      },
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
