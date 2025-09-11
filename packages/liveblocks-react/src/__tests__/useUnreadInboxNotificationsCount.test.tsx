import { nanoid } from "@liveblocks/core";
import { renderHook, waitFor } from "@testing-library/react";
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
} from "vitest";

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
      mockGetInboxNotifications(() => {
        return HttpResponse.json({
          threads,
          inboxNotifications,
          subscriptions,
          groups: [],
          meta: {
            requestedAt: new Date().toISOString(),
            nextCursor: null,
          },
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

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        count: 1,
      })
    );

    unmount();
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
      mockGetInboxNotifications(() => {
        return HttpResponse.json({
          threads,
          inboxNotifications,
          subscriptions,
          groups: [],
          meta: {
            requestedAt: new Date().toISOString(),
            nextCursor: null,
          },
        });
      }),
      mockGetInboxNotificationsDelta(() => {
        return HttpResponse.json({
          threads: [],
          inboxNotifications: [],
          subscriptions: [],
          deletedThreads: [],
          deletedInboxNotifications: [],
          deletedSubscriptions: [],
          meta: {
            requestedAt: new Date().toISOString(),
          },
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
