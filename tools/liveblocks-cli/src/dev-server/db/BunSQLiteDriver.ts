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
import type {
  IUserInfo,
  Json,
  JsonObject,
  NodeStream,
  PlainLsonObject,
  SerializedChild,
  SerializedCrdt,
  SerializedObject,
  SerializedRootObject,
} from "@liveblocks/core";
import { asPos, CrdtType, nn } from "@liveblocks/core";
import type {
  IReadableSnapshot,
  IStorageDriver,
  IStorageDriverNodeAPI,
  LeasedSession,
  Logger,
  Pos,
  YDocId,
} from "@liveblocks/server";
import {
  makeInMemorySnapshot,
  NestedMap,
  plainLsonToNodeStream,
  quote,
} from "@liveblocks/server";
import { Database } from "bun:sqlite";

function tryParseJson<J extends Json>(
  value: string | undefined
): J | undefined {
  try {
    return value !== undefined ? (JSON.parse(value) as J) : undefined;
  } catch {
    return undefined;
  }
}

type StorageNodesRow = {
  node_id: string;
  crdt_json: string;
};

type MetadataRow = {
  key: string;
  jval: string;
};

type RoomInfoRow = {
  setting: string;
  jval: string;
};

type YdocsRow = {
  doc_id: string;
  key: string;
  data: Uint8Array;
};

type LeasedSessionRow = {
  session_id: string;
  jpresence: string; // JSON
  updated_at: number; // timestamp in milliseconds
  juserinfo: string; // JSON (IUserInfo)
  ttl: number; // milliseconds
  actor_id: number;
};

/**
 * Returns `?, ?, ?` for length = 3.
 */
function nparams(count: number): string {
  if (count > 512) {
    throw new Error("More than 512 params not supported");
  }
  return new Array(count).fill("?").join(",");
}

function consume<T>(it: Iterable<T>): T[] {
  return Array.isArray(it) ? (it as T[]) : Array.from(it);
}

function safeSelect(
  db: Database
): Iterable<[key: string, value: SerializedCrdt]> {
  return (
    db
      .query<StorageNodesRow, []>("SELECT node_id, crdt_json FROM nodes")
      .values() as [string, string][]
  ).map(([node_id, crdt_json]) => [
    node_id,
    tryParseJson<SerializedCrdt>(crdt_json)!,
  ]);
}

function safeUpdate(db: Database, entries: Iterable<[string, SerializedCrdt]>) {
  const stm = db.prepare(
    `INSERT INTO nodes (node_id, crdt_json)
      VALUES (?, ?)
      ON CONFLICT (node_id) DO UPDATE SET crdt_json = ?`
  );
  const insertMany = db.transaction(
    (pairs: Iterable<[string, SerializedCrdt]>) => {
      for (const [key, value] of pairs) {
        const crdt_json = JSON.stringify(value);
        stm.run(key, crdt_json, crdt_json);
      }
    }
  );
  insertMany(entries);
}

function safeDelete(db: Database, ids_: Iterable<string>) {
  // Since we need to know the number of items here, we'll need to consume
  // the (potentially lazy) iterable entirely first
  const ids = consume(ids_);
  const n = ids.length;

  db.query(`DELETE FROM nodes WHERE node_id IN (${nparams(n)})`).run(...ids);
}

//
// TODO: Refactor to leverage SQL more. Ideas:
// - Remove in-memory revNodes building, use SQL indexes/queries instead
// - Use SQL constraints (UNIQUE, FOREIGN KEY) for integrity instead of runtime fixes
// - Consider a normalized schema: separate parent_id/parent_key columns with indexes
//

function buildRevNodes(nodeStream: NodeStream) {
  const result = new NestedMap<string, string, string>();
  for (const [id, node] of nodeStream) {
    if (node.parentId === undefined) continue;
    // Highest node id wins in case of conflict (deterministic across backends)
    const existing = result.get(node.parentId, node.parentKey);
    if (existing === undefined || id > existing) {
      result.set(node.parentId, node.parentKey, id);
    }
  }
  return result;
}

/**
 * Builds the reverse node index, and corrects any data corruption found
 * along the way.
 */
