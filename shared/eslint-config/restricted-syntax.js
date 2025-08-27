module.exports = [
  {
    selector: 'TSTypeReference[typeName.name="AbstractCrdt"]',
    message: "Don't refer to AbstractCrdt as a type. Use LiveNode instead.",
  },

  {
    selector: "TSTypeReference[typeName.name='WebSocket']",
    message:
      "Please don't rely on the WebSocket type directly. Instead use IWebSocket, which is a minimal subset that is also compatible with NodeJS's WebSocket API.",
  },
  {
    selector:
      "ImportDeclaration[source.value='react'] ImportSpecifier[imported.name='useLayoutEffect']",
    message:
      "useLayoutEffect triggers a warning when executed on the server on React <=18.2.0. Import it from '@liveblocks/react/_private' instead.",
  },
  {
    selector:
      "ImportDeclaration[source.value='vitest'] ImportSpecifier[imported.name='it']",
    message:
      "Import 'test' instead of 'it' from vitest.",
  },
];
