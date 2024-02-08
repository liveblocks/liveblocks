import "@testing-library/jest-dom";

import { createClient, kInternal } from "@liveblocks/core";
import { render, renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import React, { Suspense } from "react";

import {
  createLiveblocksContext,
  INBOX_NOTIFICATIONS_QUERY,
  POLLING_INTERVAL,
} from "../liveblocks";
import { dummyInboxNoficationData, dummyThreadData } from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import { mockGetInboxNotifications } from "./_restMocks";
import { generateFakeJwt } from "./_utils";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

beforeEach(() => {
  MockWebSocket.instances = [];
});

afterEach(() => {
  MockWebSocket.instances = [];
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

describe("useInboxNotifications", () => {
  test("should fetch inbox notifications", async () => {
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
      liveblocksCtx: { LiveblocksProvider, useInboxNotifications },
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

    unmount();
  });

  test("should be referentially stable after rerendering", async () => {
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
      liveblocksCtx: { LiveblocksProvider, useInboxNotifications },
    } = createLiveblocksContextForTest();

    const { result, unmount, rerender } = renderHook(
      () => useInboxNotifications(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        inboxNotifications,
      })
    );

    const oldResult = result.current;

    rerender();

    expect(result.current).toBe(oldResult);

    unmount();
  });

  test("multiple instances of useInboxNotifications should dedupe requests", async () => {
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
    let getInboxNotificationsReqCount = 0;

    server.use(
      mockGetInboxNotifications(async (_req, res, ctx) => {
        getInboxNotificationsReqCount++;
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
      liveblocksCtx: { LiveblocksProvider, useInboxNotifications },
    } = createLiveblocksContextForTest();

    const { rerender, unmount } = renderHook(
      () => {
        useInboxNotifications();
        useInboxNotifications();
        useInboxNotifications();
      },
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    await waitFor(() => expect(getInboxNotificationsReqCount).toBe(1));

    rerender();

    expect(getInboxNotificationsReqCount).toBe(1);

    unmount();
  });

  test("should return an error if initial call if failing", async () => {
    server.use(
      mockGetInboxNotifications(async (_req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    const {
      liveblocksCtx: { LiveblocksProvider, useInboxNotifications },
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
        error: expect.any(Error),
      })
    );

    unmount();
  });

  test("sort inbox notifications by notified at date before returning", () => {
    const thread1 = dummyThreadData();
    const oldInboxNotification = dummyInboxNoficationData();
    oldInboxNotification.threadId = thread1.id;
    oldInboxNotification.notifiedAt = new Date("2021-01-01");

    const thread2 = dummyThreadData();
    const newInboxNotification = dummyInboxNoficationData();
    newInboxNotification.threadId = thread2.id;
    newInboxNotification.notifiedAt = new Date("2021-01-02");

    const {
      liveblocksCtx: { LiveblocksProvider, useInboxNotifications },
      client,
    } = createLiveblocksContextForTest();

    const store = client[kInternal].cacheStore;
    store.set((state) => ({
      ...state,
      inboxNotifications: {
        // Explicitly set the order to be reversed to test that the hook sorts the notifications
        [oldInboxNotification.id]: oldInboxNotification,
        [newInboxNotification.id]: newInboxNotification,
      },
      queries: {
        [INBOX_NOTIFICATIONS_QUERY]: {
          isLoading: false,
        },
      },
    }));

    const { result, unmount } = renderHook(() => useInboxNotifications(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });

    expect(result.current).toEqual({
      isLoading: false,
      inboxNotifications: [newInboxNotification, oldInboxNotification],
    });

    unmount();
  });
});

describe("useInboxNotifications - Suspense", () => {
  test("should be referentially stable after rerendering", async () => {
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
        suspense: { LiveblocksProvider, useInboxNotifications },
      },
    } = createLiveblocksContextForTest();

    const { result, unmount, rerender } = renderHook(
      () => useInboxNotifications(),
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
        inboxNotifications,
      })
    );

    const oldResult = result.current;

    rerender();

    expect(result.current).toBe(oldResult);

    unmount();
  });
});

describe("useInboxNotifications: polling", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });
  test("should poll threads every x seconds", async () => {
    let getInboxNotificationsReqCount = 0;

    const threads = [dummyThreadData()];
    const inboxNotification = dummyInboxNoficationData();
    inboxNotification.threadId = threads[0].id;
    const inboxNotifications = [inboxNotification];

    server.use(
      mockGetInboxNotifications(async (_req, res, ctx) => {
        getInboxNotificationsReqCount++;
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
      liveblocksCtx: { LiveblocksProvider, useInboxNotifications },
    } = createLiveblocksContextForTest();

    const Room = () => {
      return (
        <LiveblocksProvider>
          <InboxNotifications />
        </LiveblocksProvider>
      );
    };

    const InboxNotifications = () => {
      useInboxNotifications();
      return null;
    };

    const { unmount } = render(<Room />);

    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() => expect(getInboxNotificationsReqCount).toBe(1));

    // Wait for the first polling to occur after the initial render
    jest.advanceTimersByTime(POLLING_INTERVAL);
    await waitFor(() => expect(getInboxNotificationsReqCount).toBe(2));

    // Advance time to simulate the polling interval
    jest.advanceTimersByTime(POLLING_INTERVAL);
    // Wait for the second polling to occur
    await waitFor(() => expect(getInboxNotificationsReqCount).toBe(3));

    unmount();
  });
});
