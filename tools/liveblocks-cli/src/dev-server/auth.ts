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

import { nanoid, Permission } from "@liveblocks/core";
import type { CreateTicketOptions } from "@liveblocks/server";
import { ProtocolVersion } from "@liveblocks/server";

import { verifyJwtLite } from "./lib/jwt-lite";

/**
 * Returns the scopes for a given room ID based on the permissions map.
 * Supports exact matches and wildcard patterns (e.g., "room-*" matches "room-123").
 */
function getScopesForRoom(
  roomId: string,
  perms: Record<string, Permission[]>
): string[] {
  // Try exact match first
  if (perms[roomId]) {
    return perms[roomId];
  }

  // Try wildcard patterns
  for (const [pattern, scopes] of Object.entries(perms)) {
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      if (roomId.startsWith(prefix)) {
        return scopes;
      }
    }
  }

  // No matching permissions
  return [];
}

//
// HINT: Adjust this function to fit your application's needs.
// HINT: Return a valid object to allow the request, or `null` to disallow.
//
export function authorizeWebSocket(
  req: Request
): [roomId: string, ticketData: CreateTicketOptions<never, never>] | null {
  const url = new URL(req.url);

  // Explicit version _must_ be used to upgrade
  const version =
    url.pathname === "/v7"
      ? ProtocolVersion.V7
      : url.pathname === "/v8"
        ? ProtocolVersion.V8
        : null;

  // Expect this URL to be for wss://domain/v7?roomId=...
  if (version === null) {
    return null; // TODO Error with a clear/helpful message
  }

  const roomId = url.searchParams.get("roomId");
  if (!roomId) {
    // This is also the place to enforce specific room ID constraints if you
    // want to
    return null; // TODO Error with a clear/helpful message
  }

  // First check if ?tok= is present (token-based auth)
  const token = url.searchParams.get("tok");
  if (token !== null) {
    const payload = verifyJwtLite(token);
    if (!payload) {
      return null; // TODO Error with a clear/helpful message
    }

    if (payload.k === "acc") {
      const scopes = getScopesForRoom(roomId, payload.perms);
      if (scopes.length === 0) {
        return null;
      }

      return [
        roomId,
        {
          version,
          id: payload.uid,
          info: payload.ui,
          scopes,
        },
      ];
    } else if (payload.k === "id") {
      // TODO Warning that ID tokens are not fully supported yet
      return [
        roomId,
        {
          version,
          id: payload.uid,
          info: payload.ui,
          scopes: [Permission.Write],
        },
      ];
    }

    return null; // TODO Error with a clear/helpful message
  }

  // Otherwise check if ?pubkey= is present (public key auth - anonymous user)
  const pubkey = url.searchParams.get("pubkey");
  if (pubkey === "pk_localdev") {
    return [
      roomId,
      {
        version,
        anonymousId: nanoid(),
        scopes: ["room:write"], // Public key auth always gets full write access
      },
    ];
  }

  // Neither token nor valid pubkey provided
  return null; // TODO Error with a clear/helpful message
}
