import type { Database } from "better-sqlite3";
import sqlite3 from "better-sqlite3";

import type { Json } from "~/lib/Json.js";

import { LiveObject } from "./LiveObject.js";
import type { Delta, NodeId, Pool } from "./types.js";

function createDB() {
  const db = sqlite3(":memory:");
  db.pragma("journal_mode = WAL");

  db.exec(
    `CREATE TABLE IF NOT EXISTS storage (
       nid    TEXT NOT NULL,
       key    TEXT NOT NULL,
       jval   TEXT NOT NULL,
       PRIMARY KEY (nid, key)
     )`
  );

  db.exec(
    `CREATE TABLE IF NOT EXISTS versions (
       nid    TEXT NOT NULL,
       key    TEXT NOT NULL,
       clock  INT UNSIGNED NOT NULL,
       jval   TEXT,
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
        string
      >("SELECT jval FROM storage WHERE nid = ? AND key = ?")
      .pluck(),

    selectKeysByNodeId: db
      .prepare<[nid: string], string>("SELECT key FROM storage WHERE nid = ?")
      .pluck(),

    selectAllByNodeId: db
      .prepare<
        [nid: string],
        [key: string, jval: string]
      >("SELECT key, jval FROM storage WHERE nid = ?")
      .raw(),

    selectAll: db
      .prepare<
        [],
        [nid: string, key: string, jval: string]
      >("SELECT nid, key, jval FROM storage")
      .raw(),

    upsertKeyValue: db.prepare<[nid: string, key: string, jval: string], void>(
      `INSERT INTO storage (nid, key, jval)
       VALUES (?, ?, ?)
       ON CONFLICT (nid, key) DO UPDATE SET jval = excluded.jval`
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
      `INSERT INTO versions (nid, key, clock, jval)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (nid, key, clock) DO UPDATE SET jval = excluded.jval`
    ),

    deleteKey: db.prepare<[nid: string, key: string, clock: number], void>(
      `INSERT INTO versions (nid, key, clock, jval)
       VALUES (?, ?, ?, NULL)
       ON CONFLICT (nid, key, clock) DO UPDATE SET jval = excluded.jval`
    ),

    selectAll: db
      .prepare<
        [],
        [nid: string, key: string, clock: number, jval: string]
      >("SELECT nid, key, clock, jval FROM versions")
      .raw(),

    selectSince: db
      .prepare<
        [clock: number],
        [nid: string, key: string, jval: string | null]
      >(
        `WITH winners AS (
           SELECT
             nid,
             key,
             jval,
             RANK() OVER (PARTITION BY nid, key ORDER BY clock DESC) as rnk
           FROM versions
           WHERE clock > ?
         )

         SELECT nid, key, jval FROM winners WHERE rnk = 1`
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

  #get(nodeId: NodeId, key: string): Json | undefined {
    const jval = this.#q.storage.selectKey.get(nodeId, key);
    return jval !== undefined ? (JSON.parse(jval) as Json) : undefined;
  }

  #set(nodeId: NodeId, key: string, value: Json): boolean {
    if (value === undefined) {
      return this.#delete(nodeId, key);
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
    const updated: { [nid: string]: { [key: string]: Json } } = {};
    for (const [nid, key, value] of this.rows()) {
      (updated[nid] ??= {})[key] = value;
    }
    return [{}, updated];
  }

  /**
   * Computes a Delta since the given clock value.
   */
  deltaSince(since: number): Delta {
    const removed: { [nid: string]: string[] } = {};
    const updated: { [nid: string]: { [key: string]: Json } } = {};
    for (const [nid, key, jval] of this.#q.versions.selectSince.iterate(
      since
    )) {
      if (jval === null) {
        (removed[nid] ??= []).push(key);
      } else {
        (updated[nid] ??= {})[key] = JSON.parse(jval) as Json;
      }
    }
    return [removed, updated];
  }

  mutate(callback: (root: LiveObject) => unknown): Delta {
    const origClock = this.clock;

    let dirty = false;
    const pool: Pool = {
      nextId: <P extends string>(prefix: P): `${P}${number}:${number}` =>
        `${prefix}${this.#pendingClock}:${this.#nextNodeId++}`,
      getRoot: (): LiveObject => LiveObject._load("root", pool),
      getChild: (nodeId: NodeId, key: string) => this.#get(nodeId, key),
      setChild: (nodeId: NodeId, key: string, value: Json) => {
        const updated = this.#set(nodeId, key, value);
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
      callback(pool.getRoot());
      if (dirty) {
        this.#commit();
        return this.deltaSince(origClock);
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
  *rows(): IterableIterator<[nid: string, key: string, value: Json]> {
    for (const [nid, key, jval] of this.#q.storage.selectAll.iterate()) {
      yield [nid, key, JSON.parse(jval)];
    }
  }

  /**
   * Returns the number of items in the cache.
   */
  get count(): number {
    return this.#q.storage.countAll.get()!;
  }

  get data(): Record<string, Record<string, Json>> {
    return this.fullDelta()[1];
  }
}
