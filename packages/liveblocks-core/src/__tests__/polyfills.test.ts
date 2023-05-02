import NodeJSWebSocket from "ws";

import { createClient } from "../client";

describe("WebSocket polyfill compatibility", () => {
  it("WebSocket polyfill from browser", () => {
    createClient({
      authEndpoint: "ignore-me",
      polyfills: {
        WebSocket: window.WebSocket,
        //         ^^^^^^^^^^^^^^^^ Browser-based WebSocket API
      },
    });
  });

  it("WebSocket polyfill from NodeJS", () => {
    createClient({
      authEndpoint: "ignore-me",
      polyfills: {
        WebSocket: NodeJSWebSocket,
        //         ^^^^^^^^^^^^^^^ NodeJS-based WebSocket API
      },
    });
  });
});
