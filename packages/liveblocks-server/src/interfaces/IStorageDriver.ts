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
  Awaitable,
  Json,
  JsonObject,
  PlainLsonObject,
  SerializedChild,
  SerializedCrdt,
  SerializedRootObject,
  StorageNode,
} from "@liveblocks/core";

import type { YDocId } from "~/decoders/y-types";
import type { Logger } from "~/lib/Logger";
import type { LeasedSession, Pos } from "~/types";

/**
 * An isolated, read-only copy of the storage document at a point in time.
 *
 * Two iteration styles are supported:
 *
 * 1. Tree traversal (top-down):
 *    Call get_root() to get the root, then use iter_children() + get_node()
 *    to walk the tree depth-first. This preserves parent-child ordering and is
 *    used by the JSON/LSON serializers.
 *
 * 2. Flat iteration:
 *    Call iter_all() to get all nodes as unordered [id, crdt] pairs. Useful
 *    when the tree structure doesn't matter (e.g. streaming raw NDJSON).
 *
 * Always call destroy() when done (use a try/finally wrapper).
 */
export interface IReadableSnapshot {
  /** Get the root node. */
  get_root(): SerializedRootObject;

  /** Get a child node by id. */
  get_node(id: string): SerializedChild;

  /**
   * Iterate all children of a node. Each child is yielded as [parentKey,
   * childId]. Children will be yielded in their parent_key order.
   */
  iter_children(nodeId: string): Iterable<[parentKey: string, childId: string]>;

  /**
   * Get all nodes as [id, crdt] pairs (flat, unordered).
   */
  iter_all(): Iterable<StorageNode>;

  /**
   * Release all resources held by the snapshot. Must be called when the
   * snapshot is no longer needed (e.g. after the stream completes or is
   * aborted).
   */
  destroy(): void;
}

/**
 * CRDT node storage with synchronous reads and async persistence.
 *
 * INVARIANTS:
 * - A virtual root node `{type: OBJECT, data: {}}` always exists.
 * - All non-root nodes have parentId and parentKey forming a tree.
 * - Reads reflect writes immediately, before the returned Promise resolves.
 */
export interface IStorageDriverNodeAPI {
  /**
   * Return the node with the given id, or undefined if no such node exists.
   * Must always return a valid root node for id="root", even if empty.
   */
  get_node(id: string): SerializedCrdt | undefined;

  /**
   * Yield all nodes as [id, node] pairs. Must always include the root node.
   */
  iter_nodes(): Iterable<StorageNode>;

  /**
   * Return true iff a node with the given id exists. Must return true for "root".
   */
  has_node(id: string): boolean;

  /**
   * Return the id of the child node at (parentId, parentKey), or undefined if
   * none. Only checks child nodes registered via set_child, NOT static data
   * keys on OBJECT nodes.
   */
  get_child_at(parentId: string, parentKey: string): string | undefined;

  /**
   * Return true iff a child node exists at (parentId, parentKey). Static data
   * keys on OBJECT nodes do not count—return false for those.
   */
  has_child_at(parentId: string, parentKey: string): boolean;

  /**
   * Return the position of the closest sibling "to the right" of `pos` under
   * parentId, or undefined if no such sibling exists. The given `pos` may, but
   * does not have to exist already. Positions compare lexicographically.
   */
  get_next_sibling(parentId: string, pos: Pos): Pos | undefined;

  /**
   * Insert a child node with the given id.
   *
   * If allowOverwrite=false (default): throw if a node with this id exists.
   * If allowOverwrite=true: replace any existing node at this id, deleting its
   * entire subtree if it has children.
   */
  set_child(id: string, node: SerializedChild, allowOverwrite?: boolean): Awaitable<void>; // prettier-ignore

  /**
   * Change a node's parentKey, effectively repositioning the node within its
   * parent. The new position must be free.
   * Throw if another node already occupies (parentId, newPos).
   */
  move_sibling(id: string, newPos: Pos): Awaitable<void>;

  /**
   * Delete a node and its entire subtree recursively.
   * Ignore if id="root" (root is immortal).
   */
  delete_node(id: string): Awaitable<void>;

  /**
   * Delete a key from node `id`. Handle two cases:
   *
   * 1. If id is an OBJECT with `key` in its data: remove that data field.
   * 2. If a child exists at (id, key): delete that child and all its
   *    descendants recursively.
   *
   * No-op if neither applies or if the node doesn't exist.
   */
  delete_child_key(id: string, key: string): Awaitable<void>;

  /**
   * Replace the data object of an OBJECT node.
   *
   * If allowOverwrite=false (default): throw if any key in `data` conflicts
   * with an existing child's parentKey.
   * If allowOverwrite=true: first delete any conflicting children (and their
   * entire subtrees), then set the data.
   */
  set_object_data(id: string, data: JsonObject, allowOverwrite?: boolean): Awaitable<void>; // prettier-ignore

