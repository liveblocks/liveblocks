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

import type { PlainLsonObject } from "@liveblocks/core";
import type { Guid, Logger, YDocId } from "@liveblocks/server";
import {
  jsonObjectYolo,
  ROOT_YDOC_ID,
  snapshotToLossyJson_eager,
  snapshotToPlainLson_eager,
} from "@liveblocks/server";
import { json, ZenRouter } from "@liveblocks/zenrouter";
import { constant, enum_, object, string } from "decoders";
import { Base64 } from "js-base64";
import * as Y from "yjs";

import * as RoomsDB from "../db/rooms";
import { authorizeSecretKey } from "../lib/auth";
import { yDocToJson } from "../lib/ydoc";
import { DUMMY, NOT_IMPLEMENTED } from "../responses";

enum SerializationFormat {
  PlainLson = "plain-lson", // the default
  LossyJson = "json",
}

const serializationFormat = enum_(SerializationFormat);

export const zen = new ZenRouter({
  authorize: ({ req }) => authorizeSecretKey(req),
});

function ROOM_NOT_FOUND(roomId: string): Response {
  return json(
    { error: "ROOM_NOT_FOUND", message: `Room with id "${roomId}" not found.` },
    404
  );
}

/**
 * Get a room by ID
 */
zen.route("GET /v2/rooms/<roomId>", async ({ p }) => {
  const exists = await RoomsDB.exists(p.roomId);
  if (!exists) {
    throw ROOM_NOT_FOUND(p.roomId);
  }

  return {
    type: "room",
    id: p.roomId,
    createdAt: new Date().toISOString(),
    metadata: {},
    defaultAccesses: ["room:write"],
    groupsAccesses: {},
    usersAccesses: {},
  };
});

/**
 * Get all rooms
 */
zen.route("GET /v2/rooms", () => {
  const roomIds = RoomsDB.getAll();
  const data = roomIds.map((id) => ({
    type: "room",
    id,
    createdAt: new Date().toISOString(),
    metadata: {},
    defaultAccesses: ["room:write"],
    groupsAccesses: {},
    usersAccesses: {},
  }));

  return DUMMY(
    { data, nextPage: null, nextCursor: null },
    200,
    "The Liveblocks dev server doesn't implement room permissions or pagination yet, so all rooms are returned in a single page with nextPage set to null.",
    "GET /v2/rooms"
  );
});

/**
 * Create a room
 *
 * TODO: Verify caller's ownership/authorization for the specified room ID
 * before initializing storage. Deliberately skipped for now.
 */
