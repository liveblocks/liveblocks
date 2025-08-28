import "@testing-library/jest-dom";

import type {
  InboxNotificationData,
  InboxNotificationDataPlain,
  ThreadData,
} from "@liveblocks/core";
import { HttpError, nanoid, Permission, ServerMsgCode } from "@liveblocks/core";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { addSeconds } from "date-fns";
import type { ResponseResolver, RestContext, RestRequest } from "msw";
import { rest } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import { createContext, Suspense, useContext, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

import {
  dummySubscriptionData,
  dummyThreadData,
  dummyThreadInboxNotificationData,
} from "./_dummies";
import MockWebSocket, { websocketSimulator } from "./_MockWebSocket";
import {
  mockGetInboxNotifications,
  mockGetThread,
  mockGetThreads,
} from "./_restMocks";
import { createContextsForTest, makeThreadFilter } from "./_utils";

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;

const server = setupServer();

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

function mockGetThreadsSince(
  resolver: ResponseResolver<
    RestRequest<never, { roomId: string }>,
    RestContext,
    {
      data: ThreadData<any>[];
      inboxNotifications: InboxNotificationData[];
      deletedThreads: ThreadData[];
      deletedInboxNotifications: InboxNotificationDataPlain[];
      meta: {
        requestedAt: string;
        permissionHints: Record<string, Permission[]>;
      };
    }
  >
) {
  return rest.get(
    "https://api.liveblocks.io/v2/c/rooms/:roomId/threads/delta",
    resolver
  );
}

describe("useThreads", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("should fetch threads", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
    ];

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: threads,
            inboxNotifications: [],
            subscriptions,
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
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
      room: { RoomProvider, useThreads },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>{children}</RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

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

  test("should be referentially stable after a re-render", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
    ];

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: threads,
            inboxNotifications: [],
            subscriptions,
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
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
      room: { RoomProvider, useThreads },
    } = createContextsForTest();

    const { result, unmount, rerender } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>{children}</RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

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

    const oldResult = result.current;

    rerender();

    expect(oldResult).toBe(result.current);

    unmount();
  });

  test("multiple instances of useThreads should not fetch threads multiple times (dedupe requests)", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
    ];
    let getThreadsReqCount = 0;

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        getThreadsReqCount++;
        return res(
          ctx.json({
            data: threads,
            inboxNotifications: [],
            subscriptions,
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
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
      room: { RoomProvider, useThreads },
    } = createContextsForTest();

    const { unmount, rerender } = renderHook(
      () => {
        useThreads();
        useThreads();
        useThreads();
      },
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    await waitFor(() => expect(getThreadsReqCount).toBe(1));

    rerender();

    expect(getThreadsReqCount).toBe(1);

    unmount();
  });

  test("should fetch threads for a given query", async () => {
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
      mockGetThreads(async (req, res, ctx) => {
        const query = req.url.searchParams.get("query");
        const pred = query ? makeThreadFilter(query) : () => true;
        const filteredThreads = [pinnedThread, unpinnedThread].filter(pred);
        const subscriptions = filteredThreads.map((thread) =>
          dummySubscriptionData({ subjectId: thread.id })
        );
        return res(
          ctx.json({
            data: filteredThreads,
            inboxNotifications: [],
            subscriptions,
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
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
      room: { RoomProvider, useThreads },
    } = createContextsForTest<{
      pinned: boolean;
    }>();

    const { result, unmount } = renderHook(
      () => useThreads({ query: { metadata: { pinned: true } } }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current).toEqual({ isLoading: true });

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

  test("should fetch threads for a given query (multiple criteria)", async () => {
    const roomId = nanoid();
    const redPinnedThread = dummyThreadData({
      roomId,
      metadata: { pinned: true, color: "red" },
    });
    const bluePinnedThread = dummyThreadData({
      roomId,
      metadata: { pinned: true, color: "blue" },
    });
    const redUnpinnedThread = dummyThreadData({
      roomId,
      metadata: { pinned: false, color: "red" },
    });
    const blueUnpinnedThread = dummyThreadData({
      roomId,
      metadata: { pinned: false, color: "blue" },
    });
    const uncoloredPinnedThread = dummyThreadData({
      roomId,
      metadata: { pinned: true },
    });
    const subscriptions = [
      dummySubscriptionData({ subjectId: bluePinnedThread.id }),
      dummySubscriptionData({ subjectId: blueUnpinnedThread.id }),
      dummySubscriptionData({ subjectId: redPinnedThread.id }),
      dummySubscriptionData({ subjectId: redUnpinnedThread.id }),
      dummySubscriptionData({ subjectId: uncoloredPinnedThread.id }),
    ];

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: [
              bluePinnedThread,
              blueUnpinnedThread,
              redPinnedThread,
              redUnpinnedThread,
              uncoloredPinnedThread,
            ], // removed any filtering so that we ensure the filtering is done properly on the client side, it shouldn't matter what the server returns
            inboxNotifications: [],
            subscriptions,
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
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
      room: { RoomProvider, useThreads },
    } = createContextsForTest<{
      pinned: boolean;
      color: string;
    }>();

    {
      // Test 1
      const { result, unmount } = renderHook(
        () =>
          useThreads({
            query: { metadata: { pinned: true, color: "red" } },
          }),
        {
          wrapper: ({ children }) => (
            <RoomProvider id={roomId}>{children}</RoomProvider>
          ),
        }
      );

      expect(result.current).toEqual({ isLoading: true });

      await waitFor(() =>
        expect(result.current).toEqual({
          isLoading: false,
          threads: [redPinnedThread],
          fetchMore: expect.any(Function),
          isFetchingMore: false,
          hasFetchedAll: true,
          fetchMoreError: undefined,
        })
      );

      unmount();
    }

    {
      // Test 2
      const { result, unmount } = renderHook(
        () =>
          useThreads({
            query: { metadata: { color: "red" } },
          }),
        {
          wrapper: ({ children }) => (
            <RoomProvider id={roomId}>{children}</RoomProvider>
          ),
        }
      );

      expect(result.current).toEqual({ isLoading: true });

      await waitFor(() =>
        expect(result.current).toEqual({
          isLoading: false,
          threads: [redPinnedThread, redUnpinnedThread],
          fetchMore: expect.any(Function),
          isFetchingMore: false,
          hasFetchedAll: true,
          fetchMoreError: undefined,
        })
      );

      unmount();
    }

    {
      // Test 3
      const { result, unmount } = renderHook(
        () =>
          useThreads({
            query: { metadata: { color: "red", pinned: true } },
          }),
        {
          wrapper: ({ children }) => (
            <RoomProvider id={roomId}>{children}</RoomProvider>
          ),
        }
      );

      expect(result.current).toEqual(
        //
        // NOTE! This query is not loading initially! This is because we
        // already queried for this combination of queries in Test 1, because
        //   { metadata: { color: "red", pinned: true } }
        // is the same query as
        //   { metadata: { pinned: true, color: "red" } }
        //
        expect.objectContaining({ isLoading: false })
      );

      await waitFor(() =>
        expect(result.current).toEqual({
          isLoading: false,
          threads: [redPinnedThread],
          fetchMore: expect.any(Function),
          isFetchingMore: false,
          hasFetchedAll: true,
          fetchMoreError: undefined,
        })
      );

      unmount();
    }

    {
      // Test 4
      const { result, unmount } = renderHook(
        () =>
          useThreads({
            query: { metadata: { color: "nonexisting", pinned: true } },
          }),
        {
          wrapper: ({ children }) => (
            <RoomProvider id={roomId}>{children}</RoomProvider>
          ),
        }
      );

      expect(result.current).toEqual({ isLoading: true });

      await waitFor(() =>
        expect(result.current).toEqual({
          isLoading: false,
          threads: [],
          fetchMore: expect.any(Function),
          isFetchingMore: false,
          hasFetchedAll: true,
          fetchMoreError: undefined,
        })
      );

      unmount();
    }

    {
      // Test 5
      const { result, unmount } = renderHook(
        () =>
          useThreads({
            query: { metadata: { color: "nonexisting" } },
          }),
        {
          wrapper: ({ children }) => (
            <RoomProvider id={roomId}>{children}</RoomProvider>
          ),
        }
      );

      expect(result.current).toEqual({ isLoading: true });

      await waitFor(() =>
        expect(result.current).toEqual({
          isLoading: false,
          threads: [],
          fetchMore: expect.any(Function),
          isFetchingMore: false,
          hasFetchedAll: true,
          fetchMoreError: undefined,
        })
      );

      unmount();
    }

    {
      // Test 6
      const { result, unmount } = renderHook(
        () => useThreads({ query: { metadata: { pinned: true } } }),
        {
          wrapper: ({ children }) => (
            <RoomProvider id={roomId}>{children}</RoomProvider>
          ),
        }
      );

      expect(result.current).toEqual({ isLoading: true });

      await waitFor(() =>
        expect(result.current).toEqual({
          isLoading: false,
          threads: [bluePinnedThread, redPinnedThread, uncoloredPinnedThread],
          fetchMore: expect.any(Function),
          isFetchingMore: false,
          hasFetchedAll: true,
          fetchMoreError: undefined,
        })
      );

      unmount();
    }

    {
      // Test 7
      const { result, unmount } = renderHook(
        () =>
          useThreads({
            query: { metadata: { color: { startsWith: "blu" }, pinned: true } },
          }),
        {
          wrapper: ({ children }) => (
            <RoomProvider id={roomId}>{children}</RoomProvider>
          ),
        }
      );

      expect(result.current).toEqual({ isLoading: true });

      await waitFor(() =>
        expect(result.current).toEqual({
          isLoading: false,
          threads: [bluePinnedThread],
          fetchMore: expect.any(Function),
          isFetchingMore: false,
          hasFetchedAll: true,
          fetchMoreError: undefined,
        })
      );

      unmount();
    }

    {
      // Test 8: explicit-undefined keys should be ignored
      const { result, unmount } = renderHook(
        () =>
          useThreads({
            query: {
              metadata: {
                pinned: true,
                // NOTE: Explicitly-undefined means color must be absent!
                color: undefined, // = color must be absent
              },
            },
          }),
        {
          wrapper: ({ children }) => (
            <RoomProvider id={roomId}>{children}</RoomProvider>
          ),
        }
      );

      await waitFor(() =>
        expect(result.current).toEqual({
          isLoading: false,
          threads: [bluePinnedThread, redPinnedThread, uncoloredPinnedThread],
          fetchMore: expect.any(Function),
          isFetchingMore: false,
          hasFetchedAll: true,
          fetchMoreError: undefined,
        })
      );

      unmount();
    }

    {
      // Test 9: explicitly filtering by absence using `null` value
      const { result, unmount } = renderHook(
        () =>
          useThreads({
            query: {
              metadata: {
                pinned: true,
                color: null, // Explicitly filtered for absence of color
              },
            },
          }),
        {
          wrapper: ({ children }) => (
            <RoomProvider id={roomId}>{children}</RoomProvider>
          ),
        }
      );

      await waitFor(() =>
        expect(result.current).toEqual({
          isLoading: false,
          threads: [uncoloredPinnedThread],
          fetchMore: expect.any(Function),
          isFetchingMore: false,
          hasFetchedAll: true,
          fetchMoreError: undefined,
        })
      );

      unmount();
    }

    {
      // Test 10: explicitly filtering by absence using `null` value
      const { result, unmount } = renderHook(
        () =>
          useThreads({
            query: {
              // Explicitly filtered for absence of color
              metadata: { color: null },
            },
          }),
        {
          wrapper: ({ children }) => (
            <RoomProvider id={roomId}>{children}</RoomProvider>
          ),
        }
      );

      await waitFor(() =>
        expect(result.current).toEqual({
          isLoading: false,
          threads: [uncoloredPinnedThread],
          fetchMore: expect.any(Function),
          isFetchingMore: false,
          hasFetchedAll: true,
          fetchMoreError: undefined,
        })
      );

      unmount();
    }
  });

  test("shoud fetch threads for a given query with a startsWith filter", async () => {
    const roomId = nanoid();
    const liveblocksEngineeringThread = dummyThreadData({
      roomId,
      metadata: {
        organization: "liveblocks:engineering",
      },
    });
    const liveblocksDesignThread = dummyThreadData({
      roomId,
      metadata: {
        organization: "liveblocks:design",
      },
    });
    const acmeEngineeringThread = dummyThreadData({
      roomId,
      metadata: {
        organization: "acme",
      },
    });

    const subscriptions = [
      dummySubscriptionData({ subjectId: liveblocksEngineeringThread.id }),
      dummySubscriptionData({ subjectId: liveblocksDesignThread.id }),
      dummySubscriptionData({ subjectId: acmeEngineeringThread.id }),
    ];

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: [
              liveblocksEngineeringThread,
              liveblocksDesignThread,
              acmeEngineeringThread,
            ],
            inboxNotifications: [],
            subscriptions,
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
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
      room: { RoomProvider, useThreads },
    } = createContextsForTest<{
      organization: string;
    }>();

    const { result, unmount } = renderHook(
      () =>
        useThreads({
          query: {
            metadata: {
              organization: {
                startsWith: "liveblocks:",
              },
            },
          },
        }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [liveblocksEngineeringThread, liveblocksDesignThread],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    unmount();
  });

  test("should dedupe fetch threads for a given query", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
    ];
    let getThreadsReqCount = 0;

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        getThreadsReqCount++;
        return res(
          ctx.json({
            data: threads,
            inboxNotifications: [],
            subscriptions,
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
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
      room: { RoomProvider, useThreads },
    } = createContextsForTest<{
      pinned: boolean;
    }>();

    const { unmount } = renderHook(
      () => {
        useThreads({ query: { metadata: { pinned: true } } });
        useThreads({ query: { metadata: { pinned: true } } });
      },
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    await waitFor(() => expect(getThreadsReqCount).toBe(1));

    unmount();
  });

  test("should refetch threads if query changed dynamically and should display threads instantly if query already been done in the past", async () => {
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
      mockGetThreads(async (req, res, ctx) => {
        const query = req.url.searchParams.get("query");
        const pred = query ? makeThreadFilter(query) : () => true;
        const filteredThreads = [pinnedThread, unpinnedThread].filter(pred);
        const subscriptions = filteredThreads.map((thread) =>
          dummySubscriptionData({ subjectId: thread.id })
        );
        return res(
          ctx.json({
            data: filteredThreads,
            inboxNotifications: [],
            subscriptions,
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
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
      room: { RoomProvider, useThreads },
    } = createContextsForTest<{
      pinned: boolean;
    }>();

    const { result, unmount, rerender } = renderHook(
      ({ pinned }: { pinned: boolean }) =>
        useThreads({ query: { metadata: { pinned } } }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
        initialProps: { pinned: true },
      }
    );

    expect(result.current).toEqual({ isLoading: true });

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

    rerender({ pinned: false });

    expect(result.current).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [unpinnedThread],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    rerender({ pinned: true });

    // Pinned threads are displayed instantly because we already fetched them previously
    expect(result.current).toEqual({
      isLoading: false,
      threads: [pinnedThread],
      fetchMore: expect.any(Function),
      isFetchingMore: false,
      hasFetchedAll: true,
      fetchMoreError: undefined,
    });

    unmount();
  });

  test("multiple instances of RoomProvider should render their corresponding threads correctly", async () => {
    const room1Id = nanoid();
    const room2Id = nanoid();
    const room1Threads = [dummyThreadData({ roomId: room1Id })];
    const room2Threads = [dummyThreadData({ roomId: room2Id })];
    const room1Subscriptions = [
      dummySubscriptionData({ subjectId: room1Threads[0]!.id }),
    ];
    const room2Subscriptions = [
      dummySubscriptionData({ subjectId: room2Threads[0]!.id }),
    ];

    server.use(
      mockGetThreads((req, res, ctx) => {
        const roomId = req.params.roomId;
        if (roomId === room1Id) {
          return res(
            ctx.json({
              data: room1Threads,
              inboxNotifications: [],
              subscriptions: room1Subscriptions,
              deletedThreads: [],
              deletedInboxNotifications: [],
              deletedSubscriptions: [],
              meta: {
                requestedAt: new Date().toISOString(),
                nextCursor: null,
                permissionHints: {
                  [roomId]: [Permission.Write],
                },
              },
            })
          );
        } else if (roomId === room2Id) {
          return res(
            ctx.json({
              data: room2Threads,
              inboxNotifications: [],
              subscriptions: room2Subscriptions,
              deletedThreads: [],
              deletedInboxNotifications: [],
              deletedSubscriptions: [],
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

        return res(ctx.status(404));
      })
    );

    const {
      room: { RoomProvider, useThreads },
    } = createContextsForTest();

    const { result: room1Result, unmount: unmountRoom1 } = renderHook(
      () => useThreads(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={room1Id}>{children}</RoomProvider>
        ),
      }
    );

    const { result: room2Result, unmount: unmountRoom2 } = renderHook(
      () => useThreads(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={room2Id}>{children}</RoomProvider>
        ),
      }
    );

    expect(room1Result.current).toEqual({ isLoading: true });
    expect(room2Result.current).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(room1Result.current).toEqual({
        isLoading: false,
        threads: room1Threads,
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    await waitFor(() =>
      expect(room2Result.current).toEqual({
        isLoading: false,
        threads: room2Threads,
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    unmountRoom1();
    unmountRoom2();
  });

  test("should correctly display threads if room id changed dynamically and should display threads instantly if query for the room already been done in the past", async () => {
    const room1Id = nanoid();
    const room2Id = nanoid();
    const room1Threads = [dummyThreadData({ roomId: room1Id })];
    const room2Threads = [dummyThreadData({ roomId: room2Id })];
    const room1Subscriptions = [
      dummySubscriptionData({ subjectId: room1Threads[0]!.id }),
    ];
    const room2Subscriptions = [
      dummySubscriptionData({ subjectId: room2Threads[0]!.id }),
    ];

    server.use(
      mockGetThreads((req, res, ctx) => {
        const roomId = req.params.roomId;
        if (roomId === room1Id) {
          return res(
            ctx.json({
              data: room1Threads,
              inboxNotifications: [],
              subscriptions: room1Subscriptions,
              deletedThreads: [],
              deletedInboxNotifications: [],
              deletedSubscriptions: [],
              meta: {
                requestedAt: new Date().toISOString(),
                nextCursor: null,
                permissionHints: {
                  [roomId]: [Permission.Write],
                },
              },
            })
          );
        } else if (roomId === room2Id) {
          return res(
            ctx.json({
              data: room2Threads,
              inboxNotifications: [],
              subscriptions: room2Subscriptions,
              deletedThreads: [],
              deletedInboxNotifications: [],
              deletedSubscriptions: [],
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

        return res(ctx.status(404));
      })
    );

    const {
      room: { RoomProvider, useThreads },
    } = createContextsForTest();

    const RoomIdDispatchContext = createContext<
      ((value: string) => void) | null
    >(null);

    const Wrapper = ({ children }: { children: ReactNode }) => {
      const [roomId, setRoomId] = useState(room1Id);

      return (
        <RoomIdDispatchContext.Provider value={setRoomId}>
          <RoomProvider id={roomId}>{children}</RoomProvider>
        </RoomIdDispatchContext.Provider>
      );
    };

    const useThreadsContainer = () => {
      const setRoomId = useContext(RoomIdDispatchContext);
      const state = useThreads();
      return { state, setRoomId };
    };

    const { result, unmount } = renderHook(() => useThreadsContainer(), {
      wrapper: Wrapper,
    });

    expect(result.current.state).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current.state).toEqual({
        isLoading: false,
        threads: room1Threads,
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    act(() => {
      result.current.setRoomId?.(room2Id);
    });

    expect(result.current.state).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current.state).toEqual({
        isLoading: false,
        threads: room2Threads,
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    act(() => {
      result.current.setRoomId?.(room1Id);
    });

    await waitFor(() =>
      expect(result.current.state).toEqual({
        isLoading: false,
        threads: room1Threads,
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    unmount();
  });

  test("should include an error object in the returned value if initial fetch throws an error", async () => {
    const roomId = nanoid();

    server.use(
      mockGetThreads((_req, res, ctx) => {
        // Mock an error response from the server for the initial fetch
        return res(ctx.status(500));
      })
    );

    const {
      room: { RoomProvider, useThreads },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>{children}</RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

    await jest.advanceTimersToNextTimerAsync(); // fetch attempt 1

    await jest.advanceTimersByTimeAsync(5_000); // fetch attempt 2
    expect(result.current).toEqual({ isLoading: true });

    await jest.advanceTimersByTimeAsync(5_000); // fetch attempt 3
    expect(result.current).toEqual({ isLoading: true });

    await jest.advanceTimersByTimeAsync(10_000); // fetch attempt 4
    expect(result.current).toEqual({ isLoading: true });

    await jest.advanceTimersByTimeAsync(15_000); // fetch attempt 5

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        error: expect.any(Error),
      })
    );

    unmount();
  });

  test("should sort threads by creation date before returning", async () => {
    const roomId = nanoid();
    const oldThread = dummyThreadData({
      roomId,
      createdAt: new Date("2021-01-01T00:00:00Z"),
    });
    const newThread = dummyThreadData({
      roomId,
      createdAt: new Date("2021-01-02T00:00:00Z"),
    });

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: [newThread, oldThread], // The order is intentionally reversed to test if the hook sorts the threads by creation date
            inboxNotifications: [],
            subscriptions: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
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
      room: { RoomProvider, useThreads },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current.threads).toEqual({
        isLoading: false,
        threads: [oldThread, newThread],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    unmount();
  });

  test("should sort threads by creation date before returning (when GET THREADS resolves before GET INBOX NOTIFICATIONS request)", async () => {
    const roomId = nanoid();
    const oldThread = dummyThreadData({
      roomId,
      createdAt: new Date("2021-01-01T00:00:00Z"),
    });
    const newThread = dummyThreadData({
      roomId,
      createdAt: new Date("2021-01-02T00:00:00Z"),
    });
    const inboxNotification = dummyThreadInboxNotificationData({
      roomId,
      threadId: oldThread.id,
    });
    const subscription = dummySubscriptionData({ subjectId: oldThread.id });

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: [newThread],
            inboxNotifications: [],
            subscriptions: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
              permissionHints: {
                [roomId]: [Permission.Write],
              },
            },
          })
        );
      }),
      mockGetInboxNotifications(async (_req, res, ctx) => {
        // Mock a delay in response so that GET THREADS request is resolved before GET NOTIFICATIONS request
        ctx.delay(100);
        return res(
          ctx.json({
            threads: [oldThread],
            inboxNotifications: [inboxNotification],
            subscriptions: [subscription],
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
      room: { RoomProvider, useThreads },
      liveblocks: { useInboxNotifications },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads(),
        inboxNotifications: useInboxNotifications(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toEqual({ isLoading: true });
    expect(result.current.inboxNotifications).toEqual({ isLoading: true });

    jest.advanceTimersByTime(100);

    await waitFor(() =>
      expect(result.current.threads).toEqual({
        isLoading: false,
        threads: [oldThread, newThread],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    unmount();
  });

  test("should sort threads by creation date before returning (when GET THREADS resolves after GET INBOX NOTIFICATIONS request)", async () => {
    const roomId = nanoid();
    const oldThread = dummyThreadData({
      roomId,
      createdAt: new Date("2021-01-01T00:00:00Z"),
    });
    const newThread = dummyThreadData({
      roomId,
      createdAt: new Date("2021-01-02T00:00:00Z"),
    });
    const inboxNotification = dummyThreadInboxNotificationData({
      roomId,
      threadId: newThread.id,
    });
    const subscription = dummySubscriptionData({ subjectId: newThread.id });

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        // Mock a delay in response so that GET THREADS request is resolved after GET NOTIFICATIONS request
        ctx.delay(100);
        return res(
          ctx.json({
            data: [oldThread],
            inboxNotifications: [],
            subscriptions: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
              permissionHints: {
                [roomId]: [Permission.Write],
              },
            },
          })
        );
      }),
      mockGetInboxNotifications(async (_req, res, ctx) => {
        return res(
          ctx.json({
            threads: [newThread],
            inboxNotifications: [inboxNotification],
            subscriptions: [subscription],
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
      room: { RoomProvider, useThreads },
      liveblocks: { useInboxNotifications },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads(),
        inboxNotifications: useInboxNotifications(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toEqual({ isLoading: true });
    expect(result.current.inboxNotifications).toEqual({ isLoading: true });

    jest.advanceTimersByTime(100);

    await waitFor(() =>
      expect(result.current.threads).toEqual({
        isLoading: false,
        threads: [oldThread, newThread],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    unmount();
  });

  test("should not return deleted threads", async () => {
    const roomId = nanoid();
    const thread1 = dummyThreadData({ roomId });
    const thread2WithDeletedAt = dummyThreadData({
      roomId,
      deletedAt: new Date(),
    });
    const subscriptions = [dummySubscriptionData({ subjectId: thread1.id })];

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: [thread1],
            inboxNotifications: [],
            subscriptions,
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
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
      room: { RoomProvider, useThreads },
      umbrellaStore,
    } = createContextsForTest();

    const db = umbrellaStore.threads;
    db.upsert(thread1);
    db.upsert(thread2WithDeletedAt);

    const { result, unmount } = renderHook(
      () => useThreads({ query: { metadata: {} } }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [thread1], // thread2WithDeleteAt should not be returned
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    unmount();
  });

  test("should update threads if room has been mounted after being unmounted", async () => {
    const roomId = nanoid();
    let threads = [dummyThreadData({ roomId }), dummyThreadData({ roomId })];
    const originalThreads = [...threads];
    const subscriptions = threads.map((thread) =>
      dummySubscriptionData({ subjectId: thread.id })
    );

    let getThreadsSinceReqCount = 0;

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: threads,
            deletedThreads: [],
            inboxNotifications: [],
            deletedInboxNotifications: [],
            subscriptions,
            deletedSubscriptions: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
              permissionHints: {
                [roomId]: [Permission.Write],
              },
            },
          })
        );
      }),
      mockGetThreadsSince(async (req, res, ctx) => {
        const url = new URL(req.url);
        const since = url.searchParams.get("since");

        if (since) {
          getThreadsSinceReqCount++;
          const updatedThreads = threads.filter((thread) => {
            return thread.updatedAt >= new Date(since);
          });
          const updatedSubscriptions = updatedThreads.map((thread) =>
            dummySubscriptionData({ subjectId: thread.id })
          );

          return res(
            ctx.json({
              data: updatedThreads,
              deletedThreads: [],
              inboxNotifications: [],
              subscriptions: updatedSubscriptions,
              deletedInboxNotifications: [],
              deletedSubscriptions: [],
              meta: {
                requestedAt: new Date().toISOString(),
                permissionHints: {
                  [roomId]: [Permission.Write],
                },
              },
            })
          );
        }

        return res(ctx.status(500));
      })
    );

    const {
      room: { RoomProvider, useThreads },
    } = createContextsForTest();

    const firstRenderResult = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>{children}</RoomProvider>
      ),
    });

    expect(firstRenderResult.result.current).toEqual({ isLoading: true });

    // Threads should be displayed after the server responds with the threads
    await waitFor(() =>
      expect(firstRenderResult.result.current).toEqual({
        isLoading: false,
        threads,
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    // Advance time to trigger the first poll and verify that a poll does occur
    await jest.advanceTimersByTimeAsync(5 * 60_000);
    await waitFor(() => expect(getThreadsSinceReqCount).toBe(1));

    firstRenderResult.unmount();

    // Add a new thread to the threads array to simulate a new thread being added to the room
    threads = [...originalThreads, dummyThreadData({ roomId })];

    // Advance time by at least maximum stale time (5000ms) so that a poll happens immediately after the room is mounted.
    await jest.advanceTimersByTimeAsync(6_000);

    // Render the RoomProvider again and verify the threads are updated
    const secondRenderResult = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>{children}</RoomProvider>
      ),
    });

    // Threads (outdated ones) should be displayed instantly because we already fetched them previously
    expect(secondRenderResult.result.current).toEqual({
      isLoading: false,
      threads: originalThreads,
      fetchMore: expect.any(Function),
      isFetchingMore: false,
      hasFetchedAll: true,
      fetchMoreError: undefined,
    });

    // The updated threads should be displayed after the server responds with the updated threads
    await waitFor(() => {
      expect(secondRenderResult.result.current).toEqual({
        isLoading: false,
        threads,
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      });
    });

    expect(getThreadsSinceReqCount).toBe(2);

    secondRenderResult.unmount();
  });

  test("should not refetch threads if room has been mounted after being unmounted if another RoomProvider for the same id is still mounted", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    let getThreadsReqCount = 0;

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        getThreadsReqCount++;
        return res(
          ctx.json({
            data: threads,
            inboxNotifications: [],
            subscriptions: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
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
      room: { RoomProvider, useThreads },
      client,
    } = createContextsForTest();

    const Room = () => {
      return (
        <RoomProvider id={roomId}>
          <Threads />
        </RoomProvider>
      );
    };

    const FirstRoom = Room;
    const SecondRoom = Room;

    const Threads = () => {
      useThreads();
      return null;
    };

    // Render a RoomProvider for the room id
    const { rerender, unmount: unmountFirstRoom } = render(<FirstRoom />);

    // Render another RoomProvider for the same room id
    const { unmount: unmountSecondRoom } = render(<SecondRoom />);

    // A new fetch request for the threads should have been made
    await waitFor(() => expect(getThreadsReqCount).toBe(1));

    const room = client.getRoom(roomId);
    expect(room).not.toBeNull();
    if (room === null) return;

    // Rerender the first RoomProvider and verify a new fetch request wasn't initiated
    rerender(<FirstRoom />);

    // A new fetch request for the threads should not have been made
    expect(getThreadsReqCount).toBe(1);

    unmountFirstRoom();
    unmountSecondRoom();
  });

  test("should update threads for a room when the browser comes back online", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId }), dummyThreadData({ roomId })];

    let getThreadsSinceReqCount = 0;

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: threads,
            deletedThreads: [],
            inboxNotifications: [],
            deletedInboxNotifications: [],
            subscriptions: [],
            deletedSubscriptions: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
              permissionHints: {
                [roomId]: [Permission.Write],
              },
            },
          })
        );
      }),
      mockGetThreadsSince(async (req, res, ctx) => {
        const url = new URL(req.url);
        const since = url.searchParams.get("since");

        if (since) {
          getThreadsSinceReqCount++;
          const updatedThreads = threads.filter((thread) => {
            return thread.updatedAt >= new Date(since);
          });

          return res(
            ctx.json({
              data: updatedThreads,
              deletedThreads: [],
              inboxNotifications: [],
              deletedInboxNotifications: [],
              subscriptions: [],
              deletedSubscriptions: [],
              meta: {
                requestedAt: new Date().toISOString(),
                permissionHints: {
                  [roomId]: [Permission.Write],
                },
              },
            })
          );
        }

        return res(ctx.status(500));
      })
    );

    const {
      room: { RoomProvider, useThreads },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>{children}</RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

    // Threads should be displayed after the server responds with the threads
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

    // Advance time to trigger the first poll and verify that a poll does occur
    await jest.advanceTimersByTimeAsync(5 * 60_000);
    await waitFor(() => expect(getThreadsSinceReqCount).toBe(1));

    // Add a new thread to the threads array to simulate a new thread being added to the room
    threads.push(dummyThreadData({ roomId }));

    // Advance time by at least maximum stale time (5000ms) so that a poll happens immediately after the room is mounted.
    await jest.advanceTimersByTimeAsync(6_000);

    // Simulate browser going online
    window.dispatchEvent(new Event("online"));

    // The updated threads should be displayed after the server responds with the updated threads (either due to a fetch request to get all threads or just the updated threads)
    await waitFor(() => {
      expect(result.current).toEqual({
        isLoading: false,
        threads,
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      });
    });

    unmount();
  });

  test("should handle 404 responses from backend endpoint and correctly poll after 404 response", async () => {
    const roomId = nanoid();

    let getThreadsReqCount = 0;
    let getThreadsSinceReqCount = 0;

    const threads = [dummyThreadData({ roomId })];

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        // Return a 404 to simulate the room not found
        getThreadsReqCount++;
        return res(ctx.status(404));
      }),
      mockGetThreadsSince(async (_req, res, ctx) => {
        // Let's say the room was created after the initial fetch but before the poll,
        // so, new threads are available in the room
        getThreadsSinceReqCount++;
        return res(
          ctx.json({
            data: threads,
            inboxNotifications: [],
            subscriptions: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
            meta: {
              requestedAt: new Date().toISOString(),
              permissionHints: {
                [roomId]: [Permission.Write],
              },
            },
          })
        );
      })
    );

    const {
      room: { RoomProvider, useThreads },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>{children}</RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
        fetchMoreError: undefined,
      })
    );

    expect(getThreadsReqCount).toBe(1);
    expect(getThreadsSinceReqCount).toBe(0);

    // Wait for the first polling to occur after the initial render
    jest.advanceTimersByTime(5 * MINUTES);
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
    expect(getThreadsSinceReqCount).toBe(1);

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

  test("should retry with exponential backoff on error", async () => {
    const roomId = nanoid();
    let getThreadsReqCount = 0;

    server.use(
      mockGetThreads((_req, res, ctx) => {
        getThreadsReqCount++;
        // Mock an error response from the server for the initial fetch
        return res(ctx.status(500));
      })
    );

    const {
      room: { RoomProvider, useThreads },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>{children}</RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() => expect(getThreadsReqCount).toBe(1));

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getThreadsReqCount).toBe(2));
    expect(result.current).toEqual({ isLoading: true });

    // The second retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getThreadsReqCount).toBe(3));
    expect(result.current).toEqual({ isLoading: true });

    // The third retry should be made after 10s
    await jest.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(getThreadsReqCount).toBe(4));
    expect(result.current).toEqual({ isLoading: true });

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
    expect(result.current).toEqual({ isLoading: true });
    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() => expect(getThreadsReqCount).toBe(6));

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getThreadsReqCount).toBe(7));
    expect(result.current).toEqual({ isLoading: true });

    // and so on...

    unmount();
  });

  test("should not retry if a 403 Forbidden response is received from server", async () => {
    const roomId = nanoid();

    server.use(
      mockGetThreads((_req, res, ctx) => {
        // Return a 403 status from the server for the initial fetch
        return res(ctx.status(403));
      })
    );

    const {
      room: { RoomProvider, useThreads },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>{children}</RoomProvider>
      ),
    });

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

describe("useThreads: polling", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });
  test("should poll threads every x seconds", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
    ];
    const now = new Date().toISOString();
    let getThreadsReqCount = 0;

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        getThreadsReqCount++;
        return res(
          ctx.json({
            data: threads,
            inboxNotifications: [],
            subscriptions,
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
            meta: {
              requestedAt: now,
              nextCursor: null,
              permissionHints: {
                [roomId]: [Permission.Write],
              },
            },
          })
        );
      }),
      mockGetThreadsSince(async (_req, res, ctx) => {
        getThreadsReqCount++;
        return res(
          ctx.json({
            data: threads,
            inboxNotifications: [],
            subscriptions,
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
            meta: {
              requestedAt: now,
              permissionHints: {
                [roomId]: [Permission.Write],
              },
            },
          })
        );
      })
    );

    const {
      room: { RoomProvider, useThreads },
    } = createContextsForTest();

    const Room = () => {
      return (
        <RoomProvider id={roomId}>
          <Threads />
        </RoomProvider>
      );
    };

    const Threads = () => {
      useThreads();
      return null;
    };

    const { unmount } = render(<Room />);

    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() => expect(getThreadsReqCount).toBe(1));

    // Wait for the first polling to occur after the initial render
    jest.advanceTimersByTime(5 * MINUTES);
    await waitFor(() => expect(getThreadsReqCount).toBe(2));

    // Advance time to simulate the polling interval
    jest.advanceTimersByTime(5 * MINUTES);
    // Wait for the second polling to occur
    await waitFor(() => expect(getThreadsReqCount).toBe(3));

    unmount();
  });

  test("should not poll if useThreads isn't used", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
    ];
    const now = new Date().toISOString();
    let hasCalledGetThreads = false;

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        hasCalledGetThreads = true;
        return res(
          ctx.json({
            data: threads,
            inboxNotifications: [],
            subscriptions,
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
            meta: {
              requestedAt: now,
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
      room: { RoomProvider },
    } = createContextsForTest();

    const Room = () => {
      return (
        <RoomProvider id={roomId}>
          <NoThreads />
        </RoomProvider>
      );
    };

    const NoThreads = () => {
      return null;
    };

    const { unmount } = render(<Room />);

    jest.advanceTimersByTime(5 * MINUTES);
    await waitFor(() => expect(hasCalledGetThreads).toBe(false));

    jest.advanceTimersByTime(5 * MINUTES);
    await waitFor(() => expect(hasCalledGetThreads).toBe(false));

    unmount();
  });
});

describe("WebSocket events", () => {
  test("COMMENT_CREATED event should refresh thread", async () => {
    const roomId = nanoid();
    const newThread = dummyThreadData({ roomId });
    const newThreadSubscription = dummySubscriptionData({
      subjectId: newThread.id,
    });

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: [],
            inboxNotifications: [],
            subscriptions: [newThreadSubscription],
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
              permissionHints: {
                [roomId]: [Permission.Write],
              },
            },
          })
        );
      }),
      mockGetThread({ threadId: newThread.id }, async (_req, res, ctx) => {
        return res(
          ctx.json({
            thread: newThread,
            inboxNotification: undefined,
            subscription: newThreadSubscription,
          })
        );
      })
    );

    const {
      room: { RoomProvider, useThreads },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>{children}</RoomProvider>
      ),
    });

    const sim = await websocketSimulator();

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
      })
    );

    sim.simulateIncomingMessage({
      type: ServerMsgCode.COMMENT_CREATED,
      threadId: newThread.id,
      commentId: newThread.comments[0]!.id,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [newThread],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
      })
    );

    unmount();
  });

  test("COMMENT_DELETED event should delete thread if getThread return 404", async () => {
    const roomId = nanoid();
    const newThread = dummyThreadData({ roomId });
    const newThreadSubscription = dummySubscriptionData({
      subjectId: newThread.id,
    });

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: [newThread],
            inboxNotifications: [],
            subscriptions: [newThreadSubscription],
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
              permissionHints: {
                [roomId]: [Permission.Write],
              },
            },
          })
        );
      }),
      mockGetThread({ threadId: newThread.id }, async (_req, res, ctx) => {
        return res(ctx.status(404));
      })
    );

    const {
      room: { RoomProvider, useThreads },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>{children}</RoomProvider>
      ),
    });

    const sim = await websocketSimulator();

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [newThread],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
      })
    );

    // This should refresh the thread and get a 404
    sim.simulateIncomingMessage({
      type: ServerMsgCode.COMMENT_DELETED,
      threadId: newThread.id,
      commentId: newThread.comments[0]!.id,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
      })
    );

    unmount();
  });

  test("THREAD_DELETED event should delete thread", async () => {
    const roomId = nanoid();
    const newThread = dummyThreadData({ roomId });
    const newThreadSubscription = dummySubscriptionData({
      subjectId: newThread.id,
    });

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: [newThread],
            inboxNotifications: [],
            subscriptions: [newThreadSubscription],
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
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
      room: { RoomProvider, useThreads },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>{children}</RoomProvider>
      ),
    });

    const sim = await websocketSimulator();

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [newThread],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
      })
    );

    sim.simulateIncomingMessage({
      type: ServerMsgCode.THREAD_DELETED,
      threadId: newThread.id,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
      })
    );

    unmount();
  });

  test("Websocket event should not refresh thread if updatedAt is earlier than the cached updatedAt", async () => {
    const roomId = nanoid();
    const now = new Date();
    const initialThread = dummyThreadData({
      roomId,
      updatedAt: now,
      metadata: { counter: 0 },
    });
    const delayedThread = {
      ...initialThread,
      updatedAt: addSeconds(now, 1),
      metadata: { counter: 1 },
    };
    const latestThread = {
      ...initialThread,
      updatedAt: addSeconds(now, 2),
      metadata: { counter: 2 },
    };

    let callIndex = 0;

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: [initialThread],
            inboxNotifications: [],
            subscriptions: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
              permissionHints: {
                [roomId]: [Permission.Write],
              },
            },
          })
        );
      }),
      mockGetThread({ threadId: initialThread.id }, async (_req, res, ctx) => {
        if (callIndex === 0) {
          callIndex++;
          return res(
            ctx.json({
              thread: latestThread,
              inboxNotification: undefined,
              subscription: dummySubscriptionData({
                subjectId: latestThread.id,
              }),
            })
          );
        } else if (callIndex === 1) {
          callIndex++;
          return res(
            ctx.json({
              thread: delayedThread,
              inboxNotification: undefined,
              subscription: undefined,
            })
          );
        } else {
          throw new Error("Only two calls to getThreads are expected");
        }
      })
    );

    const {
      room: { RoomProvider, useThreads },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>{children}</RoomProvider>
      ),
    });

    const sim = await websocketSimulator();

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [initialThread],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
      })
    );

    // First thread metadata updated event returns the most recent thread
    sim.simulateIncomingMessage({
      type: ServerMsgCode.THREAD_METADATA_UPDATED,
      threadId: initialThread.id,
    });

    // Second thread metadata updated event returns an old thread
    sim.simulateIncomingMessage({
      type: ServerMsgCode.THREAD_METADATA_UPDATED,
      threadId: initialThread.id,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [latestThread],
        fetchMore: expect.any(Function),
        isFetchingMore: false,
        hasFetchedAll: true,
      })
    );

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

  test("should fetch threads", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
    ];

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: threads,
            inboxNotifications: [],
            subscriptions,
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
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
      room: {
        RoomProvider,
        suspense: { useThreads },
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>
          <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
        </RoomProvider>
      ),
    });

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

  test("should be referentially stable after a re-render", async () => {
    const roomId = nanoid();
    const threads = [dummyThreadData({ roomId })];
    const subscriptions = [
      dummySubscriptionData({ subjectId: threads[0]!.id }),
    ];

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: threads,
            inboxNotifications: [],
            subscriptions,
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
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
      room: {
        RoomProvider,
        suspense: { useThreads },
      },
    } = createContextsForTest();

    const { result, unmount, rerender } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>
          <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
        </RoomProvider>
      ),
    });

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

    const oldResult = result.current;

    rerender();

    expect(oldResult).toBe(result.current);

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
    const roomId = nanoid();
    let getThreadsReqCount = 0;

    server.use(
      mockGetThreads((_req, res, ctx) => {
        getThreadsReqCount++;
        return res(ctx.status(500));
      })
    );

    const {
      room: {
        RoomProvider,
        suspense: { useThreads },
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>
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
        </RoomProvider>
      ),
    });

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

