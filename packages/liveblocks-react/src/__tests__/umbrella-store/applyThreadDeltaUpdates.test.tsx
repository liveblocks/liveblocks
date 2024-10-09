import type { ThreadData, ThreadDeleteInfo } from "@liveblocks/core";

import { ThreadDB } from "../../ThreadDB";
import { applyThreadDeltaUpdates } from "../../umbrella-store";
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

  it("should add a new thread if it doesn't exist already", () => {
    const db = new ThreadDB();

    applyThreadDeltaUpdates(db, {
      newThreads: [thread1],
      deletedThreads: [],
    });

    // @ts-expect-error Accessing internal field
    expect(db._toRecord()).toEqual({
      [thread1.id]: thread1,
    });
  });

  it("should update an existing thread with a newer one", () => {
    const thread1Updated: ThreadData = {
      ...thread1,
      updatedAt: new Date("2024-01-03"), // A newer date than the original thread1
      metadata: { pinned: true }, // Simulate changes in the thread
    };

    // Initial state with the original thread1
    const db = new ThreadDB();
    db.upsert(thread1);

    // Simulate updates with the newer version of thread1
    const updates = {
      newThreads: [thread1Updated],
      deletedThreads: [],
    };

    // Expected output should reflect the updated properties of thread1Updated
    const expectedOutput = {
      [thread1.id]: thread1Updated,
    };

    applyThreadDeltaUpdates(db, updates);
    // @ts-expect-error Accessing internal field
    expect(db._toRecord()).toEqual(expectedOutput);
  });

  it("should mark a thread as deleted if there is deletion info associated with it", () => {
    const db = new ThreadDB();
    db.upsert(thread1);

    const updates = {
      newThreads: [],
      deletedThreads: [thread1DeleteInfo], // Mark thread1 as deleted
    };

    const expectedOutput = {
      [thread1.id]: {
        ...thread1,
        deletedAt: thread1DeleteInfo.deletedAt,
        updatedAt: thread1DeleteInfo.deletedAt, // Assuming an updatedAt property for marking deletion time
        comments: [], // Clear comments upon deletion
      },
    };

    applyThreadDeltaUpdates(db, updates);
    // @ts-expect-error Accessing internal field
    expect(db._toRecord()).toEqual(expectedOutput);
  });

  it("should ignore deletion of a non-existing thread", () => {
    const db = new ThreadDB();
    db.upsert(thread1); // Only thread1 exists

    const updates = {
      newThreads: [],
      deletedThreads: [thread2DeleteInfo], // Attempt to delete non-existing thread2
    };

    const expectedOutput = {
      [thread1.id]: thread1, // Output should remain unchanged
    };

    applyThreadDeltaUpdates(db, updates);
    // @ts-expect-error Accessing internal field
    expect(db._toRecord()).toEqual(expectedOutput);
  });

  it("should correctly handle a combination of add, update, and delete operations", () => {
    const db = new ThreadDB();
    db.upsert(thread1); // Existing thread

    const updates = {
      newThreads: [thread2], // Add thread2
      deletedThreads: [thread1DeleteInfo], // Delete thread1
    };

    const expectedOutput = {
      [thread1.id]: {
        ...thread1,
        deletedAt: thread1DeleteInfo.deletedAt,
        updatedAt: thread1DeleteInfo.deletedAt, // Assuming an updatedAt property for marking deletion time
        comments: [], // Clear comments upon deletion
      },
      [thread2.id]: thread2, // thread2 added
    };

    applyThreadDeltaUpdates(db, updates);
    // @ts-expect-error Accessing internal field
    expect(db._toRecord()).toEqual(expectedOutput);
  });

  it("should return existing threads unchanged when no updates are provided", () => {
    const db = new ThreadDB();
    db.upsert(thread1);
    db.upsert(thread2);

    const updates = {
      newThreads: [],
      deletedThreads: [],
    };

    const expectedOutput = {
      [thread1.id]: thread1,
      [thread2.id]: thread2,
    };

    applyThreadDeltaUpdates(db, updates);
    // @ts-expect-error Accessing internal field
    expect(db._toRecord()).toEqual(expectedOutput);
  });
});
