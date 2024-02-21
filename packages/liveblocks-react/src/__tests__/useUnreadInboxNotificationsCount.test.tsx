import "@testing-library/jest-dom";

import { createClient } from "@liveblocks/core";
import { renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import React, { Suspense } from "react";

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

  return createLiveblocksContext(client);
}

describe("useUnreadInboxNotificationsCount", () => {
  test("should fetch inbox notifications", async () => {
    const threads = [dummyThreadData()];
    const inboxNotification = dummyInboxNoficationData();
    inboxNotification.readAt = null;
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

    const { LiveblocksProvider, useUnreadInboxNotificationsCount } =
      createLiveblocksContextForTest();

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
    const threads = [dummyThreadData()];
    const inboxNotification = dummyInboxNoficationData();
    inboxNotification.threadId = threads[0].id;
    inboxNotification.readAt = null;
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
      suspense: { LiveblocksProvider, useUnreadInboxNotificationsCount },
    } = createLiveblocksContextForTest();

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
