import { nanoid } from "@liveblocks/core";
import { renderHook, waitFor } from "@testing-library/react";
import { sorted } from "itertools";
import { HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

import {
  dummyCustomInboxNoficationData,
  dummySubscriptionData,
  dummyThreadData,
  dummyThreadInboxNotificationData,
} from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import { mockGetInboxNotifications } from "./_restMocks";
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

describe("useInboxNotificationThread", () => {
  test("should return a thread after notifications are fetched", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const inboxNotification = dummyThreadInboxNotificationData({
      roomId,
      threadId: threads[0]!.id,
    });
    const inboxNotifications = [inboxNotification];

    server.use(
      mockGetInboxNotifications(() => {
        return HttpResponse.json({
          threads,
          inboxNotifications,
          subscriptions: [],
          meta: {
            requestedAt: new Date().toISOString(),
            nextCursor: null,
          },
        });
      })
    );

    const {
      liveblocks: {
        LiveblocksProvider,
        useInboxNotifications,
        useInboxNotificationThread,
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useInboxNotifications(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });

    expect(result.current).toEqual({
      isLoading: true,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        inboxNotifications,
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    const { result: threadResult, rerender } = renderHook(
      () => useInboxNotificationThread(inboxNotification.id),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    expect(threadResult.current).toEqual(threads[0]);

    const oldResult = threadResult.current;

    rerender();

    expect(threadResult.current).toEqual(oldResult);

    unmount();
  });

  test("it should throw when the notification is not found or the thread is not found", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const inboxNotification = dummyThreadInboxNotificationData({
      roomId,
      threadId: threads[0]!.id,
    });
    const customInboxNotification = dummyCustomInboxNoficationData();
    const inboxNotifications = [inboxNotification, customInboxNotification];

    server.use(
      mockGetInboxNotifications(() => {
        return HttpResponse.json({
          threads: [], // NOTE! Not setting the thread ID, making it a broken reference from the inbox notification
          inboxNotifications,
          subscriptions: [],
          meta: {
            requestedAt: new Date().toISOString(),
            nextCursor: null,
          },
        });
      })
    );

    const {
      liveblocks: {
        LiveblocksProvider,
        useInboxNotifications,
        useInboxNotificationThread,
      },
    } = createContextsForTest();

    // Use the hook without fetching the notifications should throw
    expect(() =>
      renderHook(() => useInboxNotificationThread(inboxNotification.id), {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      })
    ).toThrow(`Inbox notification with ID "${inboxNotification.id}" not found`);

    const { result, unmount } = renderHook(() => useInboxNotifications(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });

    expect(result.current).toEqual({
      isLoading: true,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        inboxNotifications: expect.any(Array),
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    expect(sorted(result.current.inboxNotifications!, (ibn) => ibn.id)).toEqual(
      [
        // NOTE: `inboxNotification` is missing here! It's been "hidden" because the associated thread does not exist!
        customInboxNotification,
      ]
    );

    // Use the hook with a notification that does not exist should throw
    expect(() =>
      renderHook(() => useInboxNotificationThread("not-found"), {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      })
    ).toThrow('Inbox notification with ID "not-found" not found');

    // Use the hook with a notification that has a thread that does not exist should throw
    // This should never happen in practice, but we should handle it
    expect(() =>
      renderHook(() => useInboxNotificationThread(inboxNotification.id), {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      })
    ).toThrow(`Thread with ID "${threads[0]!.id}" not found`);

    // Use the hook with a custom notification should throw
    expect(() =>
      renderHook(() => useInboxNotificationThread(customInboxNotification.id), {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      })
    ).toThrow(
      `Inbox notification with ID "${customInboxNotification.id}" is not of kind "thread"`
    );

    unmount();
  });

  test("it should return the associated thread for the notification", async () => {
    const roomId = nanoid();
    const thread1 = dummyThreadData({ roomId });
    const threads = [thread1];
    const inboxNotification = dummyThreadInboxNotificationData({
      roomId,
      threadId: thread1.id,
    });
    const subscription1 = dummySubscriptionData({ subjectId: thread1.id });
    const subscriptions = [subscription1];
    const customInboxNotification = dummyCustomInboxNoficationData();
    const inboxNotifications = [inboxNotification, customInboxNotification];

    server.use(
      mockGetInboxNotifications(() => {
        return HttpResponse.json({
          threads,
          inboxNotifications,
          subscriptions,
          meta: {
            requestedAt: new Date().toISOString(),
            nextCursor: null,
          },
        });
      })
    );

    const {
      liveblocks: {
        LiveblocksProvider,
        useInboxNotifications,
        useInboxNotificationThread,
      },
    } = createContextsForTest();

    // Use the hook without fetching the notifications should throw
    expect(() =>
      renderHook(() => useInboxNotificationThread(inboxNotification.id), {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      })
    ).toThrow(`Inbox notification with ID "${inboxNotification.id}" not found`);

    const { result, unmount } = renderHook(() => useInboxNotifications(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });

    expect(result.current).toEqual({
      isLoading: true,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        inboxNotifications: expect.any(Array),
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    const sortedNotifications = sorted(inboxNotifications, (ibn) => ibn.id);
    expect(sorted(result.current.inboxNotifications!, (ibn) => ibn.id)).toEqual(
      sortedNotifications
    );

    // Use the hook with a notification that does not exist should throw
    expect(() =>
      renderHook(() => useInboxNotificationThread("not-found"), {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      })
    ).toThrow('Inbox notification with ID "not-found" not found');

    // Use the hook with a notification that has a thread that does not exist should throw
    // This should never happen in practice, but we should handle it

    const { result: result2 } = renderHook(
      () => useInboxNotificationThread(inboxNotification.id),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );
    expect(result2.current).toEqual(thread1);

    // Use the hook with a custom notification should throw
    expect(() =>
      renderHook(() => useInboxNotificationThread(customInboxNotification.id), {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      })
    ).toThrow(
      `Inbox notification with ID "${customInboxNotification.id}" is not of kind "thread"`
    );

    unmount();
  });
});
