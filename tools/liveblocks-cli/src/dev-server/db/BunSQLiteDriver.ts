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
  CompactNode,
  IUserInfo,
  Json,
  JsonObject,
  NodeStream,
  PlainLsonObject,
  Relax,
  SerializedChild,
  SerializedCrdt,
  SerializedObject,
  SerializedRootObject,
} from "@liveblocks/core";
import { asPos, CrdtType, raise } from "@liveblocks/core";
import type {
  Feed,
  FeedMessage,
  IReadableSnapshot,
  IStorageDriver,
  jstring,
  LeasedSession,
  ListFeedMessagesOptions,
  ListFeedMessagesResult,
  ListFeedsOptions,
  ListFeedsResult,
  Pos,
  YDocId,
} from "@liveblocks/server";
import {
  makeInMemorySnapshot,
  plainLsonToNodeStream,
  quote,
} from "@liveblocks/server";
import { Database, type SQLQueryBindings } from "bun:sqlite";

function tryParseJson<J extends Json>(
  value: string | undefined
): J | undefined {
  try {
    return value !== undefined ? (JSON.parse(value) as J) : undefined;
  } catch {
    return undefined;
  }
}

function parseJson<J extends Json>(text: string): J {
  return JSON.parse(text) as J;
}

// Table `nodes`
type NodeRow =
  | {
      id: "root";
      type: CrdtType.OBJECT;
      parent_id: null;
      parent_key: null;
      jdata: jstring;
    }
  | {
      id: string;
      type: CrdtType.OBJECT | CrdtType.REGISTER;
      parent_id: string;
      parent_key: string;
      jdata: jstring;
    }
  | {
      id: string;
      type: CrdtType.LIST | CrdtType.MAP;
      parent_id: string;
      parent_key: string;
      jdata: null;
    };

function rowToSerializedCrdt(row: NodeRow): SerializedCrdt {
  const { type, parent_id: parentId, parent_key: parentKey, jdata } = row;
  switch (type) {
    case CrdtType.OBJECT:
      return parentId === null
        ? { type, data: parseJson(jdata) }
        : { type, parentId, parentKey, data: parseJson(jdata) };

    case CrdtType.REGISTER:
      return { type, parentId, parentKey, data: parseJson(jdata) };

    case CrdtType.LIST:
    case CrdtType.MAP:
      return { type, parentId, parentKey };

    default:
      raise("Unhandled case");
  }
}

function rowToIdTuple(row: NodeRow): [string, SerializedCrdt] {
  return [row.id, rowToSerializedCrdt(row)];
}

type MetadataRow = {
  key: string;
  jval: jstring;
};

type RoomInfoRow = {
  setting: string;
  jval: jstring;
};

type YdocsRow = {
  doc_id: string;
  key: string;
  data: Uint8Array;
};

type FeedRow = {
  feed_id: string;
  jmetadata: jstring;
  created_at: number;
  updated_at: number;
};

type FeedMessageRow = {
  feed_id: string;
  message_id: string;
  jdata: jstring;
  created_at: number;
  updated_at: number;
};

