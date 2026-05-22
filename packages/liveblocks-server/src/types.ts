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

declare const fromType: unique symbol;

/**
 * A string known to be a valid JSON-encoded value. Use this whenever a
 * `string` already carries JSON, to keep that fact visible in the type system
 * (instead of letting it look like a freeform `string`).
 *
 * Optionally parameterised by the *parsed* shape: `jstring<CompactNode>`
 * means "a string whose `JSON.parse` result is a `CompactNode`". Without
 * a type argument, defaults to `jstring<Json>` (any JSON value).
 *
 * At storage boundaries (e.g. reading `jdata` from SQLite), `as jstring`
 * is acceptable — we trust the bytes are valid JSON because we wrote them as
 * JSON ourselves.
 *
 * For example, these are valid JSON strings:
 * - '0', '1', '2', '3', '3.14', etc.
 * - 'null', 'true', 'false'
 * - '{"foo":1}', '{ "foo": 1 }' (spaces are fine)
 * - '[]', '[1,2, 3]', '[[]]', etc.
 * - '["hi",{}]'
 * - '"foo"'
 *
 * But these are not:
 * - 'foo'
 * - '1,2,3'
 * - '{'
 * - '[1,2,3,]' or '{"foo":1},' (trailing commas are not valid)
 */
export type jstring<J = Json> = string & { readonly [fromType]: J };

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

/**
 * Feed message data structure for messages within feeds.
 */
export type FeedMessage = {
  id: string; // Unique identifier
  createdAt: number; // Unix timestamp in milliseconds, stable for ordering
  updatedAt: number; // Unix timestamp in milliseconds, used for stale-update protection
  data: Json; // Arbitrary JSON data
};

/**
 * Feed data structure for feed-related data within a room.
 * Note: Messages are stored separately and accessed via list_feed_messages.
 */
export type Feed = {
  feedId: string; // Unique identifier for the feed
  metadata: Json; // Arbitrary JSON metadata
  createdAt: number; // Unix timestamp in milliseconds, stable for ordering
  updatedAt: number; // Unix timestamp in milliseconds, same as createdAt on insert
};