zen.route(
  "POST /v2/rooms",
  object({
    id: string,
  }),
  async ({ body }) => {
    // Check if room already exists
    const exists = await RoomsDB.exists(body.id);
    if (exists) {
      return new Response(
        JSON.stringify({
          error: "ROOM_ALREADY_EXISTS",
          message: `Room with id "${body.id}" already exists.`,
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create room with empty storage
    try {
      await RoomsDB.create(body.id);
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
        return new Response(
          JSON.stringify({
            error: "ROOM_ALREADY_EXISTS",
            message: `Room with id "${body.id}" already exists.`,
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      throw error;
    }

    return {
      type: "room",
      id: body.id,
      createdAt: new Date().toISOString(),
      metadata: {},
      defaultAccesses: ["room:write"],
      groupsAccesses: {},
      usersAccesses: {},
    };
  }
);

zen.route("POST /v2/rooms/<roomId>", () => NOT_IMPLEMENTED());

/**
 * Get storage for a room
 */
zen.route("GET /v2/rooms/<roomId>/storage", async ({ url, p }) => {
  const exists = await RoomsDB.exists(p.roomId);
  if (!exists) {
    throw ROOM_NOT_FOUND(p.roomId);
  }

  const format =
    serializationFormat.value(url.searchParams.get("format")) ??
    SerializationFormat.PlainLson;

  const room = RoomsDB.getOrCreate(p.roomId);
  await room.load();

  const snapshot = room.storage.loadedDriver.get_snapshot(false);
  const storage =
    format === SerializationFormat.LossyJson
      ? snapshotToLossyJson_eager(snapshot)
      : snapshotToPlainLson_eager(snapshot);

  return new Response(JSON.stringify(storage), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

/**
 * Initialize storage for a room
 *
 * TODO: Verify caller's per-room access permission before loading or
 * modifying storage. Deliberately skipped for now.
 */
zen.route(
  "POST /v2/rooms/<roomId>/storage",

  object({
    liveblocksType: constant("LiveObject" as const),
    data: jsonObjectYolo,
  }).refineType<PlainLsonObject>(),

  async ({ p, body }) => {
    const exists = await RoomsDB.exists(p.roomId);
    if (!exists) {
      throw ROOM_NOT_FOUND(p.roomId);
    }

    const room = RoomsDB.getOrCreate(p.roomId);
    await room.load();

    // Check if storage already has data
    const snapshot = room.storage.loadedDriver.get_snapshot(false);
    const existingStorage = snapshotToPlainLson_eager(snapshot);

    if (Object.keys(existingStorage.data).length > 0) {
      return new Response(
        JSON.stringify({
          error: "CANNOT_UPDATE_EXISTING_STORAGE",
          message:
            "The room already has storage data. It's only possible to initialize the storage for an empty room.",
          suggestion: "Create another room or clear this room storage first.",
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Initialize storage
    await room.driver.DANGEROUSLY_reset_nodes(body);
    room.unload();

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
);

zen.route("GET /v2/rooms/<roomId>/ydoc", async ({ url, p }) => {
  const exists = await RoomsDB.exists(p.roomId);
  if (!exists) {
    throw ROOM_NOT_FOUND(p.roomId);
  }

  const room = RoomsDB.getOrCreate(p.roomId);
  await room.load();

  const key = url.searchParams.get("key") ?? "";
  const type = url.searchParams.get("type") ?? "";
  const ydocId = (url.searchParams.get("guid") ?? ROOT_YDOC_ID) as YDocId;
  const formatting = url.searchParams.get("formatting") !== null;

  const doc = await room.yjsStorage.getYDoc(ydocId);
  const result = yDocToJson(doc, key, formatting, type);

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

zen.route("PUT /v2/rooms/<roomId>/ydoc", async ({ req, url, p }) => {
  if (req.headers.get("content-type") !== "application/octet-stream") {
    return new Response(
      JSON.stringify({
        error: "BAD_REQUEST",
        message:
          'Expected "Content-Type" header to be "application/octet-stream", and the HTTP body to be a valid binary Yjs update.',
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const exists = await RoomsDB.exists(p.roomId);
  if (!exists) {
    throw ROOM_NOT_FOUND(p.roomId);
  }

  const room = RoomsDB.getOrCreate(p.roomId);
  await room.load();

  const buffer: ArrayBuffer = await req.arrayBuffer();
  const update = Base64.fromUint8Array(new Uint8Array(buffer));
  const guidParam = url.searchParams.get("guid");
  const encoder = url.searchParams.get("encoder");
  const v2 = encoder === "v2";

  // Convert guid to Guid type, or undefined if not provided or is ROOT_YDOC_ID
  const guid: Guid | undefined =
    guidParam && guidParam !== ROOT_YDOC_ID ? (guidParam as Guid) : undefined;

  try {
    await room.mutex.runExclusive(() =>
      room.yjsStorage.addYDocUpdate({} as unknown as Logger, update, guid, v2)
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "UNPROCESSABLE_ENTITY",
        message: err instanceof Error ? err.message : "Could not apply update",
        suggestion:
          "Please ensure the update is correct, and you selected the correct encoder to use (v1 or v2).",
      }),
      {
        status: 422,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

zen.route("GET /v2/rooms/<roomId>/ydoc-binary", async ({ url, p }) => {
  const exists = await RoomsDB.exists(p.roomId);
  if (!exists) {
    throw ROOM_NOT_FOUND(p.roomId);
  }

  const room = RoomsDB.getOrCreate(p.roomId);
  await room.load();

  const ydocId = (url.searchParams.get("guid") ?? ROOT_YDOC_ID) as YDocId;
  const encoder = url.searchParams.get("encoder");

  const doc = await room.yjsStorage.getYDoc(ydocId);
  const update =
    encoder === "v2"
      ? Y.encodeStateAsUpdateV2(doc)
      : Y.encodeStateAsUpdate(doc);

  return new Response(update, {
    status: 200,
    headers: { "Content-Type": "application/octet-stream" },
  });
});

/**
 * ------------------------------------------------------------
 * NOT IMPLEMENTED ROUTES
 * ------------------------------------------------------------
 */

// prettier-ignore
{
  zen.route("DELETE /v2/rooms/<roomId>/storage", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/rooms/<roomId>/threads", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/upsert", () => NOT_IMPLEMENTED());
  zen.route("DELETE /v2/rooms/<roomId>", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/update-room-id", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/update-tenant-id", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/update-organization-id", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/rooms/<roomId>/prewarm", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/request-storage-mutation", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/rooms/<roomId>/rippling/text-editor", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/rippling/text-editor", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/rooms/<roomId>/active_users", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/send-message", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/broadcast_event", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/rooms/<roomId>/versions", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/rooms/<roomId>/version/<version>", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/version", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/threads", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/rooms/<roomId>/threads/<threadId>", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/threads/<threadId>/mark-as-resolved", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/threads/<threadId>/mark-as-unresolved", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/threads/<threadId>/subscribe", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/threads/<threadId>/unsubscribe", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/rooms/<roomId>/threads/<threadId>/subscriptions", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/threads/<threadId>/metadata", () => NOT_IMPLEMENTED());
  zen.route("DELETE /v2/rooms/<roomId>/threads/<threadId>", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/rooms/<roomId>/threads/<threadId>/participants", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/rooms/<roomId>/threads/<threadId>/inbox-notifications", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/threads/<threadId>/comments", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/rooms/<roomId>/threads/<threadId>/comments/<commentId>", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/threads/<threadId>/comments/<commentId>", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/threads/<threadId>/comments/<commentId>/metadata", () => NOT_IMPLEMENTED());
  zen.route("DELETE /v2/rooms/<roomId>/threads/<threadId>/comments/<commentId>", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/threads/<threadId>/comments/<commentId>/add-reaction", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/threads/<threadId>/comments/<commentId>/remove-reaction", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/rooms/<roomId>/users/<userId>/notification-settings", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/rooms/<roomId>/users/<userId>/subscription-settings", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/users/<userId>/notification-settings", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/users/<userId>/subscription-settings", () => NOT_IMPLEMENTED());
  zen.route("DELETE /v2/rooms/<roomId>/users/<userId>/notification-settings", () => NOT_IMPLEMENTED());
  zen.route("DELETE /v2/rooms/<roomId>/users/<userId>/subscription-settings", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/users/<userId>/inbox-notifications/<inboxNotificationId>", () => NOT_IMPLEMENTED());
  zen.route("DELETE /v2/users/<userId>/inbox-notifications/<inboxNotificationId>", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/users/<userId>/inbox-notifications", () => NOT_IMPLEMENTED());
  zen.route("DELETE /v2/users/<userId>/inbox-notifications", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/users/<userId>/notification-settings", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/users/<userId>/notification-settings", () => NOT_IMPLEMENTED());
  zen.route("DELETE /v2/users/<userId>/notification-settings", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/users/<userId>/room-subscription-settings", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/users/<userId>/threads", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/inbox-notifications/trigger", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/inbox-notifications/<inboxNotificationId>/read", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/threads", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/groups", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/groups/<groupId>", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/groups/<groupId>/add-members", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/groups/<groupId>/remove-members", () => NOT_IMPLEMENTED());
  zen.route("DELETE /v2/groups/<groupId>", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/groups", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/users/<userId>/groups", () => NOT_IMPLEMENTED());
}
