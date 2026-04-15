import { describe, expect, test, vi } from "vitest";

import { ThreadDB } from "../ThreadDB";
import { dummyThreadData } from "./_dummies";

describe("ThreadDB", () => {
  test("empty db", () => {
    const db = new ThreadDB();
    expect(db.get("th_nonexisting")).toEqual(undefined);
    expect(db.getEvenIfDeleted("th_nonexisting")).toEqual(undefined);
  });

  test("automatically keeps threads sorted", () => {
    const db = new ThreadDB();

    const th1 = dummyThreadData({
      id: "th_abc",
      roomId: "room1",
      createdAt: new Date("2024-10-08"),
    });
    const th2 = dummyThreadData({
      id: "th_def",
      roomId: "room2",
      createdAt: new Date("2024-10-09"),
    });
    const th3 = dummyThreadData({
      id: "th_klm",
      roomId: "room1",
      createdAt: new Date("2024-10-10"),
    });
    const th4 = dummyThreadData({
      id: "th_pqr",
      roomId: "room3",
      createdAt: new Date("2024-10-11"),
      deletedAt: new Date(),
    });
    const th5 = dummyThreadData({
      id: "th_xyz",
      roomId: "room3",
      createdAt: new Date("2024-10-11"),
      comments: [], // Empty comments array will also count as deleted
    });

    db.upsert(th1);
    db.upsert(th2);
    db.upsert(th3);
    db.upsert(th4);
    db.upsert(th5);

    expect(db.get("th_abc")!.id).toEqual("th_abc");
    expect(db.get("th_def")!.id).toEqual("th_def");
    expect(db.get("th_klm")!.id).toEqual("th_klm");
    expect(db.get("th_pqr")).toEqual(undefined);
    expect(db.getEvenIfDeleted("th_pqr")!.id).toEqual("th_pqr");
    expect(db.get("th_nonexisting")).toEqual(undefined);

    expect(db.findMany("room0", {}, "asc")).toEqual([]);
    expect(db.findMany("room1", {}, "asc")).toEqual([th1, th3]);
    expect(db.findMany("room1", {}, "desc")).toEqual([th3, th1]);
    expect(db.findMany("room2", {}, "asc")).toEqual([th2]);
    expect(db.findMany("room3", {}, "asc")).toEqual([
      /* th4 is explicitly deleted */
      /* th5 is also (implicitly) deleted */
    ]);
  });

  test("deleting threads", () => {
    const db = new ThreadDB();

    const th1 = dummyThreadData({
      id: "th_abc",
      roomId: "room1",
      createdAt: new Date("2024-09-08"),
    });
    const th2 = dummyThreadData({
      id: "th_klm",
      roomId: "room1",
      createdAt: new Date("2024-09-10"),
    });

    db.upsert(th1);
    db.upsert(th2);

    expect(db.findMany("room1", {}, "asc")).toEqual([th1, th2]);
    expect(db.findMany("room1", {}, "desc")).toEqual([th2, th1]);

    db.delete("th_abc", new Date("2024-10-01"));
    expect(db.get("th_abc")).toEqual(undefined);
    expect(db.getEvenIfDeleted("th_abc")).toEqual({
      ...th1,
      deletedAt: new Date("2024-10-01"),
      updatedAt: new Date("2024-10-01"), // Updated at field will also change when deleting
      comments: [],
    });

    expect(db.findMany("room1", {}, "asc")).toEqual([th2]);
    expect(db.findMany("room1", {}, "desc")).toEqual([th2]);

    db.delete("th_nonexisting", new Date());

    expect(db.findMany("room1", {}, "asc")).toEqual([th2]);
    expect(db.findMany("room1", {}, "desc")).toEqual([th2]);

    // Deleting th1 again has no effect
    db.delete("th_abc", new Date());
    expect(db.getEvenIfDeleted("th_abc")).toEqual({
      ...th1,
      deletedAt: new Date("2024-10-01"), // Note that the deletedAt field did not get updated
      updatedAt: new Date("2024-10-01"), // Updated at field will also change when deleting
      comments: [],
    });

    db.delete("th_klm", new Date());

    expect(db.findMany("room1", {}, "asc")).toEqual([]);

    expect(db.findMany("room1", {}, "desc")).toEqual([]);
  });

  test("upsert if newer", () => {
    const fn = vi.fn();
    const db = new ThreadDB();
    const unsub = db.signal.subscribe(fn);

    const v1 = dummyThreadData({
      id: "th_abc",
      roomId: "room1",
      createdAt: new Date("2024-09-08"),
    });
    const v2 = { ...v1, updatedAt: new Date("2024-09-09") };
    const v3 = { ...v2, updatedAt: new Date("2024-09-10") };

    db.upsertIfNewer(v1);
    expect(db.findMany("room1", {}, "asc")).toEqual([v1]);

    db.upsertIfNewer(v3); // First update to the later version (v3)
    expect(db.findMany("room1", {}, "asc")).toEqual([v3]);

    expect(fn).toHaveBeenCalledTimes(2);

    // Now that v3 is the latest, updating to v1 or v2 should no longer work
    db.upsertIfNewer(v1);
    db.upsertIfNewer(v2);

    expect(fn).toHaveBeenCalledTimes(2); // Did not update!

    expect(db.findMany("room1", {}, "asc")).toEqual([v3]);

    unsub();
  });

  test("upsert should never overwrite already-deleted threads", () => {
    const fn = vi.fn();
    const db = new ThreadDB();
    const unsub = db.signal.subscribe(fn);

    const v1 = dummyThreadData({
      id: "th_abc",
      roomId: "room1",
      createdAt: new Date("2024-10-01"),
    });

    db.upsert(v1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(db.findMany("room1", {}, "asc")).toEqual([v1]);

    // Now v1 is already deleted, these should no longer mutate the DB
    const v2 = { ...v1, deletedAt: new Date() };
    db.upsert(v2);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(db.findMany("room1", {}, "asc")).toEqual([]);

    // Now try to "put back" the old version - it should not work
    db.upsert(v1);

    // Did not do anything
    expect(fn).toHaveBeenCalledTimes(2);
    expect(db.findMany("room1", {}, "asc")).toEqual([]);

    unsub();
  });

  test("upsert if newer should never update deleted threads", () => {
    const fn = vi.fn();
    const db = new ThreadDB();
    const unsub = db.signal.subscribe(fn);

    const v1 = dummyThreadData({
      id: "th_abc",
      roomId: "room1",
      createdAt: new Date("2024-09-08"),
    });
    const v2 = { ...v1, updatedAt: new Date("2024-09-09") };
    const v3 = { ...v2, updatedAt: new Date("2024-09-10") };

    db.upsertIfNewer({ ...v1, deletedAt: new Date() });
    expect(db.findMany("room1", {}, "asc")).toEqual([]);

    expect(fn).toHaveBeenCalledTimes(1);

    // Now that v1 is already deleted, these should no longer mutate the DB
    db.upsertIfNewer(v2);
    db.upsertIfNewer(v3);

    // Did not do anything
    expect(db.findMany("room1", {}, "asc")).toEqual([]);
    expect(fn).toHaveBeenCalledTimes(1);

    unsub();
  });

  test("cloning the db", () => {
    const db1 = new ThreadDB();

    const th1 = dummyThreadData({
      id: "th_abc",
      roomId: "room1",
      createdAt: new Date("2024-10-08"),
    });
    const th2 = dummyThreadData({
      id: "th_def",
      roomId: "room1",
      createdAt: new Date("2024-10-09"),
    });
    const th3 = dummyThreadData({
      id: "th_klm",
      roomId: "room1",
      createdAt: new Date("2024-10-10"),
    });
    const th4 = dummyThreadData({
      id: "th_pqr",
      roomId: "room1",
      createdAt: new Date("2024-10-11"),
    });
    const th5 = dummyThreadData({
      id: "th_xyz",
      roomId: "room1",
      createdAt: new Date("2024-10-12"),
    });

    db1.upsert(th1);
    db1.upsert(th2);
    db1.upsert(th3);

    expect(db1.findMany("room1", {}, "asc")).toEqual([th1, th2, th3]);
    expect(db1.findMany("room1", {}, "desc")).toEqual([th3, th2, th1]);

    const db2 = db1.clone();
    db2.delete("th_def", new Date());
    db2.delete("th_abc", new Date());

    expect(db1.findMany("room1", {}, "asc")).toEqual([th1, th2, th3]);
    expect(db1.findMany("room1", {}, "desc")).toEqual([th3, th2, th1]);

    expect(db2.findMany("room1", {}, "asc")).toEqual([th3]);
    expect(db2.findMany("room1", {}, "desc")).toEqual([th3]);

    db2.upsert(th4);
    db2.upsert(th5);

    expect(db1.findMany("room1", {}, "asc")).toEqual([th1, th2, th3]);
    expect(db1.findMany("room1", {}, "desc")).toEqual([th3, th2, th1]);

    expect(db2.findMany("room1", {}, "asc")).toEqual([th3, th4, th5]);
    expect(db2.findMany("room1", {}, "desc")).toEqual([th5, th4, th3]);
  });

  test("query filtering", () => {
    const db = new ThreadDB();

    const th1 = dummyThreadData({
      id: "th_111",
      roomId: "room2",
      createdAt: new Date("2024-10-08"),
      resolved: true,
      metadata: { color: "red", tag: "odd" },
    });
    const th2 = dummyThreadData({
      id: "th_222",
      roomId: "room1",
      createdAt: new Date("2024-10-09"),
      resolved: false,
      metadata: { color: "red", tag: "even" },
    });
    const th3 = dummyThreadData({
      id: "th_333",
      roomId: "room2",
      createdAt: new Date("2024-10-10"),
      resolved: true,
      metadata: { color: "blue", tag: "odd" },
    });
    const th4 = dummyThreadData({
      id: "th_444",
      roomId: "room2",
      createdAt: new Date("2024-10-11"),
      deletedAt: new Date(), // 👈 This one is deleted! ❌
      resolved: false,
      metadata: { color: "red", tag: "even" },
    });
    const th5 = dummyThreadData({
      id: "th_555",
      roomId: "room1",
      createdAt: new Date("2024-10-12"),
      resolved: true,
      metadata: { color: "brown", tag: "odd" },
    });

    db.upsert(th1);
    db.upsert(th2);
    db.upsert(th3);
    db.upsert(th4);
    db.upsert(th5);

    expect(db.findMany("room1", {}, "asc")).toEqual([th2, th5]);
    expect(db.findMany("room1", {}, "desc")).toEqual([th5, th2]);
    expect(db.findMany("room2", {}, "asc")).toEqual([th1, th3]);
    expect(db.findMany("room2", {}, "desc")).toEqual([th3, th1]);
    expect(db.findMany(undefined, {}, "asc")).toEqual([th1, th2, th3, th5]);
    expect(db.findMany(undefined, {}, "desc")).toEqual([th5, th3, th2, th1]);

    // Mismatching metadata returns nothing
    expect(db.findMany("room1", { metadata: { a: 1 } }, "asc")).toEqual([]);
    expect(db.findMany("room2", { metadata: { a: 1 } }, "asc")).toEqual([]);
    expect(db.findMany(undefined, { metadata: { a: 1 } }, "asc")).toEqual([]);

    // Unresolved checks
    expect(db.findMany("room1", { resolved: false }, "asc")).toEqual([th2]);
    expect(db.findMany("room2", { resolved: false }, "asc")).toEqual([]);
    expect(db.findMany(undefined, { resolved: false }, "asc")).toEqual([th2]);

    // Resolved checks
    expect(db.findMany("room1", { resolved: true }, "asc")).toEqual([th5]);
    expect(db.findMany("room2", { resolved: true }, "asc")).toEqual([th1, th3]);
    expect(db.findMany(undefined, { resolved: true }, "asc")).toEqual([
      th1,
      th3,
      th5,
    ]);

    // Metadata checks
    {
      const query = { metadata: { color: "red" } };
      expect(db.findMany("room1", query, "asc")).toEqual([th2]);
      expect(db.findMany("room2", query, "asc")).toEqual([th1]);
      expect(db.findMany(undefined, query, "asc")).toEqual([th1, th2]);
    }

    // Metadata checks
    {
      const query = { metadata: { color: "blue" } };
      expect(db.findMany("room1", query, "asc")).toEqual([]);
      expect(db.findMany("room2", query, "asc")).toEqual([th3]);
      expect(db.findMany(undefined, query, "asc")).toEqual([th3]);
    }

    {
      const query = { metadata: { tag: "odd" } };
      expect(db.findMany("room1", query, "asc")).toEqual([th5]);
      expect(db.findMany("room2", query, "asc")).toEqual([th1, th3]);
      expect(db.findMany(undefined, query, "asc")).toEqual([th1, th3, th5]);
    }

    // Startswith filtering
    {
      const query = { metadata: { color: { startsWith: "b" } } };
      expect(db.findMany("room1", query, "asc")).toEqual([th5]);
      expect(db.findMany("room2", query, "asc")).toEqual([th3]);
      expect(db.findMany(undefined, query, "asc")).toEqual([th3, th5]);
    }

    // Combining metadata criteria
    {
      const query = { resolved: true, metadata: { color: "red" } };
      expect(db.findMany("room1", query, "asc")).toEqual([]);
      expect(db.findMany("room2", query, "asc")).toEqual([th1]);
      expect(db.findMany(undefined, query, "asc")).toEqual([th1]);
    }

    // Combining metadata criteria
    {
      const query = { resolved: false, metadata: { color: "red" } };
      expect(db.findMany("room1", query, "asc")).toEqual([th2]);
      expect(db.findMany("room2", query, "asc")).toEqual([]);
      expect(db.findMany(undefined, query, "asc")).toEqual([th2]);
    }

    // Combining metadata criteria
    {
      const query = { metadata: { color: "red", tag: "odd" } };
      expect(db.findMany("room1", query, "asc")).toEqual([]);
      expect(db.findMany("room2", query, "asc")).toEqual([th1]);
      expect(db.findMany(undefined, query, "asc")).toEqual([th1]);
    }
  });
});
