import type { Database } from "better-sqlite3";
import sqlite3 from "better-sqlite3";

import type { Json } from "~/lib/Json.js";

import type { Delta, NodeId, Transaction } from "./types.js";

// const ROOT = "root" as NodeId;

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

    selectAllKeys: db
      .prepare<[], [nid: string, key: string]>("SELECT nid, key FROM storage")
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

  constructor() {
    this.#q = createQueries(createDB());
    this.#clock = 0; // TBD Derive this value from the DB data
    this.#pendingClock = this.#clock;
  }

  get clock(): number {
    return this.#pendingClock;
  }

  // ----------------------------------------------------
  // "Convenience" accessors to make implementing mutations easier
  // ----------------------------------------------------

  getNumber(nodeId: NodeId, key: string): number | undefined {
    const value = this.get(nodeId, key);
    return typeof value === "number" ? value : undefined;
  }

  // ----------------------------------------------------
  // "Multi-layer" cache idea
  // ----------------------------------------------------

  /**
   * Returns the number of items in the cache.
   */
  count(): number {
    return this.#q.storage.countAll.get()!;
  }

  has(nodeId: NodeId, key: string): boolean {
    return !!this.#q.storage.exists.get(nodeId, key);
  }

  get(nodeId: NodeId, key: string): Json | undefined {
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

  keys(): IterableIterator<[nodeId: NodeId, key: string]> {
    return this.#q.storage.selectAllKeys.iterate();
  }

  *entries(): IterableIterator<[nodeId: NodeId, key: string, value: Json]> {
    const rows = this.#q.storage.selectAll.iterate();
    for (const [nid, key, jval] of rows) {
      yield [nid, key, JSON.parse(jval)];
    }
  }

  [Symbol.iterator](): IterableIterator<
    [nodeId: NodeId, key: string, value: Json]
  > {
    return this.entries();
  }

  // ----------------------------------------------------
  // Transaction API
  // ----------------------------------------------------

  /**
   * Computes a Delta since the given clock value.
   */
  fullDelta(): Delta {
    const updated: { [nid: string]: { [key: string]: Json } } = {};
    for (const [nid, key, jval] of this.#q.storage.selectAll.iterate()) {
      (updated[nid] ??= {})[key] = JSON.parse(jval) as Json;
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

  mutate(callback: (tx: Transaction) => unknown): Delta {
    const origClock = this.clock;

    let dirty = false;
    const tx: Transaction = {
      has: (nodeId: NodeId, key: string) => this.has(nodeId, key),
      get: (nodeId: NodeId, key: string) => this.get(nodeId, key),
      getNumber: (nodeId: NodeId, key: string) => this.getNumber(nodeId, key),
      keys: () => this.keys(),
      set: (nodeId: NodeId, key: string, value: Json) => {
        const updated = this.#set(nodeId, key, value);
        dirty ||= updated;
        return updated;
      },
      delete: (nodeId: NodeId, key: string) => {
        const deleted = this.#delete(nodeId, key);
        dirty ||= deleted;
        return deleted;
      },
    };

    this.#startTransaction();
    try {
      callback(tx);
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
  get data(): Record<string, Record<string, Json>> {
    const obj: Record<string, Record<string, Json>> = {};
    for (const [nid, key, value] of this) {
      (obj[nid] ??= {})[key] = value;
    }
    return obj;
  }
}
