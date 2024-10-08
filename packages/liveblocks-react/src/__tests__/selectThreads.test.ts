import type { ThreadData } from "@liveblocks/core";

import { selectThreads, UmbrellaStore } from "../umbrella-store";

describe("selectThreads", () => {
  it("should only return resolved threads from a list of threads", () => {
    const thread1: ThreadData = {
      type: "thread" as const,
      id: "th_1",
      createdAt: new Date("2024-01-01"),
      roomId: "room_1",
      comments: [],
      metadata: {},
      resolved: false,
    };

    const thread2: ThreadData = {
      type: "thread" as const,
      id: "th_2",
      createdAt: new Date("2024-01-02"),
      roomId: "room_1",
      comments: [],
      metadata: {},
      resolved: false,
    };

    const store = new UmbrellaStore();

    store.updateThreadsAndNotifications([thread1, thread2], [], [], []);

    const resolvedThreads = selectThreads(store.getFullState(), {
      roomId: "room_1",
      query: { resolved: true },
      orderBy: "age",
    });

    expect(resolvedThreads).toEqual([]);
  });
});
