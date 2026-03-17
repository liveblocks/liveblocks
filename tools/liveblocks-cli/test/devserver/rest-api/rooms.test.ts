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

import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import * as Rooms from "~/dev-server/db/rooms";
import { zen } from "~/dev-server/routes/rest-api";

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
  beforeAll(() => {
    Rooms.useEphemeralStorage();
  });

  afterAll(() => {
    Rooms.cleanup();
  });

  test("create three rooms with different metadata, then list/filter", async () => {
    // Create three rooms with distinct metadata
    expect(
      (
        await api("POST", "/v2/rooms", {
          id: "project-alpha-1",
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
          id: "project-alpha-2",
          metadata: { team: "backend", priority: "low" },
        })
      ).status
    ).toBe(200);

    expect(
      (
        await api("POST", "/v2/rooms", {
          id: "project-beta-1",
          metadata: { team: "frontend", priority: "low" },
        })
      ).status
    ).toBe(200);

    // List all rooms (no filters)
    const all = await api("GET", "/v2/rooms");
    expect(all.status).toBe(200);
    expect(all.body.data).toHaveLength(3);

    // Filter by roomId prefix: "project-alpha"
    const prefix = await api(
      "GET",
      `/v2/rooms?query=${encodeURIComponent('roomId^"project-alpha"')}`
    );
    expect(prefix.status).toBe(200);
    expect(prefix.body.data).toHaveLength(2);
    const prefixIds = (prefix.body.data as { id: string }[])
      .map((r) => r.id)
      .sort();
    expect(prefixIds).toEqual(["project-alpha-1", "project-alpha-2"]);

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
    expect(metaIds).toEqual(["project-alpha-1", "project-beta-1"]);

    // Combined: roomId prefix + metadata
    const combined = await api(
      "GET",
      `/v2/rooms?query=${encodeURIComponent('roomId^"project-alpha" metadata["team"]:"frontend"')}`
    );
    expect(combined.status).toBe(200);
    expect(combined.body.data).toHaveLength(1);
    expect((combined.body.data as { id: string }[])[0].id).toBe(
      "project-alpha-1"
    );

    // Filter by metadata: priority = "low"
    const low = await api(
      "GET",
      `/v2/rooms?query=${encodeURIComponent('metadata["priority"]:"low"')}`
    );
    expect(low.status).toBe(200);
    expect(low.body.data).toHaveLength(2);
    const lowIds = (low.body.data as { id: string }[]).map((r) => r.id).sort();
    expect(lowIds).toEqual(["project-alpha-2", "project-beta-1"]);
  });

  test("get room returns metadata and permissions", async () => {
    const { status, body } = await api("GET", "/v2/rooms/project-alpha-1");
    expect(status).toBe(200);
    expect(body.id).toBe("project-alpha-1");
    expect(body.metadata).toEqual({
      team: "frontend",
      priority: "high",
      labels: ["bug", "urgent"],
    });
    expect(body.defaultAccesses).toEqual(["room:write"]);
  });

  test("get non-existent room returns 404", async () => {
    const { status } = await api("GET", "/v2/rooms/does-not-exist");
    expect(status).toBe(404);
  });

  test("create duplicate room returns 409", async () => {
    const { status } = await api("POST", "/v2/rooms", {
      id: "project-alpha-1",
    });
    expect(status).toBe(409);
  });

  test("update room metadata", async () => {
    const { status, body } = await api("POST", "/v2/rooms/project-alpha-1", {
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
    const { status, body } = await api("POST", "/v2/rooms", {
      id: "default-perms-room",
    });
    expect(status).toBe(200);
    expect(body.defaultAccesses).toEqual(["room:write"]);
    expect(body.usersAccesses).toEqual({});
    expect(body.groupsAccesses).toEqual({});
  });

  test("room created with explicit permissions is reflected in GET", async () => {
    const { status: createStatus } = await api("POST", "/v2/rooms", {
      id: "perms-room",
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

    const { status, body } = await api("GET", "/v2/rooms/perms-room");
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
    const del = await api("DELETE", "/v2/rooms/project-beta-1");
    expect(del.status).toBe(204);

    // Verify it's gone
    const get = await api("GET", "/v2/rooms/project-beta-1");
    expect(get.status).toBe(404);

    // Verify it no longer appears in the list
    const list = await api("GET", "/v2/rooms");
    const listIds = (list.body.data as { id: string }[]).map((r) => r.id);
    expect(listIds).not.toContain("project-beta-1");
  });

  test("room created without organizationId defaults to 'default'", () => {
    const room = Rooms.getRoom("project-alpha-1");
    expect(room).toBeDefined();
    expect(room!.organizationId).toBe("default");
  });

  test("create room with explicit organizationId", async () => {
    const { status } = await api("POST", "/v2/rooms", {
      id: "org-room-acme",
      organizationId: "org_acme",
      metadata: { env: "test" },
    });
    expect(status).toBe(200);

    const room = Rooms.getRoom("org-room-acme");
    expect(room).toBeDefined();
    expect(room!.organizationId).toBe("org_acme");
  });

  test("create room with different organizationId", async () => {
    const { status } = await api("POST", "/v2/rooms", {
      id: "org-room-globex",
      organizationId: "org_globex",
    });
    expect(status).toBe(200);

    const room = Rooms.getRoom("org-room-globex");
    expect(room).toBeDefined();
    expect(room!.organizationId).toBe("org_globex");
  });

  test("list rooms filtered by organizationId", async () => {
    const acme = await api("GET", "/v2/rooms?organizationId=org_acme");
    expect(acme.status).toBe(200);
    const acmeIds = (acme.body.data as { id: string }[]).map((r) => r.id);
    expect(acmeIds).toEqual(["org-room-acme"]);

    const globex = await api("GET", "/v2/rooms?organizationId=org_globex");
    expect(globex.status).toBe(200);
    const globexIds = (globex.body.data as { id: string }[]).map((r) => r.id);
    expect(globexIds).toEqual(["org-room-globex"]);

    // Default org rooms (created without explicit organizationId)
    const defaultOrg = await api("GET", "/v2/rooms?organizationId=default");
    expect(defaultOrg.status).toBe(200);
    const defaultIds = (defaultOrg.body.data as { id: string }[]).map(
      (r) => r.id
    );
    expect(defaultIds).not.toContain("org-room-acme");
    expect(defaultIds).not.toContain("org-room-globex");
  });

  test("update room with null groupsAccesses removes the group", async () => {
    // Create a room with group permissions
    const { status: createStatus } = await api("POST", "/v2/rooms", {
      id: "null-perms-room",
      groupsAccesses: { editors: ["room:write"] },
      usersAccesses: { alice: ["room:write"] },
    });
    expect(createStatus).toBe(200);

    // Verify permissions are set
    const before = await api("GET", "/v2/rooms/null-perms-room");
    expect(before.body.groupsAccesses).toEqual({ editors: ["room:write"] });
    expect(before.body.usersAccesses).toEqual({ alice: ["room:write"] });

    // Remove group by setting to null
    const { status: updateStatus } = await api(
      "POST",
      "/v2/rooms/null-perms-room",
      {
        groupsAccesses: { editors: null },
        usersAccesses: { alice: null },
      }
    );
    expect(updateStatus).toBe(200);

    // Verify permissions are removed
    const after = await api("GET", "/v2/rooms/null-perms-room");
    expect(after.body.groupsAccesses).toEqual({});
    expect(after.body.usersAccesses).toEqual({});
  });
});
