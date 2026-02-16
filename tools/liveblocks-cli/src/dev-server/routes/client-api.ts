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

import { ZenRouter } from "@liveblocks/zenrouter";

import { verifyJwtLite } from "~/dev-server/lib/jwt-lite";
import { DUMMY, NOT_IMPLEMENTED } from "~/dev-server/responses";

export const zen = new ZenRouter({
  cors: {
    allowCredentials: true,
    maxAge: 600,
  },
  authorize: ({ req }) => {
    const header = req.headers.get("Authorization");
    if (!header?.startsWith("Bearer ")) return false;

    const token = header.slice(7); // Remove "Bearer " prefix
    const acessToken = verifyJwtLite(token);
    return acessToken !== null;
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
  zen.route("POST /v2/c/rooms/<roomId>/version", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/c/rooms/<roomId>/y-version/<version>", () => NOT_IMPLEMENTED());
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
  zen.route("GET /v2/c/rooms/<roomId>/notification-settings", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/c/rooms/<roomId>/subscription-settings", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/rooms/<roomId>/notification-settings", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/rooms/<roomId>/subscription-settings", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/c/inbox-notifications/delta", () => NOT_IMPLEMENTED());
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
  zen.route("GET /v2/c/rooms/<roomId>/versions", () => NOT_IMPLEMENTED());
  zen.route("GET /v2/c/rooms/<roomId>/versions/delta", () => NOT_IMPLEMENTED());
  zen.route("POST /v2/c/groups/find", () => NOT_IMPLEMENTED());
}
