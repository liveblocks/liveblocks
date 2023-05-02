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

  {
    selector: "TSTypeReference[typeName.name='WebSocket']",
    message:
      "Please don't rely on the WebSocket type directly. Instead use IWebSocket, which is a minimal subset that is also compatible with NodeJS's WebSocket API.",
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
