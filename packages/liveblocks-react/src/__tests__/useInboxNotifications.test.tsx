import "@testing-library/jest-dom";

import { createClient, kInternal } from "@liveblocks/core";
import {
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { setupServer } from "msw/node";
import React, { Suspense } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";

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

  test("sort inbox notifications by notified at date before returning", async () => {
    const thread1 = dummyThreadData();
    const oldInboxNotification = dummyInboxNoficationData();
    oldInboxNotification.threadId = thread1.id;
    oldInboxNotification.notifiedAt = new Date("2021-01-01");

    const thread2 = dummyThreadData();
    const newInboxNotification = dummyInboxNoficationData();
    newInboxNotification.threadId = thread2.id;
    newInboxNotification.notifiedAt = new Date("2021-01-02");

    server.use(
      mockGetInboxNotifications(async (_req, res, ctx) => {
        return res(
          ctx.json({
            threads: [],
            inboxNotifications: [],
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
      isLoading: true,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        inboxNotifications: [newInboxNotification, oldInboxNotification],
      })
    );

    unmount();
  });
});

describe("useInboxNotifications: error", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers(); // Restores the real timers
  });

  test("should retry with exponential backoff on error", async () => {
    let getInboxNotificationsReqCount = 0;
    server.use(
      mockGetInboxNotifications(async (_req, res, ctx) => {
        getInboxNotificationsReqCount++;
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

    // Unmount so polling doesn't interfere with the test
    unmount();

    // The first retry should be made after 5000ms * 2^0 (5000ms is the currently set error retry interval)
    jest.advanceTimersByTime(5000);
    // A new fetch request for the inbox notifications should have been made after the first retry
    await waitFor(() => expect(getInboxNotificationsReqCount).toBe(2));

    // The second retry should be made after 5000ms * 2^1
    jest.advanceTimersByTime(5000 * Math.pow(2, 1));
    await waitFor(() => expect(getInboxNotificationsReqCount).toBe(3));

    // The third retry should be made after 5000ms * 2^2
    jest.advanceTimersByTime(5000 * Math.pow(2, 2));
    await waitFor(() => expect(getInboxNotificationsReqCount).toBe(4));

    // The fourth retry should be made after 5000ms * 2^3
    jest.advanceTimersByTime(5000 * Math.pow(2, 3));
    await waitFor(() => expect(getInboxNotificationsReqCount).toBe(5));

    // and so on...
  });

  test("should retry with exponential backoff with a maximum retry limit", async () => {
    let getInboxNotificationsReqCount = 0;
    server.use(
      mockGetInboxNotifications(async (_req, res, ctx) => {
        getInboxNotificationsReqCount++;
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

    // Unmount so polling doesn't interfere with the test
    unmount();

    // Simulate retries up to maximum retry count (currently set to 5)
    for (let i = 0; i < 5; i++) {
      const interval = 5000 * Math.pow(2, i); // 5000ms is the currently set error retry interval

      jest.advanceTimersByTime(interval);

      await waitFor(() => expect(getInboxNotificationsReqCount).toBe(i + 2));
    }

    expect(getInboxNotificationsReqCount).toBe(1 + 5); // initial request + 5 retries

    // No more retries should be made after the maximum number of retries
    await jest.advanceTimersByTimeAsync(5 * Math.pow(2, 5));

    // The number of requests should not have increased after the maximum number of retries
    expect(getInboxNotificationsReqCount).toBe(1 + 5);
  });

  test("should retry with exponential backoff with a maximum retry limit", async () => {
    let getInboxNotificationsReqCount = 0;
    server.use(
      mockGetInboxNotifications(async (_req, res, ctx) => {
        getInboxNotificationsReqCount++;
        if (getInboxNotificationsReqCount === 1) {
          return res(ctx.status(500));
        } else {
          return res(
            ctx.json({
              threads: [],
              inboxNotifications: [],
              deletedThreads: [],
              deletedInboxNotifications: [],
              meta: {
                requestedAt: new Date().toISOString(),
              },
            })
          );
        }
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

    // The first retry should be made after 5000ms * 2^0 (5000ms is the currently set error retry interval)
    jest.advanceTimersByTime(5000);
    // A new fetch request for inbox notifications should have been made after the first retry
    await waitFor(() => expect(getInboxNotificationsReqCount).toBe(2));

    expect(result.current).toEqual({
      inboxNotifications: [],
      isLoading: false,
    });

    // No more retries should be made after successful retry
    await jest.advanceTimersByTimeAsync(5000 * Math.pow(2, 1));
    expect(getInboxNotificationsReqCount).toBe(2);

    // Unmount so polling doesn't interfere with the test
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

describe("useThreadsSuspense: error", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers(); // Restores the real timers
  });

  test("should trigger error boundary if initial fetch throws an error", async () => {
    server.use(
      mockGetInboxNotifications((_req, res, ctx) => {
        // Mock an error response from the server for the initial fetch
        return res(ctx.status(500));
      })
    );

    const {
      liveblocksCtx: {
        suspense: { LiveblocksProvider, useInboxNotifications },
      },
    } = createLiveblocksContextForTest();

    function Fallback({ resetErrorBoundary }: FallbackProps) {
      return (
        <div>
          <p>There was an error while getting inbox notifications.</p>
          <button onClick={resetErrorBoundary}>Retry</button>
        </div>
      );
    }

    const { result, unmount } = renderHook(() => useInboxNotifications(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>
          <ErrorBoundary FallbackComponent={Fallback}>
            <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
          </ErrorBoundary>
        </LiveblocksProvider>
      ),
    });

    expect(result.current).toEqual(null);

    await waitFor(() =>
      // Check if the error boundary's fallback is displayed
      expect(
        screen.getByText(
          "There was an error while getting inbox notifications."
        )
      ).toBeInTheDocument()
    );

    unmount();
  });

  test("should retry with exponential backoff on error and clear error boundary", async () => {
    const threads = [dummyThreadData()];
    const inboxNotification = dummyInboxNoficationData();
    inboxNotification.threadId = threads[0].id;
    const inboxNotifications = [inboxNotification];

    let getInboxNotificationsReqCount = 0;
    server.use(
      mockGetInboxNotifications((_req, res, ctx) => {
        getInboxNotificationsReqCount++;

        if (getInboxNotificationsReqCount === 1) {
          // Mock an error response from the server
          return res(ctx.status(500));
        } else {
          // Mock a successful response from the server for the subsequent fetches
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
        }
      })
    );

    const {
      liveblocksCtx: {
        suspense: { LiveblocksProvider, useInboxNotifications },
      },
    } = createLiveblocksContextForTest();

    function Fallback({ resetErrorBoundary }: FallbackProps) {
      return (
        <div>
          <p>There was an error while getting inbox notifications.</p>
          <button onClick={resetErrorBoundary}>Retry</button>
        </div>
      );
    }

    const { result, unmount } = renderHook(() => useInboxNotifications(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>
          <ErrorBoundary FallbackComponent={Fallback}>
            <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
          </ErrorBoundary>
        </LiveblocksProvider>
      ),
    });

    expect(result.current).toEqual(null);

    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() => expect(getInboxNotificationsReqCount).toBe(1));
    // Check if the error boundary's fallback is displayed
    expect(
      screen.getByText("There was an error while getting inbox notifications.")
    ).toBeInTheDocument();

    // The first retry should be made after 5000ms * 2^0 (5000ms is the currently set error retry interval)
    jest.advanceTimersByTime(5000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getInboxNotificationsReqCount).toBe(2));

    // Simulate clicking the retry button
    fireEvent.click(screen.getByText("Retry"));

    // The error boundary's fallback should be cleared
    expect(
      screen.queryByText(
        "There was an error while getting inbox notifications."
      )
    ).not.toBeInTheDocument();

    expect(result.current).toEqual({
      isLoading: false,
      inboxNotifications,
    });

    unmount();
  });
});
