import type { ThreadData } from "@liveblocks/core";

import { selectThreads, UmbrellaStore } from "../umbrella-store";

describe("selectThreads", () => {
  it("should only return resolved threads from a list of threads", () => {
    const now1 = new Date("2024-01-01");
    const now2 = new Date("2024-01-02");
    const thread1: ThreadData = {
      type: "thread" as const,
      id: "th_1",
      createdAt: now1,
      updatedAt: now1,
      roomId: "room_1",
      comments: [],
      metadata: {},
      resolved: false,
    };

    const thread2: ThreadData = {
      type: "thread" as const,
      id: "th_2",
      createdAt: now2,
      updatedAt: now2,
      roomId: "room_1",
      comments: [],
      metadata: {},
      resolved: false,
    };

    const store = new UmbrellaStore();

    store.updateThreadsAndNotifications([thread1, thread2], [], [], []);

    const resolvedThreads = selectThreads(store.getFullState().threadsDB, {
      roomId: "room_1",
      query: { resolved: true },
      orderBy: "age",
    });

    expect(resolvedThreads).toEqual([]);
  });
});
