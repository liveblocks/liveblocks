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

import type { JsonObject, PlainLsonObject } from "@liveblocks/core";
import { QueryParser } from "@liveblocks/query-parser";
import type { Guid, Logger, YDocId } from "@liveblocks/server";
import {
  jsonObjectYolo,
  ROOT_YDOC_ID,
  snapshotToLossyJson_eager,
  snapshotToPlainLson_eager,
} from "@liveblocks/server";
import { json, ZenRouter } from "@liveblocks/zenrouter";
import {
  array,
  constant,
  either,
  enum_,
  nullable,
  object,
  optional,
  record,
  string,
} from "decoders";
import { Base64 } from "js-base64";
import * as Y from "yjs";

import type { DbRoom, RoomFilters } from "~/dev-server/db/rooms";
import * as Rooms from "~/dev-server/db/rooms";
import { authorizeSecretKey } from "~/dev-server/lib/auth";
import type { Permission } from "~/dev-server/lib/permissions";
import { yDocToJson } from "~/dev-server/lib/ydoc";
import { DUMMY, NOT_IMPLEMENTED } from "~/dev-server/responses";

enum SerializationFormat {
  PlainLson = "plain-lson", // the default
  LossyJson = "json",
}

const serializationFormat = enum_(SerializationFormat);

const roomMetadata = record(
  string,
  // Values can be either strings or arrays-of-strings
  either(string, array(string))
);

export const zen = new ZenRouter({
  authorize: ({ req }) => authorizeSecretKey(req),
});

function ROOM_NOT_FOUND(roomId: string): Response {
  return json(
    { error: "ROOM_NOT_FOUND", message: `Room with id "${roomId}" not found.` },
    404
  );
}

const roomsQueryParser = new QueryParser({
  fields: { roomId: "string" },
  indexableFields: { metadata: "token" },
});

function parseRoomsQuery(query: string): RoomFilters {
  const result = roomsQueryParser.parse(query);
  const filters: RoomFilters = {};

  for (const cond of result.query.allOf) {
    switch (cond.type) {
      case "PrefixCondition": {
        if (
          cond.field.type === "DirectField" &&
          cond.field.ref.name === "roomId"
        ) {
          filters.roomId = { value: cond.prefix.value, operator: "^" };
        }
        break;
      }
      case "ExactCondition": {
        if (
          cond.field.type === "KeyedField" &&
          cond.field.base.name === "metadata" &&
          cond.value.type === "LiteralString"
        ) {
          filters.metadata ??= {};
          filters.metadata[cond.field.key] = cond.value.value;
        }
        break;
      }
    }
  }

  return filters;
}

function serializeRoom(record: DbRoom) {
  return {
    type: "room",
    id: record.id,
    organizationId: record.organizationId,
    createdAt: record.createdAt,
    metadata: record.metadata,
    defaultAccesses: record.defaultAccesses,
    groupsAccesses: record.groupsAccesses,
    usersAccesses: record.usersAccesses,
  };
}

/**
 * Get a room by ID
 */
zen.route("GET /v2/rooms/<roomId>", ({ p }) => {
  const record = Rooms.getRoom(p.roomId);
  if (!record) {
    throw ROOM_NOT_FOUND(p.roomId);
  }
  return serializeRoom(record);
});

/**
 * Get all rooms
 */