  /**
   * Return a readable snapshot of the storage tree.
   *
   * @param lowMemory When true, the call site hints that the snapshot should
   * be optimized for lower memory consumption, even if that means slower
   * access.
   */
  get_snapshot(lowMemory?: boolean): IReadableSnapshot;
}

/**
 * Persistent storage backend for Liveblocks room data: CRDT nodes, metadata,
 * actor IDs, and Yjs updates. All methods may be async.
 */
export interface IStorageDriver {
  // ---------------------------------------------------------------------------
  // Node APIs
  // ---------------------------------------------------------------------------

  /**
   * Load all nodes from storage, validate/repair corruptions (orphans, cycles,
   * conflicting siblings), and return an IStorageDriverNodeAPI for operations.
   *
   * After DANGEROUSLY_reset_nodes(), any previously-loaded instance is
   * invalid—must call this again to get a fresh one.
   */
  load_nodes_api(logger: Logger): Awaitable<IStorageDriverNodeAPI>;

  /**
   * Delete all CRDT nodes and replace them with the given document.
   * Does NOT affect metadata, actor IDs, or Yjs updates.
   * Invalidates any previously-loaded IStorageDriverNodeAPI.
   *
   * Pass `{ liveblocksType: "LiveObject", data: {} }` to reset to an empty root.
   */
  DANGEROUSLY_reset_nodes(doc: PlainLsonObject): Awaitable<void>;

  /**
   * Read raw node data directly from storage.
   *
   * @internal Test-only API
   */
  raw_iter_nodes(): Awaitable<Iterable<[string, SerializedCrdt]>>;

  // ---------------------------------------------------------------------------
  // Metadata APIs (key-value store, isolated from nodes)
  // ---------------------------------------------------------------------------

  /**
   * Return the value for `key`, or undefined if not set.
   */
  get_meta(key: string): Awaitable<Json | undefined>;

  /**
   * Store `value` under `key`. Overwrite any existing value.
   */
  put_meta(key: string, value: Json): Awaitable<void>;

  /**
   * Delete the value under `key`. No-op if not set.
   */
  delete_meta(key: string): Awaitable<void>;

  // ---------------------------------------------------------------------------
  // System APIs
  // ---------------------------------------------------------------------------

  /**
   * Return a unique actor ID. Each call must return a distinct integer ≥ 0.
   * Concurrent calls must never return duplicates.
   */
  next_actor(): Awaitable<number>;

  /**
   * If defined, called once before each storage mutation batch. Can be used by
   * the driver to more efficiently implement snapshot isolation.
   */
  bump_storage_version?(): void;

  // ---------------------------------------------------------------------------
  // YDoc APIs (keyed by docId: "root" or a subdocument GUID)
  // ---------------------------------------------------------------------------

  /**
   * Return all Yjs updates for docId as [key, data] pairs. Return empty if none.
   */
  iter_y_updates(docId: YDocId): Awaitable<Iterable<[string, Uint8Array]>>; // prettier-ignore

  /**
   * Store a Yjs update under (docId, key). Overwrite if key exists.
   */
  write_y_updates(docId: YDocId, key: string, data: Uint8Array): Awaitable<void>; // prettier-ignore

  /**
   * Delete the specified keys for docId.
   */
  delete_y_updates(docId: YDocId, keys: string[]): Awaitable<void>; // prettier-ignore

  /**
   * Delete ALL Yjs updates across ALL documents.
   * @private Test-only: never use in production.
   */
  DANGEROUSLY_wipe_all_y_updates(): Awaitable<void>;

  // ---------------------------------------------------------------------------
  // Leased Session APIs (key-value store for leased sessions)
  // ---------------------------------------------------------------------------

  /**
   * List all leased sessions.
   * Note: Does NOT filter by expiration - returns all stored sessions.
   * Expiration logic is handled at the Room.ts level.
   */
  list_leased_sessions(): Awaitable<
    Iterable<[sessionId: string, session: LeasedSession]>
  >;

  /**
   * Get a specific leased session by session ID.
   * Note: Does NOT check expiration - returns the stored session if it exists.
   * Expiration logic is handled at the Room.ts level.
   */
  get_leased_session(sessionId: string): Awaitable<LeasedSession | undefined>;

  /**
   * Create or update a leased session.
   * Note: This is a full replace operation - the caller is responsible for
   * merging/patching presence if needed.
   */
  put_leased_session(session: LeasedSession): Awaitable<void>;

  /**
   * Delete a leased session by session ID.
   */
  delete_leased_session(sessionId: string): Awaitable<void>;
}
