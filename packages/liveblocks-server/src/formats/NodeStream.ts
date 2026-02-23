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

import type { StorageNode } from "@liveblocks/core";

import type { IReadableSnapshot } from "~/interfaces";

/**
 * Yield all nodes from a snapshot as [id, crdt] tuples.
 * Destroys the snapshot when done (or aborted).
 */
export function* snapshotToNodeStream(
  snapshot: IReadableSnapshot
): Generator<StorageNode, void, never> {
  try {
    yield* snapshot.iter_all();
  } finally {
    snapshot.destroy();
  }
}
