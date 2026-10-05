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

import { abort, ZenRouter } from "@liveblocks/zenrouter";
import { array, number, numeric, object, string } from "decoders";

import {
  storageFileId,
  storageFileIds,
  uploadId,
} from "~/dev-server/lib/decoders";
import { verifyJwtLite } from "~/dev-server/lib/jwt-lite";
import {
  abortStorageFileMultipartUpload,
  completeStorageFileMultipartUpload,
  createStorageFileMultipartUpload,
  getStorageFileSignedUrls,
  partitionStorageFileIds,
  recordLivefileUpload,
  requireInternalRoomId,
  uploadStorageFile,
  uploadStorageFileMultipartPart,
} from "~/dev-server/lib/storage-files";
import { DUMMY, NOT_IMPLEMENTED } from "~/dev-server/responses";

/** The client's advisory `?fileSize=`, used only for pre-flight limit checks. */
function optionalFileSize(url: URL): number | undefined {
  const raw = url.searchParams.get("fileSize");
  if (raw === null) return undefined;

  const size = Number(raw);
  if (!Number.isSafeInteger(size) || size < 0) {
    abort(400);
  }
  return size;
}

export const zen = new ZenRouter({
  cors: {
    allowCredentials: true,
    maxAge: 600,
    exposeHeaders: ["X-LB-Warn"],
  },
  authorize: ({ req }) => {
    const header = req.headers.get("Authorization");
    if (!header?.startsWith("Bearer ")) return false;

    const token = header.slice(7); // Remove "Bearer " prefix
    const acessToken = verifyJwtLite(token);
    return acessToken !== null;
  },
  params: {
    fileId: storageFileId,
    partNumber: numeric,
    uploadId,
  },
});

/**
 * ------------------------------------------------------------
 * DUMMY RESPONSES
 * ------------------------------------------------------------
 */

zen.route("GET /v2/c/threads", () => {
  return DUMMY({
    threads: [],
    inboxNotifications: [],
    subscriptions: [],
    meta: {
      nextCursor: null,
      requestedAt: new Date().toISOString(),
      permissionHints: {},
    },
  });
});

zen.route("GET /v2/c/threads/delta", () => {
  return DUMMY({
    threads: [],
    inboxNotifications: [],
    subscriptions: [],
    meta: {
      requestedAt: new Date().toISOString(),
      permissionHints: {},
    },
  });
});

zen.route("GET /v2/c/inbox-notifications", () => {
  return DUMMY({
    inboxNotifications: [],
    threads: [],
    subscriptions: [],
    groups: [],
    meta: {
      nextCursor: null,
      requestedAt: new Date().toISOString(),
    },
  });
});

zen.route("GET /v2/c/inbox-notifications/count", () => {
  return DUMMY({ count: 0 });
});

zen.route("GET /v2/c/inbox-notifications/delta", () => {
  return DUMMY({
    inboxNotifications: [],
    threads: [],
    subscriptions: [],
    groups: [],
    deletedInboxNotifications: [],
    deletedThreads: [],
    deletedSubscriptions: [],
    meta: {
      requestedAt: new Date().toISOString(),
    },
  });
});

// TODO: Verify the authenticated user's permission for this room before
// returning room-specific data. Deliberately skipped for now.
zen.route("GET /v2/c/rooms/<roomId>/threads", () => {
  return DUMMY({
    data: [],
    inboxNotifications: [],
    subscriptions: [],
    meta: {
      nextCursor: null,
      requestedAt: new Date().toISOString(),
      permissionHints: {},
    },
  });
});

zen.route("GET /v2/c/rooms/<roomId>/threads/delta", () => {
  return DUMMY({
    data: [],
    inboxNotifications: [],
    subscriptions: [],
    deletedThreads: [],
    deletedInboxNotifications: [],
    deletedSubscriptions: [],
    meta: {
      requestedAt: new Date().toISOString(),
      permissionHints: {},
    },
  });
});

