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

import type { BaseUserMeta, JsonObject } from "@liveblocks/core";
import { ServerMsgCode } from "@liveblocks/core";

import type { RoomStateServerMsg } from "~/protocol";

/**
 * Concatenates multiple Uint8Arrays into a single Uint8Array.
 */
export function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export function makeRoomStateMsg(
  actor: number,
  nonce: string,
  scopes: string[],
  users: Record<number, BaseUserMeta & { scopes: string[] }>,
  publicMeta?: JsonObject
): RoomStateServerMsg<BaseUserMeta> {
  return {
    type: ServerMsgCode.ROOM_STATE,
    actor,
    nonce,
    scopes,
    users,
    meta: publicMeta ?? {},
  };
}
