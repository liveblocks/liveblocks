import type { Database } from "better-sqlite3";
import sqlite3 from "better-sqlite3";

import type { Json } from "~/lib/Json.js";
import type { LiveStructure, Lson } from "~/lib/Lson.js";
import { isLiveStructure } from "~/lib/Lson.js";

import { DefaultMap } from "./lib/DefaultMap.js";
import { LiveObject } from "./LiveObject.js";
import type { Delta, NodeId, Pool } from "./types.js";

function createDB() {
  const db = sqlite3(":memory:");
  db.pragma("journal_mode = WAL");

  db.exec(
    `CREATE TABLE IF NOT EXISTS storage (
       nid    TEXT NOT NULL,
       key    TEXT NOT NULL,
       jval   TEXT NULL,
       ref    TEXT NULL,

       PRIMARY KEY (nid, key),
       UNIQUE (ref),
       CHECK (
         -- jval XOR ref
         (jval IS NULL) != (ref IS NULL)
       )
     )`
  );

  db.exec(
    `CREATE TABLE IF NOT EXISTS versions (
       nid    TEXT NOT NULL,
       key    TEXT NOT NULL,
       clock  INT UNSIGNED NOT NULL,
       jval   TEXT,
       ref    TEXT,
       PRIMARY KEY (nid, key, clock DESC)
     )`
  );

  return db;
}