zen.route("POST /v2/c/rooms/<roomId>/text-metadata", () => {
  return DUMMY({
    status: "ok",
  });
});

/**
 * ------------------------------------------------------------
 * LIVEFILE (Storage files)
 * ------------------------------------------------------------
 *
 * Mirrors the secret-key routes, minus the single-file GET and plus the batch
 * presigned-urls endpoint — the same asymmetry production has.
 *
 * TODO: Verify the authenticated user's write permission for this room. The
 * dev server currently only checks that the token is valid, like the other
 * room-scoped client routes here.
 */

zen.route(
  "PUT /v2/c/rooms/<roomId>/storage/files/<fileId>/upload/<name>",
  async ({ req, url, p }) => {
    const internalRoomId = requireInternalRoomId(p.roomId);
    if (!req.body) {
      abort(400);
    }

    const file = await uploadStorageFile(
      internalRoomId,
      p.fileId,
      p.name,
      req.body,
      optionalFileSize(url)
    );
    recordLivefileUpload(p.roomId, file);
    return file;
  }
);

zen.route(
  "POST /v2/c/rooms/<roomId>/storage/files/<fileId>/multipart/<name>",
  async ({ url, p }) => {
    const internalRoomId = requireInternalRoomId(p.roomId);
    return await createStorageFileMultipartUpload(
      internalRoomId,
      p.fileId,
      p.name,
      optionalFileSize(url)
    );
  }
);

zen.route(
  "PUT /v2/c/rooms/<roomId>/storage/files/<fileId>/multipart/<uploadId>/<partNumber>",
  async ({ req, p }) => {
    const internalRoomId = requireInternalRoomId(p.roomId);
    if (!req.body) {
      abort(400);
    }

    return await uploadStorageFileMultipartPart(
      internalRoomId,
      p.fileId,
      p.uploadId,
      p.partNumber,
      req.body
    );
  }
);

zen.route(
  "POST /v2/c/rooms/<roomId>/storage/files/<fileId>/multipart/<uploadId>/complete",

  object({ parts: array(object({ partNumber: number, etag: string })) }),

  async ({ p, body }) => {
    const internalRoomId = requireInternalRoomId(p.roomId);
    const file = await completeStorageFileMultipartUpload(
      internalRoomId,
      p.fileId,
      p.uploadId,
      body.parts
    );
    recordLivefileUpload(p.roomId, file);
    return file;
  }
);

zen.route(
  "DELETE /v2/c/rooms/<roomId>/storage/files/<fileId>/multipart/<uploadId>",
  async ({ p }) => {
    const internalRoomId = requireInternalRoomId(p.roomId);
    await abortStorageFileMultipartUpload(internalRoomId, p.fileId, p.uploadId);
    return new Response(null, { status: 200 });
  }
);

zen.route(
  "POST /v2/c/rooms/<roomId>/storage/files/presigned-urls",

  object({ fileIds: storageFileIds }),

  async ({ p, body }) => {
    const internalRoomId = requireInternalRoomId(p.roomId);
    const { referenced, uploaded } = partitionStorageFileIds(
      p.roomId,
      body.fileIds
    );

    return await getStorageFileSignedUrls(
      internalRoomId,
      body.fileIds,
      referenced,
      uploaded
    );
  }
);

/**
 * ------------------------------------------------------------
 * NOT IMPLEMENTED ROUTES
 * ------------------------------------------------------------
 */

