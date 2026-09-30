/**
 * Copyright (c) Liveblocks Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import {
  ClientMsgCode,
  CrdtType,
  OpCode,
  Promise_withResolvers,
  ServerMsgCode,
} from "@liveblocks/core";
import { E_ALREADY_LOCKED } from "async-mutex";
import { describe, expect, test, vi } from "vitest";

import { makeNewInMemoryDriver } from "~/plugins/InMemoryDriver";
import type { ActorID } from "~/Room";
import { Room } from "~/Room";

class MockServerWebSocket {
  send(_data: string): number {
    // Mock implementation
    return _data.length;
  }
  close() {
    // Mock implementation
  }
}

function setupStorage(initial?: { actorId: number }) {
  return makeNewInMemoryDriver({ initialActor: initial?.actorId });
}

/**
 * This helper exists because
 *
 *     await expect(promise).rejects.toThrow()
 *
 * is not yet implemented in Bun test yet. It's on the roadmap, though, so
 * maybe later we can remove this and replace it.
 */
async function expectToThrow(
  fn: () => Promise<unknown>,
  msg?: RegExp | string
) {
  let error: unknown = "Did not error";
  try {
    await fn();
  } catch (e: unknown) {
    error = e;
  }
  expect(error).toBeInstanceOf(Error);
  if (msg) {
    expect((error as Error).message).toMatch(msg);
  }
}

