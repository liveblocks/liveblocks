import { nanoid, Permission, Promise_withResolvers } from "@liveblocks/core";
import { act, renderHook } from "@testing-library/react";
import { HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import { makeInboxNotificationsQueryKey } from "../umbrella-store";
import {
  dummySubscriptionData,
  dummyThreadData,
  dummyThreadInboxNotificationData,
} from "./_dummies";
import {
  mockGetInboxNotifications,
  mockGetThreads,
  mockGetUnreadInboxNotificationsCount,
  mockMarkInboxNotificationsAsRead,
} from "./_restMocks";
import { createContextsForTest } from "./_utils";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => server.close());

function renderUnreadThread() {
  const roomId = nanoid();
  const otherRoomId = nanoid();
  const thread = dummyThreadData({ roomId });
  const inboxNotification = dummyThreadInboxNotificationData({
    roomId,
    threadId: thread.id,
    readAt: null,
  });
  const subscriptions = [dummySubscriptionData({ subjectId: thread.id })];

  server.use(
    mockGetInboxNotifications(() =>
      HttpResponse.json({
        inboxNotifications: [inboxNotification],
        threads: [thread],
        subscriptions,
        groups: [],
        meta: {
          requestedAt: new Date().toISOString(),
          nextCursor: null,
        },
      })
    )
  );

  const {
    room: { RoomProvider, useMarkThreadAsRead, useThreadSubscription },
    liveblocks: {
      LiveblocksProvider,
      useInboxNotifications,
      useUnreadInboxNotificationsCount,
    },
    umbrellaStore,
  } = createContextsForTest();

  return {
    ...renderHook(
      () => ({
        markThreadAsRead: useMarkThreadAsRead(),
        inboxNotifications: useInboxNotifications().inboxNotifications,
        subscription: useThreadSubscription(thread.id),
        counts: {
          threads: useUnreadInboxNotificationsCount({
            query: { kind: "thread" },
          }).count,
          room: useUnreadInboxNotificationsCount({
            query: { kind: "thread", roomId },
          }).count,
          otherRoom: useUnreadInboxNotificationsCount({
            query: { kind: "thread", roomId: otherRoomId },
          }).count,
          otherKind: useUnreadInboxNotificationsCount({
            query: { kind: "$custom" },
          }).count,
        },
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
    inboxNotification,
    umbrellaStore,
  };
}

describe("useMarkThreadAsRead", () => {
  test("should clear matching unread counts, notification, and subscription immediately", async () => {
    const mutationResponse = Promise_withResolvers<void>();
    const countRequests = vi.fn(() =>
      HttpResponse.json<{ count: number }>({ count: 1 })
    );

    server.use(
      mockGetUnreadInboxNotificationsCount(countRequests),
      mockMarkInboxNotificationsAsRead(async () => {
        await mutationResponse.promise;
        return HttpResponse.json(null, { status: 200 });
      })
    );

    const { result, thread, inboxNotification, umbrellaStore, unmount } =
      renderUnreadThread();

    try {
      await vi.waitFor(() => {
        expect(result.current.counts).toEqual({
          threads: 1,
          room: 1,
          otherRoom: 1,
          otherKind: 1,
        });
        expect(result.current.inboxNotifications).toEqual([inboxNotification]);
        expect(result.current.subscription).toMatchObject({
          status: "subscribed",
          unreadSince: null,
        });
      });

      act(() => result.current.markThreadAsRead(thread.id));

      expect(result.current.counts).toEqual({
        threads: 0,
        room: 0,
        otherRoom: 1,
        otherKind: 1,
      });
      expect(result.current.inboxNotifications?.[0]?.readAt).toEqual(
        expect.any(Date)
      );
      expect(result.current.subscription).toMatchObject({
        status: "subscribed",
        unreadSince: expect.any(Date),
      });
      expect(countRequests).toHaveBeenCalledTimes(4);
    } finally {
      mutationResponse.resolve();
      await vi.waitFor(() =>
        expect(umbrellaStore.optimisticUpdates.signal.get()).toHaveLength(0)
      );
      unmount();
    }
  });

  test("should keep a repeated read when the newer request succeeds before the older one fails", async () => {
    const firstMutationResponse = Promise_withResolvers<void>();
    const secondMutationResponse = Promise_withResolvers<void>();
    const refetchedCountResponse = Promise_withResolvers<void>();
    let mutationRequestNumber = 0;
    const markAsRead = vi.fn(async () => {
      mutationRequestNumber++;
      if (mutationRequestNumber === 1) {
        await firstMutationResponse.promise;
        return HttpResponse.json(null, { status: 400 });
      }

      await secondMutationResponse.promise;
      return HttpResponse.json(null, { status: 200 });
    });

    server.use(
      mockGetUnreadInboxNotificationsCount(() =>
        HttpResponse.json({ count: 2 })
      ),
      mockMarkInboxNotificationsAsRead(markAsRead)
    );

    const { result, thread, inboxNotification, umbrellaStore, unmount } =
      renderUnreadThread();

    try {
      await vi.waitFor(() => {
        expect(result.current.counts.threads).toBe(2);
        expect(result.current.counts.room).toBe(2);
        expect(result.current.inboxNotifications).toEqual([inboxNotification]);
      });

      const countRequests = vi.fn(async () => {
        await refetchedCountResponse.promise;
        return HttpResponse.json<{ count: number }>({ count: 1 });
      });
      server.use(mockGetUnreadInboxNotificationsCount(countRequests));

      act(() => result.current.markThreadAsRead(thread.id));

      expect(result.current.counts.threads).toBe(1);
      expect(result.current.counts.room).toBe(1);

      await vi.waitFor(() => expect(markAsRead).toHaveBeenCalledTimes(1));

      act(() => result.current.markThreadAsRead(thread.id));

      expect(result.current.counts.threads).toBe(1);
      expect(result.current.counts.room).toBe(1);

      const latestReadAt = result.current.inboxNotifications?.[0]?.readAt;
      expect(latestReadAt).toEqual(expect.any(Date));

      await vi.waitFor(() => expect(markAsRead).toHaveBeenCalledTimes(2));

      act(() => secondMutationResponse.resolve());

      await vi.waitFor(() =>
        expect(umbrellaStore.optimisticUpdates.signal.get()).toHaveLength(1)
      );
      expect(result.current.counts.threads).toBe(1);
      expect(result.current.counts.room).toBe(1);

      act(() => firstMutationResponse.resolve());

      await vi.waitFor(() => {
        expect(umbrellaStore.optimisticUpdates.signal.get()).toHaveLength(0);
        expect(countRequests).toHaveBeenCalled();
      });

      expect(result.current.counts.threads).toBe(1);
      expect(result.current.counts.room).toBe(1);
      expect(result.current.inboxNotifications?.[0]?.readAt).toEqual(
        latestReadAt
      );
    } finally {
      firstMutationResponse.resolve();
      secondMutationResponse.resolve();
      refetchedCountResponse.resolve();
      await vi.waitFor(() =>
        expect(umbrellaStore.optimisticUpdates.signal.get()).toHaveLength(0)
      );
      unmount();
    }
  });

  test("should restore unread counts if marking a thread as read fails", async () => {
    const mutationResponse = Promise_withResolvers<void>();

    server.use(
      mockGetUnreadInboxNotificationsCount(() =>
        HttpResponse.json({ count: 1 })
      ),
      mockMarkInboxNotificationsAsRead(async () => {
        await mutationResponse.promise;
        return HttpResponse.json(null, { status: 400 });
      })
    );

    const { result, thread, inboxNotification, umbrellaStore, unmount } =
      renderUnreadThread();

    try {
      await vi.waitFor(() => {
        expect(result.current.counts.threads).toBe(1);
        expect(result.current.counts.room).toBe(1);
        expect(result.current.inboxNotifications).toEqual([inboxNotification]);
      });

      act(() => result.current.markThreadAsRead(thread.id));

      expect(result.current.counts.threads).toBe(0);
      expect(result.current.counts.room).toBe(0);

      act(() => mutationResponse.resolve());

      await vi.waitFor(() => {
        expect(result.current.counts.threads).toBe(1);
        expect(result.current.counts.room).toBe(1);
        expect(result.current.inboxNotifications).toEqual([inboxNotification]);
        expect(result.current.subscription).toMatchObject({
          status: "subscribed",
          unreadSince: null,
        });
      });
    } finally {
      mutationResponse.resolve();
      await vi.waitFor(() =>
        expect(umbrellaStore.optimisticUpdates.signal.get()).toHaveLength(0)
      );
      unmount();
    }
  });

  test("should keep counts read when a notification delta confirms a pending read", async () => {
    const mutationResponse = Promise_withResolvers<void>();
    let readSucceeded = false;

    server.use(
      mockGetUnreadInboxNotificationsCount(() =>
        HttpResponse.json({ count: readSucceeded ? 0 : 1 })
      ),
      mockMarkInboxNotificationsAsRead(async () => {
        await mutationResponse.promise;
        readSucceeded = true;
        return HttpResponse.json(null, { status: 200 });
      })
    );

    const { result, thread, inboxNotification, umbrellaStore, unmount } =
      renderUnreadThread();

    try {
      await vi.waitFor(() => {
        expect(result.current.counts.threads).toBe(1);
        expect(result.current.counts.room).toBe(1);
        expect(result.current.inboxNotifications).toEqual([inboxNotification]);
      });

      act(() => result.current.markThreadAsRead(thread.id));

      expect(result.current.counts.threads).toBe(0);
      expect(result.current.counts.room).toBe(0);

      act(() => {
        umbrellaStore.updateThreadifications(
          [],
          [{ ...inboxNotification, readAt: new Date() }],
          []
        );
      });

      expect(result.current.counts.threads).toBe(0);
      expect(result.current.counts.room).toBe(0);

      act(() => mutationResponse.resolve());

      await vi.waitFor(() =>
        expect(umbrellaStore.optimisticUpdates.signal.get()).toHaveLength(0)
      );

      expect(result.current.counts.threads).toBe(0);
      expect(result.current.counts.room).toBe(0);
    } finally {
      mutationResponse.resolve();
      await vi.waitFor(() =>
        expect(umbrellaStore.optimisticUpdates.signal.get()).toHaveLength(0)
      );
      unmount();
    }
  });

  test("should keep a newer notification unread when an earlier read is pending", async () => {
    const mutationResponse = Promise_withResolvers<void>();

    server.use(
      mockGetUnreadInboxNotificationsCount(() =>
        HttpResponse.json({ count: 1 })
      ),
      mockMarkInboxNotificationsAsRead(async () => {
        await mutationResponse.promise;
        return HttpResponse.json(null, { status: 200 });
      })
    );

    const { result, thread, inboxNotification, umbrellaStore, unmount } =
      renderUnreadThread();

    try {
      await vi.waitFor(() => {
        expect(result.current.counts.threads).toBe(1);
        expect(result.current.counts.room).toBe(1);
        expect(result.current.inboxNotifications).toEqual([inboxNotification]);
      });

      act(() => result.current.markThreadAsRead(thread.id));

      expect(result.current.counts.threads).toBe(0);
      expect(result.current.counts.room).toBe(0);

      const pendingReadAt = result.current.inboxNotifications?.[0]?.readAt;
      if (!pendingReadAt)
        throw new Error("Expected the pending read timestamp");

      act(() => {
        umbrellaStore.updateThreadifications(
          [],
          [
            {
              ...inboxNotification,
              notifiedAt: new Date(pendingReadAt.getTime() + 1_000),
            },
          ],
          []
        );
      });

      expect(result.current.counts.threads).toBe(1);
      expect(result.current.counts.room).toBe(1);

      act(() => mutationResponse.resolve());

      await vi.waitFor(() =>
        expect(umbrellaStore.optimisticUpdates.signal.get()).toHaveLength(0)
      );

      expect(result.current.counts.threads).toBe(1);
      expect(result.current.counts.room).toBe(1);
    } finally {
      mutationResponse.resolve();
      await vi.waitFor(() =>
        expect(umbrellaStore.optimisticUpdates.signal.get()).toHaveLength(0)
      );
      unmount();
    }
  });

  test("should refetch counts after the read succeeds and ignore an older in-flight response", async () => {
    const mutationResponse = Promise_withResolvers<void>();
    const staleCountResponse = Promise_withResolvers<void>();
    let readSucceeded = false;
    const markAsRead = vi.fn(async () => {
      await mutationResponse.promise;
      readSucceeded = true;
      return HttpResponse.json(null, { status: 200 });
    });

    server.use(
      mockGetUnreadInboxNotificationsCount(() =>
        HttpResponse.json({ count: 1 })
      ),
      mockMarkInboxNotificationsAsRead(markAsRead)
    );

    const { result, thread, inboxNotification, umbrellaStore, unmount } =
      renderUnreadThread();

    try {
      await vi.waitFor(() => {
        expect(result.current.counts.threads).toBe(1);
        expect(result.current.counts.room).toBe(1);
        expect(result.current.inboxNotifications).toEqual([inboxNotification]);
      });

      let countRequestNumber = 0;
      const countRequests = vi.fn(async () => {
        countRequestNumber++;
        if (countRequestNumber === 1) {
          await staleCountResponse.promise;
          return HttpResponse.json<{ count: number }>({ count: 1 });
        }

        expect(readSucceeded).toBe(true);
        return HttpResponse.json<{ count: number }>({ count: 0 });
      });

      server.use(mockGetUnreadInboxNotificationsCount(countRequests));

      const staleCountRequest$ = umbrellaStore.fetchUnreadNotificationsCount(
        makeInboxNotificationsQueryKey({ kind: "thread" }),
        new AbortController().signal
      );
      await vi.waitFor(() => expect(countRequests).toHaveBeenCalledTimes(1));

      act(() => result.current.markThreadAsRead(thread.id));

      expect(result.current.counts.threads).toBe(0);
      expect(result.current.counts.room).toBe(0);

      await vi.waitFor(() => expect(markAsRead).toHaveBeenCalledTimes(1));
      expect(countRequests).toHaveBeenCalledTimes(1);

      act(() => mutationResponse.resolve());

      await vi.waitFor(() => {
        expect(countRequests.mock.calls.length).toBeGreaterThan(1);
        expect(umbrellaStore.optimisticUpdates.signal.get()).toHaveLength(0);
      });
      expect(result.current.counts.threads).toBe(0);

      await act(async () => {
        staleCountResponse.resolve();
        await staleCountRequest$;
      });

      expect(result.current.counts.threads).toBe(0);
    } finally {
      mutationResponse.resolve();
      staleCountResponse.resolve();
      await vi.waitFor(() =>
        expect(umbrellaStore.optimisticUpdates.signal.get()).toHaveLength(0)
      );
      unmount();
    }
  });

  test("should wait for a pending read before polling counts without double-decrementing", async () => {
    const mutationResponse = Promise_withResolvers<void>();
    let readSucceeded = false;
    const markAsRead = vi.fn(async () => {
      await mutationResponse.promise;
      readSucceeded = true;
      return HttpResponse.json(null, { status: 200 });
    });

    server.use(
      mockGetUnreadInboxNotificationsCount(() =>
        HttpResponse.json({ count: 2 })
      ),
      mockMarkInboxNotificationsAsRead(markAsRead)
    );

    const { result, thread, inboxNotification, umbrellaStore, unmount } =
      renderUnreadThread();

    try {
      await vi.waitFor(() => {
        expect(result.current.counts.threads).toBe(2);
        expect(result.current.counts.room).toBe(2);
        expect(result.current.inboxNotifications).toEqual([inboxNotification]);
      });

      const countRequests = vi.fn(() => {
        expect(readSucceeded).toBe(true);
        return HttpResponse.json<{ count: number }>({ count: 1 });
      });
      server.use(mockGetUnreadInboxNotificationsCount(countRequests));

      act(() => result.current.markThreadAsRead(thread.id));

      const pendingPoll$ = umbrellaStore.fetchUnreadNotificationsCount(
        makeInboxNotificationsQueryKey({ kind: "thread" }),
        new AbortController().signal
      );

      await vi.waitFor(() => expect(markAsRead).toHaveBeenCalledTimes(1));
      expect(countRequests).not.toHaveBeenCalled();
      expect(result.current.counts.threads).toBe(1);

      await act(async () => {
        mutationResponse.resolve();
        await pendingPoll$;
      });

      expect(countRequests).toHaveBeenCalled();
      expect(result.current.counts.threads).toBe(1);
    } finally {
      mutationResponse.resolve();
      await vi.waitFor(() =>
        expect(umbrellaStore.optimisticUpdates.signal.get()).toHaveLength(0)
      );
      unmount();
    }
  });

  test("should load fresh counts when the initial count request overlaps a read", async () => {
    const initialCountResponse = Promise_withResolvers<void>();
    const mutationResponse = Promise_withResolvers<void>();
    let readSucceeded = false;
    const countRequests = vi.fn(async () => {
      if (!readSucceeded) {
        await initialCountResponse.promise;
        return HttpResponse.json<{ count: number }>({ count: 1 });
      }

      return HttpResponse.json<{ count: number }>({ count: 0 });
    });

    server.use(
      mockGetUnreadInboxNotificationsCount(countRequests),
      mockMarkInboxNotificationsAsRead(async () => {
        await mutationResponse.promise;
        readSucceeded = true;
        return HttpResponse.json(null, { status: 200 });
      })
    );

    const { result, thread, inboxNotification, umbrellaStore, unmount } =
      renderUnreadThread();

    try {
      await vi.waitFor(() => {
        expect(countRequests).toHaveBeenCalledTimes(4);
        expect(result.current.inboxNotifications).toEqual([inboxNotification]);
      });
      expect(result.current.counts.threads).toBeUndefined();
      expect(result.current.counts.room).toBeUndefined();

      act(() => result.current.markThreadAsRead(thread.id));
      act(() => mutationResponse.resolve());

      await vi.waitFor(() =>
        expect(umbrellaStore.optimisticUpdates.signal.get()).toHaveLength(0)
      );

      act(() => initialCountResponse.resolve());

      await vi.waitFor(() => {
        expect(result.current.counts.threads).toBe(0);
        expect(result.current.counts.room).toBe(0);
      });
    } finally {
      mutationResponse.resolve();
      initialCountResponse.resolve();
      await vi.waitFor(() =>
        expect(umbrellaStore.optimisticUpdates.signal.get()).toHaveLength(0)
      );
      unmount();
    }
  });

  test("should mark notification as read optimistically", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const inboxNotifications = [
      dummyThreadInboxNotificationData({
        roomId,
        threadId: threads[0]!.id,
        readAt: null,
      }),
    ];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
    ];

    server.use(
      mockGetThreads(() => {
        return HttpResponse.json(
          {
            data: threads,
            inboxNotifications,
            subscriptions,
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
              permissionHints: {
                [roomId]: [Permission.RoomWrite],
              },
            },
          },
          { status: 200 }
        );
      }),
      mockGetInboxNotifications(() => {
        return HttpResponse.json(
          {
            inboxNotifications,
            threads,
            subscriptions,
            groups: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
            },
          },
          { status: 200 }
        );
      }),
      mockMarkInboxNotificationsAsRead(() => {
        return HttpResponse.json(null, { status: 200 });
      })
    );

    const {
      room: { RoomProvider, useMarkThreadAsRead },
      liveblocks: { LiveblocksProvider, useInboxNotifications },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        markThreadAsRead: useMarkThreadAsRead(),
        inboxNotifications: useInboxNotifications().inboxNotifications,
      }),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>
            <RoomProvider id={roomId}>{children}</RoomProvider>
          </LiveblocksProvider>
        ),
      }
    );

    await vi.waitFor(() =>
      expect(result.current.inboxNotifications).toEqual(
        expect.arrayContaining(inboxNotifications)
      )
    );

    // Mark the first thread in our threads list as read
    act(() => {
      result.current.markThreadAsRead(threads[0]!.id);
    });

    expect(result.current.inboxNotifications?.[0]?.readAt).not.toBe(null);

    unmount();
  });

  test("should mark inbox notification as read optimistically and revert the updates if error response from server", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const inboxNotifications = [
      dummyThreadInboxNotificationData({
        roomId,
        threadId: threads[0]!.id,
        readAt: null,
      }),
    ];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
    ];

    server.use(
      mockGetThreads(() => {
        return HttpResponse.json(
          {
            data: threads,
            inboxNotifications,
            subscriptions,
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
              permissionHints: {
                [roomId]: [Permission.RoomWrite],
              },
            },
          },
          { status: 200 }
        );
      }),
      mockGetInboxNotifications(() => {
        return HttpResponse.json(
          {
            inboxNotifications,
            threads,
            subscriptions,
            groups: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
            },
          },
          { status: 200 }
        );
      }),
      mockMarkInboxNotificationsAsRead(() => {
        return HttpResponse.json(null, { status: 500 });
      })
    );

    const {
      room: { RoomProvider, useMarkThreadAsRead },
      liveblocks: { LiveblocksProvider, useInboxNotifications },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        markThreadAsRead: useMarkThreadAsRead(),
        inboxNotifications: useInboxNotifications().inboxNotifications,
      }),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>
            <RoomProvider id={roomId}>{children}</RoomProvider>
          </LiveblocksProvider>
        ),
      }
    );

    await vi.waitFor(() =>
      expect(result.current.inboxNotifications).toEqual(
        expect.arrayContaining(inboxNotifications)
      )
    );

    // Mark the first thread in our threads list as read
    act(() => {
      result.current.markThreadAsRead(threads[0]!.id);
    });

    // We mark the notification as read optimitiscally
    expect(result.current.inboxNotifications?.[0]?.readAt).not.toBe(null);

    await vi.waitFor(() => {
      // The readAt field should have been updated in the inbox notification cache
      expect(result.current.inboxNotifications?.[0]?.readAt).toEqual(null);
    });

    unmount();
  });
});
