import { nanoid, Permission } from "@liveblocks/core";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";

import {
  dummySubscriptionData,
  dummyThreadData,
  dummyThreadInboxNotificationData,
} from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import { mockGetThreads } from "./_restMocks";
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

describe("useThreadSubscription", () => {
  test("should return the expected object if the associated inbox notification hasn't been read at all", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const inboxNotifications = [
      dummyThreadInboxNotificationData({ roomId, threadId: threads[0]!.id }),
    ];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
    ];

    server.use(
      mockGetThreads(() => {
        return HttpResponse.json({
          data: threads,
          inboxNotifications,
          subscriptions,
          meta: {
            requestedAt: new Date().toISOString(),
            nextCursor: null,
            permissionHints: {
              [roomId]: [Permission.Write],
            },
          },
        });
      })
    );

    const {
      room: { RoomProvider, useThreads, useThreadSubscription },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads(),
        subscription: useThreadSubscription(threads[0]!.id),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toEqual({ isLoading: true });
    expect(result.current.subscription).toEqual({
      status: "not-subscribed",
      subscribe: expect.any(Function),
      unsubscribe: expect.any(Function),
    });

    await waitFor(() =>
      expect(result.current.threads).toEqual({
        isLoading: false,
        threads,
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    expect(result.current.subscription).toEqual({
      status: "subscribed",
      unreadSince: null,
      subscribe: expect.any(Function),
      unsubscribe: expect.any(Function),
    });

    unmount();
  });

  test("should return the expected object if the associated inbox notification has been read", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const inboxNotifications = [
      dummyThreadInboxNotificationData({
        roomId,
        threadId: threads[0]!.id,
        readAt: new Date(),
      }),
    ];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
    ];

    server.use(
      mockGetThreads(() => {
        return HttpResponse.json({
          data: threads,
          inboxNotifications,
          subscriptions,
          meta: {
            requestedAt: new Date().toISOString(),
            nextCursor: null,
            permissionHints: {
              [roomId]: [Permission.Write],
            },
          },
        });
      })
    );

    const {
      room: { RoomProvider, useThreads, useThreadSubscription },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads(),
        subscription: useThreadSubscription(threads[0]!.id),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toEqual({ isLoading: true });
    expect(result.current.subscription).toEqual({
      status: "not-subscribed",
      subscribe: expect.any(Function),
      unsubscribe: expect.any(Function),
    });

    await waitFor(() =>
      expect(result.current.threads).toEqual({
        isLoading: false,
        threads,
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    expect(result.current.subscription).toEqual({
      status: "subscribed",
      unreadSince: inboxNotifications[0]!.readAt,
      subscribe: expect.any(Function),
      unsubscribe: expect.any(Function),
    });

    unmount();
  });

  test("should return the expected object if the thread doesn't have any inbox notification associated with it", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];

    server.use(
      mockGetThreads(() => {
        return HttpResponse.json({
          data: threads,
          inboxNotifications: [],
          subscriptions: [],
          meta: {
            requestedAt: new Date().toISOString(),
            nextCursor: null,
            permissionHints: {
              [roomId]: [Permission.Write],
            },
          },
        });
      })
    );

    const {
      room: { RoomProvider, useThreads, useThreadSubscription },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads(),
        subscription: useThreadSubscription(threads[0]!.id),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toEqual({ isLoading: true });
    expect(result.current.subscription).toEqual({
      status: "not-subscribed",
      subscribe: expect.any(Function),
      unsubscribe: expect.any(Function),
    });

    await waitFor(() =>
      expect(result.current.threads).toEqual({
        isLoading: false,
        threads,
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    expect(result.current.subscription).toEqual({
      status: "not-subscribed",
      subscribe: expect.any(Function),
      unsubscribe: expect.any(Function),
    });

    unmount();
  });

  test("should return the expected object if the thread has an associated inbox notification but doesn't have a subscription for it", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const inboxNotifications = [
      dummyThreadInboxNotificationData({
        roomId,
        threadId: threads[0]!.id,
      }),
    ];

    server.use(
      mockGetThreads(() => {
        return HttpResponse.json({
          data: threads,
          inboxNotifications,
          subscriptions: [],
          meta: {
            requestedAt: new Date().toISOString(),
            nextCursor: null,
            permissionHints: {
              [roomId]: [Permission.Write],
            },
          },
        });
      })
    );

    const {
      room: { RoomProvider, useThreads, useThreadSubscription },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads(),
        subscription: useThreadSubscription(threads[0]!.id),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toEqual({ isLoading: true });
    expect(result.current.subscription).toEqual({
      status: "not-subscribed",
      subscribe: expect.any(Function),
      unsubscribe: expect.any(Function),
    });

    await waitFor(() =>
      expect(result.current.threads).toEqual({
        isLoading: false,
        threads,
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    expect(result.current.subscription).toEqual({
      status: "not-subscribed",
      subscribe: expect.any(Function),
      unsubscribe: expect.any(Function),
    });

    unmount();
  });

  test("should be referentially stable", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const inboxNotifications = [
      dummyThreadInboxNotificationData({
        roomId,
        threadId: threads[0]!.id,
      }),
    ];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
    ];

    server.use(
      mockGetThreads(() => {
        return HttpResponse.json({
          data: threads,
          inboxNotifications,
          subscriptions,
          meta: {
            requestedAt: new Date().toISOString(),
            nextCursor: null,
            permissionHints: {
              [roomId]: [Permission.Write],
            },
          },
        });
      })
    );

    const {
      room: { RoomProvider, useThreads, useThreadSubscription },
    } = createContextsForTest();

    const { result, unmount, rerender } = renderHook(
      () => ({
        threads: useThreads(),
        subscription: useThreadSubscription(threads[0]!.id),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toEqual({ isLoading: true });
    expect(result.current.subscription).toEqual({
      status: "not-subscribed",
      subscribe: expect.any(Function),
      unsubscribe: expect.any(Function),
    });

    await waitFor(() =>
      expect(result.current.threads).toEqual({
        isLoading: false,
        threads,
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    const oldResult = result.current.subscription;

    rerender();

    expect(result.current.subscription).toBe(oldResult);

    unmount();
  });
});
