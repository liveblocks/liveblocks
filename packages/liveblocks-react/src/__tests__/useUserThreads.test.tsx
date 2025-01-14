import "@testing-library/jest-dom";

import type {
  InboxNotificationData,
  ThreadData,
  ThreadDataWithDeleteInfo,
} from "@liveblocks/core";
import { HttpError, nanoid, Permission } from "@liveblocks/core";
import type { AST } from "@liveblocks/query-parser";
import { QueryParser } from "@liveblocks/query-parser";
import { fireEvent, renderHook, screen, waitFor } from "@testing-library/react";
import {
  type ResponseResolver,
  rest,
  type RestContext,
  type RestRequest,
} from "msw";
import { setupServer } from "msw/node";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { dummyThreadData } from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import { createContextsForTest } from "./_utils";

const server = setupServer();

const parser = new QueryParser({
  fields: {},
  indexableFields: {
    metadata: "mixed",
  },
});

const getFilter = (
  clauses: AST.Clause[],
  indexedFieldKey: string,
  filterKey: string
) => {
  const filter = clauses.find(
    (clause) =>
      clause.field._kind === "IndexedField" &&
      clause.field.base.name === indexedFieldKey &&
      clause.field.key === filterKey
  );

  return {
    key: filter?.field._kind === "IndexedField" ? filter.field.key : "",
    operator: filter?.operator.op,
    value: filter?.value.value,
  };
};

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

beforeEach(() => {
  MockWebSocket.reset();
});

afterEach(() => {
  MockWebSocket.reset();
  server.resetHandlers();
  jest.clearAllTimers();
  jest.clearAllMocks();
});

afterAll(() => server.close());

function mockGetUserThreads(
  resolver: ResponseResolver<
    RestRequest<never, { roomId: string }>,
    RestContext,
    {
      threads: ThreadData[];
      inboxNotifications: InboxNotificationData[];
      meta: {
        nextCursor: string | null;
        requestedAt: string;
        permissionHints: Record<string, Permission[]>;
      };
    }
  >
) {
  return rest.get("https://api.liveblocks.io/v2/c/threads", resolver);
}

function mockGetUserThreadsDelta(
  resolver: ResponseResolver<
    RestRequest<never, { roomId: string }>,
    RestContext,
    {
      threads: ThreadData[];
      inboxNotifications: InboxNotificationData[];
      deletedInboxNotifications: InboxNotificationData[];
      deletedThreads: ThreadDataWithDeleteInfo[];
      meta: {
        requestedAt: string; // ISO date
        permissionHints: Record<string, Permission[]>;
      };
    }
  >
) {
  return rest.get("https://api.liveblocks.io/v2/c/threads/delta", resolver);
}

describe("useUserThreads", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("should fetch user threads on mount", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];

    server.use(
      mockGetUserThreads((_req, res, ctx) => {
        return res(
          ctx.json({
            threads,
            inboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
              permissionHints: {
                [roomId]: [Permission.Write],
              },
            },
          })
        );
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useUserThreads_experimental },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useUserThreads_experimental(),
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
        threads,
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    unmount();
  });

  test("should fetch user threads for given query on mount", async () => {
    const roomId = nanoid();
    const pinnedThread = dummyThreadData({
      roomId,
      metadata: {
        pinned: true,
      },
    });
    const unpinnedThread = dummyThreadData({
      roomId,
      metadata: {
        pinned: false,
      },
    });

    server.use(
      mockGetUserThreads((req, res, ctx) => {
        const url = new URL(req.url);
        const query = url.searchParams.get("query");
        const parseRes = parser.parse(query ?? "");

        const metadataPinned = getFilter(
          parseRes.query.clauses,
          "metadata",
          "pinned"
        );

        return res(
          ctx.json({
            threads: [pinnedThread, unpinnedThread].filter(
              (thread) => thread.metadata.pinned === metadataPinned.value
            ),
            inboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
              permissionHints: {
                [roomId]: [Permission.Write],
              },
            },
          })
        );
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useUserThreads_experimental },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () =>
        useUserThreads_experimental({ query: { metadata: { pinned: true } } }),
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
        threads: [pinnedThread],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    unmount();
  });

  test("should sort threads by most recently updated date before returning", async () => {
    const roomId = nanoid();
    const latestUpdatedThread = dummyThreadData({
      roomId,
      createdAt: new Date("2021-01-01T00:00:00Z"),
      updatedAt: new Date("2021-01-03T00:00:00Z"),
    });

    const earliestUpdatedThread = dummyThreadData({
      roomId,
      createdAt: new Date("2020-12-31T00:00:00Z"), // Earlier creation date
      updatedAt: new Date("2021-01-01T00:00:00Z"), // Earlier update date
    });

    server.use(
      mockGetUserThreads((_req, res, ctx) => {
        return res(
          ctx.json({
            threads: [latestUpdatedThread, earliestUpdatedThread],
            inboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
              permissionHints: {
                [roomId]: [Permission.Write],
              },
            },
          })
        );
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useUserThreads_experimental },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useUserThreads_experimental(),
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
        threads: [latestUpdatedThread, earliestUpdatedThread],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    unmount();
  });
});

