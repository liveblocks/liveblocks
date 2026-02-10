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

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/require-await */
import type {
  Json,
  JsonObject,
  NodeMap,
  NodeStream,
  PlainLsonObject,
  SerializedChild,
  SerializedCrdt,
  SerializedObject,
  SerializedRootObject,
} from "@liveblocks/core";
import { asPos, CrdtType, isRootStorageNode, nn } from "@liveblocks/core";
import { ifilter, imap } from "itertools";

import type { YDocId } from "~/decoders/y-types";
import { plainLsonToNodeStream } from "~/formats/PlainLson";
import type {
  IReadableSnapshot,
  IStorageDriver,
  IStorageDriverNodeAPI,
} from "~/interfaces";
import { NestedMap } from "~/lib/NestedMap";
import { quote } from "~/lib/text";
import { makeInMemorySnapshot } from "~/makeInMemorySnapshot";
import type { Pos } from "~/types";

function buildRevNodes(nodeStream: NodeStream) {
  const result = new NestedMap<string, string, string>();
  for (const node of nodeStream) {
    if (isRootStorageNode(node)) continue;

    // Highest node id wins in case of conflict (deterministic across backends)
    const [id, crdt] = node;
    const existing = result.get(crdt.parentId, crdt.parentKey);
    if (existing === undefined || id > existing) {
      result.set(crdt.parentId, crdt.parentKey, id);
    }
  }
  return result;
}

/**
 * Builds the reverse node index, and corrects any data corruption found
 * along the way.
 */
function buildReverseLookup(nodes: NodeMap) {
  const revNodes = buildRevNodes(nodes as NodeStream);

  const queue: string[] = ["root"];
  const reachableNodes: Set<string> = new Set();

  while (queue.length > 0) {
    const nodeId = queue.pop()!;
    const node = nn(nodes.get(nodeId));

    if (node.type === CrdtType.OBJECT) {
      for (const key of revNodes.keysAt(nodeId)) {
        delete node.data[key]; // Remove static data that conflicts with child nodes
      }
    }

    if (node.type !== CrdtType.REGISTER) {
      queue.push(...revNodes.valuesAt(nodeId));
    } else {
      const parent = nodes.get(node.parentId);
      if (parent?.type === CrdtType.OBJECT) {
        continue;
      }
    }

    reachableNodes.add(nodeId);
  }

  // Delete unreachable nodes (safe to delete from Map during iteration)
  let deletedCount = 0;
  for (const [id] of nodes) {
    if (!reachableNodes.has(id)) {
      nodes.delete(id);
      deletedCount++;
    }
  }

  // If no nodes were dropped (99% happy path), revNodes is correct already.
  // Otherwise, recompute it.
  return deletedCount === 0 ? revNodes : buildRevNodes(nodes as NodeStream);
}

function hasStaticDataAt(
  node: SerializedCrdt,
  key: string
): node is SerializedObject | SerializedRootObject {
  return (
    node.type === CrdtType.OBJECT &&
    Object.prototype.hasOwnProperty.call(node.data, key) &&
    node.data[key] !== undefined
  );
}

/**
 * Implements the most basic in-memory store. Used if no explicit store is
 * provided.
 */
export class InMemoryDriver implements IStorageDriver {
  private _nextActor;
  private _nodes: NodeMap;
  private _metadb: Map<string, Json>;
  private _ydb: Map<string, Uint8Array>;

  constructor(options?: {
    initialActor?: number;
    initialNodes?: Iterable<[string, SerializedCrdt]>;
  }) {
    this._nodes = new Map();
    this._metadb = new Map();
    this._ydb = new Map();

    this._nextActor = options?.initialActor ?? -1;

    for (const [key, value] of options?.initialNodes ?? []) {
      this._nodes.set(key, value);
    }
  }

  raw_iter_nodes() {
    return this._nodes[Symbol.iterator]();
  }

  /** Deletes all nodes and replaces them with the given document. */
  DANGEROUSLY_reset_nodes(doc: PlainLsonObject) {
    this._nodes.clear();
    for (const [id, node] of plainLsonToNodeStream(doc)) {
      this._nodes.set(id, node);
    }
  }

  async get_meta(key: string) {
    return this._metadb.get(key);
  }
  async put_meta(key: string, value: Json) {
    this._metadb.set(key, value);
  }
  async delete_meta(key: string) {
    this._metadb.delete(key);
  }

  next_actor() {
    return ++this._nextActor;
  }

