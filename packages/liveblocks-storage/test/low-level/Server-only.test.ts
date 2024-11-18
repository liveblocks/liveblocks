import { expect, test } from "vitest";

import { Server } from "~/Server.js";
import { opId } from "~/utils.js";

import { putAndFail, putAndInc } from "../mutations.config.js";

test("reading value set during transaction should come from transaction cache", () => {
  const server = new Server({ putAndInc });

  server.applyOp([opId(), "putAndInc", ["A", 0]]);
  expect(server.data).toEqual({ A: 1 });
});

test("rollback after failure", () => {
  const server = new Server({ putAndFail });

  try {
    // XXX We should ideally not even expose `.applyOp()` on the Server
    // instance directly. Instead, the only way to interact with the Server
    // should be by connecting a (fake) client socket, and sending messages
    // through it. Otherwise we're just testing implementation details here.
    server.applyOp([opId(), "putAndFail", ["A", 0]]);
  } catch {
    // XXX Catching this should NOT be necessary when sending the server
    // messages!
  }
  expect(server.data).toEqual({});
});

// test("nested LiveObject", () => {
//   const server = new Server({ setLiveObject });
//
//   server.applyOp([opId(), "setLiveObject", ["child", "foo", "bar"]]);
//   expect(server.toImmutable()).toEqual({ child: { foo: "bar" } });
// });
