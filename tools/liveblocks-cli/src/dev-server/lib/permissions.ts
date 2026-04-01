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

/**
 * Permission values accepted by the dev server. This must stay in sync with the
 * backend's canonical Permission definition in shared/common/src/security/client-auth.ts.
 * NOTE: Do not import from @liveblocks/core — the published version may lag behind.
 * TODO: Find a way to DRY this up with the backend's Permission definition.
 */
export const Permission = {
  RoomRead: "room:read",
  RoomWrite: "room:write",
  CommentsWrite: "comments:write",
  FeedsWrite: "feeds:write",
  /** @deprecated Accepted but ignored. Presence is always writable. */
  RoomPresenceWrite: "room:presence:write",
  /** @deprecated Accepted but ignored. Read access is implied by room:read. */
  CommentsRead: "comments:read",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];
