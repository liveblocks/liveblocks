import sqlite from "better-sqlite3";
import { expect, test } from "vitest";

import type { Json } from "~/lib/Json.js";

test("sqlite tests", () => {
  const db = sqlite(":memory:");
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
     txn    INT UNSIGNED NOT NULL,
     jval   TEXT,
     PRIMARY KEY (nid, key, txn DESC)
   )`
  );

  const putdata = db.prepare(
    `INSERT INTO storage (nid, key, jval)
     VALUES (?, ?, ?)
     ON CONFLICT (nid, key) DO UPDATE SET jval = excluded.jval`
  );

  const putversion = db.prepare(
    `INSERT INTO versions (nid, key, txn, jval)
        VALUES (?, ?, ?, ?)`
  );

  const deldata = db.prepare("DELETE FROM storage WHERE nid = ? AND key = ?");
  const delversion = db.prepare(
    "INSERT INTO versions (nid, key, txn) VALUES (?, ?, ?)"
  );

  const deller = db.transaction((txn: number, key: string) => {
    if (deldata.run("root", key).changes > 0) {
      delversion.run("root", key, txn);
    }
  });

  const putter = db.transaction((txn: number, key: string, value: Json) => {
    putdata.run("root", key, value);
    // if (txn === 3) throw new Error("crap");
    putversion.run("root", key, txn, value);
  });

  let clock = 0;
  function put(key: string, value: Json) {
    ++clock;
    try {
      putter(clock, key, JSON.stringify(value));
    } catch (e) {
      clock--;
      // throw e;
    }
  }

  function del(key: string) {
    ++clock;
    try {
      deller(clock, key);
    } catch (e) {
      clock--;
      // throw e;
    }
  }

  put("a", 1); // 1
  del("b"); // 2
  put("b", 9999); // 3
  put("b", 3); // 4
  put("c", 3); // 5
  put("d", 4); // 6
  put("e", 5); // 7
  //
  // del("d");
  // del("a");
  //
  // put("a", 13);
  // del("b");

  // expect(db.prepare("select nid, key, jval from storage").raw().all()).toEqual([
  //   ["root", "x", "5"],
  //   ["root", "b", "null"],
  // ]);

  console.table(db.prepare("select * from storage").all());
  // expect(
  //   db.prepare("select nid, key, txn, jval from versions").raw().all()
  // ).toEqual([
  //   ["root", "a", 1, "[123]"],
  //   ["root", "x", 2, "5"],
  //   ["root", "b", 3, "123"],
  //   ["root", "b", 4, "null"],
  //   ["root", "d", 5, null],
  //   ["root", "a", 6, null],
  // ]);

  const deltaSince = db.prepare(
    `
      WITH winners AS (
        SELECT
          nid,
          key,
          txn,
          jval,
          RANK() OVER (PARTITION BY nid, key ORDER BY txn DESC) as rnk
        FROM versions
        WHERE txn > ?
       )

       SELECT nid, key, jval FROM winners WHERE rnk = 1
      `
  );

  console.table(deltaSince.raw().all(5));
});