describe("room", () => {
  test("basic", () => {
    const room = new Room("my-room");
    expect(room.meta).toEqual("my-room");
  });

  test("arbitrary metadata can be attached", () => {
    {
      const room = new Room({ roomId: "my-room" });
      expect(room.meta.roomId).toEqual("my-room");
    }

    {
      const room = new Room(null);
      expect(room.meta).toBeNull();
    }

    {
      const ctx = { x: 42 };
      const room = new Room(ctx);
      expect(room.meta).toBe(ctx);
    }
  });

  // YYY Ideally, this test would be possible to re-enable
  test.skip('room will throw "no such session" errors when used before the session is started', async () => {
    const room = new Room("my-room");
    const ticket = room.createTicket();
    const key = ticket.sessionKey;

    // Errors will happen if used before .startBrowserSession() is used
    await expectToThrow(() => room.handleData(key, "ping"), "No such session");
    await expectToThrow(() => room.handleData(key, "[]"), "No such session");
  });

  test("starting multiple sessions", () => {
    const room = new Room("my-room");
    const ticket1 = room.createTicket();
    const ticket2 = room.createTicket();
    const ticket3 = room.createTicket();
    const ticket4 = room.createTicket();
    const ticket5 = room.createTicket();
    room.startBrowserSession(ticket1, new MockServerWebSocket());
    room.startBrowserSession(ticket2, new MockServerWebSocket());
    room.startBrowserSession(ticket3, new MockServerWebSocket());
    room.startBrowserSession(ticket4, new MockServerWebSocket());
    room.startBrowserSession(ticket5, new MockServerWebSocket());
    expect(room.numSessions).toEqual(5);
  });

  test("starting a second session for an actor kicks the first one", () => {
    const room = new Room("my-room");
    const ticket1 = room.createTicket({ actor: 13 as ActorID });
    const ticket2 = room.createTicket();
    const ticket3 = room.createTicket({ actor: 13 as ActorID });
    expect(room.numSessions).toEqual(0);
    room.startBrowserSession(ticket1, new MockServerWebSocket());
    expect(room.numSessions).toEqual(1);
    room.startBrowserSession(ticket2, new MockServerWebSocket());
    expect(room.numSessions).toEqual(2);
    room.startBrowserSession(ticket3, new MockServerWebSocket());
    expect(room.numSessions).toEqual(2); // Session 1 will have been kicked!
  });

  test("enter + leave", () => {
    const room = new Room("my-room");
    const ticket = room.createTicket();
    room.startBrowserSession(ticket, new MockServerWebSocket());
    room.endBrowserSession(ticket.sessionKey, 1001, "bleh");
  });

  test.each([undefined, true] as const)(
    "LiveText history is delivered only when requested and only to its sender (includeTextHistory: %s)",
    async (includeTextHistory) => {
      const storage = makeNewInMemoryDriver({
        initialNodes: [
          ["root", { type: CrdtType.OBJECT, data: {} }],
          [
            "0:1",
            {
              type: CrdtType.TEXT,
              parentId: "root",
              parentKey: "text",
              data: [["Hello"]],
              version: 0,
            },
          ],
        ],
      });
      const room = new Room("replay", { storage });
      const sender = room.createTicket();
      const remote = room.createTicket();
      const senderSocket = new MockServerWebSocket();
      const remoteSocket = new MockServerWebSocket();
      const senderMessages = vi.spyOn(senderSocket, "send");
      const remoteMessages = vi.spyOn(remoteSocket, "send");
      room.startBrowserSession(sender, senderSocket);
      room.startBrowserSession(remote, remoteSocket);

      await room.handleData(
        remote.sessionKey,
        JSON.stringify([
          {
            type: ClientMsgCode.UPDATE_STORAGE,
            ops: [
              {
                type: OpCode.UPDATE_TEXT,
                id: "0:1",
                opId: "remote",
                baseVersion: 0,
                ops: [{ type: "insert", index: 0, text: "A" }],
              },
            ],
          },
        ])
      );
      senderMessages.mockClear();
      remoteMessages.mockClear();

      const replay = {
        type: ClientMsgCode.UPDATE_STORAGE,
        includeTextHistory,
        ops: [
          {
            type: OpCode.UPDATE_TEXT,
            id: "0:1",
            opId: "original",
            baseVersion: 0,
            ops: [{ type: "delete", index: 0, length: 2 }],
          },
        ],
      };
      await room.handleData(sender.sessionKey, JSON.stringify([replay]));

      const accepted = {
        type: OpCode.UPDATE_TEXT,
        id: "0:1",
        baseVersion: 1,
        version: 2,
        ops: [{ type: "delete", index: 1, length: 2 }],
      };
      expect(
        remoteMessages.mock.calls.flatMap(([data]) => {
          const messages: unknown = JSON.parse(data);
          return messages;
        })
      ).toEqual([{ type: ServerMsgCode.UPDATE_STORAGE, ops: [accepted] }]);
      expect(
        senderMessages.mock.calls.flatMap(([data]) => {
          const messages: unknown = JSON.parse(data);
          return messages;
        })
      ).toEqual([
        {
          type: ServerMsgCode.UPDATE_STORAGE,
          ops: [
            {
              ...accepted,
              opId: "original",
              ...(includeTextHistory
                ? {
                    history: [
                      {
                        version: 1,
                        ops: [{ type: "insert", index: 0, text: "A" }],
                      },
                    ],
                  }
                : {}),
            },
          ],
        },
      ]);

      senderMessages.mockClear();
      remoteMessages.mockClear();
      await room.handleData(sender.sessionKey, JSON.stringify([replay]));
      expect(remoteMessages.mock.calls).toEqual([]);
      expect(
        senderMessages.mock.calls.flatMap(([data]) => {
          const messages: unknown = JSON.parse(data);
          return messages;
        })
      ).toEqual([
        {
          type: ServerMsgCode.UPDATE_STORAGE,
          ops: [
            {
              ...accepted,
              opId: "original",
              ...(includeTextHistory
                ? {
                    history: [
                      {
                        version: 1,
                        ops: [{ type: "insert", index: 0, text: "A" }],
                      },
                      { version: 2, ops: accepted.ops },
                    ],
                  }
                : {}),
            },
          ],
        },
      ]);
      expect(storage.get_node("0:1")).toMatchObject({
        data: [["Allo"]],
        version: 2,
      });
    }
  );

  test("reconciles each text node from its own base version in a mixed storage batch", async () => {
    const storage = makeNewInMemoryDriver({
      initialNodes: [
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.TEXT,
            parentId: "root",
            parentKey: "title",
            data: [["Hello"]],
            version: 0,
          },
        ],
        [
          "0:2",
          {
            type: CrdtType.TEXT,
            parentId: "root",
            parentKey: "body",
            data: [["World"]],
            version: 4,
          },
        ],
      ],
    });
    const room = new Room("reconcile-mixed-batch", { storage });
    const sender = room.createTicket();
    const socket = new MockServerWebSocket();
    const messages = vi.spyOn(socket, "send");
    room.startBrowserSession(sender, socket);

    await room.handleData(
      sender.sessionKey,
      JSON.stringify([
        {
          type: ClientMsgCode.UPDATE_STORAGE,
          ops: [
            {
              type: OpCode.UPDATE_TEXT,
              id: "0:1",
              opId: "title:remote",
              baseVersion: 0,
              ops: [{ type: "insert", index: 0, text: "A" }],
            },
            {
              type: OpCode.UPDATE_TEXT,
              id: "0:2",
              opId: "body:remote",
              baseVersion: 4,
              ops: [{ type: "insert", index: 5, text: "!" }],
            },
          ],
        },
      ])
    );
    messages.mockClear();

    const objectOp = {
      type: OpCode.UPDATE_OBJECT,
      id: "root",
      opId: "object:local",
      data: { status: "edited" },
    };
    await room.handleData(
      sender.sessionKey,
      JSON.stringify([
        {
          type: ClientMsgCode.UPDATE_STORAGE,
          includeTextHistory: true,
          ops: [
            objectOp,
            {
              type: OpCode.UPDATE_TEXT,
              id: "0:1",
              opId: "title:local",
              baseVersion: 0,
              ops: [{ type: "insert", index: 5, text: "?" }],
            },
            {
              type: OpCode.UPDATE_TEXT,
              id: "0:2",
              opId: "body:local",
              baseVersion: 4,
              ops: [{ type: "insert", index: 0, text: "B" }],
            },
          ],
        },
      ])
    );

    expect(
      messages.mock.calls.flatMap(([data]) => {
        const messages: unknown = JSON.parse(data);
        return messages;
      })
    ).toEqual([
      {
        type: ServerMsgCode.UPDATE_STORAGE,
        ops: [
          objectOp,
          {
            type: OpCode.UPDATE_TEXT,
            id: "0:1",
            opId: "title:local",
            baseVersion: 1,
            version: 2,
            ops: [{ type: "insert", index: 6, text: "?" }],
            history: [
              { version: 1, ops: [{ type: "insert", index: 0, text: "A" }] },
            ],
          },
          {
            type: OpCode.UPDATE_TEXT,
            id: "0:2",
            opId: "body:local",
            baseVersion: 5,
            version: 6,
            ops: [{ type: "insert", index: 0, text: "B" }],
            history: [
              { version: 5, ops: [{ type: "insert", index: 5, text: "!" }] },
            ],
          },
        ],
      },
    ]);
  });
});

