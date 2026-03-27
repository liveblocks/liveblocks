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

import { Permission } from "@liveblocks/core";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { authorizeWebSocket } from "~/dev-server/auth";
import * as Rooms from "~/dev-server/db/rooms";
import { createJwtLite, verifyJwtLite } from "~/dev-server/lib/jwt-lite";
import { zen } from "~/dev-server/routes/auth";

const BASE = "http://localhost";
const AUTH = { Authorization: "Bearer sk_localdev" };

async function post(
  path: string,
  body: unknown
): Promise<{ status: number; body: Record<string, unknown> }> {
  const resp = await zen.fetch(
    new Request(`${BASE}${path}`, {
      method: "POST",
      headers: { ...AUTH, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
  return {
    status: resp.status,
    body: (await resp.json()) as Record<string, unknown>,
  };
}

describe("POST /v2/authorize-user", () => {
  test("returns a valid access token", async () => {
    const { status, body } = await post("/v2/authorize-user", {
      userId: "user-1",
      permissions: { "room-*": ["room:write"] },
    });

    expect(status).toBe(200);
    expect(body.token).toBeString();

    const payload = verifyJwtLite(body.token as string);
    expect(payload).not.toBeNull();
    expect(payload!.k).toBe("acc");
    expect(payload!.uid).toBe("user-1");
    if (payload!.k === "acc") {
      expect(payload!.perms).toEqual({ "room-*": [Permission.Write] });
    }
  });

  test("includes userInfo when provided", async () => {
    const { status, body } = await post("/v2/authorize-user", {
      userId: "user-2",
      userInfo: { name: "Alice", avatar: "https://example.com/alice.png" },
      permissions: { "*": ["room:write"] },
    });

    expect(status).toBe(200);
    const payload = verifyJwtLite(body.token as string);
    expect(payload!.ui).toEqual({
      name: "Alice",
      avatar: "https://example.com/alice.png",
    });
  });

  test("rejects missing userId", async () => {
    const { status } = await post("/v2/authorize-user", {
      permissions: { "*": ["room:write"] },
    });
    expect(status).toBe(422);
  });

  test("rejects missing permissions", async () => {
    const { status } = await post("/v2/authorize-user", {
      userId: "user-1",
    });
    expect(status).toBe(422);
  });

  test("rejects without auth header", async () => {
    const resp = await zen.fetch(
      new Request(`${BASE}/v2/authorize-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "user-1",
          permissions: { "*": ["room:write"] },
        }),
      })
    );
    expect(resp.status).toBe(401);
  });
});

describe("POST /v2/identify-user", () => {
  test("returns a valid ID token", async () => {
    const { status, body } = await post("/v2/identify-user", {
      userId: "user-1",
    });

    expect(status).toBe(200);
    expect(body.token).toBeString();

    const payload = verifyJwtLite(body.token as string);
    expect(payload).not.toBeNull();
    expect(payload!.k).toBe("id");
    expect(payload!.uid).toBe("user-1");
  });

  test("includes userInfo when provided", async () => {
    const { status, body } = await post("/v2/identify-user", {
      userId: "user-2",
      userInfo: { name: "Bob" },
    });

    expect(status).toBe(200);
    const payload = verifyJwtLite(body.token as string);
    expect(payload!.ui).toEqual({ name: "Bob" });
  });

  test("rejects missing userId", async () => {
    const { status } = await post("/v2/identify-user", {});
    expect(status).toBe(422);
  });

  test("rejects without auth header", async () => {
    const resp = await zen.fetch(
      new Request(`${BASE}/v2/identify-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "user-1" }),
      })
    );
    expect(resp.status).toBe(401);
  });

  test("includes groupIds when provided", async () => {
    const { status, body } = await post("/v2/identify-user", {
      userId: "user-3",
      groupIds: ["team-a", "team-b"],
    });

    expect(status).toBe(200);
    const payload = verifyJwtLite(body.token as string);
    expect(payload).not.toBeNull();
    expect(payload!.k).toBe("id");
    if (payload!.k === "id") {
      expect(payload!.gids).toEqual(["team-a", "team-b"]);
    }
  });
});

// ---------------------------------------------------------------------------
// authorizeWebSocket — permission resolution
// ---------------------------------------------------------------------------

function wsReq(params: Record<string, string>, version = "v8"): Request {
  const url = new URL(`http://localhost/${version}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Request(url, { headers: { Upgrade: "websocket" } });
}

function accToken(userId: string, perms: Record<string, Permission[]>): string {
  return createJwtLite({
    k: "acc",
    pid: "localdev",
    uid: userId,
    perms,
  });
}

function idToken(userId: string, groupIds?: string[]): string {
  return createJwtLite({
    k: "id",
    pid: "localdev",
    uid: userId,
    gids: groupIds,
  });
}

describe("authorizeWebSocket", () => {
  beforeAll(() => {
    Rooms.useEphemeralStorage();
  });

  afterAll(() => {
    Rooms.cleanup();
  });

  // -- Edge cases --

  test("rejects missing roomId", () => {
    const result = authorizeWebSocket(wsReq({}));
    expect(result.ok).toBe(false);
  });

  test("rejects invalid protocol version", () => {
    const result = authorizeWebSocket(wsReq({ roomId: "room-1" }, "v99"));
    expect(result.ok).toBe(false);
  });

  test("rejects invalid token", () => {
    const result = authorizeWebSocket(
      wsReq({ roomId: "room-1", tok: "garbage" })
    );
    expect(result.ok).toBe(false);
  });

  // -- Access token resolution --

  describe("access tokens", () => {
    test("exact room match grants scopes", () => {
      const tok = accToken("user-1", { "my-room": [Permission.Write] });
      const result = authorizeWebSocket(wsReq({ roomId: "my-room", tok }));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.ticketData.scopes).toEqual([Permission.Write]);
      }
    });

    test("wildcard pattern match grants scopes", () => {
      const tok = accToken("user-1", { "project-*": [Permission.Write] });
      const result = authorizeWebSocket(wsReq({ roomId: "project-abc", tok }));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.ticketData.scopes).toEqual([Permission.Write]);
      }
    });

    test("no matching room/pattern is denied", () => {
      const tok = accToken("user-1", { "other-room": [Permission.Write] });
      const result = authorizeWebSocket(wsReq({ roomId: "my-room", tok }));
      expect(result.ok).toBe(false);
    });

    test("read-only permission in token gives read-only scopes", () => {
      const tok = accToken("user-1", { "my-room": [Permission.Read] });
      const result = authorizeWebSocket(wsReq({ roomId: "my-room", tok }));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.ticketData.scopes).toEqual([Permission.Read]);
      }
    });
  });

  // -- ID token resolution --

  describe("ID tokens", () => {
    test("write room grants write scopes", () => {
      Rooms.getOrCreateRoom("id-write-room", {
        defaultAccesses: [Permission.Write],
      });
      const tok = idToken("user-1");
      const result = authorizeWebSocket(
        wsReq({ roomId: "id-write-room", tok })
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.ticketData.scopes).toEqual([Permission.Write]);
      }
    });

    test("read-only room grants read-only scopes", () => {
      Rooms.getOrCreateRoom("id-readonly-room", {
        defaultAccesses: [Permission.Read],
      });
      const tok = idToken("user-1");
      const result = authorizeWebSocket(
        wsReq({ roomId: "id-readonly-room", tok })
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.ticketData.scopes).toEqual([Permission.Read]);
      }
    });

    test("nonexistent room is denied", () => {
      const tok = idToken("user-1");
      const result = authorizeWebSocket(wsReq({ roomId: "no-such-room", tok }));
      expect(result.ok).toBe(false);
    });

    test("usersAccesses override for specific user", () => {
      Rooms.getOrCreateRoom("id-user-override-room", {
        defaultAccesses: [Permission.Read],
        usersAccesses: { "vip-user": [Permission.Write] },
      });
      // VIP user gets both read (from default) and write (from usersAccesses)
      const tok1 = idToken("vip-user");
      const result1 = authorizeWebSocket(
        wsReq({ roomId: "id-user-override-room", tok: tok1 })
      );
      expect(result1.ok).toBe(true);
      if (result1.ok) {
        expect(result1.ticketData.scopes).toContain(Permission.Read);
        expect(result1.ticketData.scopes).toContain(Permission.Write);
      }
      // Regular user gets read only
      const tok2 = idToken("regular-user");
      const result2 = authorizeWebSocket(
        wsReq({ roomId: "id-user-override-room", tok: tok2 })
      );
      expect(result2.ok).toBe(true);
      if (result2.ok) {
        expect(result2.ticketData.scopes).toEqual([Permission.Read]);
      }
    });

    test("groupsAccesses grants group-based permissions", () => {
      Rooms.getOrCreateRoom("id-group-room", {
        defaultAccesses: [],
        groupsAccesses: { "team-a": [Permission.Write] },
      });
      // Member of team-a gets write
      const tok1 = idToken("user-1", ["team-a"]);
      const result1 = authorizeWebSocket(
        wsReq({ roomId: "id-group-room", tok: tok1 })
      );
      expect(result1.ok).toBe(true);
      if (result1.ok) {
        expect(result1.ticketData.scopes).toContain(Permission.Write);
      }
      // Non-member gets denied (empty defaultAccesses)
      const tok2 = idToken("user-2");
      const result2 = authorizeWebSocket(
        wsReq({ roomId: "id-group-room", tok: tok2 })
      );
      expect(result2.ok).toBe(false);
    });

    test("union of defaultAccesses + groupsAccesses", () => {
      Rooms.getOrCreateRoom("id-union-room", {
        defaultAccesses: [Permission.Read],
        groupsAccesses: { editors: [Permission.Write] },
      });
      const tok = idToken("user-1", ["editors"]);
      const result = authorizeWebSocket(
        wsReq({ roomId: "id-union-room", tok })
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.ticketData.scopes).toContain(Permission.Read);
        expect(result.ticketData.scopes).toContain(Permission.Write);
      }
    });
  });

  // -- Pubkey auth --

  describe("pubkey auth", () => {
    test("nonexistent room is auto-created with write access", () => {
      const result = authorizeWebSocket(
        wsReq({ roomId: "pk-new-room", pubkey: "pk_localdev" })
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.ticketData.scopes).toEqual([Permission.Write]);
      }
    });

    test("always grants write even on a read-only room", () => {
      // Explicitly create a room with read-only default access
      Rooms.getOrCreateRoom("pk-readonly-room", {
        defaultAccesses: [Permission.Read],
      });
      // Pubkey auth ignores the room's defaultAccesses and always grants write
      const result = authorizeWebSocket(
        wsReq({ roomId: "pk-readonly-room", pubkey: "pk_localdev" })
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.ticketData.scopes).toEqual([Permission.Write]);
      }
    });

    test("wrong pubkey is denied", () => {
      const result = authorizeWebSocket(
        wsReq({ roomId: "pk-some-room", pubkey: "pk_wrong" })
      );
      expect(result.ok).toBe(false);
    });
  });
});
