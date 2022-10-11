module.exports = {
  root: true,
  extends: ["@liveblocks/eslint-config"],
  rules: {
    // ----------------------------------------------------------------------
    // Overrides from default rule config used in all other projects!
    // ----------------------------------------------------------------------
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    eqeqeq: "off",

    // ----------------------------------------------------------------------
    // Extra rules for this project specifically
    // ----------------------------------------------------------------------
    /* None yet 😇 ! */

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