// prettier-ignore
{
  zen.route("PUT /v2/c/rooms/<roomId>/attachments/<attachmentId>/upload/<name>", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/rooms/<roomId>/attachments/<attachmentId>/multipart/<name>", () => NOT_IMPLEMENTED());
  zen.route("PUT /v2/c/rooms/<roomId>/attachments/<attachmentId>/multipart/<uploadId>/<partNumber>", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/rooms/<roomId>/attachments/<attachmentId>/multipart/<uploadId>/complete", () => NOT_IMPLEMENTED());
  zen.route("DELETE /v2/c/rooms/<roomId>/attachments/<attachmentId>/multipart/<uploadId>", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/rooms/<roomId>/attachments/presigned-urls", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/rooms/<roomId>/send-message", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/c/rooms/<roomId>/storage", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/c/rooms/<roomId>/versions", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/c/rooms/<roomId>/versions/delta", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/c/rooms/<roomId>/versions/<versionId>/storage", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/c/rooms/<roomId>/versions/<versionId>/yjs", () => NOT_IMPLEMENTED());
  zen.route("DELETE /v2/c/rooms/<roomId>/versions/<versionId>", () => NOT_IMPLEMENTED());
  zen.alias(
    "GET /v2/c/rooms/<roomId>/y-version/<versionId>",    // Deprecated
    "GET /v2/c/rooms/<roomId>/versions/<versionId>/yjs", // Canonical new version
  );
  zen.route("POST /v2/c/rooms/<roomId>/versions", () => NOT_IMPLEMENTED());
  zen.alias(
    "POST /v2/c/rooms/<roomId>/version", // Deprecated
    "POST /v2/c/rooms/<roomId>/versions", // Canonical new version
  );
  zen.route("POST /v2/c/rooms/<roomId>/ai/contextual-prompt", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/rooms/<roomId>/threads", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/rooms/<roomId>/threads/search", () => NOT_IMPLEMENTED());
  zen.route("DELETE /v2/c/rooms/<roomId>/threads/<threadId>", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/rooms/<roomId>/threads/<threadId>/metadata", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/rooms/<roomId>/threads/<threadId>/mark-as-resolved", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/rooms/<roomId>/threads/<threadId>/mark-as-unresolved", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/rooms/<roomId>/threads/<threadId>/subscribe", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/rooms/<roomId>/threads/<threadId>/unsubscribe", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/rooms/<roomId>/threads/<threadId>/comments", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/c/rooms/<roomId>/threads/<threadId>/comments/<commentId>", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/rooms/<roomId>/threads/<threadId>/comments/<commentId>", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/rooms/<roomId>/threads/<threadId>/comments/<commentId>/metadata", () => NOT_IMPLEMENTED());
  zen.route("DELETE /v2/c/rooms/<roomId>/threads/<threadId>/comments/<commentId>", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/rooms/<roomId>/threads/<threadId>/comments/<commentId>/reactions", () => NOT_IMPLEMENTED());
  zen.route("DELETE /v2/c/rooms/<roomId>/threads/<threadId>/comments/<commentId>/reactions/<emoji>", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/c/rooms/<roomId>/threads/comments/search", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/c/rooms/<roomId>/threads/<threadId>/participants", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/c/rooms/<roomId>/subscription-settings", () => NOT_IMPLEMENTED());
  zen.alias(
    "GET /v2/c/rooms/<roomId>/notification-settings", // Deprecated
    "GET /v2/c/rooms/<roomId>/subscription-settings", // Canonical new version
  );
  zen.route("POST /v2/c/rooms/<roomId>/subscription-settings", () => NOT_IMPLEMENTED());
  zen.alias(
    "POST /v2/c/rooms/<roomId>/notification-settings", // Deprecated
    "POST /v2/c/rooms/<roomId>/subscription-settings", // Canonical new version
  );
  zen.route("DELETE /v2/c/inbox-notifications", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/inbox-notifications/read", () => NOT_IMPLEMENTED());
  zen.route("DELETE /v2/c/inbox-notifications/<inboxNotificationId>", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/rooms/<roomId>/inbox-notifications/read", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/rooms/<roomId>/text-mentions", () => NOT_IMPLEMENTED());
  zen.route("DELETE /v2/c/rooms/<roomId>/text-mentions/<mentionId>", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/c/notification-settings", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/notification-settings", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/c/rooms/<roomId>/thread-with-notification/<threadId>", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/c/urls/metadata", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/groups/find", () => NOT_IMPLEMENTED());
}
