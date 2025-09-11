import { nanoid, Permission } from "@liveblocks/core";
import { act, renderHook, waitFor } from "@testing-library/react";
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
import { mockGetThreads, mockUnsubscribeFromThread } from "./_restMocks";
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

describe("useUnsubscribeFromThread", () => {
  test("should unsubscribe from thread optimistically", async () => {
    const roomId = nanoid();
    const initialThread = dummyThreadData({ roomId });
    const inboxNotifications = [
      dummyThreadInboxNotificationData({ roomId, threadId: initialThread.id }),
    ];
    let hasCalledUnsubscribeFromThread = false;

    server.use(
      mockGetThreads(() => {
        return HttpResponse.json({
          data: [initialThread],
          inboxNotifications,
          subscriptions: [
            dummySubscriptionData({
              kind: "thread",
              subjectId: initialThread.id,
              createdAt: initialThread.createdAt,
            }),
          ],
          meta: {
            requestedAt: new Date().toISOString(),
            nextCursor: null,
            permissionHints: {
              [roomId]: [Permission.Write],
            },
          },
        });
      }),
      mockUnsubscribeFromThread({ threadId: initialThread.id }, () => {
        hasCalledUnsubscribeFromThread = true;

        return HttpResponse.json(null, { status: 200 });
      })
    );

    const {
      room: {
        RoomProvider,
        useThreads,
        useThreadSubscription,
        useUnsubscribeFromThread,
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        subscription: useThreadSubscription(initialThread.id),
        unsubscribeFromThread: useUnsubscribeFromThread(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toBeUndefined();

    await waitFor(() =>
      expect(result.current.threads).toEqual([initialThread])
    );

    // The thread is initially subscribed to
    expect(result.current.subscription.status).toBe("subscribed");

    act(() => result.current.unsubscribeFromThread(initialThread.id));

    await waitFor(() => expect(hasCalledUnsubscribeFromThread).toEqual(true));

    // The thread should optimistically no longer be subscribed to
    expect(result.current.subscription.status).toBe("not-subscribed");

    unmount();
  });

  test("should not do anything if the thread is not subscribed to", async () => {
    const roomId = nanoid();
    const initialThread = dummyThreadData({ roomId });
    let hasCalledUnsubscribeFromThread = false;

    server.use(
      mockGetThreads(() => {
        return HttpResponse.json({
          data: [initialThread],
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
      }),
      mockUnsubscribeFromThread({ threadId: initialThread.id }, () => {
        hasCalledUnsubscribeFromThread = true;

        return HttpResponse.json(null, { status: 200 });
      })
    );

    const {
      room: {
        RoomProvider,
        useThreads,
        useThreadSubscription,
        useUnsubscribeFromThread,
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        subscription: useThreadSubscription(initialThread.id),
        unsubscribeFromThread: useUnsubscribeFromThread(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toBeUndefined();

    await waitFor(() =>
      expect(result.current.threads).toEqual([initialThread])
    );

    expect(result.current.subscription.status).toBe("not-subscribed");

    act(() => result.current.unsubscribeFromThread(initialThread.id));

    await waitFor(() => expect(hasCalledUnsubscribeFromThread).toEqual(true));

    expect(result.current.subscription.status).toBe("not-subscribed");

    unmount();
  });
});
