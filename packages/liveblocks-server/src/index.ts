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

//
// Intended to be part of the public API eventually
//
export * from "~/decoders";
export {
  snapshotToLossyJson_eager,
  snapshotToLossyJson_lazy,
} from "~/formats/LossyJson";
export { snapshotToNodeStream } from "~/formats/NodeStream";
export {
  plainLsonToNodeStream,
  snapshotToPlainLson_eager,
  snapshotToPlainLson_lazy,
} from "~/formats/PlainLson";
export { makeInMemorySnapshot } from "~/makeInMemorySnapshot";
export type { MetadataDB } from "~/MetadataDB";
export { makeMetadataDB } from "~/MetadataDB";
export * from "~/protocol";
export * from "~/Room";
export type {
  LeasedSession,
  NodeMap,
  NodeStream,
  NodeTuple,
  Pos,
} from "~/types";
export { concatUint8Arrays, isLeasedSessionExpired } from "~/utils";

// YYY Maybe isolate logger into a completely separate package, i.e. @liveblocks/logger?
export * from "~/lib/Logger";
export * from "~/lib/tryCatch";

// YYY Maybe isolate these simple/common datastructures into a separate NPM package?
export * from "~/lib/DefaultMap";
export * from "~/lib/NestedMap";
export { quote } from "~/lib/text";
export * from "~/lib/UniqueMap";

// Re-export all interfaces
export type * from "~/interfaces";

//
// ------------------------------------------------------------------------------
// ⚠️ ⚠️ ⚠️
// The exports below this line should be considered temporary and aren't
// supposed to become part of the public API for @liveblocks/server.
//
// The fact that these need to be exported is a leaky abstraction!
// ⚠️ ⚠️ ⚠️
// ------------------------------------------------------------------------------
//
export { InMemoryDriver } from "~/plugins/InMemoryDriver"; // Only used in type-level tests, consider removing
export { Storage as test_only__Storage } from "~/Storage"; // Liveblocks Storage™  // Can be removed once unit tests are moved
export { YjsStorage as test_only__YjsStorage } from "~/YjsStorage"; // Yjs Storage™  // Can be removed once unit tests are moved