function createQueries(db: Database) {
  const storage = {
    countAll: db.prepare<[], number>("SELECT COUNT(*) FROM storage").pluck(),

    exists: db
      .prepare<
        [nid: string, key: string],
        number // EXISTS doesn't return a boolean
      >("SELECT EXISTS(SELECT 1 FROM storage WHERE nid = ? AND key = ?)")
      .pluck(),

    selectKey: db
      .prepare<
        [nid: string, key: string],
        [jval: string, ref: null] | [jval: null, ref: string]
      >("SELECT jval, ref FROM storage WHERE nid = ? AND key = ?")
      .raw(),

    selectKeysByNodeId: db
      .prepare<[nid: string], string>("SELECT key FROM storage WHERE nid = ?")
      .pluck(),

    selectAllByNodeId: db
      .prepare<
        [nid: string],
        [key: string, jval: string, ref: string]
      >("SELECT key, jval, ref FROM storage WHERE nid = ?")
      .raw(),

    selectAll: db
      .prepare<
        [],
        | [nid: string, key: string, jval: string, ref: null]
        | [nid: string, key: string, jval: null, ref: string]
      >("SELECT nid, key, jval, ref FROM storage")
      .raw(),

    upsertKeyValue: db.prepare<[nid: string, key: string, jval: string], void>(
      `INSERT INTO storage (nid, key, jval, ref)
       VALUES (?, ?, ?, NULL)
       ON CONFLICT (nid, key) DO UPDATE SET jval = excluded.jval, ref = excluded.ref`
    ),

    upsertKeyRef: db.prepare<[nid: string, key: string, ref: string], void>(
      `INSERT INTO storage (nid, key, jval, ref)
       VALUES (?, ?, NULL, ?)
       ON CONFLICT (nid, key) DO UPDATE SET jval = excluded.jval, ref = excluded.ref`
    ),

    deleteKey: db.prepare<[nid: string, key: string], void>(
      "DELETE FROM storage WHERE nid = ? AND key = ?"
    ),

    clear: db.prepare<[], void>("DELETE FROM storage"),
  };

  const versions = {
    clear: db.prepare<[], void>("DELETE FROM versions"),

    upsertKeyValue: db.prepare<
      [nid: string, key: string, clock: number, jval: string],
      void
    >(
      `INSERT INTO versions (nid, key, clock, jval, ref)
       VALUES (?, ?, ?, ?, NULL)
       ON CONFLICT (nid, key, clock) DO UPDATE SET jval = excluded.jval, ref = excluded.ref`
    ),

    upsertKeyRef: db.prepare<
      [nid: string, key: string, clock: number, ref: string],
      void
    >(
      `INSERT INTO versions (nid, key, clock, jval, ref)
       VALUES (?, ?, ?, NULL, ?)
       ON CONFLICT (nid, key, clock) DO UPDATE SET jval = excluded.jval, ref = excluded.ref`
    ),

    deleteKey: db.prepare<[nid: string, key: string, clock: number], void>(
      `INSERT INTO versions (nid, key, clock, jval, ref)
       VALUES (?, ?, ?, NULL, NULL)
       ON CONFLICT (nid, key, clock) DO UPDATE SET jval = excluded.jval, ref = excluded.ref`
    ),

    selectAll: db
      .prepare<
        [],
        [nid: string, key: string, clock: number, jval: string, ref: string]
      >("SELECT nid, key, clock, jval, ref FROM versions")
      .raw(),

    selectSince: db
      .prepare<
        [clock: number],
        | [nid: string, key: string, jval: string, ref: null]
        | [nid: string, key: string, jval: null, ref: string]
      >(
        `WITH winners AS (
           SELECT
             nid,
             key,
             jval,
             ref,
             RANK() OVER (PARTITION BY nid, key ORDER BY clock DESC) as rnk
           FROM versions
           WHERE clock > ?
         )

         SELECT nid, key, jval, ref FROM winners WHERE rnk = 1`
      )
      .raw(),
  };

  return {
    begin: db.prepare<[], void>("BEGIN"),
    commit: db.prepare<[], void>("COMMIT"),
    rollback: db.prepare<[], void>("ROLLBACK"),

    storage,
    versions,
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

  #get(pool: Pool, nodeId: NodeId, key: string): Lson | undefined {
    const row = this.#q.storage.selectKey.get(nodeId, key);
    if (row === undefined) return undefined;

    const [jval, ref] = row;
    if (jval === null) {
      return pool.getNode(ref);
    } else {
      return JSON.parse(jval) as Json;
    }
  }

  #set(
    pool: Pool,
    poolCache: DefaultMap<NodeId, LiveStructure>,
    nodeId: NodeId,
    key: string,
    value: Lson
  ): boolean {
    if (value === undefined) {
      return this.#delete(nodeId, key);
    } else {
      if (isLiveStructure(value)) {
        const ref = value._attach(pool);
        poolCache.set(ref, value);
        this.#q.storage.upsertKeyRef.run(nodeId, key, ref);
        this.#q.versions.upsertKeyRef.run(nodeId, key, this.#pendingClock, ref);
        return true;
      } else {
        const jval = JSON.stringify(value);
        this.#q.storage.upsertKeyValue.run(nodeId, key, jval);
        this.#q.versions.upsertKeyValue.run(
          nodeId,
          key,
          this.#pendingClock,
          jval
        );
        return true;
      }
    }
  }

  #delete(nodeId: NodeId, key: string): boolean {
    const result = this.#q.storage.deleteKey.run(nodeId, key);
    if (result.changes > 0) {
      this.#q.versions.deleteKey.run(nodeId, key, this.#pendingClock);
      return true;
    } else {
      return false;
    }
  }

  // keys(nodeId: NodeId): IterableIterator<string> {
  //   return this.#q.storage.selectKeysByNodeId.iterate(nodeId);
  // }

  *entries(nodeId: NodeId): IterableIterator<[key: string, value: Json]> {
    const rows = this.#q.storage.selectAllByNodeId.iterate(nodeId);
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
    const values: { [nid: string]: { [key: string]: Json } } = {};
    const refs: { [nid: string]: { [key: string]: string } } = {};
    for (const [nid, key, value, ref] of this.rows()) {
      if (ref !== null) {
        (refs[nid] ??= {})[key] = ref;
      } else {
        (values[nid] ??= {})[key] = value;
      }
    }
    return [{}, values, refs];
  }

  /**
   * Computes a Delta since the given clock value.
   */
  deltaSince(since: number): Delta {
    const removed: { [nid: string]: string[] } = {};
    const values: { [nid: string]: { [key: string]: Json } } = {};
    const refs: { [nid: string]: { [key: string]: string } } = {};
    for (const [nid, key, jval, ref] of this.#q.versions.selectSince.iterate(
      since
    )) {
      if (jval === null && ref === null) {
        (removed[nid] ??= []).push(key);
      } else if (ref === null) {
        const value = JSON.parse(jval) as Json;
        (values[nid] ??= {})[key] = value;
      } else {
        (refs[nid] ??= {})[key] = ref;
      }
    }
    return [removed, values, refs];
  }

  mutate(callback: (root: LiveObject) => unknown): Delta {
    const origClock = this.clock;

    let dirty = false;
    const poolCache = new DefaultMap<NodeId, LiveStructure>((nodeId: NodeId) =>
      LiveObject._load(nodeId, pool)
    );
    const pool: Pool = {
      nextId: <P extends string>(prefix: P): `${P}${number}:${number}` =>
        `${prefix}${this.#pendingClock}:${this.#nextNodeId++}`,
      getNode: (nodeId: NodeId) => {
        const x = poolCache.get(nodeId);
        const rv = poolCache.getOrCreate(nodeId);
        console.log({ nodeId, x, rv });
        return rv;
      },
      getChild: (nodeId: NodeId, key: string) => this.#get(pool, nodeId, key),
      setChild: (nodeId: NodeId, key: string, value: Json) => {
        const updated = this.#set(pool, poolCache, nodeId, key, value);
        dirty ||= updated;
        return updated;
      },
      deleteChild: (nodeId: NodeId, key: string) => {
        const deleted = this.#delete(nodeId, key);
        dirty ||= deleted;
        return deleted;
      },
    };

    this.#startTransaction();
    try {
      callback(LiveObject._load("root", pool));
      if (dirty) {
        this.#commit();
        return this.deltaSince(origClock);
      } else {
        this.#rollback();
        return [{}, {}, {}];
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
  *rows(): IterableIterator<
    | [nid: string, key: string, value: Json, ref: null]
    | [nid: string, key: string, value: undefined, ref: string]
  > {
    for (const [nid, key, jval, ref] of this.#q.storage.selectAll.iterate()) {
      if (jval === null) {
        yield [nid, key, undefined, ref];
      } else {
        yield [nid, key, JSON.parse(jval), null];
      }
    }
  }

  /**
   * Returns the number of items in the cache.
   */
  get count(): number {
    return this.#q.storage.countAll.get()!;
  }

  get table(): [
    id: string,
    key: string,
    value: Json | undefined,
    ref: string | null,
  ][] {
    return Array.from(this.rows());
  }
}