zen.route("GET /v2/rooms", ({ url }) => {
  let filters: RoomFilters | undefined;

  // The `query` param uses the Liveblocks query language
  const query = url.searchParams.get("query");
  if (query) {
    try {
      filters = parseRoomsQuery(query);
    } catch (err) {
      return json(
        {
          error: "INVALID_QUERY",
          message: err instanceof Error ? err.message : String(err),
        },
        422
      );
    }
  } else {
    // Fall back to simple metadata.* query params
    const metadata: Record<string, string> = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (key.startsWith("metadata.")) {
        metadata[key.slice("metadata.".length)] = value;
      }
    }
    if (Object.keys(metadata).length > 0) {
      filters = { metadata };
    }
  }

  const organizationId = url.searchParams.get("organizationId") ?? undefined;
  if (organizationId) {
    filters = { ...filters, organizationId };
  }

  const records = Rooms.listRooms(filters);
  const data = records.map(serializeRoom);

  return { data, nextPage: null, nextCursor: null };
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
    organizationId: optional(string),
    defaultAccesses: optional(array(string)),
    metadata: optional(roomMetadata),
    usersAccesses: optional(record(string, array(string))),
    groupsAccesses: optional(record(string, array(string))),
  }),
  ({ body }) => {
    if (Rooms.getRoom(body.id)) {
      return json(
        {
          error: "ROOM_ALREADY_EXISTS",
          message: `Room with id "${body.id}" already exists.`,
        },
        409
      );
    }

    const rec = Rooms.getOrCreateRoom(body.id, {
      organizationId: body.organizationId,
      defaultAccesses: body.defaultAccesses as Permission[] | undefined,
      metadata: body.metadata as JsonObject | undefined,
      usersAccesses: body.usersAccesses as
        | Record<string, Permission[]>
        | undefined,
      groupsAccesses: body.groupsAccesses as
        | Record<string, Permission[]>
        | undefined,
    });
    return serializeRoom(rec);
  }
);

/**
 * Update a room
 */
zen.route(
  "POST /v2/rooms/<roomId>",
  object({
    defaultAccesses: optional(array(string)),
    metadata: optional(roomMetadata),
    usersAccesses: optional(record(string, nullable(array(string)))),
    groupsAccesses: optional(record(string, nullable(array(string)))),
  }),
  ({ p, body }) => {
    const updated = Rooms.updateRoom(p.roomId, {
      defaultAccesses: body.defaultAccesses as Permission[] | undefined,
      metadata: body.metadata as JsonObject | undefined,
      usersAccesses: body.usersAccesses as
        | Record<string, Permission[] | null>
        | undefined,
      groupsAccesses: body.groupsAccesses as
        | Record<string, Permission[] | null>
        | undefined,
    });
    if (!updated) {
      throw ROOM_NOT_FOUND(p.roomId);
    }
    return serializeRoom(updated);
  }
);

/**
 * Delete a room
 *
 * Idempotent: returns 204 even if the room doesn't exist.
 */
zen.route("DELETE /v2/rooms/<roomId>", async ({ p }) => {
  await Rooms.deleteRoom(p.roomId);
  return new Response(null, { status: 204 });
});

/**
 * Get storage for a room
 */
