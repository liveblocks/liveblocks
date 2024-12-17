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
];
