import type { Database } from "better-sqlite3";
import sqlite3 from "better-sqlite3";

import type { Json } from "~/lib/Json.js";

import { LiveObject } from "./LiveObject.js";
import type { Delta, NodeId, Transaction } from "./types.js";

function createDB() {
  const db = sqlite3(":memory:");
  db.pragma("journal_mode = WAL");

  db.exec(
    // Notes:
    // - "Internal" ID, used for linking only, but not exposed in the protocol
    // - "External" ID, communicated in our protocol
    `CREATE TABLE IF NOT EXISTS nodes (
       internal_id  INTEGER NOT NULL PRIMARY KEY,
       node_id      TEXT NOT NULL,
       type         INTEGER NOT NULL,  -- 0=LiveObj, 1=LiveList, 2=LiveMap

       UNIQUE (node_id)
     )`
  );

  db.exec(
    // Ensures a "root" node exists, and is a LiveObject, always.
    `INSERT INTO nodes (node_id, type) VALUES ('root', 0)
       ON CONFLICT (node_id) DO UPDATE SET type = 0`
  );

  db.exec(
    `CREATE TABLE IF NOT EXISTS nodetree (
       internal_id  INTEGER NOT NULL,
       key          TEXT NOT NULL,
       jval         TEXT,
       live_ref     INTEGER,

       PRIMARY KEY (internal_id, key),
       UNIQUE (live_ref)

       -- XXX Add this check!
       -- CHECK ((jval IS NOT NULL) != (live_ref IS NOT NULL))

       -- XXX Use these foreign keys!
       -- FOREIGN KEY (internal_id) REFERENCES nodes (internal_id)
       -- FOREIGN KEY (live_ref) REFERENCES nodes (internal_id)
     )`
  );

  // db.exec(
  //   `CREATE TABLE IF NOT EXISTS versions (
  //      node_id  TEXT NOT NULL,
  //      key      TEXT NOT NULL,
  //      clock    INTEGER NOT NULL,
  //      jval     TEXT,
  //      PRIMARY KEY (node_id, key, clock DESC)
  //    )`
  // );

  return db;
}

function createQueries(db: Database) {
  const nodes = {
    countAll: db.prepare<[], number>("SELECT COUNT(*) FROM nodes").pluck(),

    selectInternalIdByNodeId: db
      .prepare<
        [node_id: string],
        number
      >("SELECT internal_id FROM nodes WHERE node_id = ?")
      .pluck(),

    clear: db.prepare<[], void>("DELETE FROM nodes"),
  };

  const nodeTree = {
    selectValueByNodeId: db
      .prepare<
        [nodeId: string, key: string],
        string
      >("SELECT jval FROM nodetree WHERE internal_id = (SELECT internal_id FROM nodes WHERE node_id = ? LIMIT 1) AND key = ?")
      .pluck(),

    selectKeysByNodeId: db
      .prepare<
        [nodeId: string],
        string
      >("SELECT key FROM nodetree WHERE internal_id = (SELECT internal_id FROM nodes WHERE node_id = ? LIMIT 1)")
      .pluck(),

    selectAllByNodeId: db
      .prepare<
        [nodeId: string],
        [key: string, jval: string]
      >("SELECT key, jval FROM nodetree WHERE internal_id = (SELECT internal_id FROM nodes WHERE node_id = ? LIMIT 1)")
      .raw(),

    selectAll: db
      .prepare<
        [],
        [
          nodeId: string,
          key: string,
          jval: string | null,
          liveRef: string | null,
        ]
      >(
        `
          SELECT n.node_id, t.key, t.jval, r.node_id
          FROM nodes n
          LEFT JOIN nodetree t ON t.internal_id = n.internal_id
          LEFT JOIN nodes r ON r.internal_id = t.live_ref
        `
      )
      .raw(),

    upsertKeyValue: db.prepare<
      [internal_id: number, key: string, jval: string],
      void
    >(
      `INSERT INTO nodetree (internal_id, key, jval, live_ref)
       VALUES (?, ?, ?, NULL)
       ON CONFLICT (internal_id, key) DO UPDATE SET jval = excluded.jval, live_ref = excluded.live_ref`
    ),

    upsertKeyLiveRef: db.prepare<
      [internal_id: number, key: string, ref_internal_id: number],
      void
    >(
      `INSERT INTO nodetree (internal_id, key, jval, live_ref)
       VALUES (?, ?, NULL, ?)
       ON CONFLICT (internal_id, key) DO UPDATE SET jval = excluded.jval, live_ref = excluded.live_ref`
    ),

    deleteKey: db.prepare<[nodeId: string, key: string], void>(
      "DELETE FROM nodetree WHERE internal_id = (SELECT internal_id FROM nodes WHERE node_id = ?) AND key = ?"
    ),

    clear: db.prepare<[], void>("DELETE FROM nodetree"),
  };

  // const versions = {
  //   clear: db.prepare<[], void>("DELETE FROM versions"),
  //
  //   upsertKeyValue: db.prepare<
  //     [nodeId: string, key: string, clock: number, jval: string],
  //     void
  //   >(
  //     `INSERT INTO versions (node_id, key, clock, jval)
  //      VALUES (?, ?, ?, ?)
  //      ON CONFLICT (node_id, key, clock) DO UPDATE SET jval = excluded.jval`
  //   ),
  //
  //   deleteKey: db.prepare<[nodeId: string, key: string, clock: number], void>(
  //     `INSERT INTO versions (node_id, key, clock, jval)
  //      VALUES (?, ?, ?, NULL)
  //      ON CONFLICT (node_id, key, clock) DO UPDATE SET jval = excluded.jval`
  //   ),
  //
  //   selectAll: db
  //     .prepare<
  //       [],
  //       [nodeId: string, key: string, clock: number, jval: string]
  //     >("SELECT node_id, key, clock, jval FROM versions")
  //     .raw(),
  //
  //   selectSince: db
  //     .prepare<
  //       [clock: number],
  //       [nodeId: string, key: string, jval: string | null]
  //     >(
  //       `WITH winners AS (
  //          SELECT
  //            node_id,
  //            key,
  //            jval,
  //            RANK() OVER (PARTITION BY node_id, key ORDER BY clock DESC) as rnk
  //          FROM versions
  //          WHERE clock > ?
  //        )
  //
  //        SELECT node_id, key, jval FROM winners WHERE rnk = 1`
  //     )
  //     .raw(),
  // };

  return {
    begin: db.prepare<[], void>("BEGIN"),
    commit: db.prepare<[], void>("COMMIT"),
    rollback: db.prepare<[], void>("ROLLBACK"),

    nodes,
    nodeTree,
    // versions,
  };
}