function buildReverseLookup(
  db: Database,
  logger: Logger
): {
  nodes: Map<string, SerializedCrdt>;
  revNodes: NestedMap<string, string, string>;
} {
  const rawNodes = new Map(safeSelect(db));
  if (!rawNodes.has("root")) {
    // In-memory, the root node always exists (this is not true on disk per se)
    rawNodes.set("root", { type: CrdtType.OBJECT, data: {} });
  }

  // Record in here which nodes have been changed (in case their data keys had a conflict)
  const nodesToFix: Set<string> = new Set();

  //
  // Now, we're going to build up the raw NodeMap (which may not be sound, i.e.
  // have corruptions) in a way that will guarantee that the final result will
  // always be a sound (correct) NodeMap.
  //
  // The algorithm works as follows:
  // 1. We generate a reverse lookup table from the rawNodes input. This
  //    will effectively give us the nodes to pick as "winners" in case of
  //    conflict, because it's not possible to have multiple values under the
  //    same key. Also, we need the last entry to "win", because that's how
  //    clients work, too, so this automatically works.
  // 2. We build up the tree from the root, then adding all of its "winner"
  //    children to the map, etc. This way, it's impossible to read conflicts
  //    into memory. Orphans, ref cycles, and conflicting siblings cannot be
  //    included this way.
  // 3. Reporting pass. We loop over the raw node map once more, to see which
  //    nodes we dropped along the way, and report about those.
  //

  const queue: string[] = ["root"];

  const nodes: Map<string, SerializedCrdt> = new Map();

  // Step (1)
  const winners: NestedMap<string, string, string> = buildRevNodes(
    rawNodes as NodeStream
  );

  // Step (2)
  while (queue.length > 0) {
    const nodeId = queue.pop()!;
    const node = nn(rawNodes.get(nodeId));

    if (node.type === CrdtType.OBJECT) {
      // Now check if any of the child keys exist in the node's data. If so,
      // remove those from the `data` key. Nodes always win over `data` fields.
      for (const key of winners.keysAt(nodeId)) {
        if (Object.prototype.hasOwnProperty.call(node.data, key)) {
          // TODO: Investigate this later? V8 might not always like the delete keyword.
          // See this blog post https://akashsingh.blog/javascript-delete-operator-might-cause-some-unexpected-performance-issues
          delete node.data[key];
          nodesToFix.add(nodeId);
          logger.warn(`[integrity] Found data key ${quote(key)} from ${quote(nodeId)} (conflicted with child node)`); // prettier-ignore
        }
      }
    }

    // Add all "winner" child nodes to the queue to process in the next loop
    // (except if the current node is a register, which is not allowed to have children)
    if (node.type !== CrdtType.REGISTER) {
      queue.push(...winners.valuesAt(nodeId));
    } else {
      // This is a REGISTER node. If its parent turns out to be an OBJECT node,
      // it means there is a data corruption, because objects should store JSON
      // key/value pairs directly into their `data` attribute instead of using
      // registers. It will be dropped as if it were an orphan.
      const parent = rawNodes.get(node.parentId);
      if (parent?.type === CrdtType.OBJECT) {
        continue;
      }
    }

    // "Hang" the validated node in the tree
    nodes.set(nodeId, node);
  }

  // Step (3)
  // Collect all node IDs here that need to be removed, because they are
  // unreachable orphans, contain ref cycles, or are at conflict with other
  // data. We'll collect them here in order to batch-delete them at the end.
  const nodesToDelete: Set<string> = new Set();

  // Emit logs so we can see what corruptions have been resolved
  for (const [id, node] of rawNodes) {
    if (!nodes.has(id)) {
      if (node.parentId !== undefined && nodes.has(node.parentId)) {
        if (nodes.get(node.parentId)?.type === CrdtType.REGISTER) {
          logger.warn(`[integrity] Found unreachable node ${quote(id)} (child of live register)`); // prettier-ignore
        } else {
          logger.warn(`[integrity] Found conflicting sibling ${quote(id)} (conflicted with ${quote(winners.get(node.parentId, node.parentKey))} at ${quote(node.parentKey)})`); // prettier-ignore
        }
      } else {
        logger.warn(`[integrity] Found orphan ${quote(id)}`); // prettier-ignore
      }

      nodesToDelete.add(id);
      nodesToFix.delete(id); // Just in case this node was also marked as "to update"
    }
  }

  if (nodesToFix.size > 0 || nodesToDelete.size > 0) {
    // Persist the fixes to disk
    if (nodesToFix.size > 0) {
      const fixedNodes = new Map<string, SerializedCrdt>();
      for (const id of nodesToFix) {
        const node = nodes.get(id);
        if (node !== undefined) {
          fixedNodes.set(id, node);
        }
      }
      safeUpdate(db, fixedNodes);
    }
    if (nodesToDelete.size > 0) {
      safeDelete(db, nodesToDelete);
    }
  }

  const revNodes =
    // If no nodes were dropped (i.e. the 99% happy path), `winners` is our
    // correct reverse node map already, no need to recompute it. Otherwise,
    // on the non-happy path, we'll simply recompute it again at the end. This
    // way we don't have to keep a complex administration.
    nodesToDelete.size === 0 ? winners : buildRevNodes(nodes as NodeStream);

  return { nodes, revNodes };
}

