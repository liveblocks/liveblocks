module.exports = [
  {
    selector: "PrivateIdentifier",
    message:
      "Avoid private identifiers to reduce bundle size. Instead of using `#foo`, prefer using `private _foo`.",
  },

  {
    selector: 'TSTypeReference[typeName.name="AbstractCrdt"]',
    message: "Don't refer to AbstractCrdt as a type. Use LiveNode instead.",
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
];