describe("maintenance mode", () => {
  test("isInMaintenance is false by default", () => {
    const room = new Room("test-room");
    expect(room.isInMaintenance).toBe(false);
  });

  test("isInMaintenance is true while callback is running", async () => {
    const room = new Room("test-room");

    await room.runInMaintenanceMode(() => {
      expect(room.isInMaintenance).toBe(true);
      return Promise.resolve();
    });

    expect(room.isInMaintenance).toBe(false);
  });

  test("isInMaintenance is true while callback is running (even if it throws)", async () => {
    const room = new Room("test-room");

    try {
      // eslint-disable-next-line @typescript-eslint/require-await
      await room.runInMaintenanceMode(async () => {
        expect(room.isInMaintenance).toBe(true);
        throw new Error("boom");
      });
    } catch {
      // Swallow
    }

    expect(room.isInMaintenance).toBe(false);
  });

  test("runInMaintenanceMode propagates callback errors", async () => {
    const room = new Room("test-room");

    await expect(
      // eslint-disable-next-line @typescript-eslint/require-await
      room.runInMaintenanceMode(async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");
  });

  test("runInMaintenanceMode returns the callback result", async () => {
    const room = new Room("test-room");
    const result = await room.runInMaintenanceMode(() => Promise.resolve(42));
    expect(result).toBe(42);
  });

  test("concurrent runInMaintenanceMode throws E_ALREADY_LOCKED", async () => {
    const room = new Room("test-room");

    const ready = Promise_withResolvers<void>();
    const first = Promise_withResolvers<void>();

    const second = room.runInMaintenanceMode(async () => {
      ready.resolve(); // Signal that we're inside maintenance mode
      await first.promise; // Wait until the test says we can finish
      return "done";
    });

    expect(room.isInMaintenance).toBe(true);
    await ready.promise;
    expect(room.isInMaintenance).toBe(true);

    // Second attempt should throw immediately
    await expect(
      room.runInMaintenanceMode(() => Promise.resolve("nope"))
    ).rejects.toBe(E_ALREADY_LOCKED);

    first.resolve();
    expect(await second).toBe("done");
    expect(room.isInMaintenance).toBe(false);
  });

  test("runInMaintenanceMode releases mutex on callback error", async () => {
    const room = new Room("test-room");
    const err = new Error("boom");

    await expect(
      // eslint-disable-next-line @typescript-eslint/require-await
      room.runInMaintenanceMode(async () => {
        throw err;
      })
    ).rejects.toBe(err);

    // Mutex should be released even after an error
    expect(room.isInMaintenance).toBe(false);
  });
});

describe("room (w/ last actor ID)", () => {
  test("many simultaneous calls will all get a unique actor (with specific start)", () => {
    const storage = setupStorage({ actorId: 7 });
    const room = new Room("my-room", { storage });

    // Create 1000 tickets
    const actors = new Set(
      Array.from({ length: 1000 })
        .map(() => room.createTicket())
        .map((t) => t.actor)
    );

    // The set contains 1000 unique elements
    expect(actors.size).toEqual(1000);

    // And all 1000 values are between 8 <= actor <= 1007
    for (const actor of actors) {
      expect(actor).toBeGreaterThanOrEqual(8);
      expect(1007).toBeGreaterThanOrEqual(actor);
      //
      // NOTE: I would write this check as follows...
      //
      //    expect(actor).toBeLessThanOrEqual(1007);
      //
      // ...but https://github.com/oven-sh/bun/issues/6754 😬
      //
    }
  });
});