  async iter_y_updates(docId: YDocId) {
    const prefix = `${docId}@|@`;
    return imap(
      ifilter(this._ydb.entries(), ([k]) => k.startsWith(prefix)),
      ([k, v]) => [k.slice(prefix.length), v] as [string, Uint8Array]
    );
  }
  async write_y_updates(docId: YDocId, key: string, data: Uint8Array) {
    this._ydb.set(`${docId}@|@${key}`, data);
  }
  async delete_y_updates(docId: YDocId, keys: string[]) {
    for (const key of keys) {
      this._ydb.delete(`${docId}@|@${key}`);
    }
  }

  /** @private Only use this in unit tests, never in production. */
  async DANGEROUSLY_wipe_all_y_updates() {
    this._ydb.clear();
  }

  // Intercept load_nodes_api to add caching layer
  load_nodes_api(): IStorageDriverNodeAPI {
    // For the in-memory backend, this._nodes IS the "on-disk" storage,
    // so we operate on it directly (no separate cache needed).
    const nodes = this._nodes;
    if (!nodes.has("root")) {
      nodes.set("root", { type: CrdtType.OBJECT, data: {} });
    }

    const revNodes = buildReverseLookup(nodes);

    function get_next_sibling(parentId: string, pos: Pos): Pos | undefined {
      let nextPos: Pos | undefined;
      // Find the smallest position greater than current
      for (const siblingKey of revNodes.keysAt(parentId)) {
        const siblingPos = asPos(siblingKey);
        if (
          siblingPos > pos &&
          (nextPos === undefined || siblingPos < nextPos)
        ) {
          nextPos = siblingPos;
        }
      }
      return nextPos;
    }

    /**
     * Inserts a node in the storage tree, deleting any nodes that already exist
     * under this key (including all of its children), if any.
     */
    async function set_child(
      id: string,
      node: SerializedChild,
      allowOverwrite = false
    ): Promise<void> {
      const parentNode = nodes.get(node.parentId);
      // Reject orphans - parent must exist
      if (parentNode === undefined) {
        throw new Error(`No such parent ${quote(node.parentId)}`);
      }

      if (
        node.type === CrdtType.REGISTER &&
        parentNode.type === CrdtType.OBJECT
      ) {
        throw new Error("Cannot add register under object");
      }

      const conflictingSiblingId = revNodes.get(node.parentId, node.parentKey);
      if (conflictingSiblingId !== id) {
        // Conflict!
        const parentNode = nodes.get(node.parentId);
        const hasConflictingData =
          parentNode !== undefined &&
          hasStaticDataAt(parentNode, node.parentKey);
        if (conflictingSiblingId !== undefined || hasConflictingData) {
          if (allowOverwrite) {
            delete_child_key(node.parentId, node.parentKey);
          } else {
            throw new Error(`Key ${quote(node.parentKey)} already exists`); // prettier-ignore
          }
        }

        // Finally, modify revNodes
        revNodes.set(node.parentId, node.parentKey, id);
      }

      nodes.set(id, node);
    }

    /**
     * Conceptually this is like "detaching" the node from its parent, and
     * "reattaching" it at the new position.
     *
     * However, this is a native operation, because doing a naive
     * delete-then-insert would would immediately destroy all (grand)children
     * when it's deleted.
     */
    async function move_sibling(id: string, newPos: Pos): Promise<void> {
      const node = nodes.get(id);
      if (node?.parentId === undefined) {
        return;
      }

      // If there is a conflicting sibling at the new position, disallow the move
      if (revNodes.has(node.parentId, newPos))
        throw new Error(`Pos ${quote(newPos)} already taken`); // prettier-ignore

      revNodes.delete(node.parentId, node.parentKey);
      const newNode = { ...node, parentKey: newPos };
      nodes.set(id, newNode);
      revNodes.set(node.parentId, newPos, id);
    }

    /**
     * Sets some static data on a node. The node must be an OBJECT node, or this
     * method will be a no-op.
     *
     * If any keys exist that also conflict with a child node, then the conflict
     * mode will determine what will happen. By default, an error will be thrown.
     * But if `allowOverwrite` is set to true, the conflicting child node (and
     * its entire subtree) will be deleted to make room for the new static data.
     */
    async function set_object_data(
      id: string,
      data: JsonObject,
      allowOverwrite = false
    ): Promise<void> {
      const node = nodes.get(id);
      if (node?.type !== CrdtType.OBJECT) {
        // Nothing to do
        return;
      }

      for (const key of Object.keys(data)) {
        // Handle if conflict!
        const childId = revNodes.get(id, key);
        if (childId !== undefined) {
          if (allowOverwrite) {
            delete_node(childId);
          } else {
            throw new Error(`Child node already exists under ${quote(key)}`); // prettier-ignore
          }
        }
      }

      nodes.set(id, { ...node, data: { ...node.data, ...data } });
    }

    /**
     * Delete a node from the tree, including all of its children.
     */
    function delete_node(id: string): void {
      const node = nodes.get(id);
      if (node?.parentId === undefined) {
        return;
      }

      // Delete the entry in the parent's children administration for this node
      revNodes.delete(node.parentId, node.parentKey);

      // Now proceed to deleting the node tree recursively
      const queue = [id];
      while (queue.length > 0) {
        const currid = queue.pop()!;
        queue.push(...revNodes.valuesAt(currid));
        nodes.delete(currid);
        revNodes.deleteAll(currid);
      }
    }

    /**
     * Deletes the child key under a given node, whether it's a static object
     * field, or a child node.
     */
    function delete_child_key(id: string, key: string): void {
      // At most one of these will do something, the other is a no-op
      const node = nodes.get(id);
      if (node !== undefined && hasStaticDataAt(node, key)) {
        const { [key]: _, ...rest } = node.data;
        nodes.set(id, { ...node, data: rest });
      }

      const childId = revNodes.get(id, key);
      if (childId !== undefined) {
        delete_node(childId);
      }
    }

    const api: IStorageDriverNodeAPI = {
      /**
       * Return the node with the given id, or undefined if no such node exists.
       * Must always return a valid root node for id="root", even if empty.
       */
      get_node: (id) => nodes.get(id),

      /**
       * Yield all nodes as [id, node] pairs. Must always include the root node.
       */
      iter_nodes: () => nodes as NodeStream,

      /**
       * Return true iff a node with the given id exists. Must return true for "root".
       */
      has_node: (id) => nodes.has(id),

      /**
       * Return the id of the child node at (parentId, parentKey), or undefined if
       * none. Only checks child nodes registered via set_child, NOT static data
       * keys on OBJECT nodes.
       */
      get_child_at: (id, key) => revNodes.get(id, key),

      /**
       * Return true iff a child node exists at (parentId, parentKey). Static data
       * keys on OBJECT nodes do not count—return false for those.
       */
      has_child_at: (id, key) => revNodes.has(id, key),

      /**
       * Return the position of the closest sibling "to the right" of `pos` under
       * parentId, or undefined if no such sibling exists. The given `pos` may, but
       * does not have to exist already. Positions compare lexicographically.
       */
      get_next_sibling,

      /**
       * Insert a child node with the given id.
       *
       * If allowOverwrite=false (default): throw if a node with this id exists.
       * If allowOverwrite=true: replace any existing node at this id, deleting its
       * entire subtree if it has children.
       */
      set_child,

      /**
       * Change a node's parentKey, effectively repositioning the node within its
       * parent. The new position must be free.
       * Throw if another node already occupies (parentId, newPos).
       */
      move_sibling,

      /**
       * Delete a node and its entire subtree recursively.
       * Ignore if id="root" (root is immortal).
       */
      delete_node,

      /**
       * Delete a key from node `id`. Handle two cases:
       *
       * 1. If id is an OBJECT with `key` in its data: remove that data field.
       * 2. If a child exists at (id, key): delete that child and all its
       *    descendants recursively.
       *
       * No-op if neither applies or if the node doesn't exist.
       */
      delete_child_key,

      /**
       * Replace the data object of an OBJECT node.
       *
       * If allowOverwrite=false (default): throw if any key in `data` conflicts
       * with an existing child's parentKey.
       * If allowOverwrite=true: first delete any conflicting children (and their
       * entire subtrees), then set the data.
       */
      set_object_data,

      /**
       * Return a readable snapshot of the storage tree.
       *
       * @param lowMemory When true, the call site hints that the snapshot should
       * be optimized for lower memory consumption, even if that means slower
       * access.
       */
      get_snapshot(_lowMemory?: boolean): IReadableSnapshot {
        return makeInMemorySnapshot(nodes);
      },
    };
    return api;
  }
}

export function makeNewInMemoryDriver(options?: {
  initialActor?: number;
  initialNodes?: Iterable<[string, SerializedCrdt]>;
}): IStorageDriver {
  return new InMemoryDriver(options);
}
