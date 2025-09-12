import "@testing-library/jest-dom";

import { batch, HttpError, nanoid, wait } from "@liveblocks/core";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { setupServer } from "msw/node";
import { Suspense } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";

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

describe("useInboxNotifications", () => {
  test("should fetch inbox notifications", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const inboxNotifications = [
      dummyThreadInboxNotificationData({ roomId, threadId: threads[0]!.id }),
    ];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
    ];

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
      liveblocks: { LiveblocksProvider, useInboxNotifications },
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

    unmount();
  });

  test("should be referentially stable after rerendering", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const inboxNotifications = [
      dummyThreadInboxNotificationData({ roomId, threadId: threads[0]!.id }),
    ];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
    ];

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
            subscriptions,
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
      liveblocks: { LiveblocksProvider, useInboxNotifications },
    } = createContextsForTest();

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
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    const oldResult = result.current;

    rerender();

    expect(result.current).toBe(oldResult);

    unmount();
  });

  test("multiple instances of useInboxNotifications should dedupe requests", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const inboxNotifications = [
      dummyThreadInboxNotificationData({ roomId, threadId: threads[0]!.id }),
    ];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
    ];

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
    let getInboxNotificationsReqCount = 0;

    server.use(
      mockGetInboxNotifications(async (_req, res, ctx) => {
        getInboxNotificationsReqCount++;
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
      liveblocks: { LiveblocksProvider, useInboxNotifications },
    } = createContextsForTest();

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
      liveblocks: { LiveblocksProvider, useInboxNotifications },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useInboxNotifications(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

    // An error will only be thrown after the initial load failed, which
    // happens after 5 retries (>1 minute) at earliest, so this is annoying
    // to test here.
    await wait(1000);

    expect(result.current).toEqual({ isLoading: true });

    unmount();
  });

  test("sort inbox notifications by notified at date before returning", async () => {
    const roomId = nanoid();
    const thread1 = dummyThreadData({ roomId });
    const oldInboxNotification = dummyThreadInboxNotificationData({
      roomId,
      threadId: thread1.id,
      notifiedAt: new Date("2021-01-01"),
    });
    const thread2 = dummyThreadData({ roomId });
    const newInboxNotification = dummyThreadInboxNotificationData({
      roomId,
      threadId: thread2.id,
      notifiedAt: new Date("2021-01-02"),
    });

    server.use(
      mockGetInboxNotifications(async (_req, res, ctx) => {
        return res(
          ctx.json({
            threads: [],
            inboxNotifications: [],
            subscriptions: [],
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
      liveblocks: { LiveblocksProvider, useInboxNotifications },
      umbrellaStore,
    } = createContextsForTest();

    // Initialize the umbrella store with some data
    batch(() => {
      umbrellaStore.threads.upsert(thread1);
      umbrellaStore.threads.upsert(thread2);
      umbrellaStore.notifications.upsert(oldInboxNotification);
      umbrellaStore.notifications.upsert(newInboxNotification);
    });

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
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
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
      liveblocks: { LiveblocksProvider, useInboxNotifications },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useInboxNotifications(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });
    await waitFor(() => expect(getInboxNotificationsReqCount).toBe(1));

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the inbox notifications should have been made after the first retry
    await waitFor(() => expect(getInboxNotificationsReqCount).toBe(2));
    expect(result.current).toEqual({ isLoading: true });

    // The second retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getInboxNotificationsReqCount).toBe(3));
    expect(result.current).toEqual({ isLoading: true });

    // The third retry should be made after 10s
    await jest.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(getInboxNotificationsReqCount).toBe(4));
    expect(result.current).toEqual({ isLoading: true });

    // The fourth retry should be made after 15s
    await jest.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(getInboxNotificationsReqCount).toBe(5));
    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        error: expect.any(Error),
      })
    );

    // Wait for 5 second for the error to clear
    await jest.advanceTimersByTimeAsync(5_000);
    expect(result.current).toEqual({ isLoading: true });
    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() => expect(getInboxNotificationsReqCount).toBe(6));

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getInboxNotificationsReqCount).toBe(7));
    expect(result.current).toEqual({ isLoading: true });

    // and so on...

    unmount();
  });

  test("should not retry if a 403 Forbidden response is received from server", async () => {
    server.use(
      mockGetInboxNotifications(async (_req, res, ctx) => {
        // Return a 403 status from the server for the initial fetch
        return res(ctx.status(403));
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useInboxNotifications },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useInboxNotifications(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        error: expect.any(HttpError),
      })
    );

    unmount();
  });
});

