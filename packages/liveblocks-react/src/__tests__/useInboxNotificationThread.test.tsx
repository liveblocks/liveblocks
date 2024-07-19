import "@testing-library/jest-dom";

import { renderHook, waitFor } from "@testing-library/react";
import { sorted } from "itertools";
import { setupServer } from "msw/node";
import { nanoid } from "nanoid";
import React from "react";

import {
  dummyCustomInboxNoficationData,
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
      threadId: threads[0].id,
    });
    const inboxNotifications = [inboxNotification];

    server.use(
      mockGetInboxNotifications(async (_req, res, ctx) => {
        return res(
          ctx.json({
            threads,
            inboxNotifications,
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        );
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
      threadId: threads[0].id,
    });
    const customInboxNotification = dummyCustomInboxNoficationData();
    const inboxNotifications = [inboxNotification, customInboxNotification];

    server.use(
      mockGetInboxNotifications(async (_req, res, ctx) => {
        return res(
          ctx.json({
            threads: [],
            inboxNotifications,
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        );
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
    expect(() =>
      renderHook(() => useInboxNotificationThread(inboxNotification.id), {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      })
    ).toThrow(`Thread with ID "${threads[0].id}" not found`);

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
