import type { ThreadData, ThreadDeleteInfo } from "@liveblocks/core";
import { describe, expect, test, vi } from "vitest";

import { ThreadDB } from "../../ThreadDB";
import { dummyThreadData } from "../_dummies";

describe("applyThreadDeltaUpdates", () => {
  const thread1 = dummyThreadData({
    id: "th_1",
    createdAt: new Date("2024-01-01"),
    roomId: "room_1",
  });

  const thread2 = dummyThreadData({
    id: "th_2",
    createdAt: new Date("2024-01-01"),
    roomId: "room_1",
  });

  const thread1DeleteInfo: ThreadDeleteInfo = {
    type: "deletedThread",
    id: thread1.id,
    roomId: thread1.roomId,
    deletedAt: new Date("2024-01-02"),
  };

  const thread2DeleteInfo: ThreadDeleteInfo = {
    type: "deletedThread",
    id: thread2.id,
    roomId: thread2.roomId,
    deletedAt: new Date("2024-01-02"),
  };

  test("should add a new thread if it doesn't exist already", () => {
    const db = new ThreadDB();

    db.applyDelta([thread1], []);

    expect(db.findMany(undefined, {}, "asc")).toEqual([thread1]);
  });

  test("should update an existing thread with a newer one", () => {
    const thread1Updated: ThreadData = {
      ...thread1,
      updatedAt: new Date("2024-01-03"), // A newer date than the original thread1
      metadata: { pinned: true }, // Simulate changes in the thread
    };

    // Initial state with the original thread1
    const db = new ThreadDB();
    db.upsert(thread1);

    // Simulate updates with the newer version of thread1
    db.applyDelta([thread1Updated], []);

    // Expected output should reflect the updated properties of thread1Updated
    expect(db.findMany(undefined, {}, "asc")).toEqual([thread1Updated]);
  });

  test("should mark a thread as deleted if there is deletion info associated with it", () => {
    const db = new ThreadDB();
    db.upsert(thread1);

    db.applyDelta(
      [],
      [thread1DeleteInfo] // Mark thread1 as deleted
    );

    expect(db.findMany(undefined, {}, "asc")).toEqual([]);
    expect(db.getEvenIfDeleted(thread1.id)).toEqual({
      ...thread1,
      deletedAt: thread1DeleteInfo.deletedAt,
      updatedAt: thread1DeleteInfo.deletedAt, // Assuming an updatedAt property for marking deletion time
      comments: [], // Clear comments upon deletion
    });
  });

  test("should ignore deletion of a non-existing thread", () => {
    const db = new ThreadDB();
    db.upsert(thread1); // Only thread1 exists

    expect(db.findMany(undefined, {}, "asc")).toEqual([thread1]);

    db.applyDelta(
      [],
      [thread2DeleteInfo] // Attempt to delete non-existing thread2
    );

    // Output should remain unchanged
    expect(db.findMany(undefined, {}, "asc")).toEqual([thread1]);
  });

  test("should correctly handle a combination of add, update, and delete operations", () => {
    const db = new ThreadDB();
    db.upsert(thread1); // Existing thread

    expect(db.findMany(undefined, {}, "asc")).toEqual([thread1]);

    db.applyDelta(
      [thread2], // Add thread2
      [thread1DeleteInfo] // Delete thread1
    );

    // Thread2 was added, and thread 1 deleted
    expect(db.findMany(undefined, {}, "asc")).toEqual([thread2]);
    expect(db.getEvenIfDeleted(thread1.id)).toEqual({
      ...thread1,
      deletedAt: thread1DeleteInfo.deletedAt,
      updatedAt: thread1DeleteInfo.deletedAt, // Assuming an updatedAt property for marking deletion time
      comments: [], // Clear comments upon deletion
    });
  });

  test("should return existing threads unchanged when no updates are provided", () => {
    const fn = vi.fn();
    const db = new ThreadDB();
    const unsub = db.signal.subscribe(fn);

    db.upsert(thread1);
    db.upsert(thread2);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(db.findMany(undefined, {}, "asc")).toEqual([thread1, thread2]);

    db.applyDelta([], []);

    expect(db.findMany(undefined, {}, "asc")).toEqual([thread1, thread2]);

    // Nothing was updated!
    expect(fn).toHaveBeenCalledTimes(2);

    unsub();
  });
});