describe("useInboxNotifications - Suspense", () => {
  test("should be referentially stable after rerendering", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const inboxNotifications = [
      dummyThreadInboxNotificationData({ roomId, threadId: threads[0]!.id }),
    ];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
    ];

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
            subscriptions,
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
        suspense: { LiveblocksProvider, useInboxNotifications },
      },
    } = createContextsForTest();

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
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
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
  test("should poll inbox notifications every x seconds", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const inboxNotifications = [
      dummyThreadInboxNotificationData({ roomId, threadId: threads[0]!.id }),
    ];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
    ];

    let initialCount = 0;
    let pollerCount = 0;

    server.use(
      mockGetInboxNotifications(async (_req, res, ctx) => {
        initialCount++;
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
        pollerCount++;
        return res(
          ctx.json({
            threads,
            inboxNotifications,
            subscriptions,
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
      liveblocks: { LiveblocksProvider, useInboxNotifications },
    } = createContextsForTest();

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

    expect(initialCount).toBe(0);
    expect(pollerCount).toBe(0);

    const { unmount } = render(<Room />);

    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() => expect(initialCount).toBe(1));
    await waitFor(() => expect(pollerCount).toBe(0));

    // Wait for the first polling to occur after the initial render
    jest.advanceTimersByTime(60_000);
    expect(initialCount).toBe(1);
    await waitFor(() => expect(pollerCount).toBe(1));

    // Advance time to simulate the polling interval
    jest.advanceTimersByTime(60_000);
    // Wait for the second polling to occur
    expect(initialCount).toBe(1);
    await waitFor(() => expect(pollerCount).toBe(2));

    unmount();
  });

  test("should fetch inbox notifications for a given query", async () => {
    const roomA = nanoid();
    const roomB = nanoid();
    const threads = [
      dummyThreadData({ roomId: roomA }),
      dummyThreadData({ roomId: roomB }),
    ];
    const inboxNotifications = [
      dummyThreadInboxNotificationData({
        roomId: roomA,
        threadId: threads[0]!.id,
      }),
      dummyThreadInboxNotificationData({
        roomId: roomB,
        threadId: threads[1]!.id,
      }),
    ];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
    ];

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
      }),
      mockGetInboxNotificationsDelta(async (_req, res, ctx) => {
        return res(
          ctx.json({
            threads,
            inboxNotifications,
            subscriptions,
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
      liveblocks: { LiveblocksProvider, useInboxNotifications },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useInboxNotifications({ query: { roomId: roomA } }),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    expect(result.current).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        inboxNotifications: inboxNotifications.filter(
          (inboxNotification) => inboxNotification.roomId === roomA
        ),
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    unmount();

    const { result: result2, unmount: unmount2 } = renderHook(
      () => useInboxNotifications(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    expect(result2.current).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result2.current).toEqual({
        isLoading: false,
        inboxNotifications,
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    unmount2();
  });

  test("should restart polling after a component is remounted", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const inboxNotifications = [
      dummyThreadInboxNotificationData({ roomId, threadId: threads[0]!.id }),
    ];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
    ];

    let hasCalledGetNotifications = false;
    let pollerCount = 0;

    server.use(
      mockGetInboxNotifications(async (_req, res, ctx) => {
        hasCalledGetNotifications = true;
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
        pollerCount++;
        return res(
          ctx.json({
            threads,
            inboxNotifications,
            subscriptions,
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
      liveblocks: { LiveblocksProvider, useInboxNotifications },
    } = createContextsForTest();

    const Client = () => {
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

    expect(hasCalledGetNotifications).toBe(false);
    expect(pollerCount).toBe(0);

    const { unmount: unmountComp1 } = render(<Client />);

    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() => expect(hasCalledGetNotifications).toBe(true));
    expect(pollerCount).toBe(0);

    // Wait for the first polling to occur after the initial render
    await jest.advanceTimersByTimeAsync(60_000);
    await waitFor(() => expect(pollerCount).toBe(1));

    // Unmount Component 1 and verify that no new poll happens after the next interval
    unmountComp1();

    // Advance time by a lot to ensure no next poll happens
    await jest.advanceTimersByTimeAsync(999_999); // Wait a loooooooooooooooong time
    expect(pollerCount).toBe(1);

    // Mount Component 2 and verify that a new poll happens immediately (because the last time we polled was 999999ms ago)
    const { unmount: unmountComp2 } = render(<Client />);
    await waitFor(() => expect(pollerCount).toBe(2));

    // And polling keeps happening every 60s too
    await jest.advanceTimersByTimeAsync(60_000);
    await waitFor(() => expect(pollerCount).toBe(3));

    unmountComp2();
  });

  test("should poll immediately when document becomes visible if last poll was more than the set maximum stale time", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const inboxNotifications = [
      dummyThreadInboxNotificationData({ roomId, threadId: threads[0]!.id }),
    ];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
    ];

    let hasCalledGetNotifications = false;
    let pollerCount = 0;

    server.use(
      mockGetInboxNotifications(async (_req, res, ctx) => {
        hasCalledGetNotifications = true;
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
        pollerCount++;
        return res(
          ctx.json({
            threads,
            inboxNotifications,
            subscriptions,
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
      liveblocks: { LiveblocksProvider, useInboxNotifications },
    } = createContextsForTest();

    const Client = () => {
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

    expect(hasCalledGetNotifications).toBe(false);
    expect(pollerCount).toBe(0);

    const { unmount } = render(<Client />);

    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() => expect(hasCalledGetNotifications).toBe(true));
    expect(pollerCount).toBe(0);

    // Wait for the first polling to occur after the initial render
    await jest.advanceTimersByTimeAsync(60_000);
    await waitFor(() => expect(pollerCount).toBe(1));

    // Advance 10 seconds (more than the the currently set maximum stale time, 5000)
    await jest.advanceTimersByTimeAsync(10_000);

    // Dispatch a `visibilitychange` event and verify that when the document becomes
    // visible a new poll happens since more than 5000 ms has passed since the last poll
    document.dispatchEvent(new Event("visibilitychange"));

    await waitFor(() => expect(pollerCount).toBe(2));

    unmount();
  });
});

describe("useInboxNotificationsSuspense: error", () => {
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
      liveblocks: {
        suspense: { LiveblocksProvider, useInboxNotifications },
      },
    } = createContextsForTest();

    function Fallback({ resetErrorBoundary }: FallbackProps) {
      return (
        <div>
          <p>Oops, error grabbing inbox notifications.</p>
          <button onClick={resetErrorBoundary}>Retry</button>
        </div>
      );
    }

    const { result, unmount } = renderHook(() => useInboxNotifications(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>
          <ErrorBoundary FallbackComponent={Fallback}>
            <Suspense fallback="Loading, yo">{children}</Suspense>
          </ErrorBoundary>
        </LiveblocksProvider>
      ),
    });

    // Hook did not return a value. Instead, an error was thrown
    expect(result.current).toEqual(null);

    expect(screen.getByText("Loading, yo")).toBeInTheDocument();

    // Wait until all fetch attempts have been done
    await act(() => jest.advanceTimersToNextTimerAsync()); // fetch attempt 1
    await act(() => jest.advanceTimersByTimeAsync(5_000)); // fetch attempt 2
    await act(() => jest.advanceTimersByTimeAsync(5_000)); // fetch attempt 3
    await act(() => jest.advanceTimersByTimeAsync(10_000)); // fetch attempt 4
    await act(() => jest.advanceTimersByTimeAsync(15_000)); // fetch attempt 5

    // Check if the error boundary's fallback is displayed
    expect(
      screen.getByText("Oops, error grabbing inbox notifications.")
    ).toBeInTheDocument();

    // Wait until the error boundary auto-clears
    await act(() => jest.advanceTimersByTimeAsync(5_000));

    // Simulate clicking the retry button
    fireEvent.click(screen.getByText("Retry"));

    // The error boundary's fallback should be cleared
    expect(screen.getByText("Loading, yo")).toBeInTheDocument();

    unmount();
  });

  test("loads initial inbox notification data, even if there is a fetch hiccup", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const inboxNotifications = [
      dummyThreadInboxNotificationData({ roomId, threadId: threads[0]!.id }),
    ];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
    ];

    let n = 0;
    server.use(
      mockGetInboxNotifications((_req, res, ctx) => {
        n++;
        if (n <= 1) {
          // Mock an error response from the server
          return res(ctx.status(500));
        }

        // Mock a successful response from the server for the subsequent fetches
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
      liveblocks: {
        suspense: { LiveblocksProvider, useInboxNotifications },
      },
    } = createContextsForTest();

    function Fallback({ resetErrorBoundary }: FallbackProps) {
      return (
        <div>
          <p>Oops, couldnt load notifications.</p>
          <button onClick={resetErrorBoundary}>Retry</button>
        </div>
      );
    }

    const { result, unmount } = renderHook(() => useInboxNotifications(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>
          <ErrorBoundary FallbackComponent={Fallback}>
            <Suspense fallback="Loading your notifications">
              <div>Done loading!</div>
              {children}
            </Suspense>
          </ErrorBoundary>
        </LiveblocksProvider>
      ),
    });

    expect(result.current).toEqual(null);
    expect(screen.getByText("Loading your notifications")).toBeInTheDocument();

    // Wait until all fetch attempts have been done
    await act(() => jest.advanceTimersToNextTimerAsync()); // fetch attempt 1

    // Check if the error boundary's fallback is displayed
    expect(screen.getByText("Done loading!")).toBeInTheDocument();

    unmount();
  });
});

describe("useInboxNotifications: pagination", () => {
  test("should load the next page of data when `fetchMore` is called", async () => {
    const roomId = nanoid();

    const thread1 = dummyThreadData({ roomId, createdAt: new Date("2021-01-01") }); // prettier-ignore
    const thread2 = dummyThreadData({ roomId, createdAt: new Date("2021-01-02") }); // prettier-ignore
    const thread3 = dummyThreadData({ roomId, createdAt: new Date("2021-01-03") }); // prettier-ignore

    const inboxNotificationsPage1 = [
      dummyThreadInboxNotificationData({
        roomId,
        threadId: thread1.id,
        notifiedAt: new Date("2021-01-03"),
      }),
    ];
    const inboxNotificationsPage2 = [
      dummyThreadInboxNotificationData({
        roomId,
        threadId: thread2.id,
        notifiedAt: new Date("2021-01-02"),
      }),
    ];
    const inboxNotificationsPage3 = [
      dummyThreadInboxNotificationData({
        roomId,
        threadId: thread3.id,
        notifiedAt: new Date("2021-01-01"),
      }),
    ];

    const subscriptionsPage1 = [
      dummySubscriptionData({ subjectId: thread1.id }),
    ];
    const subscriptionsPage2 = [
      dummySubscriptionData({ subjectId: thread2.id }),
    ];
    const subscriptionsPage3 = [
      dummySubscriptionData({ subjectId: thread3.id }),
    ];

    let isPage1Requested = false;
    let isPage2Requested = false;
    let isPage3Requested = false;

    server.use(
      mockGetInboxNotifications(async (req, res, ctx) => {
        const url = new URL(req.url);
        const cursor = url.searchParams.get("cursor");

        // Request for Page 2
        if (cursor === "cursor-1") {
          isPage2Requested = true;
          return res(
            ctx.json({
              threads: [thread2],
              inboxNotifications: inboxNotificationsPage2,
              subscriptions: subscriptionsPage2,
              groups: [],
              meta: {
                requestedAt: new Date().toISOString(),
                nextCursor: "cursor-2",
              },
            })
          );
        }
        // Request for Page 3
        else if (cursor === "cursor-2") {
          isPage3Requested = true;
          return res(
            ctx.json({
              threads: [thread3],
              inboxNotifications: inboxNotificationsPage3,
              subscriptions: subscriptionsPage3,
              groups: [],
              meta: {
                requestedAt: new Date().toISOString(),
                nextCursor: "cursor-3",
              },
            })
          );
        }
        // Request for the first page
        else {
          isPage1Requested = true;
          return res(
            ctx.json({
              threads: [thread1],
              inboxNotifications: inboxNotificationsPage1,
              subscriptions: subscriptionsPage1,
              groups: [],
              meta: {
                requestedAt: new Date().toISOString(),
                nextCursor: "cursor-1",
              },
            })
          );
        }
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
      liveblocks: { LiveblocksProvider, useInboxNotifications },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useInboxNotifications(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });

    expect(result.current).toEqual({
      isLoading: true,
    });

    expect(result.current).toEqual({ isLoading: true });

    // Initial load (Page 1)
    await waitFor(() => expect(isPage1Requested).toBe(true));
    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        inboxNotifications: [...inboxNotificationsPage1],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: false,
        fetchMoreError: undefined,
      })
    );

    const fetchMore = result.current.fetchMore!;

    // Fetch Page 2
    fetchMore();
    await waitFor(() => expect(isPage2Requested).toBe(true));
    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        inboxNotifications: [
          ...inboxNotificationsPage1,
          ...inboxNotificationsPage2,
        ],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: false,
        fetchMoreError: undefined,
      })
    );

    // Fetch Page 3
    fetchMore();
    await waitFor(() => expect(isPage3Requested).toBe(true));
    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        inboxNotifications: [
          ...inboxNotificationsPage1,
          ...inboxNotificationsPage2,
          ...inboxNotificationsPage3,
        ],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: false,
        fetchMoreError: undefined,
      })
    );

    unmount();
  });

  test("should set `hasFetchedAll` to true when there are no more pages to fetch", async () => {
    const roomId = nanoid();

    const threadOne = dummyThreadData({
      roomId,
      createdAt: new Date("2021-01-02T00:00:00Z"),
    });
    const threadTwo = dummyThreadData({
      roomId,
      createdAt: new Date("2021-01-01T00:00:00Z"),
    });

    const inboxNotificationsPageOne = [
      dummyThreadInboxNotificationData({
        roomId,
        threadId: threadOne.id,
        notifiedAt: new Date("2021-01-02T00:01:00Z"),
      }),
    ];
    const inboxNotificationsPageTwo = [
      dummyThreadInboxNotificationData({
        roomId,
        threadId: threadTwo.id,
        notifiedAt: new Date("2021-01-01T00:01:00Z"),
      }),
    ];

    const subscriptionsPageOne = [
      dummySubscriptionData({ subjectId: threadOne.id }),
    ];
    const subscriptionsPageTwo = [
      dummySubscriptionData({ subjectId: threadTwo.id }),
    ];

    let isPageTwoRequested = false;
    let getNotificationsReqCount = 0;

    server.use(
      mockGetInboxNotifications(async (req, res, ctx) => {
        getNotificationsReqCount++;
        const url = new URL(req.url);
        const cursor = url.searchParams.get("cursor");

        // Request for Page 2 (final page)
        if (cursor === "cursor-1") {
          isPageTwoRequested = true;
          return res(
            ctx.json({
              threads: [threadTwo],
              inboxNotifications: inboxNotificationsPageTwo,
              subscriptions: subscriptionsPageTwo,
              groups: [],
              meta: {
                requestedAt: new Date().toISOString(),
                nextCursor: null,
              },
            })
          );
        }
        // Request for the first page
        else {
          return res(
            ctx.json({
              threads: [threadOne],
              inboxNotifications: inboxNotificationsPageOne,
              subscriptions: subscriptionsPageOne,
              groups: [],
              meta: {
                requestedAt: new Date().toISOString(),
                nextCursor: "cursor-1",
              },
            })
          );
        }
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useInboxNotifications },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useInboxNotifications(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

    // Initial load (Page 1)
    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        inboxNotifications: [...inboxNotificationsPageOne],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: false,
        fetchMoreError: undefined,
      })
    );
    expect(getNotificationsReqCount).toEqual(1);

    const fetchMore = result.current.fetchMore!;

    // Fetch Page 2 (final page)
    fetchMore();
    await waitFor(() => expect(isPageTwoRequested).toBe(true));
    expect(getNotificationsReqCount).toEqual(2);
    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        inboxNotifications: [
          ...inboxNotificationsPageOne,
          ...inboxNotificationsPageTwo,
        ],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    unmount();
  });

  test("should handle error while fetching more and set fetchMoreError", async () => {
    const roomId = nanoid();

    const threadOne = dummyThreadData({ roomId });

    let isPageTwoRequested = false;

    const inboxNotificationsPageOne = [
      dummyThreadInboxNotificationData({
        roomId,
        threadId: threadOne.id,
      }),
    ];

    const subscriptionsPageOne = [
      dummySubscriptionData({ subjectId: threadOne.id }),
    ];

    server.use(
      mockGetInboxNotifications(async (req, res, ctx) => {
        const url = new URL(req.url);
        const cursor = url.searchParams.get("cursor");

        // Initial load (Page 1)
        if (cursor === null) {
          return res(
            ctx.json({
              threads: [threadOne],
              inboxNotifications: inboxNotificationsPageOne,
              subscriptions: subscriptionsPageOne,
              groups: [],
              meta: {
                requestedAt: new Date().toISOString(),
                nextCursor: "cursor-1",
              },
            })
          );
        }
        // Page 2
        else {
          isPageTwoRequested = true;
          return res(ctx.status(500));
        }
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useInboxNotifications },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useInboxNotifications(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

    // Initial load (Page 1)
    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        inboxNotifications: [...inboxNotificationsPageOne],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: false,
        fetchMoreError: undefined,
      })
    );

    const fetchMore = result.current.fetchMore!;

    // Fetch Page 2 (which returns an error)
    fetchMore();

    await waitFor(() => expect(isPageTwoRequested).toBe(true));
    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        inboxNotifications: [...inboxNotificationsPageOne],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: false,
        fetchMoreError: expect.any(Error),
      })
    );

    unmount();
  });
});
