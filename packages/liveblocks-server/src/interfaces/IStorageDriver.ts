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
  CompactNode,
  Json,
  JsonObject,
  PlainLsonObject,
  SerializedChild,
  SerializedCrdt,
  SerializedRootObject,
  StorageNode,
} from "@liveblocks/core";

import type { YDocId } from "~/decoders/y-types";
import type { Feed, FeedMessage, jstring, LeasedSession, Pos } from "~/types";

/**
 * Options for listing feeds with pagination and filtering.
 */
export type ListFeedsOptions = {
  cursor?: string; // Pagination cursor
  since?: number; // Unix timestamp in milliseconds - return feeds created after this time
  limit?: number; // Max items to return (1-100)
  metadata?: Record<string, Json>; // Metadata filters (key-value pairs, supports string/number/boolean/null)
};

/**
 * Options for listing feed messages with pagination.
 */
export type ListFeedMessagesOptions = {
  cursor?: string; // Pagination cursor
  since?: number; // Unix timestamp in milliseconds - return messages created after this time
  limit?: number; // Max items to return (1-100)
};

/**
 * Result of listing feeds with pagination info.
 */
export type ListFeedsResult = {
  feeds: Feed[];
  nextCursor?: string; // Cursor for next page, undefined if no more pages
};

/**
 * Result of listing feed messages with pagination info.
 */
export type ListFeedMessagesResult = {
  messages: FeedMessage[];
  nextCursor?: string; // Cursor for next page, undefined if no more pages
};

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
 * Persistent storage backend for Liveblocks room data: CRDT nodes, metadata,
 * actor IDs, and Yjs updates.
 *
 * The node methods will initialize lazily (but synchronously): on first node
 * access, the driver loads/repairs its node state internally, at most once per
 * instance. DANGEROUSLY_reset_nodes() invalidates that state, after which the
 * next access transparently re-runs the load/repair sanitization.
 *
 * INVARIANTS:
 * - A virtual root node `{type: OBJECT, data: {}}` always exists.
 * - All non-root nodes have parentId and parentKey forming a tree.
 * - Reads reflect writes immediately.
 */
export interface IStorageDriver {
  // ---------------------------------------------------------------------------
  // Node APIs
  // ---------------------------------------------------------------------------

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
   * Yield each node as a pre-built `CompactNode` JSON tuple string, ready to
   * be emitted directly into a STORAGE_CHUNK wire frame without JSON.parse()
   * or JSON.stringify()'ing overhead. Implementations MUST produce text whose
   * parsed shape exactly matches the `CompactNode` union type from
   * @liveblocks/core. The emitted shapes are:
   *
   *   - Root node:          '["root",<data>]'
   *   - OBJECT / REGISTER:  '["0:1",0,"root","a",<data>]'
   *   - LIST   / MAP:       '["0:2",1,"0:1","b"]'
   *
   * Invariant (implementations MUST uphold; asserted by `_generateFullTestSuite`):
   *
   *     iter_nodes_optimized().map(JSON.parse)
   *       ≡ nodeStreamToCompactNodes(iter_nodes())
   *
   * i.e. parsing each yielded string yields the same sequence of CompactNodes
   * that the canonical `iter_nodes()` + `nodeStreamToCompactNodes()` path
   * would produce.
   */
  iter_nodes_optimized(): Iterable<jstring<CompactNode>>;

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
   * Return the position of the last (rightmost) child under parentId, or
   * undefined if the node has no children. Positions compare
   * lexicographically.
   */
  get_last_sibling(parentId: string): Pos | undefined;

  /**
   * Insert a child node with the given id.
   *
   * If allowOverwrite=false (default): throw if a node with this id exists.
   * If allowOverwrite=true: replace any existing node at this id, deleting its
   * entire subtree if it has children.
   */
  set_child(id: string, node: SerializedChild, allowOverwrite?: boolean): void;

  /**
   * Change a node's parentKey, effectively repositioning the node within its
   * parent. The new position must be free.
   * Throw if another node already occupies (parentId, newPos).
   */
  move_sibling(id: string, newPos: Pos): void;

  /**
   * Delete a node and its entire subtree recursively.
   * Ignore if id="root" (root is immortal).
   */
  delete_node(id: string): void;

  /**
   * Delete a key from node `id`. Handle two cases:
   *
   * 1. If id is an OBJECT with `key` in its data: remove that data field.
   * 2. If a child exists at (id, key): delete that child and all its
   *    descendants recursively.
   *
   * No-op if neither applies or if the node doesn't exist.
   */
  delete_child_key(id: string, key: string): void;

  /**
   * Replace the data object of an OBJECT node.
   *
   * If allowOverwrite=false (default): throw if any key in `data` conflicts
   * with an existing child's parentKey.
   * If allowOverwrite=true: first delete any conflicting children (and their
   * entire subtrees), then set the data.
   */
  set_object_data(id: string, data: JsonObject, allowOverwrite?: boolean): void;

  /**
   * Return a readable snapshot of the storage tree.
   *
   * @param lowMemory When true, the call site hints that the snapshot should
   * be optimized for lower memory consumption, even if that means slower
   * access.
   */
  get_snapshot(lowMemory?: boolean): IReadableSnapshot;

