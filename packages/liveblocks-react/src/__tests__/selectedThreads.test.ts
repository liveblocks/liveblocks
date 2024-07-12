import type { BaseMetadata, CacheStore, ThreadData } from "@liveblocks/core";
import { createClient, kInternal } from "@liveblocks/core";

import { selectedThreads } from "../comments/lib/selected-threads";
import MockWebSocket from "./_MockWebSocket";

describe("selectedThreads", () => {
  it.failing(
    "should only return resolved threads from a list of threads",
    () => {
      const client = createClient({
        publicApiKey: "pk_xxx",
        polyfills: {
          WebSocket: MockWebSocket as any,
        },
      });

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

      const store = client[kInternal]
        .cacheStore as unknown as CacheStore<BaseMetadata>;

      store.updateThreadsAndNotifications([thread1, thread2], [], [], []);

      const resolvedThreads = selectedThreads("room_1", store.get(), {
        query: { resolved: true },
      });

      expect(resolvedThreads).toEqual([]);
    }
  );
});