function hasStaticDataAt(
  node: SerializedCrdt | undefined,
  key: string
): node is SerializedObject | SerializedRootObject {
  return (
    node?.type === CrdtType.OBJECT &&
    Object.prototype.hasOwnProperty.call(node.data, key) &&
    node.data[key] !== undefined
  );
}

/**
 * Implements a simple SQLite-backed store.
 */
export class BunSQLiteDriver implements IStorageDriver {
  private db: Database;

  constructor(path: string) {
    const db = new Database(path, { create: true });

    db.run("PRAGMA journal_mode = WAL");
    db.run("PRAGMA case_sensitive_like = ON");

    // Create a table for room info
    db.run(
      `CREATE TABLE IF NOT EXISTS system (
         setting TEXT NOT NULL,
         jval    TEXT NOT NULL,
         PRIMARY KEY (setting)
       )`
    );

    // Create a table to read/write CRDT nodes
    db.run(
      `CREATE TABLE IF NOT EXISTS nodes (
         node_id TEXT NOT NULL,
         crdt_json TEXT NOT NULL,
         PRIMARY KEY (node_id)
       )`
    );

    // Create a table to read/write JSON values
    db.run(
      `CREATE TABLE IF NOT EXISTS metadata (
         key  TEXT NOT NULL,
         jval TEXT NOT NULL,
         PRIMARY KEY (key)
       )`
    );

    // Create a table to read/write BINARY values
    db.run(
      `CREATE TABLE IF NOT EXISTS ydocs (
        doc_id  TEXT NOT NULL,
        key     TEXT NOT NULL,
        data    BLOB NOT NULL,
        PRIMARY KEY (doc_id, key)
      )`
    );

    // Create a table for leased sessions
    db.run(
      `CREATE TABLE IF NOT EXISTS leased_sessions (
        session_id  TEXT NOT NULL PRIMARY KEY,
        jpresence   TEXT NOT NULL,
        updated_at  INTEGER NOT NULL,
        juserinfo   TEXT NOT NULL,
        ttl         INTEGER NOT NULL,
        actor_id    INTEGER NOT NULL
      )`
    );
    db.run(
      "CREATE INDEX IF NOT EXISTS idx_leased_sessions_expiry ON leased_sessions(updated_at, ttl)"
    );

    this.db = db;
  }