describe("useThreads: pagination", () => {
  test("should load the next page of data when `fetchMore` is called", async () => {
    const roomId = nanoid();

    const threadsPageOne = [
      dummyThreadData({
        roomId,
        createdAt: new Date("2021-01-01T00:00:00Z"),
      }),
    ];
    const threadsPageTwo = [
      dummyThreadData({
        roomId,
        createdAt: new Date("2021-01-02T00:00:00Z"),
      }),
    ];
    const threadsPageThree = [
      dummyThreadData({
        roomId,
        createdAt: new Date("2021-01-03T00:00:00Z"),
      }),
    ];
    const subscriptionsPageOne = [
      dummySubscriptionData({ subjectId: threadsPageOne[0]!.id }),
    ];
    const subscriptionsPageTwo = [
      dummySubscriptionData({ subjectId: threadsPageTwo[0]!.id }),
    ];
    const subscriptionsPageThree = [
      dummySubscriptionData({ subjectId: threadsPageThree[0]!.id }),
    ];

    let isPageOneRequested = false;
    let isPageTwoRequested = false;
    let isPageThreeRequested = false;

    server.use(
      mockGetThreads(async (req, res, ctx) => {
        const url = new URL(req.url);
        const cursor = url.searchParams.get("cursor");

        // Request for Page 2
        if (cursor === "cursor-1") {
          isPageTwoRequested = true;
          return res(
            ctx.json({
              data: threadsPageTwo,
              inboxNotifications: [],
              subscriptions: subscriptionsPageTwo,
              deletedThreads: [],
              deletedInboxNotifications: [],
              deletedSubscriptions: [],
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
              data: threadsPageThree,
              subscriptions: subscriptionsPageThree,
              inboxNotifications: [],
              deletedThreads: [],
              deletedInboxNotifications: [],
              deletedSubscriptions: [],
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
        // Request for the first page
        else {
          isPageOneRequested = true;
          return res(
            ctx.json({
              data: threadsPageOne,
              inboxNotifications: [],
              subscriptions: subscriptionsPageOne,
              deletedThreads: [],
              deletedInboxNotifications: [],
              deletedSubscriptions: [],
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
      room: { RoomProvider, useThreads },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>{children}</RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

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
      dummyThreadData({
        roomId,
        createdAt: new Date("2021-01-01T00:00:00Z"),
      }),
    ];
    const threadsPageTwo = [
      dummyThreadData({
        roomId,
        createdAt: new Date("2021-01-02T00:00:00Z"),
      }),
    ];
    const subscriptionsPageOne = [
      dummySubscriptionData({ subjectId: threadsPageOne[0]!.id }),
    ];
    const subscriptionsPageTwo = [
      dummySubscriptionData({ subjectId: threadsPageTwo[0]!.id }),
    ];

    let isPageTwoRequested = false;
    let getThreadsReqCount = 0;

    server.use(
      mockGetThreads(async (req, res, ctx) => {
        getThreadsReqCount++;
        const url = new URL(req.url);
        const cursor = url.searchParams.get("cursor");

        // Request for Page 2
        if (cursor === "cursor-1") {
          isPageTwoRequested = true;
          return res(
            ctx.json({
              data: threadsPageTwo,
              subscriptions: subscriptionsPageTwo,
              inboxNotifications: [],
              deletedThreads: [],
              deletedInboxNotifications: [],
              deletedSubscriptions: [],
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
        // Request for the first page
        else {
          return res(
            ctx.json({
              data: threadsPageOne,
              subscriptions: subscriptionsPageOne,
              inboxNotifications: [],
              deletedThreads: [],
              deletedInboxNotifications: [],
              deletedSubscriptions: [],
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
      room: { RoomProvider, useThreads },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>{children}</RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

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
    expect(getThreadsReqCount).toEqual(1);

    const fetchMore = result.current.fetchMore!;

    fetchMore();
    await waitFor(() => expect(isPageTwoRequested).toBe(true));
    expect(getThreadsReqCount).toEqual(2);
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

    let isPageTwoRequested = false;

    const threadsPageOne = [dummyThreadData({ roomId })];

    server.use(
      mockGetThreads(async (req, res, ctx) => {
        const url = new URL(req.url);
        const cursor = url.searchParams.get("cursor");

        // Initial load (Page 1)
        if (cursor === null) {
          return res(
            ctx.json({
              data: threadsPageOne,
              inboxNotifications: [],
              subscriptions: [],
              deletedThreads: [],
              deletedInboxNotifications: [],
              deletedSubscriptions: [],
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
      room: { RoomProvider, useThreads },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>{children}</RoomProvider>
      ),
    });

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
