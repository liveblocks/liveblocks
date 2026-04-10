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

import { nanoid } from "@liveblocks/core";
import type { CreateTicketOptions } from "@liveblocks/server";
import { ProtocolVersion } from "@liveblocks/server";

import * as Rooms from "./db/rooms";
import type { LiteAccessToken, LiteIdToken, LiteToken } from "./lib/jwt-lite";
import { verifyJwtLite } from "./lib/jwt-lite";
import { Permission } from "./lib/permissions";

function resolvePermissions_acc(
  token: LiteAccessToken,
  roomId: string
): Permission[] {
  // Try exact match first
  if (token.perms[roomId]) {
    return token.perms[roomId];
  }

  // Try wildcard patterns
  for (const [pattern, scopes] of Object.entries(token.perms)) {
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      if (roomId.startsWith(prefix)) {
        return scopes;
      }
    }
  }

  return [];
}

function resolvePermissions_id(
  token: LiteIdToken,
  roomId: string
): Permission[] {
  // ID token: resolve from the rooms DB (room must already exist)
  const room = Rooms.getRoom(roomId);
  if (!room) return [];

  const scopes = new Set<Permission>(room.defaultAccesses);

  if (token.gids) {
    for (const gid of token.gids) {
      for (const p of room.groupsAccesses[gid] ?? []) {
        scopes.add(p);
      }
    }
  }

  for (const p of room.usersAccesses[token.uid] ?? []) {
    scopes.add(p);
  }

  return Array.from(scopes);
}

/**
 * Resolves permissions for a token against a room.
 * - Access tokens: match roomId against the token's explicit perms map.
 * - ID tokens: look up the room in the DB and collect the union of
 *   defaultAccesses, groupsAccesses, and usersAccesses.
 */
function resolvePermissions(token: LiteToken, roomId: string): Permission[] {
  return token.k === "acc"
    ? resolvePermissions_acc(token, roomId)
    : resolvePermissions_id(token, roomId);
}

//
// HINT: Adjust this function to fit your application's needs.
// HINT: Return a valid object to allow the request, or `null` to disallow.
//
export function authorizeWebSocket(
  req: Request
):
  | { ok: true; roomId: string; ticketData: CreateTicketOptions<never, never> }
  | { ok: false; xwarn?: string } {
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
    return { ok: false }; // TODO Emit helpful X-Warn here, or not?
  }

  const roomId = url.searchParams.get("roomId");
  if (!roomId) {
    // This is also the place to enforce specific room ID constraints if you
    // want to
    return { ok: false }; // TODO Emit helpful X-Warn here, or not?
  }

  // First check if ?tok= is present (token-based auth)
  const token = url.searchParams.get("tok");
  if (token !== null) {
    const payload = verifyJwtLite(token);
    if (!payload) {
      return { ok: false }; // TODO Emit helpful X-Warn here, or not?
    }

    const scopes = resolvePermissions(payload, roomId);
    if (scopes.length === 0) {
      return { ok: false };
    }

    return {
      ok: true,
      roomId,
      ticketData: {
        version,
        id: payload.uid,
        info: payload.ui,
        scopes,
      },
    };
  }

  // Otherwise check if ?pubkey= is present (public key auth - anonymous user)
  const pubkey = url.searchParams.get("pubkey");
  if (pubkey !== null) {
    if (pubkey !== "pk_localdev") {
      return {
        ok: false,
        xwarn: "You can only use 'pk_localdev' as the public key",
      };
    }

    // Auto-create the room if it doesn't exist yet
    Rooms.getOrCreateRoom(roomId, {
      defaultAccesses: [Permission.RoomWrite],
    });

    // Public key auth always grants write access (matches production behavior)
    return {
      ok: true,
      roomId,
      ticketData: {
        version,
        anonymousId: nanoid(),
        scopes: [Permission.RoomWrite],
      },
    };
  }

  // Neither token nor pubkey provided
  return { ok: false }; // TODO Emit helpful X-Warn here, or not?
}
