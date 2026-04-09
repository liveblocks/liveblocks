import NodeJSWebSocket from "ws";
import type { IWebSocket } from "@liveblocks/core";
import { describe, expectTypeOf, test } from "vitest";

//
// NOTE: If one of these tests ever fails, it means our IWebSocket type (which
// is our minimal subset between browser-based and NodeJS-based WebSocket
// implementations) is incompatible with either one of the implementations.
//
// This will be reported as:
//
//     Type 'IWebSocket' does not satisfy the constraint '{ prototype: { ... }; ... }'
//
// Which is... not a very helpful message! 🤔
//
// The incompatibility lies much deeper in one of the other interface types.
//

describe("IWebSocket", () => {
  test("should be assignable to a browser-based WebSocket implementation", () => {
    expectTypeOf(window.WebSocket).toExtend<IWebSocket>();
  });

  test("should be assignable to a Node.js-based WebSocket implementation", () => {
    expectTypeOf(NodeJSWebSocket).toExtend<IWebSocket>();
  });
});
