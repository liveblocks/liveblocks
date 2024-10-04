import "@testing-library/jest-dom";

import type { InboxNotificationData, ThreadData } from "@liveblocks/core";
import { nanoid } from "@liveblocks/core";
import type { AST } from "@liveblocks/query-parser";
import { QueryParser } from "@liveblocks/query-parser";
import { renderHook, waitFor } from "@testing-library/react";
import {
  type ResponseResolver,
  rest,
  type RestContext,
  type RestRequest,
} from "msw";
import { setupServer } from "msw/node";
import React from "react";

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
    }
  >
) {
  return rest.get("https://api.liveblocks.io/v2/c/threads", resolver);
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
