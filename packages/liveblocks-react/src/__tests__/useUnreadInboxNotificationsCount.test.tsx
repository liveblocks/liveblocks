import { nanoid, Promise_withResolvers, ServerMsgCode } from "@liveblocks/core";
import { act, renderHook } from "@testing-library/react";
import { HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { Suspense } from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import { getLiveblocksExtrasForClient } from "../liveblocks";
import { makeInboxNotificationsQueryKey } from "../umbrella-store";
import {
  dummyCommentData,
  dummySubscriptionData,
  dummyThreadData,
  dummyThreadInboxNotificationData,
} from "./_dummies";
import MockWebSocket, { websocketSimulator } from "./_MockWebSocket";
import {
  mockGetThread,
  mockGetUnreadInboxNotificationsCount,
} from "./_restMocks";
import { createContextsForTest } from "./_utils";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

beforeEach(() => {
  MockWebSocket.reset();
});

afterEach(() => {
  MockWebSocket.reset();
  server.resetHandlers();
});

afterAll(() => server.close());

describe("useUnreadInboxNotificationsCount", () => {
  test("should fetch inbox notification count", async () => {
    server.use(
      mockGetUnreadInboxNotificationsCount(() => {
        return HttpResponse.json({
          count: 1,
        });
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useUnreadInboxNotificationsCount },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useUnreadInboxNotificationsCount(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    expect(result.current).toEqual({
      isLoading: true,
    });

    await vi.waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        count: 1,
      })
    );

    unmount();
  });

  test("should fetch inbox notification count for a given query", async () => {
    const roomA = nanoid();

    server.use(
      mockGetUnreadInboxNotificationsCount(({ request }) => {
        const query = new URL(request.url).searchParams.get("query");

        // For the sake of simplicity, the server mock assumes that if a query is provided, it's for roomA.
        if (query) {
          return HttpResponse.json({
            count: 1,
          });
        }

        return HttpResponse.json({
          count: 2,
        });
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useUnreadInboxNotificationsCount },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useUnreadInboxNotificationsCount({ query: { roomId: roomA } }),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    expect(result.current).toEqual({
      isLoading: true,
    });

    await vi.waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        count: 1,
      })
    );

    unmount();

    const { result: result2, unmount: unmount2 } = renderHook(
      () => useUnreadInboxNotificationsCount(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    expect(result2.current).toEqual({
      isLoading: true,
    });

    await vi.waitFor(() =>
      expect(result2.current).toEqual({
        isLoading: false,
        count: 2,
      })
    );

    unmount2();
  });
});

describe("useUnreadInboxNotificationsCount - Suspense", () => {
  test("should be referentially stable after rerendering", async () => {
    server.use(
      mockGetUnreadInboxNotificationsCount(() => {
        return HttpResponse.json({
          count: 1,
        });
      })
    );

    const {
      liveblocks: {
        suspense: { LiveblocksProvider, useUnreadInboxNotificationsCount },
      },
    } = createContextsForTest();

    const { result, unmount, rerender } = renderHook(
      () => useUnreadInboxNotificationsCount(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>
            <Suspense>{children}</Suspense>
          </LiveblocksProvider>
        ),
      }
    );

    expect(result.current).toEqual(null);

    await vi.waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        count: 1,
      })
    );

    const oldResult = result.current;

    rerender();

    expect(result.current).toBe(oldResult);

    unmount();
  });
});

