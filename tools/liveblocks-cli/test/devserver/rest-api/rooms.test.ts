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

import { nanoid } from "@liveblocks/core";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import * as Rooms from "~/dev-server/db/rooms";
import { zen } from "~/dev-server/routes/rest-api";

import { makeExternalRoomId } from "../_helpers";

const BASE = "http://localhost";
const AUTH = { Authorization: "Bearer sk_localdev" };

type ApiResult = { status: number; body: Record<string, unknown> };

async function api(
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResult> {
  const headers: Record<string, string> = { ...AUTH };
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const resp = await zen.fetch(new Request(`${BASE}${path}`, init));
  const respBody: Record<string, unknown> = resp.headers
    .get("content-type")
    ?.includes("application/json")
    ? ((await resp.json()) as Record<string, unknown>)
    : {};
  return { status: resp.status, body: respBody };
}

describe("REST API - rooms", () => {
  beforeAll(() => Rooms.useEphemeralStorage());
  afterAll(() => Rooms.cleanup()); // Needed in bun:test (unlike in Vitest)

  test("create three rooms with different metadata, then list/filter", async () => {
    // `alpha1` and `alpha2` share a prefix exercised by the prefix-filter
    // assertion below; `beta1` does not.
    const alphaPrefix = `alpha-${nanoid()}`;
    const alpha1 = `${alphaPrefix}-1`;
    const alpha2 = `${alphaPrefix}-2`;
    const beta1 = makeExternalRoomId();

    expect(
      (
        await api("POST", "/v2/rooms", {
          id: alpha1,
          metadata: {
            team: "frontend",
            priority: "high",
            labels: ["bug", "urgent"],
          },
        })
      ).status
    ).toBe(200);

    expect(
      (
        await api("POST", "/v2/rooms", {
          id: alpha2,
          metadata: { team: "backend", priority: "low" },
        })
      ).status
    ).toBe(200);

    expect(
      (
        await api("POST", "/v2/rooms", {
          id: beta1,
          metadata: { team: "frontend", priority: "low" },
        })
      ).status
    ).toBe(200);

    // List all rooms (no filters)
    const all = await api("GET", "/v2/rooms");
    expect(all.status).toBe(200);
    expect(all.body.data).toHaveLength(3);

    // Filter by roomId prefix
    const prefix = await api(
      "GET",
      `/v2/rooms?query=${encodeURIComponent(`roomId^"${alphaPrefix}"`)}`
    );
    expect(prefix.status).toBe(200);
    expect(prefix.body.data).toHaveLength(2);
    const prefixIds = (prefix.body.data as { id: string }[])
      .map((r) => r.id)
      .sort();
    expect(prefixIds).toEqual([alpha1, alpha2].sort());

    // Filter by metadata: team = "frontend"
    const meta = await api(
      "GET",
      `/v2/rooms?query=${encodeURIComponent('metadata["team"]:"frontend"')}`
    );
    expect(meta.status).toBe(200);
    expect(meta.body.data).toHaveLength(2);
    const metaIds = (meta.body.data as { id: string }[])
      .map((r) => r.id)
      .sort();
    expect(metaIds).toEqual([alpha1, beta1].sort());

    // Combined: roomId prefix + metadata
    const combined = await api(
      "GET",
      `/v2/rooms?query=${encodeURIComponent(`roomId^"${alphaPrefix}" metadata["team"]:"frontend"`)}`
    );
    expect(combined.status).toBe(200);
    expect(combined.body.data).toHaveLength(1);
    expect((combined.body.data as { id: string }[])[0].id).toBe(alpha1);

    // Filter by metadata: priority = "low"
    const low = await api(
      "GET",
      `/v2/rooms?query=${encodeURIComponent('metadata["priority"]:"low"')}`
    );
    expect(low.status).toBe(200);
    expect(low.body.data).toHaveLength(2);
    const lowIds = (low.body.data as { id: string }[]).map((r) => r.id).sort();
    expect(lowIds).toEqual([alpha2, beta1].sort());
  });

  test("get room returns metadata and permissions", async () => {
    const roomId = makeExternalRoomId();
    await api("POST", "/v2/rooms", {
      id: roomId,
      metadata: {
        team: "frontend",
        priority: "high",
        labels: ["bug", "urgent"],
      },
    });

    const { status, body } = await api("GET", `/v2/rooms/${roomId}`);
    expect(status).toBe(200);
    expect(body.id).toBe(roomId);
    expect(body.metadata).toEqual({
      team: "frontend",
      priority: "high",
      labels: ["bug", "urgent"],
    });
    expect(body.defaultAccesses).toEqual(["room:write"]);
  });

  test("get non-existent room returns 404", async () => {
    const { status } = await api("GET", `/v2/rooms/${makeExternalRoomId()}`);
    expect(status).toBe(404);
  });

  test("create duplicate room returns 409", async () => {
    const roomId = makeExternalRoomId();
    expect((await api("POST", "/v2/rooms", { id: roomId })).status).toBe(200);

    const { status } = await api("POST", "/v2/rooms", { id: roomId });
    expect(status).toBe(409);
  });

  test("create with ?idempotent returns existing room instead of 409", async () => {
    const roomId = makeExternalRoomId();
    const created = await api("POST", "/v2/rooms", {
      id: roomId,
      metadata: { team: "frontend" },
    });
    expect(created.status).toBe(200);

    const { status, body } = await api("POST", "/v2/rooms?idempotent", {
      id: roomId,
      metadata: { team: "ignored" },
    });
    expect(status).toBe(200);
    expect(body.id).toBe(roomId);
    // Existing room is returned untouched - creation-time fields are ignored
    expect(body.metadata).toEqual({ team: "frontend" });
  });

  test("create with ?idempotent creates room when it does not yet exist", async () => {
    const roomId = makeExternalRoomId();
    const { status, body } = await api("POST", "/v2/rooms?idempotent", {
      id: roomId,
      metadata: { team: "qa" },
    });
    expect(status).toBe(200);
    expect(body.id).toBe(roomId);
    expect(body.metadata).toEqual({ team: "qa" });
  });

  test.each([
    "?idempotent",
    "?idempotent=",
    "?idempotent=true",
    "?idempotent=false",
    "?idempotent=0",
  ])(
    "?idempotent is a presence flag - %s suppresses 409 on duplicate",
    async (qs) => {
      const roomId = makeExternalRoomId();
      expect((await api("POST", "/v2/rooms", { id: roomId })).status).toBe(200);

      const { status } = await api("POST", `/v2/rooms${qs}`, { id: roomId });
      expect(status).toBe(200);
    }
  );

  test("update room metadata", async () => {
    const roomId = makeExternalRoomId();
    await api("POST", "/v2/rooms", {
      id: roomId,
      metadata: {
        team: "frontend",
        priority: "high",
        labels: ["bug", "urgent"],
      },
    });

    const { status, body } = await api("POST", `/v2/rooms/${roomId}`, {
      metadata: { priority: "medium" },
    });
    expect(status).toBe(200);
    // Metadata is merged, not replaced
    expect(body.metadata).toEqual({
      team: "frontend",
      priority: "medium",
      labels: ["bug", "urgent"],
    });
  });

  test("room created without explicit permissions defaults to room:write", async () => {
    const roomId = makeExternalRoomId();
    const { status, body } = await api("POST", "/v2/rooms", { id: roomId });
    expect(status).toBe(200);
    expect(body.defaultAccesses).toEqual(["room:write"]);
    expect(body.usersAccesses).toEqual({});
    expect(body.groupsAccesses).toEqual({});
  });

  test("room created with explicit permissions is reflected in GET", async () => {
    const roomId = makeExternalRoomId();
    const { status: createStatus } = await api("POST", "/v2/rooms", {
      id: roomId,
      defaultAccesses: ["room:read"],
      usersAccesses: {
        alice: ["room:write"],
        bob: ["room:read", "room:presence:write"],
      },
      groupsAccesses: {
        admins: ["room:write"],
      },
    });
    expect(createStatus).toBe(200);

    const { status, body } = await api("GET", `/v2/rooms/${roomId}`);
    expect(status).toBe(200);
    expect(body.defaultAccesses).toEqual(["room:read"]);
    expect(body.usersAccesses).toEqual({
      alice: ["room:write"],
      bob: ["room:read", "room:presence:write"],
    });
    expect(body.groupsAccesses).toEqual({
      admins: ["room:write"],
    });
  });

  test("delete room", async () => {
    const roomId = makeExternalRoomId();
    await api("POST", "/v2/rooms", { id: roomId });

    const del = await api("DELETE", `/v2/rooms/${roomId}`);
    expect(del.status).toBe(204);

    // Verify it's gone
    const get = await api("GET", `/v2/rooms/${roomId}`);
    expect(get.status).toBe(404);

    // Verify it no longer appears in the list
    const list = await api("GET", "/v2/rooms");
    const listIds = (list.body.data as { id: string }[]).map((r) => r.id);
    expect(listIds).not.toContain(roomId);
  });

  test("room created without organizationId defaults to 'default'", async () => {
    const roomId = makeExternalRoomId();
    await api("POST", "/v2/rooms", { id: roomId });

    const room = Rooms.getRoom(roomId);
    expect(room).toBeDefined();
    expect(room!.organizationId).toBe("default");
  });

  test("create room with explicit organizationId", async () => {
    const roomId = makeExternalRoomId();
    const { status } = await api("POST", "/v2/rooms", {
      id: roomId,
      organizationId: "org_acme",
      metadata: { env: "test" },
    });
    expect(status).toBe(200);

    const room = Rooms.getRoom(roomId);
    expect(room).toBeDefined();
    expect(room!.organizationId).toBe("org_acme");
  });

  test("create room with different organizationId", async () => {
    const roomId = makeExternalRoomId();
    const { status } = await api("POST", "/v2/rooms", {
      id: roomId,
      organizationId: "org_globex",
    });
    expect(status).toBe(200);

    const room = Rooms.getRoom(roomId);
    expect(room).toBeDefined();
    expect(room!.organizationId).toBe("org_globex");
  });

  test("list rooms filtered by organizationId", async () => {
    // Unique org IDs so the listing assertions are scoped to this test's
    // rooms and not polluted by other tests in the file that also create
    // rooms in custom orgs.
    const orgAcme = `org-acme-${nanoid()}`;
    const orgGlobex = `org-globex-${nanoid()}`;
    const acmeRoomId = makeExternalRoomId();
    const globexRoomId = makeExternalRoomId();

    await api("POST", "/v2/rooms", {
      id: acmeRoomId,
      organizationId: orgAcme,
    });
    await api("POST", "/v2/rooms", {
      id: globexRoomId,
      organizationId: orgGlobex,
    });

    const acme = await api("GET", `/v2/rooms?organizationId=${orgAcme}`);
    expect(acme.status).toBe(200);
    const acmeIds = (acme.body.data as { id: string }[]).map((r) => r.id);
    expect(acmeIds).toEqual([acmeRoomId]);

    const globex = await api("GET", `/v2/rooms?organizationId=${orgGlobex}`);
    expect(globex.status).toBe(200);
    const globexIds = (globex.body.data as { id: string }[]).map((r) => r.id);
    expect(globexIds).toEqual([globexRoomId]);

    // Default org rooms (created without explicit organizationId)
    const defaultOrg = await api("GET", "/v2/rooms?organizationId=default");
    expect(defaultOrg.status).toBe(200);
    const defaultIds = (defaultOrg.body.data as { id: string }[]).map(
      (r) => r.id
    );
    expect(defaultIds).not.toContain(acmeRoomId);
    expect(defaultIds).not.toContain(globexRoomId);
  });

  test("update room with null groupsAccesses removes the group", async () => {
    const roomId = makeExternalRoomId();
    const { status: createStatus } = await api("POST", "/v2/rooms", {
      id: roomId,
      groupsAccesses: { editors: ["room:write"] },
      usersAccesses: { alice: ["room:write"] },
    });
    expect(createStatus).toBe(200);

    // Verify permissions are set
    const before = await api("GET", `/v2/rooms/${roomId}`);
    expect(before.body.groupsAccesses).toEqual({ editors: ["room:write"] });
    expect(before.body.usersAccesses).toEqual({ alice: ["room:write"] });

    // Remove group by setting to null
    const { status: updateStatus } = await api("POST", `/v2/rooms/${roomId}`, {
      groupsAccesses: { editors: null },
      usersAccesses: { alice: null },
    });
    expect(updateStatus).toBe(200);

    // Verify permissions are removed
    const after = await api("GET", `/v2/rooms/${roomId}`);
    expect(after.body.groupsAccesses).toEqual({});
    expect(after.body.usersAccesses).toEqual({});
  });
});