describe("useThreads: error", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers(); // Restores the real timers
  });

  test("should trigger error boundary if initial fetch throws an error", async () => {
    let getThreadsReqCount = 0;

    server.use(
      mockGetUserThreads((_req, res, ctx) => {
        getThreadsReqCount++;
        return res(ctx.status(500));
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useUserThreads_experimental },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useUserThreads_experimental(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    expect(result.current).toEqual({ isLoading: true });

    // Wait until all fetch attempts have been done
    await jest.advanceTimersToNextTimerAsync(); // fetch attempt 1

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getThreadsReqCount).toBe(2));

    // The second retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getThreadsReqCount).toBe(3));

    // The third retry should be made after 10s
    await jest.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(getThreadsReqCount).toBe(4));

    // The fourth retry should be made after 15s
    await jest.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(getThreadsReqCount).toBe(5));

    await waitFor(() => {
      expect(result.current).toEqual({
        isLoading: false,
        error: expect.any(Error),
      });
    });

    // Wait for 5 second for the error to clear
    await jest.advanceTimersByTimeAsync(5_000);

    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() => expect(getThreadsReqCount).toBe(6));
    expect(result.current).toEqual({
      isLoading: true,
    });

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getThreadsReqCount).toBe(7));

    // and so on...

    unmount();
  });

  test("should not retry if a 403 Forbidden response is received from server", async () => {
    server.use(
      mockGetUserThreads((_req, res, ctx) => {
        // Return a 403 status from the server for the initial fetch
        return res(ctx.status(403));
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useUserThreads_experimental },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useUserThreads_experimental(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    expect(result.current).toEqual({ isLoading: true });

    await waitFor(() => {
      expect(result.current).toEqual({
        isLoading: false,
        error: expect.any(HttpError),
      });
    });

    unmount();
  });
});

describe("useThreadsSuspense", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("should fetch user threads on render", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];

    server.use(
      mockGetUserThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            threads,
            inboxNotifications: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
              permissionHints: {
                [roomId]: [Permission.Write],
              },
            },
          })
        );
      })
    );

    const {
      liveblocks: {
        suspense: { LiveblocksProvider, useUserThreads_experimental },
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useUserThreads_experimental(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>
            <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
          </LiveblocksProvider>
        ),
      }
    );

    expect(result.current).toEqual(null);

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads,
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
      })
    );

    unmount();
  });
});

describe("useUserThreadsSuspense: error", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers(); // Restores the real timers
  });

  test("should trigger error boundary if initial fetch throws an error", async () => {
    let getThreadsReqCount = 0;

    server.use(
      mockGetUserThreads((_req, res, ctx) => {
        getThreadsReqCount++;
        return res(ctx.status(500));
      }),
      mockGetUserThreadsDelta((_req, res, ctx) => {
        return res(
          ctx.json({
            threads: [],
            inboxNotifications: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
              permissionHints: {},
            },
          })
        );
      })
    );

    const {
      liveblocks: {
        suspense: { LiveblocksProvider, useUserThreads_experimental },
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useUserThreads_experimental(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>
            <ErrorBoundary
              FallbackComponent={({ resetErrorBoundary }) => {
                return (
                  <>
                    <div>There was an error while getting threads.</div>
                    <button onClick={resetErrorBoundary}>Retry</button>
                  </>
                );
              }}
            >
              <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
            </ErrorBoundary>
          </LiveblocksProvider>
        ),
      }
    );

    expect(result.current).toEqual(null);

    expect(screen.getByText("Loading")).toBeInTheDocument();

    // Wait until all fetch attempts have been done
    await jest.advanceTimersToNextTimerAsync(); // fetch attempt 1

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getThreadsReqCount).toBe(2));

    // The second retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getThreadsReqCount).toBe(3));

    // The third retry should be made after 10s
    await jest.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(getThreadsReqCount).toBe(4));

    // The fourth retry should be made after 15s
    await jest.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(getThreadsReqCount).toBe(5));

    // Check if the error boundary's fallback is displayed
    await waitFor(() => {
      expect(
        screen.getByText("There was an error while getting threads.")
      ).toBeInTheDocument();
    });

    // Wait until the error boundary auto-clears
    await jest.advanceTimersByTimeAsync(5_000);

    // Simulate clicking the retry button
    fireEvent.click(screen.getByText("Retry"));

    // The error boundary's fallback should be cleared
    await waitFor(() => {
      expect(screen.getByText("Loading")).toBeInTheDocument();
    });

    unmount();
  });
});

