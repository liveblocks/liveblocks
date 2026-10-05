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

import type { Json } from "@liveblocks/core";
import { ClientMsgCode, nanoid, OpCode, ServerMsgCode } from "@liveblocks/core";
import type { IServerWebSocket } from "@liveblocks/server";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import * as Rooms from "~/dev-server/db/rooms";
import { zen as restApi } from "~/dev-server/routes/rest-api";

import { makeExternalRoomId } from "../_helpers";

const BASE = "http://localhost";
const SECRET = { Authorization: "Bearer sk_localdev" };

function makeFileId(): string {
  return `fl_${nanoid()}`;
}

/**
 * Collects everything the server sends down a session's socket.
 *
 * The whole point of these tests is the isClientMsgAllowed hook, which only
 * runs for browser sessions. The REST routes all use backend sessions, which
 * deliberately skip it, so they can't reach this code path at all.
 */
class FakeSocket implements IServerWebSocket {
  readonly sent: string[] = [];
  closed: { code: number; reason?: string } | undefined;

  send(msg: string | ArrayBuffer): number {
    this.sent.push(typeof msg === "string" ? msg : "<binary>");
    return 1;
  }

  close(code: number, reason?: string): void {
    this.closed = { code, reason };
  }

  /** Every server message received, parsed. */
  messages(): { type: number; reason?: string }[] {
    return this.sent.flatMap((raw) => {
      const parsed = JSON.parse(raw) as
        | { type: number; reason?: string }
        | { type: number; reason?: string }[];
      return Array.isArray(parsed) ? parsed : [parsed];
    });
  }
}

/** Start a real browser session on a room, and return its socket. */
function connect(roomId: string): {
  socket: FakeSocket;
  send: (msgs: Json[]) => Promise<void>;
} {
  const room = Rooms.getRoomInstance(roomId);
  const socket = new FakeSocket();
  const ticket = room.createTicket();

  // Side effects from hooks are fire-and-forget here; nothing under test
  // depends on them completing.
  const defer = (p: Promise<void>) => void p;

  room.startBrowserSession(ticket, socket, undefined, defer);
  return {
    socket,
    send: (msgs) =>
      room.handleData(
        ticket.sessionKey,
        JSON.stringify(msgs),
        undefined,
        defer
      ),
  };
}

function createFileOp(fileId: string, size: number) {
  return {
    type: OpCode.CREATE_FILE,
    id: "1:0",
    parentId: "root",
    parentKey: "file",
    data: { id: fileId, name: "hello.txt", size, mimeType: "text/plain" },
    opId: "1:1",
  };
}

async function api(method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = { ...SECRET };
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  return restApi.fetch(new Request(`${BASE}${path}`, init));
}

async function makeRoom(): Promise<string> {
  const roomId = makeExternalRoomId();
  await api("POST", "/v2/rooms", { id: roomId });
  return roomId;
}

async function upload(roomId: string, fileId: string, contents: string) {
  return restApi.fetch(
    new Request(
      `${BASE}/v2/rooms/${roomId}/storage/files/${fileId}/upload/hello.txt`,
      { method: "PUT", headers: SECRET, body: contents }
    )
  );
}

async function serverStorage(roomId: string) {
  const resp = await api("GET", `/v2/rooms/${roomId}/storage`);
  return (await resp.json()) as {
    data: Record<string, { data: { size: number } } | undefined>;
  };
}

describe("isClientMsgAllowed hook (WebSocket path)", () => {
  beforeAll(() => Rooms.useEphemeralStorage());
  afterAll(() => Rooms.cleanup()); // Needed in bun:test (unlike in Vitest)

  test("rejects a CREATE_FILE op for a file that was never uploaded", async () => {
    const roomId = await makeRoom();
    const { socket, send } = connect(roomId);

    await send([
      { type: ClientMsgCode.UPDATE_STORAGE, ops: [createFileOp(makeFileId(), 1)] }, // prettier-ignore
    ]);

    const rejection = socket
      .messages()
      .find((msg) => msg.type === ServerMsgCode.REJECT_STORAGE_OP);

    expect(rejection).toBeDefined();
    expect(rejection?.reason).toBe("Storage file has not been uploaded");

    // ...and the node never made it into Storage
    expect((await serverStorage(roomId)).data.file).toBeUndefined();
  });

  test("allows a CREATE_FILE op once the file has been uploaded", async () => {
    const roomId = await makeRoom();
    const fileId = makeFileId();
    await upload(roomId, fileId, "hello world");

    const { socket, send } = connect(roomId);
    await send([
      { type: ClientMsgCode.UPDATE_STORAGE, ops: [createFileOp(fileId, 11)] },
    ]);

    expect(
      socket.messages().find((m) => m.type === ServerMsgCode.REJECT_STORAGE_OP)
    ).toBeUndefined();
    expect((await serverStorage(roomId)).data.file?.data.size).toBe(11);
  });

  test("the uploaded size wins over the size the client claims", async () => {
    const roomId = await makeRoom();
    const fileId = makeFileId();
    await upload(roomId, fileId, "hello world");

    const { send } = connect(roomId);
    // Uploaded 11 bytes, claiming 1
    await send([
      { type: ClientMsgCode.UPDATE_STORAGE, ops: [createFileOp(fileId, 1)] },
    ]);

    expect((await serverStorage(roomId)).data.file?.data.size).toBe(11);
  });

  test("one bad file in a batch rejects the whole message", async () => {
    const roomId = await makeRoom();
    const uploadedId = makeFileId();
    await upload(roomId, uploadedId, "hello world");

    const { socket, send } = connect(roomId);
    await send([
      {
        type: ClientMsgCode.UPDATE_STORAGE,
        ops: [
          createFileOp(uploadedId, 11),
          {
            ...createFileOp(makeFileId(), 1),
            id: "1:2",
            parentKey: "ghost",
            opId: "1:3",
          },
        ],
      },
    ]);

    expect(
      socket.messages().find((m) => m.type === ServerMsgCode.REJECT_STORAGE_OP)
    ).toBeDefined();

    // Neither op applied: the check is per-message, not per-op
    const storage = await serverStorage(roomId);
    expect(storage.data.file).toBeUndefined();
    expect(storage.data.ghost).toBeUndefined();
  });

  test("ops that don't create files are unaffected", async () => {
    const roomId = await makeRoom();
    const { socket, send } = connect(roomId);

    await send([
      {
        type: ClientMsgCode.UPDATE_STORAGE,
        ops: [
          {
            type: OpCode.UPDATE_OBJECT,
            id: "root",
            data: { greeting: "hello" },
            opId: "1:1",
          },
        ],
      },
    ]);

    expect(
      socket.messages().find((m) => m.type === ServerMsgCode.REJECT_STORAGE_OP)
    ).toBeUndefined();
  });
});
