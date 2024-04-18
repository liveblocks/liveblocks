import "@testing-library/jest-dom";

import { createClient } from "@liveblocks/core";
import { renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import React from "react";

import { createLiveblocksContext } from "../liveblocks";
import { dummyInboxNoficationData, dummyThreadData } from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import { mockGetInboxNotifications } from "./_restMocks";
import { generateFakeJwt } from "./_utils";

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

// TODO: Dry up and create utils that wrap renderHook
function createLiveblocksContextForTest() {
  const client = createClient({
    async authEndpoint() {
      return {
        token: await generateFakeJwt({ userId: "userId" }),
      };
    },
    polyfills: {
      WebSocket: MockWebSocket as any,
    },
  });

  return { liveblocksCtx: createLiveblocksContext(client), client };
}

describe("useInboxNotificationThread", () => {
  test("should return a thread after notifications are fetched", async () => {
    const threads = [dummyThreadData()];
    const inboxNotification = dummyInboxNoficationData();
    inboxNotification.threadId = threads[0].id;
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
      liveblocksCtx: {
        LiveblocksProvider,
        useInboxNotifications,
        useInboxNotificationThread,
      },
    } = createLiveblocksContextForTest();

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
    const threads = [dummyThreadData()];
    const inboxNotification = dummyInboxNoficationData();
    inboxNotification.threadId = threads[0].id;
    const inboxNotifications = [inboxNotification];

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
      liveblocksCtx: {
        LiveblocksProvider,
        useInboxNotifications,
        useInboxNotificationThread,
      },
    } = createLiveblocksContextForTest();

    // Use the hook without fetching the notifications should throw
    expect(() =>
      renderHook(() => useInboxNotificationThread(inboxNotification.id), {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      })
    ).toThrow(`Inbox notification with id "${inboxNotification.id}" not found`);

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

    // Use the hook with a notification that does not exist should throw
    expect(() =>
      renderHook(() => useInboxNotificationThread("not-found"), {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      })
    ).toThrow('Inbox notification with id "not-found" not found');

    // Use the hook with a notification that has a thread that does not exist should throw
    // This should never happen in practice, but we should handle it
    expect(() =>
      renderHook(() => useInboxNotificationThread(inboxNotification.id), {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      })
    ).toThrow(`Thread with id "${threads[0].id}" not found`);

    unmount();
  });
});