describe("useUserThreads: pagination", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("should load the next page of data when `fetchMore` is called", async () => {
    const roomId = nanoid();
    const threadsPageOne = [
      dummyThreadData({ roomId, createdAt: new Date("2021-01-03T00:00:00Z") }),
    ];
    const threadsPageTwo = [
      dummyThreadData({ roomId, createdAt: new Date("2021-01-02T00:00:00Z") }),
    ];
    const threadsPageThree = [
      dummyThreadData({ roomId, createdAt: new Date("2021-01-01T00:00:00Z") }),
    ];

    let isPageOneRequested = false;
    let isPageTwoRequested = false;
    let isPageThreeRequested = false;

    server.use(
      mockGetUserThreads((req, res, ctx) => {
        const url = new URL(req.url);
        const cursor = url.searchParams.get("cursor");

        // Request for Page 2
        if (cursor === "cursor-1") {
          isPageTwoRequested = true;
          return res(
            ctx.json({
              threads: threadsPageTwo,
              inboxNotifications: [],
              meta: {
                requestedAt: new Date().toISOString(),
                nextCursor: "cursor-2",
                permissionHints: {
                  [roomId]: [Permission.Write],
                },
              },
            })
          );
        }
        // Request for Page 3
        else if (cursor === "cursor-2") {
          isPageThreeRequested = true;
          return res(
            ctx.json({
              threads: threadsPageThree,
              inboxNotifications: [],
              meta: {
                requestedAt: new Date().toISOString(),
                nextCursor: "cursor-3",
                permissionHints: {
                  [roomId]: [Permission.Write],
                },
              },
            })
          );
        }
        // Request for Page 1
        else {
          isPageOneRequested = true;
          return res(
            ctx.json({
              threads: threadsPageOne,
              inboxNotifications: [],
              meta: {
                requestedAt: new Date().toISOString(),
                nextCursor: "cursor-1",
                permissionHints: {
                  [roomId]: [Permission.Write],
                },
              },
            })
          );
        }
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useUserThreads_experimental },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useUserThreads_experimental(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    expect(result.current).toEqual({
      isLoading: true,
    });

    // Initial load (Page 1)
    await waitFor(() => expect(isPageOneRequested).toBe(true));
    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [...threadsPageOne],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: false,
        fetchMoreError: undefined,
      })
    );

    const fetchMore = result.current.fetchMore!;

    // Fetch Page 2
    fetchMore();
    await waitFor(() => expect(isPageTwoRequested).toBe(true));
    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [...threadsPageOne, ...threadsPageTwo],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: false,
        fetchMoreError: undefined,
      })
    );

    // Fetch Page 3
    fetchMore();
    await waitFor(() => expect(isPageThreeRequested).toBe(true));
    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [...threadsPageOne, ...threadsPageTwo, ...threadsPageThree],
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
    const threadsPageOne = [
      dummyThreadData({ roomId, createdAt: new Date("2021-01-02T00:00:00Z") }),
    ];
    const threadsPageTwo = [
      dummyThreadData({ roomId, createdAt: new Date("2021-01-01T00:00:00Z") }),
    ];

    let isPageOneRequested = false;
    let isPageTwoRequested = false;

    server.use(
      mockGetUserThreads((req, res, ctx) => {
        const url = new URL(req.url);
        const cursor = url.searchParams.get("cursor");

        // Request for Page 2
        if (cursor === "cursor-1") {
          isPageTwoRequested = true;
          return res(
            ctx.json({
              threads: threadsPageTwo,
              inboxNotifications: [],
              meta: {
                requestedAt: new Date().toISOString(),
                nextCursor: null,
                permissionHints: {
                  [roomId]: [Permission.Write],
                },
              },
            })
          );
        }
        // Request for Page 1
        else {
          isPageOneRequested = true;
          return res(
            ctx.json({
              threads: threadsPageOne,
              inboxNotifications: [],
              meta: {
                requestedAt: new Date().toISOString(),
                nextCursor: "cursor-1",
                permissionHints: {
                  [roomId]: [Permission.Write],
                },
              },
            })
          );
        }
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useUserThreads_experimental },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useUserThreads_experimental(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    expect(result.current).toEqual({
      isLoading: true,
    });

    // Initial load (Page 1)
    await waitFor(() => expect(isPageOneRequested).toBe(true));
    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [...threadsPageOne],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: false,
        fetchMoreError: undefined,
      })
    );

    const fetchMore = result.current.fetchMore!;

    // Fetch Page 2
    fetchMore();
    await waitFor(() => expect(isPageTwoRequested).toBe(true));
    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [...threadsPageOne, ...threadsPageTwo],
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
    const threadsPageOne = [dummyThreadData({ roomId })];

    let isPageTwoRequested = false;

    server.use(
      mockGetUserThreads((req, res, ctx) => {
        const url = new URL(req.url);
        const cursor = url.searchParams.get("cursor");

        // Initial load (Page 1)
        if (cursor === null) {
          return res(
            ctx.json({
              threads: threadsPageOne,
              inboxNotifications: [],
              deletedThreads: [],
              deletedInboxNotifications: [],
              meta: {
                requestedAt: new Date().toISOString(),
                nextCursor: "cursor-1",
                permissionHints: {
                  [roomId]: [Permission.Write],
                },
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
      liveblocks: { LiveblocksProvider, useUserThreads_experimental },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useUserThreads_experimental(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    expect(result.current).toEqual({ isLoading: true });

    // Initial load (Page 1)
    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [...threadsPageOne],
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
        threads: threadsPageOne,
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: false,
        fetchMoreError: expect.any(Error),
      })
    );

    unmount();
  });
});
