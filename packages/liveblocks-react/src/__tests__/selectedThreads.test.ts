import type { ThreadData } from "@liveblocks/core";

import { selectedThreads } from "../comments/lib/selected-threads";
import { UmbrellaStore } from "../umbrella-store";

describe("selectedThreads", () => {
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

    const resolvedThreads = selectedThreads("room_1", store.get(), {
      query: { resolved: true },
    });

    expect(resolvedThreads).toEqual([]);
  });
});
