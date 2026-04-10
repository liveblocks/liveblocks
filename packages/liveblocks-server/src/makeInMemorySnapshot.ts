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

import type {
  NodeMap,
  NodeStream,
  SerializedChild,
  SerializedCrdt,
  SerializedRootObject,
  StorageNode,
} from "@liveblocks/core";
import { CrdtType, isRootStorageNode, nn } from "@liveblocks/core";

import type { IReadableSnapshot } from "~/interfaces";
import { NestedMap } from "~/lib/NestedMap";

/**
 * Create a basic in-memory snapshot from a set of storage nodes.
 *
 * Takes a copy of the provided nodes, so the snapshot is isolated from
 * subsequent mutations to the source.
 */
export function makeInMemorySnapshot(
  values: NodeMap | NodeStream
): IReadableSnapshot {
  const map: NodeMap = new Map<string, SerializedCrdt>(values as NodeStream);

  if (!map.has("root")) {
    map.set("root", { type: CrdtType.OBJECT, data: {} });
  }

  // Collect child entries, sort by (parentId, parentKey), then insert into
  // the revMap so that entriesAt() returns children in parent_key order
  // without needing to re-sort on every iter_children call.
  const entries: Array<[parentId: string, parentKey: string, id: string]> = [];
  const nodeStream = map as NodeStream;
  for (const node of nodeStream) {
    if (isRootStorageNode(node)) continue;
    const [id, crdt] = node;
    entries.push([crdt.parentId, crdt.parentKey, id]);
  }
  entries.sort((a, b) =>
    a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0
  );

  const revMap = new NestedMap<string, string, string>();
  for (const [parentId, parentKey, id] of entries) {
    revMap.set(parentId, parentKey, id);
  }

  function get_node(id: string): SerializedChild {
    return nn(map.get(id), `Node not found: ${id}`) as SerializedChild;
  }

  return {
    get_root: () =>
      nn(
        map.get("root"),
        "Root not found"
      ) as SerializedCrdt as SerializedRootObject,
    get_node,
    iter_children: (nodeId) => revMap.entriesAt(nodeId),
    iter_all: () => map as Iterable<StorageNode>,
    destroy() {
      map.clear();
      revMap.clear();
    },
  };
}
