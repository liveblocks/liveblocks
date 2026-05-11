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

import { ClientMsgCode, CrdtType, OpCode } from "@liveblocks/core";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import * as Rooms from "~/dev-server/db/rooms";
import { zen } from "~/dev-server/routes/rest-api";

import { makeExternalRoomId } from "../_helpers";

const BASE = "http://localhost";
const AUTH = { Authorization: "Bearer sk_localdev" };

async function api(
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const headers: Record<string, string> = { ...AUTH };
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  return zen.fetch(new Request(`${BASE}${path}`, init));
}

function parseNdjson(text: string): unknown[] {
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown);
}

describe("REST API - storage mutation", () => {
  beforeAll(() => Rooms.useEphemeralStorage());
  afterAll(() => Rooms.cleanup()); // Needed in bun:test (unlike in Vitest)

  describe("POST /v2/rooms/<roomId>/request-storage-mutation", () => {
    test("returns 404 for non-existent room", async () => {
      const resp = await api(
        "POST",
        `/v2/rooms/${makeExternalRoomId()}/request-storage-mutation`
      );
      expect(resp.status).toBe(404);
    });

    test("returns actor and empty root for new room", async () => {
      const roomId = makeExternalRoomId();
      await api("POST", "/v2/rooms", { id: roomId });

      const resp = await api(
        "POST",
        `/v2/rooms/${roomId}/request-storage-mutation`
      );
      expect(resp.status).toBe(200);
      expect(resp.headers.get("content-type")).toContain(
        "application/x-ndjson"
      );

      const lines = parseNdjson(await resp.text());

      // First line: frontmatter with actor
      expect(lines[0]).toEqual({ actor: expect.any(Number) as unknown });

      // Second line: root node with empty data
      expect(lines[1]).toEqual(["root", { type: CrdtType.OBJECT, data: {} }]);
    });

    test("returns storage nodes for room with data", async () => {
      const roomId = makeExternalRoomId();
      await api("POST", "/v2/rooms", { id: roomId });
      await api("POST", `/v2/rooms/${roomId}/storage`, {
        liveblocksType: "LiveObject",
        data: {
          name: "Alice",
          scores: { liveblocksType: "LiveList", data: [10, 20] },
        },
      });

      const resp = await api(
        "POST",
        `/v2/rooms/${roomId}/request-storage-mutation`
      );
      expect(resp.status).toBe(200);

      const lines = parseNdjson(await resp.text());
      expect(lines[0]).toEqual({ actor: expect.any(Number) as unknown });

      // Should have root + at least one child node
      expect(lines.length).toBeGreaterThan(2);

      // Root should contain "name" in its data
      const root = lines[1] as [string, { type: number; data: object }];
      expect(root[0]).toBe("root");
      expect(root[1].type).toBe(CrdtType.OBJECT);
      expect(root[1].data).toMatchObject({ name: "Alice" });
    });

    test("returns incrementing actor IDs", async () => {
      const roomId = makeExternalRoomId();
      await api("POST", "/v2/rooms", { id: roomId });

      const resp1 = await api(
        "POST",
        `/v2/rooms/${roomId}/request-storage-mutation`
      );
      const lines1 = parseNdjson(await resp1.text());
      const actor1 = (lines1[0] as { actor: number }).actor;

      const resp2 = await api(
        "POST",
        `/v2/rooms/${roomId}/request-storage-mutation`
      );
      const lines2 = parseNdjson(await resp2.text());
      const actor2 = (lines2[0] as { actor: number }).actor;

      expect(actor2).toBeGreaterThan(actor1);
    });
  });

  describe("POST /v2/rooms/<roomId>/send-message", () => {
    test("returns 404 for non-existent room", async () => {
      const resp = await api(
        "POST",
        `/v2/rooms/${makeExternalRoomId()}/send-message`,
        { messages: [] }
      );
      expect(resp.status).toBe(404);
    });

    test("applies UPDATE_STORAGE ops to room storage", async () => {
      const roomId = makeExternalRoomId();
      await api("POST", "/v2/rooms", { id: roomId });

      // First, get an actor ID via request-storage-mutation
      const mutResp = await api(
        "POST",
        `/v2/rooms/${roomId}/request-storage-mutation`
      );
      const lines = parseNdjson(await mutResp.text());
      const { actor } = lines[0] as { actor: number };

      // Send an UPDATE_STORAGE message that sets a key on root
      const resp = await api("POST", `/v2/rooms/${roomId}/send-message`, {
        messages: [
          {
            type: ClientMsgCode.UPDATE_STORAGE,
            ops: [
              {
                type: OpCode.UPDATE_OBJECT,
                id: "root",
                data: { greeting: "hello" },
                opId: `${actor}:0`,
              },
            ],
          },
        ],
      });

      expect(resp.status).toBe(200);
      const body = (await resp.json()) as { messages: unknown[] };
      expect(body).toHaveProperty("messages");

      // Verify the storage was actually updated
      const storageResp = await api("GET", `/v2/rooms/${roomId}/storage`);
      const storage = (await storageResp.json()) as {
        liveblocksType: string;
        data: Record<string, unknown>;
      };
      expect(storage.data).toMatchObject({ greeting: "hello" });
    });

    test("applies CreateObject ops", async () => {
      const roomId = makeExternalRoomId();
      await api("POST", "/v2/rooms", { id: roomId });

      const mutResp = await api(
        "POST",
        `/v2/rooms/${roomId}/request-storage-mutation`
      );
      const lines = parseNdjson(await mutResp.text());
      const { actor } = lines[0] as { actor: number };

      // Create a child object under root
      const resp = await api("POST", `/v2/rooms/${roomId}/send-message`, {
        messages: [
          {
            type: ClientMsgCode.UPDATE_STORAGE,
            ops: [
              {
                type: OpCode.CREATE_OBJECT,
                id: `${actor}:0`,
                parentId: "root",
                parentKey: "child",
                data: { value: 42 },
                opId: `${actor}:1`,
              },
            ],
          },
        ],
      });

      expect(resp.status).toBe(200);

      // Verify via GET storage
      const storageResp = await api("GET", `/v2/rooms/${roomId}/storage`);
      const storage = (await storageResp.json()) as {
        liveblocksType: string;
        data: Record<string, unknown>;
      };
      expect(storage.data.child).toMatchObject({
        liveblocksType: "LiveObject",
        data: { value: 42 },
      });
    });
  });
});
