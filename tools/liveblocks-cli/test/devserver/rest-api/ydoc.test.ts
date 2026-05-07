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

import { ServerMsgCode } from "@liveblocks/core";
import type { IServerWebSocket } from "@liveblocks/server";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import * as Y from "yjs";

import * as Rooms from "~/dev-server/db/rooms";
import { zen } from "~/dev-server/routes/rest-api";

import { makeExternalRoomId } from "../_helpers";

const BASE = "http://localhost";
const AUTH = { Authorization: "Bearer sk_localdev" };

async function createRoom(roomId: string): Promise<Response> {
  return zen.fetch(
    new Request(`${BASE}/v2/rooms`, {
      method: "POST",
      headers: { ...AUTH, "Content-Type": "application/json" },
      body: JSON.stringify({ id: roomId }),
    })
  );
}

async function putYdoc(roomId: string, update: Uint8Array): Promise<Response> {
  return zen.fetch(
    new Request(`${BASE}/v2/rooms/${roomId}/ydoc`, {
      method: "PUT",
      headers: { ...AUTH, "Content-Type": "application/octet-stream" },
      body: update.slice(),
    })
  );
}

/** A fake socket that records every message sent to it. */
function makeFakeSocket(): { received: string[]; socket: IServerWebSocket } {
  const received: string[] = [];
  const socket: IServerWebSocket = {
    send(msg) {
      const text =
        typeof msg === "string" ? msg : new TextDecoder().decode(msg);
      received.push(text);
      return text.length;
    },
    close() {},
  };
  return { received, socket };
}

describe("PUT /v2/rooms/<roomId>/ydoc", () => {
  beforeAll(() => Rooms.useEphemeralStorage());
  afterAll(() => Rooms.cleanup()); // Needed in bun:test (unlike in Vitest)

  test("broadcasts UPDATE_YDOC to a connected session", async () => {
    const roomId = makeExternalRoomId();
    expect((await createRoom(roomId)).status).toBe(200);

    // Connect a real WebSocket session into the room (via a fake socket that
    // records messages sent to it).
    const room = Rooms.getRoomInstance(roomId);
    await room.load();
    const { received, socket } = makeFakeSocket();
    const ticket = await room.createTicket({});
    await room.startBrowserSession(ticket, socket);

    // Mark how much was sent during session bootstrap so we only inspect
    // messages produced by the REST PUT below.
    const initialMsgCount = received.length;

    // Make a Yjs update and PUT it via the REST API
    const doc = new Y.Doc();
    doc.getText("content").insert(0, "Hello");
    const resp = await putYdoc(roomId, Y.encodeStateAsUpdate(doc));
    expect(resp.status).toBe(200);

    // The connected session should have received an UPDATE_YDOC broadcast
    const broadcastMsgs = received.slice(initialMsgCount).map(
      (s) => JSON.parse(s) as { type?: number }
    );
    const updateYdocCount = broadcastMsgs.filter(
      (m) => m.type === ServerMsgCode.UPDATE_YDOC
    ).length;
    expect(updateYdocCount).toBe(1);
  });
});