  /**
   * Release any lazily-initialized in-memory node state (caches/indexes
   * built on first node access), freeing it up for garbage collection.
   * Persisted data is NOT touched — the next node access transparently
   * re-initializes. (Contrast with DANGEROUSLY_reset_nodes(), which deletes
   * the actual data.)
   */
  reinitialize(): void;

  /**
   * Delete all CRDT nodes and replace them with the given document.
   * Does NOT affect metadata, actor IDs, or Yjs updates.
   * Invalidates the driver's internally loaded node state.
   *
   * Pass `{ liveblocksType: "LiveObject", data: {} }` to reset to an empty root.
   */
  DANGEROUSLY_reset_nodes(doc: PlainLsonObject): void;

  /**
   * Read raw node data directly from storage.
   *
   * @internal Test-only API
   */
  raw_iter_nodes(): Iterable<[string, SerializedCrdt]>;

  // ---------------------------------------------------------------------------
  // Metadata APIs (key-value store, isolated from nodes)
  // ---------------------------------------------------------------------------

  /**
   * Return the value for `key`, or undefined if not set.
   */
  get_meta(key: string): Json | undefined;

  /**
   * Store `value` under `key`. Overwrite any existing value.
   */
  put_meta(key: string, value: Json): void;

  /**
   * Delete the value under `key`. No-op if not set.
   */
  delete_meta(key: string): void;

  // ---------------------------------------------------------------------------
  // System APIs
  // ---------------------------------------------------------------------------

  /**
   * Return a unique actor ID. Each call must return a distinct integer ≥ 0.
   * Concurrent calls must never return duplicates.
   */
  next_actor(): number;

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
  iter_y_updates(docId: YDocId): Iterable<[string, Uint8Array]>;

  /**
   * Store a Yjs update under (docId, key). Overwrite if key exists.
   */
  write_y_updates(docId: YDocId, key: string, data: Uint8Array): void;

  /**
   * Delete the specified keys for docId.
   */
  delete_y_updates(docId: YDocId, keys: string[]): void;

  /**
   * Delete ALL Yjs updates across ALL documents.
   * @private Test-only: never use in production.
   */
  DANGEROUSLY_wipe_all_y_updates(): void;

  // ---------------------------------------------------------------------------
  // Leased Session APIs (key-value store for leased sessions)
  // ---------------------------------------------------------------------------

  /**
   * List all leased sessions.
   * Note: Does NOT filter by expiration - returns all stored sessions.
   * Expiration logic is handled at the Room.ts level.
   */
  list_leased_sessions(): Iterable<[sessionId: string, session: LeasedSession]>;

  /**
   * Get a specific leased session by session ID.
   * Note: Does NOT check expiration - returns the stored session if it exists.
   * Expiration logic is handled at the Room.ts level.
   */
  get_leased_session(sessionId: string): LeasedSession | undefined;

  /**
   * Create or update a leased session.
   * Note: This is a full replace operation - the caller is responsible for
   * merging/patching presence if needed.
   */
  put_leased_session(session: LeasedSession): void;

  /**
   * Delete a leased session by session ID.
   */
  delete_leased_session(sessionId: string): void;

  /**
   * Return the number of storage rows written since last call to this method,
   * and reset the counter.
   */
  takeRowsWritten?(): number;

  // ---------------------------------------------------------------------------
  // Feed APIs
  // ---------------------------------------------------------------------------

  /**
   * List feeds with pagination, filtering, and metadata querying.
   * Feeds are sorted by createdAt descending (newest first).
   */
  list_feeds(options?: ListFeedsOptions): ListFeedsResult;

  /**
   * Get a specific feed by feed ID.
   * Returns feed metadata only (without messages).
   * Use list_feed_messages to retrieve messages for this feed.
   * Returns undefined if the feed doesn't exist.
   */
  get_feed(feedId: string): Feed | undefined;

  /**
   * Create a new feed.
   * If feedId already exists, throws an error.
   */
  create_feed(feed: Feed): void;

  /**
   * Update a feed's metadata.
   * The feed must exist, otherwise throws an error.
   */
  update_feed_metadata(feedId: string, metadata: Json): void;

  /**
   * Delete a feed by feed ID.
   * Also deletes all messages associated with the feed (via CASCADE).
   * No-op if feed doesn't exist.
   */
  delete_feed(feedId: string): void;

  /**
   * List feed messages for a feed with pagination.
   * Messages are sorted by createdAt descending (newest first).
   */
  list_feed_messages(
    feedId: string,
    options?: ListFeedMessagesOptions
  ): ListFeedMessagesResult;

  /**
   * Add a message to a feed.
   * The message must have id, createdAt, and updatedAt already set (handled by Room layer).
   * The feed must exist, otherwise throws an error.
   */
  add_feed_message(feedId: string, message: FeedMessage): void;

  /**
   * Update a feed message's data.
   * Returns the updated message.
   * The feed and message must exist, otherwise throws an error.
   * If timestamp is not provided, current server time is used.
   * Messages are only updated if the provided timestamp is greater than or equal to the stored updatedAt.
   */
  update_feed_message(
    feedId: string,
    messageId: string,
    data: Json,
    timestamp?: number
  ): FeedMessage;

  /**
   * Delete a feed message.
   * The feed and message must exist, otherwise throws an error.
   */
  delete_feed_message(feedId: string, messageId: string): void;
}