zen.route("GET /v2/rooms/<roomId>/storage", async ({ url, p }) => {
  if (!Rooms.getRoom(p.roomId)) {
    throw ROOM_NOT_FOUND(p.roomId);
  }

  const format =
    serializationFormat.value(url.searchParams.get("format")) ??
    SerializationFormat.PlainLson;

  const room = Rooms.getRoomInstance(p.roomId);
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
    if (!Rooms.getRoom(p.roomId)) {
      throw ROOM_NOT_FOUND(p.roomId);
    }

    const room = Rooms.getRoomInstance(p.roomId);
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

/**
 * Delete storage for a room (reset to empty)
 */
zen.route("DELETE /v2/rooms/<roomId>/storage", async ({ p }) => {
  if (!Rooms.getRoom(p.roomId)) {
    throw ROOM_NOT_FOUND(p.roomId);
  }

  const room = Rooms.getRoomInstance(p.roomId);
  await room.load();

  const emptyStorage: PlainLsonObject = {
    liveblocksType: "LiveObject",
    data: {},
  };
  await room.driver.DANGEROUSLY_reset_nodes(emptyStorage);
  room.unload();

  return new Response(null, { status: 204 });
});

zen.route("GET /v2/rooms/<roomId>/ydoc", async ({ url, p }) => {
  if (!Rooms.getRoom(p.roomId)) {
    throw ROOM_NOT_FOUND(p.roomId);
  }

  const room = Rooms.getRoomInstance(p.roomId);
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

  if (!Rooms.getRoom(p.roomId)) {
    throw ROOM_NOT_FOUND(p.roomId);
  }

  const room = Rooms.getRoomInstance(p.roomId);
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
  if (!Rooms.getRoom(p.roomId)) {
    throw ROOM_NOT_FOUND(p.roomId);
  }

  const room = Rooms.getRoomInstance(p.roomId);
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
 * Get active users in a room
 */
zen.route("GET /v2/rooms/<roomId>/active_users", ({ p }) => {
  if (!Rooms.getRoom(p.roomId)) {
    throw ROOM_NOT_FOUND(p.roomId);
  }

  const room = Rooms.getRoomInstance(p.roomId);
  const data = room.listSessions().map((session) => ({
    type: "user",
    connectionId: session.actor,
    id: session.user.id,
    info: session.user.info,
  }));

  return json({ data });
});

zen.route("DELETE /v2/rooms/<roomId>/feeds/<feedId>", ({ p }) => {
  if (!Rooms.getRoom(p.roomId)) {
    throw ROOM_NOT_FOUND(p.roomId);
  }
  return DUMMY({
    ok: true,
  });
});
zen.route(
  "DELETE /v2/rooms/<roomId>/feeds/<feedId>/messages/<messageId>",
  ({ p }) => {
    if (!Rooms.getRoom(p.roomId)) {
      throw ROOM_NOT_FOUND(p.roomId);
    }
    return DUMMY({
      ok: true,
    });
  }
);
zen.route("GET /v2/rooms/<roomId>/feeds", ({ p }) => {
  if (!Rooms.getRoom(p.roomId)) {
    throw ROOM_NOT_FOUND(p.roomId);
  }
  return DUMMY({
    feeds: [
      {
        feedId: "123",
        metadata: {
          title: "Test Feed",
          description: "This is a test feed",
        },
        timestamp: new Date().getTime(),
      },
    ],
    nextCursor: null,
  });
});
zen.route("GET /v2/rooms/<roomId>/feeds/<feedId>", ({ p }) => {
  if (!Rooms.getRoom(p.roomId)) {
    throw ROOM_NOT_FOUND(p.roomId);
  }
  return DUMMY({
    feedId: "123",
    timestamp: new Date().getTime(),
    metadata: {
      title: "Test Feed",
      description: "This is a test feed",
    },
  });
});
zen.route("GET /v2/rooms/<roomId>/feeds/<feedId>/messages", ({ p }) => {
  if (!Rooms.getRoom(p.roomId)) {
    throw ROOM_NOT_FOUND(p.roomId);
  }
  return DUMMY({
    messages: [
      {
        messageId: "123",
        data: {
          content: "This is a test message",
        },
      },
    ],
    nextCursor: null,
  });
});
zen.route("PATCH /v2/rooms/<roomId>/feeds/<feedId>", ({ p }) => {
  if (!Rooms.getRoom(p.roomId)) {
    throw ROOM_NOT_FOUND(p.roomId);
  }
  const now = Date.now();
  return DUMMY({
    feedId: p.feedId,
    createdAt: now,
    updatedAt: now,
    metadata: {
      title: "Test Feed",
      description: "This is a test feed",
    },
  });
});
zen.route(
  "PATCH /v2/rooms/<roomId>/feeds/<feedId>/messages/<messageId>",
  ({ p }) => {
    if (!Rooms.getRoom(p.roomId)) {
      throw ROOM_NOT_FOUND(p.roomId);
    }
    const now = Date.now();
    return DUMMY({
      id: p.messageId,
      createdAt: now,
      updatedAt: now,
      data: {
        content: "This is a test message",
      },
    });
  }
);
zen.route("POST /v2/rooms/<roomId>/feeds", ({ p }) => {
  if (!Rooms.getRoom(p.roomId)) {
    throw ROOM_NOT_FOUND(p.roomId);
  }
  return DUMMY({
    feedId: "123",
    timestamp: new Date().getTime(),
    metadata: {
      title: "Test Feed",
      description: "This is a test feed",
    },
  });
});
zen.route("POST /v2/rooms/<roomId>/feeds/<feedId>/messages", ({ p }) => {
  if (!Rooms.getRoom(p.roomId)) {
    throw ROOM_NOT_FOUND(p.roomId);
  }
  return DUMMY({
    id: "123",
    timestamp: new Date().getTime(),
    data: {
      content: "This is a test message",
    },
  });
});

/**
 * ------------------------------------------------------------
 * NOT IMPLEMENTED ROUTES
 * ------------------------------------------------------------
 */

// prettier-ignore
{
  zen.route("PATCH /v2/rooms/<roomId>/storage/json-patch", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/presence", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/rooms/<roomId>/threads", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/upsert", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/update-room-id", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/rooms/<roomId>/update-organization-id", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/rooms/<roomId>/prewarm", () => NOT_IMPLEMENTED());
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
  zen.route("GET /v2/rooms/<roomId>/attachments/<attachmentId>", () => NOT_IMPLEMENTED());
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
  zen.route("POST /v2/inbox-notifications/trigger", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/inbox-notifications/<inboxNotificationId>/read", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/groups", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/groups/<groupId>", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/groups/<groupId>/add-members", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/groups/<groupId>/remove-members", () => NOT_IMPLEMENTED());
  zen.route("DELETE /v2/groups/<groupId>", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/groups", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/users/<userId>/groups", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/ai/copilots", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/ai/copilots/<copilotId>", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/ai/copilots/<copilotId>/knowledge", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/ai/copilots/<copilotId>/knowledge/<knowledgeSourceId>", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/ai/copilots/<copilotId>/knowledge/file/<knowledgeSourceId>", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/ai/copilots/<copilotId>/knowledge/web/<knowledgeSourceId>/links", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/ai/copilots", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/ai/copilots/<copilotId>", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/ai/copilots/<copilotId>/knowledge/web", () => NOT_IMPLEMENTED());
  zen.route("DELETE /v2/ai/copilots/<copilotId>", () => NOT_IMPLEMENTED());
  zen.route("DELETE /v2/ai/copilots/<copilotId>/knowledge/file/<knowledgeSourceId>", () => NOT_IMPLEMENTED());
  zen.route("DELETE /v2/ai/copilots/<copilotId>/knowledge/web/<knowledgeSourceId>", () => NOT_IMPLEMENTED());
  zen.route("PUT /v2/ai/copilots/<copilotId>/knowledge/file/<fileName>", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/management/projects", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/management/projects/<projectId>", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/management/projects", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/management/projects/<projectId>", () => NOT_IMPLEMENTED());
  zen.route("DELETE /v2/management/projects/<projectId>", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/management/projects/<projectId>/webhooks", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/management/projects/<projectId>/webhooks/<webhookId>", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/management/projects/<projectId>/webhooks/<webhookId>/additional-headers", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/management/projects/<projectId>/webhooks", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/management/projects/<projectId>/webhooks/<webhookId>", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/management/projects/<projectId>/webhooks/<webhookId>/additional-headers", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/management/projects/<projectId>/webhooks/<webhookId>/delete-additional-headers", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/management/projects/<projectId>/webhooks/<webhookId>/recover-failed-messages", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/management/projects/<projectId>/webhooks/<webhookId>/secret/roll", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/management/projects/<projectId>/webhooks/<webhookId>/test", () => NOT_IMPLEMENTED());
  zen.route("DELETE /v2/management/projects/<projectId>/webhooks/<webhookId>", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/management/projects/<projectId>/api-keys/public/activate", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/management/projects/<projectId>/api-keys/public/deactivate", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/management/projects/<projectId>/api-keys/public/roll", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/management/projects/<projectId>/api-keys/secret/roll", () => NOT_IMPLEMENTED());
}