  load_nodes_api(logger: Logger): IStorageDriverNodeAPI {
    const db = this.db;

    // REFACTOR NOTE: This logic was inlined here for backward compatibility,
    // but it makes no sense to build this reverse lookup table here in the
    // Bun-SQLite setting, where we could directly read the reverse lookups
    // from the database instead of keeping them in memory. Refactor later.
    const { nodes, revNodes } = buildReverseLookup(db, logger);

    // Helpers used by multiple sync functions below
    const get_node = (id: string) => nodes.get(id);
    const get_child_at = (parentId: string, parentKey: string) =>
      revNodes.get(parentId, parentKey);
    const has_child_at = (parentId: string, parentKey: string) =>
      revNodes.has(parentId, parentKey);

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
    function set_child(
      id: string,
      node: SerializedChild,
      allowOverwrite = false
    ): void {
      const parentNode = get_node(node.parentId);
      if (parentNode === undefined) {
        throw new Error(`No such parent ${quote(node.parentId)}`);
      }

      if (
        node.type === CrdtType.REGISTER &&
        parentNode.type === CrdtType.OBJECT
      ) {
        throw new Error("Cannot add register under object");
      }

      const conflictingSiblingId = get_child_at(node.parentId, node.parentKey);
      if (conflictingSiblingId !== id) {
        // Conflict!
        const hasConflictingData = hasStaticDataAt(parentNode, node.parentKey);
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
      safeUpdate(db, [[id, node]]);
    }

    /**
     * Conceptually this is like "detaching" the node from its parent, and
     * "reattaching" it at the new position.
     *
     * However, this is a native operation, because doing a naive
     * delete-then-insert would would immediately destroy all (grand)children
     * when it's deleted.
     */
    function move_sibling(id: string, newPos: Pos): void {
      const node = get_node(id);
      if (node?.parentId === undefined) {
        return;
      }

      // If there is a conflicting sibling at the new position, disallow the move
      if (has_child_at(node.parentId, newPos))
        throw new Error(`Pos ${quote(newPos)} already taken`); // prettier-ignore

      revNodes.delete(node.parentId, node.parentKey);
      const newNode = { ...node, parentKey: newPos };
      nodes.set(id, newNode);
      revNodes.set(node.parentId, newPos, id);
      safeUpdate(db, [[id, newNode]]);
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
    function set_object_data(
      id: string,
      data: JsonObject,
      allowOverwrite = false
    ): void {
      const node = get_node(id);
      if (node?.type !== CrdtType.OBJECT) {
        // Nothing to do
        return;
      }

      for (const key of Object.keys(data)) {
        // Handle if conflict!
        const childId = get_child_at(id, key);
        if (childId !== undefined) {
          if (allowOverwrite) {
            delete_node(childId);
          } else {
            throw new Error(`Child node already exists under ${key}`); // prettier-ignore
          }
        }
      }

      const newNode = { ...node, data: { ...node.data, ...data } };
      nodes.set(id, newNode);
      safeUpdate(db, [[id, newNode]]);
    }

    /**
     * Delete a node from the in-memory and on-disk tree, including all of its
     * children.
     */
    function delete_node(id: string): void {
      const node = get_node(id);
      if (node?.parentId === undefined) {
        return;
      }

      // Delete the entry in the parent's children administration for this node
      revNodes.delete(node.parentId, node.parentKey);

      // Now proceed to deleting the node tree recursively
      const idsToDelete: string[] = [];
      const queue = [id];
      while (queue.length > 0) {
        const currid = queue.pop()!;
        queue.push(...revNodes.valuesAt(currid));
        nodes.delete(currid);
        revNodes.deleteAll(currid);
        idsToDelete.push(currid);
      }
      safeDelete(db, idsToDelete);
    }

    /**
     * Deletes the child key under a given node, whether it's a static object
     * field, or a child node.
     */
    function delete_child_key(id: string, key: string): void {
      // At most one of these will do something, the other is a no-op
      const node = get_node(id);
      if (hasStaticDataAt(node, key)) {
        const { [key]: _, ...rest } = node.data;
        const newNode = { ...node, data: rest };
        nodes.set(id, newNode);
        safeUpdate(db, [[id, newNode]]);
      }

      const childId = get_child_at(id, key);
      if (childId !== undefined) {
        delete_node(childId);
      }
    }

    const api: IStorageDriverNodeAPI = {
      /**
       * Return the node with the given id, or undefined if no such node exists.
       * Must always return a valid root node for id="root", even if empty.
       */
      get_node,

      /**
       * Yield all nodes as [id, node] pairs. Must always include the root node.
       */
      iter_nodes: () => nodes.entries() as NodeStream,

      /**
       * Return true iff a node with the given id exists. Must return true for "root".
       */
      has_node: (id: string) => nodes.has(id),

      /**
       * Return the id of the child node at (parentId, parentKey), or undefined if
       * none. Only checks child nodes registered via set_child, NOT static data
       * keys on OBJECT nodes.
       */
      get_child_at,

      /**
       * Return true iff a child node exists at (parentId, parentKey). Static data
       * keys on OBJECT nodes do not count—return false for those.
       */
      has_child_at,

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

  /** Deletes all nodes and replaces them with the given document. */
  DANGEROUSLY_reset_nodes(doc: PlainLsonObject) {
    const deleteStm = this.db.prepare("DELETE FROM nodes");
    const insertStm = this.db.prepare(
      "INSERT INTO nodes (node_id, crdt_json) VALUES (?, ?)"
    );
    const resetNodes = this.db.transaction(() => {
      deleteStm.run();
      for (const [key, value] of plainLsonToNodeStream(doc)) {
        insertStm.run(key, JSON.stringify(value));
      }
    });
    resetNodes();
  }

  /* @deprecated Had to introduce this ugly API for now during refactoring, try to remove this again later */
  raw_iter_nodes(): Iterable<[key: string, value: SerializedCrdt]> {
    return (
      this.db
        .query<StorageNodesRow, []>("SELECT node_id, crdt_json FROM nodes")
        .values() as [string, string][]
    ).map(([node_id, crdt_json]) => [
      node_id,
      tryParseJson<SerializedCrdt>(crdt_json)!,
    ]);
  }

  get_meta(key: string) {
    const stm = this.db.query<Pick<MetadataRow, "jval">, [key: string]>(
      "SELECT jval FROM metadata WHERE key = ?"
    );
    const value = stm.get(key)?.jval;
    if (value === undefined) return undefined;
    return tryParseJson(value) ?? null;
  }
  put_meta(key: string, value: Json) {
    const jval = JSON.stringify(value);
    this.db.run(
      `INSERT INTO metadata (key, jval)
         VALUES (?, ?)
         ON CONFLICT (key) DO UPDATE SET jval = ?
       `,
      [key, jval, jval]
    );
  }
  delete_meta(key: string) {
    this.db.query("DELETE FROM metadata WHERE key = ?").run(key);
  }

  next_actor(): number {
    const result = this.db
      .query<Pick<RoomInfoRow, "jval">, []>(
        `INSERT INTO system (setting, jval)
         VALUES ('last_actor_id', '0')
         ON CONFLICT (setting) DO UPDATE SET jval = json(CAST(jval AS INTEGER) + 1)
         RETURNING jval`
      )
      .get();
    return JSON.parse(result!.jval) as number;
  }

  iter_y_updates(docId: YDocId) {
    return this.db
      .query<
        Pick<YdocsRow, "key" | "data">,
        [YDocId]
      >("SELECT key, data FROM ydocs WHERE doc_id = ?")
      .values(docId) as [key: string, data: Uint8Array][];
  }

  write_y_updates(docId: YDocId, key: string, data: Uint8Array) {
    this.db
      .query(
        `INSERT INTO ydocs
        VALUES (?, ?, ?)
        ON CONFLICT (doc_id, key) DO UPDATE SET data = ?`
      )
      .run(docId, key, data, data);
  }

  delete_y_updates(docId: YDocId, keys: string[]) {
    const n = keys.length;
    this.db
      .query(`DELETE FROM ydocs WHERE doc_id = ? AND key IN (${nparams(n)})`)
      .run(docId, ...keys);
  }

  /** @private Only use this in unit tests, never in production. */
  DANGEROUSLY_wipe_all_y_updates() {
    this.db.query("DELETE FROM ydocs").run(); // spicey
  }

  list_leased_sessions(): Iterable<[string, LeasedSession]> {
    const rows = this.db
      .query<
        LeasedSessionRow,
        []
      >("SELECT session_id, jpresence, updated_at, juserinfo, ttl, actor_id FROM leased_sessions")
      .all();
    return Array.from(rows, (row) => [
      row.session_id,
      {
        sessionId: row.session_id,
        presence: tryParseJson<Json>(row.jpresence) ?? null,
        updatedAt: row.updated_at,
        info: tryParseJson<IUserInfo>(row.juserinfo) ?? { name: "" },
        ttl: row.ttl,
        actorId: row.actor_id,
      },
    ]);
  }

  get_leased_session(sessionId: string): LeasedSession | undefined {
    const row = this.db
      .query<
        LeasedSessionRow,
        [string]
      >("SELECT session_id, jpresence, updated_at, juserinfo, ttl, actor_id FROM leased_sessions WHERE session_id = ?")
      .get(sessionId) as LeasedSessionRow | null | undefined;
    if (row === undefined || row === null) {
      return undefined;
    }
    return {
      sessionId: row.session_id,
      presence: tryParseJson<Json>(row.jpresence) ?? null,
      updatedAt: row.updated_at,
      info: tryParseJson<IUserInfo>(row.juserinfo) ?? { name: "" },
      ttl: row.ttl,
      actorId: row.actor_id,
    };
  }

  put_leased_session(session: LeasedSession): void {
    this.db
      .query(
        `INSERT INTO leased_sessions (session_id, jpresence, updated_at, juserinfo, ttl, actor_id)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (session_id) DO UPDATE SET
           jpresence = excluded.jpresence,
           updated_at = excluded.updated_at,
           juserinfo = excluded.juserinfo,
           ttl = excluded.ttl,
           actor_id = excluded.actor_id`
      )
      .run(
        session.sessionId,
        JSON.stringify(session.presence),
        session.updatedAt,
        JSON.stringify(session.info),
        session.ttl,
        session.actorId
      );
  }

  delete_leased_session(sessionId: string): void {
    this.db
      .query("DELETE FROM leased_sessions WHERE session_id = ?")
      .run(sessionId);
  }

  close() {
    this.db.close();
  }
}