type LeasedSessionRow = {
  session_id: string;
  jpresence: jstring;
  updated_at: number; // timestamp in milliseconds
  juserinfo: jstring; // IUserInfo
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

// ----------------------------------------------------------------------------
// Sanitization helpers
// Run lazily on first node access (at most once per driver instance) to fix
// any data corruption.
// Optimized for the happy path (no corruption) to be as fast as possible.
// ----------------------------------------------------------------------------

/**
 * Ensures the root node exists. Required for FK constraints to work.
 *
 * Common case is also the happy path: root already exists, this is a no-op.
 */
function sanitize_missingRoot(db: Database): void {
  db.run(
    `INSERT OR IGNORE INTO nodes (id, type, parent_id, parent_key, jdata)
     VALUES ('root', 0, NULL, NULL, '{}')`
  );
}

/**
 * Deletes illegal tree nodes and their subtrees:
 * 1. Registers under Objects
 * 2. Any child node under a Register
 *
 * Common case is also the happy path: no rows match, this is a no-op.
 */
function sanitize_illegalNodes(db: Database): void {
  // Find all illegal nodes (roots of subtrees to delete)
  const illegalNodes = db
    .query<Pick<NodeRow, "id">, []>(
      `SELECT c.id
         FROM nodes c
         JOIN nodes p ON p.id = c.parent_id
         WHERE
           (c.type = ${CrdtType.REGISTER} AND p.type = ${CrdtType.OBJECT})
           OR
           p.type = ${CrdtType.REGISTER}`
    )
    .all();

  // Delete each illegal subtree
  for (const { id } of illegalNodes) {
    delete_node(db, id);
  }
}

/**
 * Fixes Object nodes where static data keys conflict with child node keys.
 * Child nodes always win - conflicting keys are removed from jdata.
 *
 * Common case is also the happy path: no nodes have conflicts, this is a no-op.
 */
function sanitize_staticDataConflicts(db: Database): void {
  // Detection query - returns empty on happy path
  const conflicts = db
    .query<{ id: string; key: string }, []>(
      `SELECT p.id, c.parent_key AS key
         FROM nodes p
         JOIN nodes c ON c.parent_id = p.id
         WHERE p.type = ${CrdtType.OBJECT}
           AND json_type(p.jdata, '$.' || json_quote(c.parent_key)) IS NOT NULL`
    )
    .all();

  // Remove each conflicting key directly in SQLite (no JS parsing needed)
  for (const { id, key } of conflicts) {
    db.query(
      "UPDATE nodes SET jdata = json_remove(jdata, '$.' || json_quote(?)) WHERE id = ?"
    ).run(key, id);
  }
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

// ----------------------------------------------------------------------------
// Node storage operations
// ----------------------------------------------------------------------------

function get_node(db: Database, id: string): SerializedCrdt | undefined {
  const row = db
    .query<
      NodeRow,
      [string]
    >("SELECT id, type, parent_id, parent_key, jdata FROM nodes WHERE id = ?")
    .get(id);
  return row ? rowToSerializedCrdt(row) : undefined;
}

function iter_nodes(db: Database): Iterable<[string, SerializedCrdt]> {
  return db
    .query<
      NodeRow,
      []
    >("SELECT id, type, parent_id, parent_key, jdata FROM nodes")
    .all()
    .map(rowToIdTuple);
}

//
// IMPORTANT: the JSON tuples emitted by this query MUST match the
// `CompactNode` shape (from @liveblocks/core) if they get JSON.parse()'ed.
//
// This contract is unit tested in `_generateFullTestSuite`.
//
function iter_nodes_optimized(db: Database): Iterable<jstring<CompactNode>> {
  return db
    .query<{ tuple: jstring<CompactNode> }, []>(
      `SELECT
         CASE
           WHEN parent_id IS NULL THEN
             '[' || json_quote(id) || ',' || jdata || ']'
           WHEN jdata IS NULL THEN
             '[' || json_quote(id) || ',' || type || ',' ||
                    json_quote(parent_id) || ',' || json_quote(parent_key) || ']'
           ELSE
             '[' || json_quote(id) || ',' || type || ',' ||
                    json_quote(parent_id) || ',' || json_quote(parent_key) || ',' || jdata || ']'
         END AS tuple
       FROM nodes`
    )
    .all()
    .map((row) => row.tuple);
}

function get_child_at(
  db: Database,
  parentId: string,
  parentKey: string
): string | undefined {
  const row = db
    .query<
      Pick<NodeRow, "id">,
      [string, string]
    >("SELECT id FROM nodes WHERE parent_id = ? AND parent_key = ?")
    .get(parentId, parentKey);
  return row?.id;
}

function has_child_at(
  db: Database,
  parentId: string,
  parentKey: string
): boolean {
  return get_child_at(db, parentId, parentKey) !== undefined;
}

function get_next_sibling(
  db: Database,
  parentId: string,
  pos: Pos
): Pos | undefined {
  const row = db
    .query<
      Pick<NodeRow, "parent_key">,
      [string, string]
    >("SELECT parent_key FROM nodes WHERE parent_id = ? AND parent_key > ? ORDER BY parent_key LIMIT 1")
    .get(parentId, pos);
  // parent_key is never null here since we filter on parent_id (root has parent_id=null)
  return row ? asPos(row.parent_key!) : undefined;
}

function get_last_sibling(db: Database, parentId: string): Pos | undefined {
  const row = db
    .query<
      Pick<NodeRow, "parent_key">,
      [string]
    >("SELECT parent_key FROM nodes WHERE parent_id = ? ORDER BY parent_key DESC LIMIT 1")
    .get(parentId);
  // parent_key is never null here since we filter on parent_id (root has parent_id=null)
  return row ? asPos(row.parent_key!) : undefined;
}

function upsert_node(db: Database, id: string, node: SerializedCrdt): void {
  const parentId = id === "root" ? null : (node.parentId ?? null);
  const parentKey = id === "root" ? null : (node.parentKey ?? null);
  const jdata =
    node.type === CrdtType.OBJECT || node.type === CrdtType.REGISTER
      ? JSON.stringify(node.data)
      : null;

  db.query(
    `INSERT INTO nodes (id, type, parent_id, parent_key, jdata)
      VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (id) DO
      UPDATE SET type = excluded.type, parent_id = excluded.parent_id, parent_key = excluded.parent_key, jdata = excluded.jdata`
  ).run(id, node.type, parentId, parentKey, jdata);
}

/**
 * Deletes a node and all its descendants using a depth-first traversal.
 *
 * Because the FK is ON DELETE RESTRICT (mirroring the production driver), we
 * must delete leaves before their parents rather than relying on cascade.
 */
function delete_node(db: Database, id: string): void {
  if (id === "root") return;

  // Stack items: either "visit this node" or "delete this node"
  // Visit going down (growing the stack), delete going back up (shrinking the stack).
  const stack: Relax<{ visit: string } | { delete: string }>[] = [
    { visit: id },
  ];

  while (stack.length > 0) {
    const item = stack.pop()!;

    if (item.delete !== undefined) {
      db.query("DELETE FROM nodes WHERE id = ?").run(item.delete);
    } else {
      // Schedule delete (will run after children due to LIFO)
      stack.push({ delete: item.visit });
      // Schedule children to be visited first
      const children = db
        .query<
          { id: string },
          [string]
        >("SELECT id FROM nodes WHERE parent_id = ?")
        .all(item.visit);
      for (const row of children) {
        stack.push({ visit: row.id });
      }
    }
  }
}

function delete_child_key(db: Database, id: string, key: string): void {
  // At most one of these will do something, the other is a no-op
  const node = get_node(db, id);
  if (hasStaticDataAt(node, key)) {
    delete node.data[key];
    upsert_node(db, id, node);
  }

  const childId = get_child_at(db, id, key);
  if (childId !== undefined) {
    delete_node(db, childId);
  }
}

function set_child(
  db: Database,
  id: string,
  node: SerializedChild,
  allowOverwrite = false
): void {
  const parentNode = get_node(db, node.parentId);
  if (parentNode === undefined) {
    throw new Error(`No such parent ${quote(node.parentId)}`);
  }

  if (node.type === CrdtType.REGISTER && parentNode.type === CrdtType.OBJECT) {
    throw new Error("Cannot add register under object");
  }

  const conflictingSiblingId = get_child_at(db, node.parentId, node.parentKey);
  if (conflictingSiblingId !== id) {
    const hasConflictingData = hasStaticDataAt(parentNode, node.parentKey);
    if (conflictingSiblingId !== undefined || hasConflictingData) {
      if (allowOverwrite) {
        delete_child_key(db, node.parentId, node.parentKey);
      } else {
        throw new Error(`Key ${quote(node.parentKey)} already exists`); // prettier-ignore
      }
    }
  }

  upsert_node(db, id, node);
}

function move_sibling(db: Database, id: string, newPos: Pos): void {
  const node = get_node(db, id);
  if (node?.parentId === undefined) {
    return;
  }

  // If there is a conflicting sibling at the new position, disallow the move
  if (has_child_at(db, node.parentId, newPos))
    throw new Error(`Pos ${quote(newPos)} already taken`); // prettier-ignore

  const newNode = { ...node, parentKey: newPos };
  upsert_node(db, id, newNode);
}

function set_object_data(
  db: Database,
  id: string,
  data: JsonObject,
  allowOverwrite = false
): void {
  const node = get_node(db, id);
  if (node?.type !== CrdtType.OBJECT) {
    // Nothing to do
    return;
  }

  let changed = false;

  for (const [key, value] of Object.entries(data)) {
    // Drop `__proto__`: assigning to it would invoke Object.prototype's
    // setter rather than create an own property, and rebuilding the object
    // via defineProperty on every write is too expensive for this hot path.
    if (key === "__proto__") continue;

    // Handle if conflict!
    const childId = get_child_at(db, id, key);
    if (childId !== undefined) {
      if (allowOverwrite) {
        delete_node(db, childId);
      } else {
        throw new Error(`Child node already exists under ${key}`); // prettier-ignore
      }
    }

    if (node.data[key] === value) {
      // No change, so skip
      continue;
    }

    node.data[key] = value;
    changed = true;
  }

  if (changed) {
    upsert_node(db, id, node);
  }
}

/**
 * The lazily-initialized part of the driver that implements all node-related
 * APIs.
 */
type NodesAPI = Pick<
  IStorageDriver,
  | "get_node"
  | "iter_nodes"
  | "iter_nodes_optimized"
  | "has_node"
  | "get_child_at"
  | "has_child_at"
  | "get_next_sibling"
  | "get_last_sibling"
  | "set_child"
  | "move_sibling"
  | "delete_node"
  | "delete_child_key"
  | "set_object_data"
  | "get_snapshot"
>;

/**
 * Implements a simple SQLite-backed store.
 */
export class BunSQLiteDriver implements IStorageDriver {
  private db: Database;
  private _nodesApi?: NodesAPI;

  constructor(path: string) {
    const db = new Database(path, { create: true });

    db.run("PRAGMA journal_mode = WAL");
    db.run("PRAGMA case_sensitive_like = ON");
    db.run("PRAGMA foreign_keys = ON");

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
         id          TEXT NOT NULL PRIMARY KEY,

         type        INTEGER NOT NULL CHECK (type >= 0 AND type <= 3),
                  -- ^^^^^^^ 0=LiveObject, 1=LiveList, 2=LiveMap, 3=Register
         parent_id   TEXT,  -- NULL only for root
         parent_key  TEXT,  -- NULL only for root
         jdata       TEXT,  -- JSON data for LiveObject and Register; NULL for LiveList/LiveMap

         UNIQUE (parent_id, parent_key),

         -- Root must always be a LiveObject
         CHECK (id != 'root' OR type = 0),

         -- Only 'root' is allowed to have no parent!
         CHECK (id != 'root' OR (parent_id IS NULL AND parent_key IS NULL)),
         CHECK (id = 'root' OR (parent_id IS NOT NULL AND parent_key IS NOT NULL)),

         -- Foreign key: parent_id must reference an existing node
         FOREIGN KEY (parent_id) REFERENCES nodes (id) ON DELETE RESTRICT
       ) STRICT`
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

    // Create a table for feeds
    db.run(
      `CREATE TABLE IF NOT EXISTS feeds (
        feed_id   TEXT NOT NULL PRIMARY KEY,
        jmetadata TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`
    );
    db.run(
      "CREATE INDEX IF NOT EXISTS idx_feeds_created_at ON feeds(created_at DESC, feed_id DESC)"
    );

    // Create a table for feed messages
    db.run(
      `CREATE TABLE IF NOT EXISTS feed_messages (
        feed_id    TEXT NOT NULL,
        message_id TEXT NOT NULL,
        jdata      TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (feed_id, message_id),
        FOREIGN KEY (feed_id) REFERENCES feeds(feed_id) ON DELETE CASCADE
      )`
    );
    db.run(
      "CREATE INDEX IF NOT EXISTS idx_feed_messages_feed_created ON feed_messages(feed_id, created_at DESC, message_id DESC)"
    );

    // Refresh query-planner statistics on every boot. The mask combines:
    //   0x10000 — consider every table, not just ones used this session
    //   0x00002 — run ANALYZE where it would help
    //   0x00010 — cap ANALYZE via a temporary analysis_limit, so a large table
    //             can't turn startup into a slow full-index scan
    // Together: "analyze on every boot" without "scan the world on every boot",
    // and it also covers the CREATE INDEX statements above.
    // See https://www.sqlite.org/pragma.html#pragma_optimize
    db.run(`PRAGMA optimize=${0x10000 | 0x00002 | 0x00010}`);

    this.db = db;
  }

  /**
   * The lazily-built node API. Building it runs the corruption sanitizers.
   * Invalidated by DANGEROUSLY_reset_nodes(), after which the next access
   * rebuilds it.
   */
  private get loadedApi(): NodesAPI {
    return (this._nodesApi ??= this._loadNodesApi());
  }

  get_node(id: string): SerializedCrdt | undefined {
    return this.loadedApi.get_node(id);
  }

  iter_nodes(): NodeStream {
    return this.loadedApi.iter_nodes();
  }

  iter_nodes_optimized(): Iterable<jstring<CompactNode>> {
    return this.loadedApi.iter_nodes_optimized();
  }

  has_node(id: string): boolean {
    return this.loadedApi.has_node(id);
  }

  get_child_at(parentId: string, parentKey: string): string | undefined {
    return this.loadedApi.get_child_at(parentId, parentKey);
  }

  has_child_at(parentId: string, parentKey: string): boolean {
    return this.loadedApi.has_child_at(parentId, parentKey);
  }

  get_next_sibling(parentId: string, pos: Pos): Pos | undefined {
    return this.loadedApi.get_next_sibling(parentId, pos);
  }

  get_last_sibling(parentId: string): Pos | undefined {
    return this.loadedApi.get_last_sibling(parentId);
  }

  set_child(id: string, node: SerializedChild, allowOverwrite?: boolean): void {
    this.loadedApi.set_child(id, node, allowOverwrite);
  }

  move_sibling(id: string, newPos: Pos): void {
    this.loadedApi.move_sibling(id, newPos);
  }

  delete_node(id: string): void {
    this.loadedApi.delete_node(id);
  }

  delete_child_key(id: string, key: string): void {
    this.loadedApi.delete_child_key(id, key);
  }

  set_object_data(
    id: string,
    data: JsonObject,
    allowOverwrite?: boolean
  ): void {
    this.loadedApi.set_object_data(id, data, allowOverwrite);
  }

  get_snapshot(lowMemory?: boolean): IReadableSnapshot {
    return this.loadedApi.get_snapshot(lowMemory);
  }

  private _loadNodesApi(): NodesAPI {
    const db = this.db;

    // Run sanitizers to fix any data corruption (optimized for happy path)
    sanitize_missingRoot(db);
    sanitize_illegalNodes(db);
    sanitize_staticDataConflicts(db);

    const api: NodesAPI = {
      get_node: (id) => get_node(db, id),
      iter_nodes: () => iter_nodes(db) as NodeStream,
      iter_nodes_optimized: () => iter_nodes_optimized(db),
      has_node: (id) => get_node(db, id) !== undefined,
      get_child_at: (parentId, parentKey) =>
        get_child_at(db, parentId, parentKey),
      has_child_at: (parentId, parentKey) =>
        has_child_at(db, parentId, parentKey),
      get_next_sibling: (parentId, pos) => get_next_sibling(db, parentId, pos),
      get_last_sibling: (parentId) => get_last_sibling(db, parentId),
      set_child: (id, node, allowOverwrite) =>
        set_child(db, id, node, allowOverwrite),
      move_sibling: (id, newPos) => move_sibling(db, id, newPos),
      delete_node: (id) => delete_node(db, id),
      delete_child_key: (id, key) => delete_child_key(db, id, key),
      set_object_data: (id, data, allowOverwrite) =>
        set_object_data(db, id, data, allowOverwrite),

      /**
       * Return a readable snapshot of the storage tree. The dev server always
       * uses an in-memory snapshot regardless of the lowMemory hint.
       */
      get_snapshot(_lowMemory?: boolean): IReadableSnapshot {
        return makeInMemorySnapshot(iter_nodes(db) as NodeStream);
      },
    };
    return api;
  }

  reinitialize(): void {
    this._nodesApi = undefined;
  }

  /** Deletes all nodes and replaces them with the given document. */
  DANGEROUSLY_reset_nodes(doc: PlainLsonObject) {
    // Invalidate the cached node API: the next access re-runs the sanitizers
    // against the replaced node set.
    this.reinitialize();

    const insertStm = this.db.prepare(
      "INSERT INTO nodes (id, type, parent_id, parent_key, jdata) VALUES (?, ?, ?, ?, ?)"
    );
    const resetNodes = this.db.transaction(() => {
      // Defer FK checks until the end of the transaction so the bulk DELETE
      // doesn't transiently violate the self-referencing parent_id FK.
      this.db.run("PRAGMA defer_foreign_keys = ON");
      this.db.run("DELETE FROM nodes");
      for (const [id, node] of plainLsonToNodeStream(doc)) {
        const parentId = id === "root" ? null : (node.parentId ?? null);
        const parentKey = id === "root" ? null : (node.parentKey ?? null);
        const jdata =
          node.type === CrdtType.OBJECT || node.type === CrdtType.REGISTER
            ? JSON.stringify(node.data)
            : null;
        insertStm.run(id, node.type, parentId, parentKey, jdata);
      }
    });
    resetNodes();
  }

  /* @deprecated Had to introduce this ugly API for now during refactoring, try to remove this again later */
  raw_iter_nodes(): Iterable<[key: string, value: SerializedCrdt]> {
    return this.db
      .query<
        NodeRow,
        []
      >("SELECT id, type, parent_id, parent_key, jdata FROM nodes")
      .all()
      .map(rowToIdTuple);
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

  // ---------------------------------------------------------------------------
  // Feed APIs
  // ---------------------------------------------------------------------------

  list_feeds(options?: ListFeedsOptions): ListFeedsResult {
    const limit = Math.min(options?.limit ?? 20, 100);
    const since = options?.since;
    const cursor = options?.cursor;
    const metadata = options?.metadata;

    let query =
      "SELECT feed_id, jmetadata, created_at, updated_at FROM feeds WHERE 1=1";
    const params: SQLQueryBindings[] = [];

    if (metadata !== undefined) {
      for (const [key, value] of Object.entries(metadata)) {
        const sqlValue = typeof value === "boolean" ? Number(value) : value;
        query += " AND json_extract(jmetadata, '$.' || ?) = ?";
        params.push(key, sqlValue as SQLQueryBindings);
      }
    }

    if (since !== undefined) {
      query += " AND created_at >= ?";
      params.push(since);
    }

    if (cursor !== undefined) {
      try {
        const decoded = JSON.parse(
          Buffer.from(
            cursor.replace(/-/g, "+").replace(/_/g, "/"),
            "base64"
          ).toString("utf8")
        ) as [string, number];
        const [feedId, createdAt] = decoded;
        query += " AND (created_at < ? OR (created_at = ? AND feed_id < ?))";
        params.push(createdAt, createdAt, feedId);
      } catch {
        // Invalid cursor, ignore it
      }
    }

    query += " ORDER BY created_at DESC, feed_id DESC LIMIT ?";
    params.push(limit + 1);

    const rows = this.db
      .query<FeedRow, SQLQueryBindings[]>(query)
      .all(...params);

    let nextCursor: string | undefined;
    if (rows.length > limit) {
      rows.pop();
      const last = rows[rows.length - 1];
      if (last) {
        const cursorData: [string, number] = [last.feed_id, last.created_at];
        nextCursor = Buffer.from(JSON.stringify(cursorData), "utf8")
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");
      }
    }

    const feeds: Feed[] = rows.map((row) => ({
      feedId: row.feed_id,
      metadata: JSON.parse(row.jmetadata) as Feed["metadata"],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { feeds, nextCursor };
  }

  get_feed(feedId: string): Feed | undefined {
    const row = this.db
      .query<
        FeedRow,
        [string]
      >("SELECT feed_id, jmetadata, created_at, updated_at FROM feeds WHERE feed_id = ?")
      .get(feedId);
    if (row === undefined || row === null) return undefined;
    return {
      feedId: row.feed_id,
      metadata: JSON.parse(row.jmetadata) as Feed["metadata"],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  create_feed(feed: Feed): void {
    const existing = this.db
      .query<
        Pick<FeedRow, "feed_id">,
        [string]
      >("SELECT feed_id FROM feeds WHERE feed_id = ?")
      .get(feed.feedId);
    if (existing !== undefined && existing !== null) {
      throw new Error(`Feed ${feed.feedId} already exists`);
    }
    this.db
      .query(
        "INSERT INTO feeds (feed_id, jmetadata, created_at, updated_at) VALUES (?, ?, ?, ?)"
      )
      .run(
        feed.feedId,
        JSON.stringify(feed.metadata),
        feed.createdAt,
        feed.updatedAt
      );
  }

  update_feed_metadata(feedId: string, metadata: Feed["metadata"]): void {
    const result = this.db
      .query<
        FeedRow,
        [string, string]
      >("UPDATE feeds SET jmetadata = ? WHERE feed_id = ? RETURNING feed_id, jmetadata, created_at, updated_at")
      .get(JSON.stringify(metadata), feedId);
    if (result === undefined || result === null) {
      throw new Error(`Feed ${feedId} not found`);
    }
  }

  delete_feed(feedId: string): void {
    this.db.query("DELETE FROM feeds WHERE feed_id = ?").run(feedId);
  }

  list_feed_messages(
    feedId: string,
    options?: ListFeedMessagesOptions
  ): ListFeedMessagesResult {
    const limit = Math.min(options?.limit ?? 20, 100);
    const since = options?.since;
    const cursor = options?.cursor;

    let query =
      "SELECT feed_id, message_id, jdata, created_at, updated_at FROM feed_messages WHERE feed_id = ?";
    const params: SQLQueryBindings[] = [feedId];

    if (since !== undefined) {
      query += " AND created_at >= ?";
      params.push(since);
    }

    if (cursor !== undefined) {
      try {
        const decoded = JSON.parse(
          Buffer.from(
            cursor.replace(/-/g, "+").replace(/_/g, "/"),
            "base64"
          ).toString("utf8")
        ) as [string, number];
        const [messageId, createdAt] = decoded;
        query += " AND (created_at < ? OR (created_at = ? AND message_id < ?))";
        params.push(createdAt, createdAt, messageId);
      } catch {
        // Invalid cursor, ignore it
      }
    }

    query += " ORDER BY created_at DESC, message_id DESC LIMIT ?";
    params.push(limit + 1);

    const rows = this.db
      .query<FeedMessageRow, SQLQueryBindings[]>(query)
      .all(...params);

    let nextCursor: string | undefined;
    if (rows.length > limit) {
      rows.pop();
      const last = rows[rows.length - 1];
      if (last) {
        const cursorData: [string, number] = [last.message_id, last.created_at];
        nextCursor = Buffer.from(JSON.stringify(cursorData), "utf8")
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");
      }
    }

    const messages: FeedMessage[] = rows.map((row) => ({
      id: row.message_id,
      data: JSON.parse(row.jdata) as FeedMessage["data"],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { messages, nextCursor };
  }

  add_feed_message(feedId: string, message: FeedMessage): void {
    const feed = this.get_feed(feedId);
    if (feed === undefined) {
      throw new Error(`Feed ${feedId} not found`);
    }
    this.db
      .query(
        "INSERT INTO feed_messages (feed_id, message_id, jdata, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
      )
      .run(
        feedId,
        message.id,
        JSON.stringify(message.data),
        message.createdAt,
        message.updatedAt
      );
  }

  update_feed_message(
    feedId: string,
    messageId: string,
    data: FeedMessage["data"],
    timestamp?: number
  ): FeedMessage {
    const existing = this.db
      .query<
        FeedMessageRow,
        [string, string]
      >("SELECT feed_id, message_id, jdata, created_at, updated_at FROM feed_messages WHERE feed_id = ? AND message_id = ?")
      .get(feedId, messageId);
    if (existing === undefined || existing === null) {
      throw new Error(`Feed message ${messageId} not found in feed ${feedId}`);
    }

    const effectiveTimestamp = timestamp ?? Date.now();
    if (effectiveTimestamp < existing.updated_at) {
      return {
        id: existing.message_id,
        data: JSON.parse(existing.jdata) as FeedMessage["data"],
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
      };
    }

    const result = this.db
      .query<
        FeedMessageRow,
        [string, number, string, string, number]
      >("UPDATE feed_messages SET jdata = ?, updated_at = ? WHERE feed_id = ? AND message_id = ? AND updated_at <= ? RETURNING feed_id, message_id, jdata, created_at, updated_at")
      .get(
        JSON.stringify(data),
        effectiveTimestamp,
        feedId,
        messageId,
        effectiveTimestamp
      );
    if (result === undefined || result === null) {
      const latest = this.db
        .query<
          FeedMessageRow,
          [string, string]
        >("SELECT feed_id, message_id, jdata, created_at, updated_at FROM feed_messages WHERE feed_id = ? AND message_id = ?")
        .get(feedId, messageId);
      if (latest === undefined || latest === null) {
        throw new Error(
          `Feed message ${messageId} not found in feed ${feedId}`
        );
      }
      return {
        id: latest.message_id,
        data: JSON.parse(latest.jdata) as FeedMessage["data"],
        createdAt: latest.created_at,
        updatedAt: latest.updated_at,
      };
    }
    return {
      id: result.message_id,
      data: JSON.parse(result.jdata) as FeedMessage["data"],
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  delete_feed_message(feedId: string, messageId: string): void {
    this.db
      .query("DELETE FROM feed_messages WHERE feed_id = ? AND message_id = ?")
      .run(feedId, messageId);
  }

  close() {
    this.db.close();
  }
}
