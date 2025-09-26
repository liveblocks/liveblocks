import { nanoid, Permission } from "@liveblocks/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

import {
  dummySubscriptionData,
  dummyThreadData,
  dummyThreadInboxNotificationData,
} from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import { mockGetThreads, mockSubscribeToThread } from "./_restMocks";
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

describe("useSubscribeToThread", () => {
  test("should subscribe to thread optimistically", async () => {
    const roomId = nanoid();
    const initialThread = dummyThreadData({ roomId });
    let hasCalledSubscribeToThread = false;

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
      mockSubscribeToThread({ threadId: initialThread.id }, () => {
        hasCalledSubscribeToThread = true;

        return HttpResponse.json({
          kind: "thread",
          subjectId: initialThread.id,
          createdAt: Date.now(),
        });
      })
    );

    const {
      room: {
        RoomProvider,
        useThreads,
        useThreadSubscription,
        useSubscribeToThread,
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        subscription: useThreadSubscription(initialThread.id),
        subscribeToThread: useSubscribeToThread(),
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

    // The thread is initially not subscribed to
    expect(result.current.subscription.status).toBe("not-subscribed");

    act(() => result.current.subscribeToThread(initialThread.id));

    await waitFor(() => expect(hasCalledSubscribeToThread).toEqual(true));

    // The thread should optimistically be subscribed to
    expect(result.current.subscription.status).toBe("subscribed");

    unmount();
  });

  test("should not do anything if the thread is already subscribed to", async () => {
    const roomId = nanoid();
    const initialThread = dummyThreadData({ roomId });
    const inboxNotifications = [
      dummyThreadInboxNotificationData({ roomId, threadId: initialThread.id }),
    ];
    let hasCalledSubscribeToThread = false;

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
      mockSubscribeToThread({ threadId: initialThread.id }, () => {
        hasCalledSubscribeToThread = true;

        return HttpResponse.json({
          kind: "thread",
          subjectId: initialThread.id,
          createdAt: Date.now(),
        });
      })
    );

    const {
      room: {
        RoomProvider,
        useThreads,
        useThreadSubscription,
        useSubscribeToThread,
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        subscription: useThreadSubscription(initialThread.id),
        subscribeToThread: useSubscribeToThread(),
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

    expect(result.current.subscription.status).toBe("subscribed");

    act(() => result.current.subscribeToThread(initialThread.id));

    await waitFor(() => expect(hasCalledSubscribeToThread).toEqual(true));

    expect(result.current.subscription.status).toBe("subscribed");

    unmount();
  });
});