type Queries = ReturnType<typeof createQueries>;

export class SQLCache {
  readonly #q: Queries;
  #clock: number;
  #pendingClock: number;
  #nextNodeId: number = 1;

  constructor() {
    this.#q = createQueries(createDB());
    this.#clock = 0; // TBD Derive this value from the DB data
    this.#pendingClock = this.#clock;
  }

  get clock(): number {
    return this.#pendingClock;
  }

  // ----------------------------------------------------
  // "Multi-layer" cache idea
  // ----------------------------------------------------

  #has(nodeId: NodeId, key: string): boolean {
    return this.#get(nodeId, key) !== undefined;
  }

  #get(nodeId: NodeId, key: string): Json | undefined {
    const jval = this.#q.nodeTree.selectValueByNodeId.get(nodeId, key);
    return jval !== undefined ? (JSON.parse(jval) as Json) : undefined;
  }

  #set(nodeId: NodeId, key: string, value: Json): boolean {
    if (value === undefined) {
      return this.#delete(nodeId, key);
    } else {
      const jval = JSON.stringify(value);
      const internalId = this.#q.nodes.selectInternalIdByNodeId.get(nodeId);
      if (internalId === undefined) return false;
      this.#q.nodeTree.upsertKeyValue.run(internalId, key, jval);
      // this.#q.versions.upsertKeyValue.run(nodeId, key, this.#pendingClock, jval);
      return true;
    }
  }

  #setLiveRef(nodeId: NodeId, key: string, ref: NodeId): boolean {
    const internalId = this.#q.nodes.selectInternalIdByNodeId.get(nodeId);
    const refInternalId = this.#q.nodes.selectInternalIdByNodeId.get(ref);
    if (internalId === undefined || refInternalId === undefined) return false;
    this.#q.nodeTree.upsertKeyLiveRef.run(internalId, key, refInternalId);
    // this.#q.versions.upsertKeyValue.run(nodeId, key, this.#pendingClock, jval);
    return true;
  }

  #delete(nodeId: NodeId, key: string): boolean {
    const result = this.#q.nodeTree.deleteKey.run(nodeId, key);
    if (result.changes > 0) {
      // XXX Maybe also remove the entry from the nodes index at the end of the transaction to clean up?
      // this.#q.versions.deleteKey.run(nodeId, key, this.#pendingClock);
      return true;
    } else {
      return false;
    }
  }

  keys(nodeId: NodeId): IterableIterator<string> {
    return this.#q.nodeTree.selectKeysByNodeId.iterate(nodeId);
  }

  *entries(nodeId: NodeId): IterableIterator<[key: string, value: Json]> {
    const rows = this.#q.nodeTree.selectAllByNodeId.iterate(nodeId);
    for (const [key, jval] of rows) {
      yield [key, JSON.parse(jval)];
    }
  }

  // ----------------------------------------------------
  // Transaction API
  // ----------------------------------------------------

  /**
   * Computes a Delta since the given clock value.
   */
  fullDelta(): Delta {
    const updated: { [nodeId: string]: { [key: string]: Json } } = {};
    for (const [nodeId, key, value] of this.rows()) {
      (updated[nodeId] ??= {})[key] = value;
    }
    return [{}, updated];
  }

  /**
   * Computes a Delta since the given clock value.
   */
  // deltaSince(since: number): Delta {
  //   const removed: { [nodeId: string]: string[] } = {};
  //   const updated: { [nodeId: string]: { [key: string]: Json } } = {};
  //   for (const [nodeId, key, jval] of this.#q.versions.selectSince.iterate(
  //     since
  //   )) {
  //     if (jval === null) {
  //       (removed[nodeId] ??= []).push(key);
  //     } else {
  //       (updated[nodeId] ??= {})[key] = JSON.parse(jval) as Json;
  //     }
  //   }
  //   return [removed, updated];
  // }

  mutate(callback: (root: LiveObject) => unknown): Delta {
    // const origClock = this.clock;

    let dirty = false;
    const deleted: Record<string, string[]> = {};
    const updated: Record<string, Record<string, Json>> = {};

    const tx: Transaction = {
      nextId: (): string => `${this.#pendingClock}:${this.#nextNodeId++}`,
      has: (nodeId: NodeId, key: string) => this.#has(nodeId, key),
      get: (nodeId: NodeId, key: string) => this.#get(nodeId, key),
      keys: (nodeId: NodeId) => this.keys(nodeId),
      set: (nodeId: NodeId, key: string, value: Json) => {
        const wasUpdated = this.#set(nodeId, key, value);
        dirty ||= wasUpdated;
        if (wasUpdated) {
          // (deleted[nodeId] ??= {}).remove(key);
          (updated[nodeId] ??= {})[key] = value;
        }
        return wasUpdated;
      },
      setLiveRef: (nodeId: NodeId, key: string, ref: NodeId) => {
        const wasUpdated = this.#setLiveRef(nodeId, key, ref);
        dirty ||= wasUpdated;
        if (wasUpdated) {
          // (deleted[nodeId] ??= {}).remove(key);
          (updated[nodeId] ??= {})[key] = { $ref: ref };
        }
        return wasUpdated;
      },
      delete: (nodeId: NodeId, key: string) => {
        const wasDeleted = this.#delete(nodeId, key);
        dirty ||= wasDeleted;
        if (wasDeleted) {
          (deleted[nodeId] ??= []).push(key);
          delete (updated[nodeId] ??= {})[key];
        }
        return wasDeleted;
      },
    };

    this.#startTransaction();
    try {
      callback(LiveObject.loadRoot(tx));
      if (dirty) {
        this.#commit();
        return [deleted, updated];
        // return this.deltaSince(origClock);
      } else {
        this.#rollback();
        return [{}, {}];
      }
    } catch (e) {
      this.#rollback();
      throw e;
    }
  }

  #startTransaction(): void {
    this.#q.begin.run();
    this.#pendingClock = this.#clock + 1;
    this.#nextNodeId = 1;
  }

  #commit(): void {
    this.#q.commit.run();
    this.#clock = this.#pendingClock;
  }

  #rollback(): void {
    this.#q.rollback.run();
    this.#pendingClock = this.#clock;
  }

  // For convenience in unit tests only --------------------------------
  *rows(): IterableIterator<[nodeId: string, key: string, value: Json]> {
    for (const [
      nodeId,
      key,
      jval,
      liveRef,
    ] of this.#q.nodeTree.selectAll.iterate()) {
      console.log("iterrrrr", nodeId, key, jval, liveRef);
      const value =
        jval !== null ? (JSON.parse(jval) as Json) : { $ref: liveRef! };
      yield [nodeId, key, value];
    }
  }

  /**
   * Returns the number of items in the cache.
   */
  get count(): number {
    return this.#q.nodes.countAll.get()!;
  }

  get data(): Record<string, Record<string, Json>> {
    return this.fullDelta()[1];
  }
}