describe("useUnreadInboxNotificationsCount - incoming replies", () => {
  test.each([
    { event: "COMMENT_CREATED", cacheThread: false },
    { event: "THREAD_UPDATED", cacheThread: false },
    { event: "COMMENT_CREATED", cacheThread: true },
    { event: "THREAD_UPDATED", cacheThread: true },
  ])(
    "should refresh room and global counts after $event with cacheThread=$cacheThread",
    async ({ event, cacheThread }) => {
      const roomId = nanoid();
      const otherRoomId = nanoid();
      let replyReceived = false;

      server.use(
        mockGetUnreadInboxNotificationsCount(({ request }) => {
          const query = new URL(request.url).searchParams.get("query");
          const count = replyReceived && !query?.includes(otherRoomId) ? 1 : 0;
          return HttpResponse.json({ count });
        })
      );

      const {
        result,
        thread,
        reply,
        updatedNotification,
        threadRequests,
        umbrellaStore,
        unmount,
      } = renderThreadCounts({ roomId, otherRoomId, cacheThread });

      try {
        const sim = await websocketSimulator();
        await vi.waitFor(() =>
          expect(result.current).toEqual({ threads: 0, room: 0, otherRoom: 0 })
        );

        replyReceived = true;
        act(() => {
          sim.simulateIncomingMessage(
            event === "COMMENT_CREATED"
              ? {
                  type: ServerMsgCode.COMMENT_CREATED,
                  threadId: thread.id,
                  commentId: reply.id,
                }
              : { type: ServerMsgCode.THREAD_UPDATED, threadId: thread.id }
          );
        });

        await vi.waitFor(() => expect(threadRequests).toHaveBeenCalledTimes(1));
        if (cacheThread || event === "COMMENT_CREATED") {
          await vi.waitFor(() =>
            expect(
              umbrellaStore.notifications.signal
                .get()
                .get(updatedNotification.id)
            ).toEqual(updatedNotification)
          );
        }

        await vi.waitFor(() =>
          expect(result.current).toEqual({ threads: 1, room: 1, otherRoom: 0 })
        );
      } finally {
        unmount();
      }
    }
  );

  test("should ignore a count response started before the incoming reply", async () => {
    const roomId = nanoid();
    const otherRoomId = nanoid();
    const staleCountResponse = Promise_withResolvers<void>();

    server.use(
      mockGetUnreadInboxNotificationsCount(() =>
        HttpResponse.json({ count: 0 })
      )
    );

    const { result, thread, threadRequests, client, umbrellaStore, unmount } =
      renderThreadCounts({ roomId, otherRoomId, cacheThread: true });

    try {
      const sim = await websocketSimulator();
      await vi.waitFor(() =>
        expect(result.current).toEqual({ threads: 0, room: 0, otherRoom: 0 })
      );

      let countRequestNumber = 0;
      const countRequests = vi.fn();
      server.use(
        mockGetUnreadInboxNotificationsCount(async ({ request }) => {
          countRequests();
          countRequestNumber++;
          if (countRequestNumber === 1) {
            await staleCountResponse.promise;
            return HttpResponse.json({ count: 0 });
          }

          const query = new URL(request.url).searchParams.get("query");
          return HttpResponse.json({
            count: query?.includes(otherRoomId) ? 0 : 1,
          });
        })
      );

      const poller = getLiveblocksExtrasForClient(
        client
      ).unreadNotificationsCountPollersByQueryKey.getOrCreate(
        makeInboxNotificationsQueryKey({ kind: "thread" })
      );
      poller.markAsStale();
      poller.pollNowIfStale();
      await vi.waitFor(() => expect(countRequests).toHaveBeenCalledTimes(1));

      act(() => {
        sim.simulateIncomingMessage({
          type: ServerMsgCode.THREAD_UPDATED,
          threadId: thread.id,
        });
      });
      await vi.waitFor(() => expect(threadRequests).toHaveBeenCalledTimes(1));
      await vi.waitFor(() =>
        expect(
          umbrellaStore.outputs.threads.get().get(thread.id)?.comments
        ).toHaveLength(2)
      );

      act(() => staleCountResponse.resolve());

      await vi.waitFor(() =>
        expect(result.current).toEqual({ threads: 1, room: 1, otherRoom: 0 })
      );
    } finally {
      staleCountResponse.resolve();
      unmount();
    }
  });
});

function renderThreadCounts({
  roomId,
  otherRoomId,
  cacheThread,
}: {
  roomId: string;
  otherRoomId: string;
  cacheThread: boolean;
}) {
  const createdAt = new Date(Date.now() - 10_000);
  const thread = dummyThreadData({ roomId, createdAt });
  const notification = dummyThreadInboxNotificationData({
    roomId,
    threadId: thread.id,
    notifiedAt: createdAt,
    readAt: createdAt,
  });
  const subscription = dummySubscriptionData({ subjectId: thread.id });
  const reply = dummyCommentData({
    roomId,
    threadId: thread.id,
    userId: "another-user",
  });
  const updatedThread = {
    ...thread,
    updatedAt: reply.createdAt,
    comments: [...thread.comments, reply],
  };
  const updatedNotification = {
    ...notification,
    notifiedAt: reply.createdAt,
  };
  const threadRequests = vi.fn();

  server.use(
    mockGetThread({ threadId: thread.id }, () => {
      threadRequests();
      return HttpResponse.json({
        thread: updatedThread,
        inboxNotification: updatedNotification,
        subscription,
      });
    })
  );

  const {
    room: { RoomProvider },
    liveblocks: { LiveblocksProvider, useUnreadInboxNotificationsCount },
    client,
    umbrellaStore,
  } = createContextsForTest();

  if (cacheThread) {
    umbrellaStore.updateThreadifications(
      [thread],
      [notification],
      [subscription]
    );
  }

  return {
    ...renderHook(
      () => ({
        threads: useUnreadInboxNotificationsCount({
          query: { kind: "thread" },
        }).count,
        room: useUnreadInboxNotificationsCount({
          query: { kind: "thread", roomId },
        }).count,
        otherRoom: useUnreadInboxNotificationsCount({
          query: { kind: "thread", roomId: otherRoomId },
        }).count,
      }),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>
            <RoomProvider id={roomId}>{children}</RoomProvider>
          </LiveblocksProvider>
        ),
      }
    ),
    thread,
    reply,
    updatedNotification,
    threadRequests,
    client,
    umbrellaStore,
  };
}
