import type {
  ThreadData,
  ThreadDataWithDeleteInfo,
  ThreadDeleteInfo,
} from "../protocol/Comments";
import { applyThreadUpdates } from "../store";

describe("applyThreadUpdates", () => {
  const thread1: ThreadDataWithDeleteInfo = {
    type: "thread" as const,
    id: "th_1",
    createdAt: new Date("2024-01-01"),
    roomId: "room_1",
    comments: [],
    metadata: {},
    resolved: false,
  };

  const thread2: ThreadDataWithDeleteInfo = {
    type: "thread" as const,
    id: "th_2",
    createdAt: new Date("2024-01-01"),
    roomId: "room_1",
    comments: [],
    metadata: {},
    resolved: false,
  };

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
    const result = applyThreadUpdates(
      {},
      {
        newThreads: [thread1],
        deletedThreads: [],
      }
    );

    expect(result).toEqual({
      [thread1.id]: thread1,
    });
  });

  it("should update an existing thread with a newer one", () => {
    const thread1Updated: ThreadData = {
      ...thread1,
      updatedAt: new Date("2024-01-03"), // A newer date than the original thread1
      metadata: { resolved: true }, // Simulate changes in the thread
    };

    // Initial state with the original thread1
    const existingThreads = {
      [thread1.id]: thread1,
    };

    // Simulate updates with the newer version of thread1
    const updates = {
      newThreads: [thread1Updated],
      deletedThreads: [],
    };

    // Expected output should reflect the updated properties of thread1Updated
    const expectedOutput = {
      [thread1.id]: thread1Updated,
    };

    const result = applyThreadUpdates(existingThreads, updates);
    expect(result).toEqual(expectedOutput);
  });

  it("should mark a thread as deleted if there is deletion info associated with it", () => {
    const existingThreads = {
      [thread1.id]: thread1,
    };

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

    const result = applyThreadUpdates(existingThreads, updates);
    expect(result).toEqual(expectedOutput);
  });

  it("should ignore deletion of a non-existing thread", () => {
    const existingThreads = {
      [thread1.id]: thread1, // Only thread1 exists
    };

    const updates = {
      newThreads: [],
      deletedThreads: [thread2DeleteInfo], // Attempt to delete non-existing thread2
    };

    const expectedOutput = {
      [thread1.id]: thread1, // Output should remain unchanged
    };

    const result = applyThreadUpdates(existingThreads, updates);
    expect(result).toEqual(expectedOutput);
  });

  it("should correctly handle a combination of add, update, and delete operations", () => {
    const existingThreads = {
      [thread1.id]: thread1, // Existing thread
    };
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

    const result = applyThreadUpdates(existingThreads, updates);
    expect(result).toEqual(expectedOutput);
  });

  it("should return existing threads unchanged when no updates are provided", () => {
    const existingThreads = {
      [thread1.id]: thread1,
      [thread2.id]: thread2,
    };

    const updates = {
      newThreads: [],
      deletedThreads: [],
    };

    const expectedOutput = {
      [thread1.id]: thread1,
      [thread2.id]: thread2,
    };

    const result = applyThreadUpdates(existingThreads, updates);
    expect(result).toEqual(expectedOutput);
  });
});
