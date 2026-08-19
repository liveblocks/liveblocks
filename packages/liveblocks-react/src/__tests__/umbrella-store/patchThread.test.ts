import { createClient } from "@liveblocks/client";
import { describe, expect, test } from "vitest";

import { UmbrellaStore } from "../../umbrella-store";
import { createComment, createThread } from "./_dummies";

describe("patchThread", () => {
  test("should keep a settled resolve after a stale refetch", () => {
    const store = createStore();
    const thread = makeThread(false);
    store.updateThreadifications([thread], [], []);

    const settledAt = new Date("2024-01-01T00:01:00Z");
    const optimisticId = store.optimisticUpdates.add({
      type: "mark-thread-as-resolved",
      threadId: thread.id,
      updatedAt: settledAt,
    });
    store.patchThread(thread.id, optimisticId, { resolved: true }, settledAt);

    expect(store.outputs.threads.get().get(thread.id)).toMatchObject({
      resolved: true,
      updatedAt: settledAt,
    });

    // A refetch started before the mutation settled can return an older snapshot.
    store.updateThreadifications([thread], [], []);

    expect(store.outputs.threads.get().get(thread.id)).toMatchObject({
      resolved: true,
      updatedAt: settledAt,
    });
  });

  test("should keep a settled unresolve after a stale refetch", () => {
    const store = createStore();
    const thread = makeThread(true);
    store.updateThreadifications([thread], [], []);

    const settledAt = new Date("2024-01-01T00:01:00Z");
    const optimisticId = store.optimisticUpdates.add({
      type: "mark-thread-as-unresolved",
      threadId: thread.id,
      updatedAt: settledAt,
    });
    store.patchThread(thread.id, optimisticId, { resolved: false }, settledAt);

    store.updateThreadifications([thread], [], []);

    expect(store.outputs.threads.get().get(thread.id)).toMatchObject({
      resolved: false,
      updatedAt: settledAt,
    });
  });
});

function createStore() {
  return new UmbrellaStore(
    createClient({
      publicApiKey: "pk_xxx",
    })
  );
}

function makeThread(resolved: boolean) {
  const createdAt = new Date("2024-01-01T00:00:00Z");
  return createThread({
    id: "th_1",
    roomId: "room_1",
    createdAt,
    updatedAt: createdAt,
    resolved,
    comments: [
      createComment({
        threadId: "th_1",
        roomId: "room_1",
        createdAt,
      }),
    ],
  });
}
