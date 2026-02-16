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

import type { asPos, IUserInfo, Json, SerializedCrdt } from "@liveblocks/core";

export type Pos = ReturnType<typeof asPos>;
export type NodeTuple<T extends SerializedCrdt = SerializedCrdt> = [
  id: string,
  value: T,
];

export type NodeMap = {
  size: number;
  [Symbol.iterator]: () => IterableIterator<[id: string, node: SerializedCrdt]>;
  clear: () => void;
  delete: (key: string) => boolean;
  get: (key: string) => SerializedCrdt | undefined;
  has: (key: string) => boolean;
  keys: () => Iterable<string>;
  set(key: string, value: SerializedCrdt): void;
};

export type NodeStream = Iterable<NodeTuple>;

/**
 * Leased session data structure for server-side sessions with temporarily persisted presence.
 */
export type LeasedSession = {
  sessionId: string; // The session's ID
  presence: Json;
  updatedAt: number; // timestamp in milliseconds
  info: IUserInfo;
  ttl: number; // time-to-live in milliseconds (default: 60000 = 1 minute)
  actorId: number;
};
