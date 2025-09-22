import "@testing-library/jest-dom";

import { nanoid } from "@liveblocks/core";
import { renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { Suspense } from "react";

import {
  dummySubscriptionData,
  dummyThreadData,
  dummyThreadInboxNotificationData,
} from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import {
  mockGetInboxNotifications,
  mockGetInboxNotificationsDelta,
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
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const inboxNotification = dummyThreadInboxNotificationData({
      roomId,
      threadId: threads[0]!.id,
      readAt: null,
    });
    const inboxNotifications = [inboxNotification];
    const subscription = dummySubscriptionData({
      subjectId: threads[0]!.id,
    });
    const subscriptions = [subscription];

    server.use(
      mockGetInboxNotifications(async (_req, res, ctx) => {
        return res(
          ctx.json({
            threads,
            inboxNotifications,
            subscriptions,
            groups: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
            },
          })
        );
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

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        count: 1,
      })
    );

    unmount();
  });

  test("should fetch inbox notification count for a given query", async () => {
    const roomA = nanoid();
    const roomB = nanoid();
    const threads = [
      dummyThreadData({ roomId: roomA }),
      dummyThreadData({ roomId: roomB }),
    ];

    const inboxNotification = dummyThreadInboxNotificationData({
      roomId: roomA,
      threadId: threads[0]!.id,
      readAt: null,
    });
    const inboxNotification2 = dummyThreadInboxNotificationData({
      roomId: roomB,
      threadId: threads[1]!.id,
      readAt: null,
    });

    const inboxNotifications = [inboxNotification, inboxNotification2];
    const subscription = dummySubscriptionData({
      subjectId: threads[0]!.id,
    });
    const subscriptions = [subscription];

    server.use(
      mockGetInboxNotifications(async (_req, res, ctx) => {
        const query = _req.url.searchParams.get("query");

        // For the sake of simplicity, the server mock assumes that if a query is provided, it's for roomA.
        if (query) {
          return res(
            ctx.json({
              threads: threads.filter((thread) => thread.roomId === roomA),
              inboxNotifications: inboxNotifications.filter(
                (inboxNotification) => inboxNotification.roomId === roomA
              ),
              subscriptions,
              groups: [],
              meta: {
                requestedAt: new Date().toISOString(),
                nextCursor: null,
              },
            })
          );
        }

        return res(
          ctx.json({
            threads,
            inboxNotifications,
            subscriptions,
            groups: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
            },
          })
        );
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

    await waitFor(() =>
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

    await waitFor(() =>
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
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const inboxNotification = dummyThreadInboxNotificationData({
      roomId,
      threadId: threads[0]!.id,
      readAt: null,
    });
    const inboxNotifications = [inboxNotification];
    const subscription = dummySubscriptionData({
      subjectId: threads[0]!.id,
    });
    const subscriptions = [subscription];

    server.use(
      mockGetInboxNotifications(async (_req, res, ctx) => {
        return res(
          ctx.json({
            threads,
            inboxNotifications,
            subscriptions,
            groups: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
            },
          })
        );
      }),
      mockGetInboxNotificationsDelta(async (_req, res, ctx) => {
        return res(
          ctx.json({
            threads: [],
            inboxNotifications: [],
            subscriptions: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        );
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

    await waitFor(() =>
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
