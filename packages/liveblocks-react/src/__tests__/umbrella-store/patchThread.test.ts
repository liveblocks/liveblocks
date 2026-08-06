import { kInternal } from "@liveblocks/core";
import { describe, expect, test } from "vitest";

import { UmbrellaStore } from "../../umbrella-store";
import { createComment, createThread } from "./_dummies";

function makeSyncSource() {
  return {
    setSyncStatus: () => {},
    destroy: () => {},
  };
}

const NO_CLIENT = {
  [kInternal]: {
    as() {
      return NO_CLIENT;
    },
    createSyncSource: makeSyncSource,
  },
} as any;

describe("patchThread", () => {
  test("a settled resolve survives a concurrent stale server refetch", () => {
    const store = new UmbrellaStore(NO_CLIENT);

    const thread = createThread({
      id: "th_1",
      roomId: "room_1",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
      resolved: false,
      comments: [
        createComment({
          threadId: "th_1",
          roomId: "room_1",
          createdAt: new Date("2024-01-01T00:00:00Z"),
        }),
      ],
    });
    store.updateThreadifications([thread], [], []);

    // User resolves the thread; the REST call succeeds and the optimistic
    // update is replaced by the real thing
    const resolvedAt = new Date("2024-01-01T00:01:00Z");
    const optimisticId = store.optimisticUpdates.add({
      type: "mark-thread-as-resolved",
      threadId: thread.id,
      updatedAt: resolvedAt,
    });
    store.patchThread(thread.id, optimisticId, { resolved: true }, resolvedAt);

    expect(store.outputs.threads.get().get(thread.id)?.resolved).toBe(true);

    // A THREAD_UPDATED (408) triggered refetch can still return a stale
    // snapshot of the thread from before the resolve. It must not clobber
    // the newer resolved state
    store.updateThreadifications([thread], [], []);

    expect(store.outputs.threads.get().get(thread.id)?.resolved).toBe(true);
  });

  test("a settled unresolve survives a concurrent stale server refetch", () => {
    const store = new UmbrellaStore(NO_CLIENT);

    const thread = createThread({
      id: "th_1",
      roomId: "room_1",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
      resolved: true,
      comments: [
        createComment({
          threadId: "th_1",
          roomId: "room_1",
          createdAt: new Date("2024-01-01T00:00:00Z"),
        }),
      ],
    });
    store.updateThreadifications([thread], [], []);

    const unresolvedAt = new Date("2024-01-01T00:01:00Z");
    const optimisticId = store.optimisticUpdates.add({
      type: "mark-thread-as-unresolved",
      threadId: thread.id,
      updatedAt: unresolvedAt,
    });
    store.patchThread(
      thread.id,
      optimisticId,
      { resolved: false },
      unresolvedAt
    );

    store.updateThreadifications([thread], [], []);

    expect(store.outputs.threads.get().get(thread.id)?.resolved).toBe(false);
  });
});
