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

  test("loading multiple times is a no-op (but fine)", async () => {
    // In series
    {
      const room = new Room("my-room");
      await room.load();
      await room.load();
      await room.load();
    }

    // Or in parallel
    {
      const room = new Room("my-room");
      await Promise.all([room.load(), room.load(), room.load()]);
    }
  });

  test("loading state", async () => {
    const room = new Room("my-room");
    expect(room.loadingState).toBe("initial");
    const promise$ = room.load();
    expect(room.loadingState).toBe("loading");
    await promise$;
    expect(room.loadingState).toBe("loaded");
    room.unload();
    expect(room.loadingState).toBe("initial");
  });

  // YYY Ideally, this test would be possible to re-enable
  test.skip('room will throw "no such session" errors when used before the session is started', async () => {
    const room = new Room("my-room");
    await room.load();
    const ticket = await room.createTicket();
    const key = ticket.sessionKey;

    // Errors will happen if used before .startBrowserSession() is used
    await expectToThrow(() => room.handleData(key, "ping"), "No such session");
    await expectToThrow(() => room.handleData(key, "[]"), "No such session");
  });

  test("starting multiple sessions", async () => {
    const room = new Room("my-room");
    await room.load();
    const ticket1 = await room.createTicket();
    const ticket2 = await room.createTicket();
    const ticket3 = await room.createTicket();
    const ticket4 = await room.createTicket();
    const ticket5 = await room.createTicket();
    room.startBrowserSession(ticket1, new MockServerWebSocket());
    room.startBrowserSession(ticket2, new MockServerWebSocket());
    room.startBrowserSession(ticket3, new MockServerWebSocket());
    room.startBrowserSession(ticket4, new MockServerWebSocket());
    room.startBrowserSession(ticket5, new MockServerWebSocket());
    expect(room.numSessions).toEqual(5);
  });

  test("starting a second session for an actor kicks the first one", async () => {
    const room = new Room("my-room");
    await room.load();
    const ticket1 = await room.createTicket({ actor: 13 as ActorID });
    const ticket2 = await room.createTicket();
    const ticket3 = await room.createTicket({ actor: 13 as ActorID });
    expect(room.numSessions).toEqual(0);
    room.startBrowserSession(ticket1, new MockServerWebSocket());
    expect(room.numSessions).toEqual(1);
    room.startBrowserSession(ticket2, new MockServerWebSocket());
    expect(room.numSessions).toEqual(2);
    room.startBrowserSession(ticket3, new MockServerWebSocket());
    expect(room.numSessions).toEqual(2); // Session 1 will have been kicked!
  });

  test("enter + leave", async () => {
    const room = new Room("my-room");
    await room.load();
    const ticket = await room.createTicket();
    room.startBrowserSession(ticket, new MockServerWebSocket());
    room.endBrowserSession(ticket.sessionKey, 1001, "bleh");
  });
});

describe("room (w/ last actor ID)", () => {
  test("many simultaneous calls will all get a unique actor (with specific start)", async () => {
    const storage = setupStorage({ actorId: 7 });
    const room = new Room("my-room", { storage });
    await room.load();

    // Create 1000 tickets
    const actors = new Set(
      (
        await Promise.all(
          Array.from({ length: 1000 }).map(() => room.createTicket())
        )
      ).map((t) => t.actor)
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
