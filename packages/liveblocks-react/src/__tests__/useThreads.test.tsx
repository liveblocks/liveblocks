import "@testing-library/jest-dom";

import type { BaseMetadata, JsonObject } from "@liveblocks/core";
import { createClient, kInternal, ServerMsgCode } from "@liveblocks/core";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { addSeconds } from "date-fns";
import { rest } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import React, { Suspense } from "react";
import type { FallbackProps } from "react-error-boundary";
import { ErrorBoundary } from "react-error-boundary";

import { createLiveblocksContext } from "../liveblocks";
import { createRoomContext, generateQueryKey, POLLING_INTERVAL } from "../room";
import { dummyInboxNoficationData, dummyThreadData } from "./_dummies";
import MockWebSocket, { websocketSimulator } from "./_MockWebSocket";
import {
  mockGetInboxNotifications,
  mockGetThread,
  mockGetThreads,
} from "./_restMocks";

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

// TODO: Dry up and create utils that wrap renderHook
function createRoomContextForTest<
  TThreadMetadata extends BaseMetadata = BaseMetadata,
>() {
  const client = createClient({
    publicApiKey: "pk_xxx",
    polyfills: {
      WebSocket: MockWebSocket as any,
    },
  });

  return {
    roomCtx: createRoomContext<
      JsonObject,
      never,
      never,
      never,
      TThreadMetadata
    >(client),
    liveblocksCtx: createLiveblocksContext(client),
    client,
  };
}

describe("useThreads", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("should fetch threads", async () => {
    const threads = [dummyThreadData()];

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: threads,
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
      roomCtx: { RoomProvider, useThreads },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          {children}
        </RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads,
      })
    );

    unmount();
  });

  test("should be referentially stable after a re-render", async () => {
    const threads = [dummyThreadData()];

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: threads,
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
      roomCtx: { RoomProvider, useThreads },
    } = createRoomContextForTest();

    const { result, unmount, rerender } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          {children}
        </RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads,
      })
    );

    const oldResult = result.current;

    rerender();

    expect(oldResult).toBe(result.current);

    unmount();
  });

  test("multiple instances of useThreads should not fetch threads multiple times (dedupe requests)", async () => {
    let getThreadsReqCount = 0;

    const threads = [dummyThreadData()];
    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        getThreadsReqCount++;
        return res(
          ctx.json({
            data: threads,
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
      roomCtx: { RoomProvider, useThreads },
    } = createRoomContextForTest();

    const { unmount, rerender } = renderHook(
      () => {
        useThreads();
        useThreads();
        useThreads();
      },
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
        ),
      }
    );

    await waitFor(() => expect(getThreadsReqCount).toBe(1));

    rerender();

    expect(getThreadsReqCount).toBe(1);

    unmount();
  });

  test("should fetch threads for a given query", async () => {
    const resolvedThread = dummyThreadData();
    resolvedThread.metadata = {
      resolved: true,
    };

    const unresolvedThread = dummyThreadData();
    unresolvedThread.metadata = {
      resolved: false,
    };

    server.use(
      mockGetThreads(async (req, res, ctx) => {
        const { metadata } = await req.json<{ metadata: BaseMetadata }>();
        return res(
          ctx.json({
            data: [resolvedThread, unresolvedThread].filter(
              (thread) => thread.metadata.resolved === metadata.resolved
            ),
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
      roomCtx: { RoomProvider, useThreads },
    } = createRoomContextForTest<{
      resolved: boolean;
    }>();

    const { result, unmount } = renderHook(
      () => useThreads({ query: { metadata: { resolved: true } } }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
        ),
      }
    );

    expect(result.current).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [resolvedThread],
      })
    );

    unmount();
  });

  test("should dedupe fetch threads for a given query", async () => {
    let getThreadsReqCount = 0;

    const threads = [dummyThreadData()];
    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        getThreadsReqCount++;
        return res(
          ctx.json({
            data: threads,
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
      roomCtx: { RoomProvider, useThreads },
    } = createRoomContextForTest<{
      resolved: boolean;
    }>();

    const { unmount } = renderHook(
      () => {
        useThreads({ query: { metadata: { resolved: true } } });
        useThreads({ query: { metadata: { resolved: true } } });
      },
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
        ),
      }
    );

    await waitFor(() => expect(getThreadsReqCount).toBe(1));

    unmount();
  });

  test("should refetch threads if query changed dynamically and should display threads instantly if query already been done in the past", async () => {
    const resolvedThread = dummyThreadData();
    resolvedThread.metadata = {
      resolved: true,
    };

    const unresolvedThread = dummyThreadData();
    unresolvedThread.metadata = {
      resolved: false,
    };

    server.use(
      mockGetThreads(async (req, res, ctx) => {
        const { metadata } = await req.json<{ metadata: BaseMetadata }>();
        return res(
          ctx.json({
            data: [resolvedThread, unresolvedThread].filter(
              (thread) => thread.metadata.resolved === metadata.resolved
            ),
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
      roomCtx: { RoomProvider, useThreads },
    } = createRoomContextForTest<{
      resolved: boolean;
    }>();

    const { result, unmount, rerender } = renderHook(
      ({ resolved }: { resolved: boolean }) =>
        useThreads({ query: { metadata: { resolved } } }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
        ),
        initialProps: { resolved: true },
      }
    );

    expect(result.current).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [resolvedThread],
      })
    );

    rerender({ resolved: false });

    expect(result.current).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [unresolvedThread],
      })
    );

    rerender({ resolved: true });

    // Resolved threads are displayed instantly because we already fetched them previously
    expect(result.current).toEqual({
      isLoading: false,
      threads: [resolvedThread],
    });

    unmount();
  });

  test("multiple instances of RoomProvider should render their corresponding threads correctly", async () => {
    const room1Threads = [dummyThreadData()];
    room1Threads.map((thread) => (thread.roomId = "room1"));

    const room2Threads = [dummyThreadData()];
    room2Threads.map((thread) => (thread.roomId = "room2"));

    server.use(
      rest.post(
        "https://api.liveblocks.io/v2/c/rooms/room1/threads/search",
        async (_req, res, ctx) => {
          return res(
            ctx.json({
              data: room1Threads,
              inboxNotifications: [],
              deletedThreads: [],
              deletedInboxNotifications: [],
              meta: {
                requestedAt: new Date().toISOString(),
              },
            })
          );
        }
      ),
      rest.post(
        "https://api.liveblocks.io/v2/c/rooms/room2/threads/search",
        async (_req, res, ctx) => {
          return res(
            ctx.json({
              data: room2Threads,
              inboxNotifications: [],
              deletedThreads: [],
              deletedInboxNotifications: [],
              meta: {
                requestedAt: new Date().toISOString(),
              },
            })
          );
        }
      )
    );

    const {
      roomCtx: { RoomProvider, useThreads },
    } = createRoomContextForTest();

    const { result: room1Result, unmount: unmountRoom1 } = renderHook(
      () => useThreads(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room1" initialPresence={{}}>
            {children}
          </RoomProvider>
        ),
      }
    );

    const { result: room2Result, unmount: unmountRoom2 } = renderHook(
      () => useThreads(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room2" initialPresence={{}}>
            {children}
          </RoomProvider>
        ),
      }
    );

    expect(room1Result.current).toEqual({ isLoading: true });
    expect(room2Result.current).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(room1Result.current).toEqual({
        isLoading: false,
        threads: room1Threads,
      })
    );

    await waitFor(() =>
      expect(room2Result.current).toEqual({
        isLoading: false,
        threads: room2Threads,
      })
    );

    unmountRoom1();
    unmountRoom2();
  });

  test("should correctly display threads if room id changed dynamically and should display threads instantly if query for the room already been done in the past", async () => {
    const room1Threads = [dummyThreadData()];
    room1Threads.map((thread) => (thread.roomId = "room1"));

    const room2Threads = [dummyThreadData()];
    room2Threads.map((thread) => (thread.roomId = "room2"));

    server.use(
      rest.post(
        "https://api.liveblocks.io/v2/c/rooms/room1/threads/search",
        async (_req, res, ctx) => {
          return res(
            ctx.json({
              data: room1Threads,
              inboxNotifications: [],
              deletedThreads: [],
              deletedInboxNotifications: [],
              meta: {
                requestedAt: new Date().toISOString(),
              },
            })
          );
        }
      ),
      rest.post(
        "https://api.liveblocks.io/v2/c/rooms/room2/threads/search",
        async (_req, res, ctx) => {
          return res(
            ctx.json({
              data: room2Threads,
              inboxNotifications: [],
              deletedThreads: [],
              deletedInboxNotifications: [],
              meta: {
                requestedAt: new Date().toISOString(),
              },
            })
          );
        }
      )
    );

    const {
      roomCtx: { RoomProvider, useThreads },
    } = createRoomContextForTest();

    const RoomIdDispatchContext = React.createContext<
      ((value: string) => void) | null
    >(null);

    const Wrapper = ({ children }: { children: ReactNode }) => {
      const [roomId, setRoomId] = React.useState("room1");

      return (
        <RoomIdDispatchContext.Provider value={setRoomId}>
          <RoomProvider id={roomId} initialPresence={{}}>
            {children}
          </RoomProvider>
        </RoomIdDispatchContext.Provider>
      );
    };

    const useThreadsContainer = () => {
      const setRoomId = React.useContext(RoomIdDispatchContext);
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
      })
    );

    act(() => {
      result.current.setRoomId?.("room2");
    });

    expect(result.current.state).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current.state).toEqual({
        isLoading: false,
        threads: room2Threads,
      })
    );

    act(() => {
      result.current.setRoomId?.("room1");
    });

    await waitFor(() =>
      expect(result.current.state).toEqual({
        isLoading: false,
        threads: room1Threads,
      })
    );

    unmount();
  });

  test("should include an error object in the returned value if initial fetch throws an error", async () => {
    server.use(
      mockGetThreads((_req, res, ctx) => {
        // Mock an error response from the server for the initial fetch
        return res(ctx.status(500));
      })
    );

    const {
      roomCtx: { RoomProvider, useThreads },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          {children}
        </RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current).toEqual({
        threads: [],
        isLoading: false,
        error: expect.any(Error),
      })
    );

    unmount();
  });

  test("should sort threads by creation date before returning", async () => {
    const oldThread = dummyThreadData();
    oldThread.createdAt = new Date("2021-01-01T00:00:00Z");

    const newThread = dummyThreadData();
    newThread.createdAt = new Date("2021-01-02T00:00:00Z");

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: [newThread, oldThread], // The order is intentionally reversed to test if the hook sorts the threads by creation date
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
      roomCtx: { RoomProvider, useThreads },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current.threads).toEqual({
        isLoading: false,
        threads: [oldThread, newThread],
      })
    );

    unmount();
  });

  test("should sort threads by creation date before returning (when GET THREADS resolves before GET INBOX NOTIFICATIONS request)", async () => {
    const oldThread = dummyThreadData();
    oldThread.createdAt = new Date("2021-01-01T00:00:00Z");

    const newThread = dummyThreadData();
    newThread.createdAt = new Date("2021-01-02T00:00:00Z");

    const inboxNotification = dummyInboxNoficationData();
    inboxNotification.threadId = oldThread.id;

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: [newThread],
            inboxNotifications: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
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
      roomCtx: { RoomProvider, useThreads },
      liveblocksCtx: { useInboxNotifications },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads(),
        inboxNotifications: useInboxNotifications(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
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
      })
    );

    unmount();
  });

  test("should sort threads by creation date before returning (when GET THREADS resolves after GET INBOX NOTIFICATIONS request)", async () => {
    const oldThread = dummyThreadData();
    oldThread.createdAt = new Date("2021-01-01T00:00:00Z");

    const newThread = dummyThreadData();
    newThread.createdAt = new Date("2021-01-02T00:00:00Z");

    const inboxNotification = dummyInboxNoficationData();
    inboxNotification.threadId = newThread.id;

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        // Mock a delay in response so that GET THREADS request is resolved after GET NOTIFICATIONS request
        ctx.delay(100);
        return res(
          ctx.json({
            data: [oldThread],
            inboxNotifications: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        );
      }),
      mockGetInboxNotifications(async (_req, res, ctx) => {
        return res(
          ctx.json({
            threads: [newThread],
            inboxNotifications: [inboxNotification],
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
      roomCtx: { RoomProvider, useThreads },
      liveblocksCtx: { useInboxNotifications },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads(),
        inboxNotifications: useInboxNotifications(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
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
      })
    );

    unmount();
  });

  test("should not return deleted threads", async () => {
    const thread1 = dummyThreadData();
    const thread2WithDeletedAt = {
      ...dummyThreadData(),
      deletedAt: new Date(),
    };

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: [],
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
      roomCtx: { RoomProvider, useThreads },
      client,
    } = createRoomContextForTest();

    const store = client[kInternal].cacheStore;
    store.set((state) => ({
      ...state,
      threads: {
        [thread1.id]: thread1,
        [thread2WithDeletedAt.id]: thread2WithDeletedAt,
      },
      queries: {
        [generateQueryKey("room-id", { metadata: {} })]: {
          isLoading: false,
        },
      },
    }));

    const { result, unmount } = renderHook(
      () => useThreads({ query: { metadata: {} } }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
        ),
      }
    );

    expect(result.current).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [thread1], // thread2WithDeleteAt should not be returned
      })
    );

    unmount();
  });

  test("should update threads if room has been mounted after being unmounted", async () => {
    let threads = [dummyThreadData(), dummyThreadData()];
    const originalThreads = [...threads];

    server.use(
      mockGetThreads(async (req, res, ctx) => {
        const url = new URL(req.url);
        const since = url.searchParams.get("since");

        if (since) {
          const updatedThreads = threads.filter((thread) => {
            if (thread.updatedAt === undefined) return false;
            return new Date(thread.updatedAt) >= new Date(since);
          });

          return res(
            ctx.json({
              data: updatedThreads,
              deletedThreads: [],
              inboxNotifications: [],
              deletedInboxNotifications: [],
              meta: {
                requestedAt: new Date().toISOString(),
              },
            })
          );
        }

        return res(
          ctx.json({
            data: threads,
            deletedThreads: [],
            inboxNotifications: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        );
      })
    );

    const {
      roomCtx: { RoomProvider, useThreads },
    } = createRoomContextForTest();

    const firstRenderResult = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          {children}
        </RoomProvider>
      ),
    });

    expect(firstRenderResult.result.current).toEqual({ isLoading: true });

    // Threads should be displayed after the server responds with the threads
    await waitFor(() =>
      expect(firstRenderResult.result.current).toEqual({
        isLoading: false,
        threads,
      })
    );

    firstRenderResult.unmount();

    // Add a new thread to the threads array to simulate a new thread being added to the room
    threads = [...originalThreads, dummyThreadData()];

    // Render the RoomProvider again and verify the threads are updated
    const secondRenderResult = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          {children}
        </RoomProvider>
      ),
    });

    // Threads (outdated ones) should be displayed instantly because we already fetched them previously
    expect(secondRenderResult.result.current).toEqual({
      isLoading: false,
      threads: originalThreads,
    });

    // The updated threads should be displayed after the server responds with the updated threads (either due to a fetch request to get all threads or just the updated threads)
    await waitFor(() => {
      expect(secondRenderResult.result.current).toEqual({
        isLoading: false,
        threads,
      });
    });

    secondRenderResult.unmount();
  });

  test("should not refetch threads if room has been mounted after being unmounted if another RoomProvider for the same id is still mounted", async () => {
    const threads = [dummyThreadData()];
    let getThreadsReqCount = 0;

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        getThreadsReqCount++;
        return res(
          ctx.json({
            data: threads,
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
      roomCtx: { RoomProvider, useThreads },
      client,
    } = createRoomContextForTest();

    const Room = () => {
      return (
        <RoomProvider id="room-id" initialPresence={{}}>
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

    const room = client.getRoom("room-id");
    expect(room).not.toBeNull();
    if (room === null) return;

    // Mock the getThreads method so we can verify it wasn't called
    room[kInternal].comments.getThreads = jest.fn();

    // Rerender the first RoomProvider and verify a new fetch request wasn't initiated
    rerender(<FirstRoom />);

    // A new fetch request for the threads should not have been made
    expect(room[kInternal].comments.getThreads).not.toHaveBeenCalled();

    unmountFirstRoom();
    unmountSecondRoom();
  });

  test("should update threads for a room when the browser comes back online", async () => {
    const threads = [dummyThreadData(), dummyThreadData()];

    server.use(
      mockGetThreads(async (req, res, ctx) => {
        const url = new URL(req.url);
        const since = url.searchParams.get("since");

        if (since) {
          const updatedThreads = threads.filter((thread) => {
            if (thread.updatedAt === undefined) return false;
            return new Date(thread.updatedAt) >= new Date(since);
          });

          return res(
            ctx.json({
              data: updatedThreads,
              deletedThreads: [],
              inboxNotifications: [],
              deletedInboxNotifications: [],
              meta: {
                requestedAt: new Date().toISOString(),
              },
            })
          );
        }

        return res(
          ctx.json({
            data: threads,
            deletedThreads: [],
            inboxNotifications: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        );
      })
    );

    const {
      roomCtx: { RoomProvider, useThreads },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          {children}
        </RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

    // Threads should be displayed after the server responds with the threads
    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads,
      })
    );

    // Add a new thread to the threads array to simulate a new thread being added to the room
    threads.push(dummyThreadData());

    // Simulate browser going online
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    // The updated threads should be displayed after the server responds with the updated threads (either due to a fetch request to get all threads or just the updated threads)
    await waitFor(() => {
      expect(result.current).toEqual({
        isLoading: false,
        threads,
      });
    });

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
    let getThreadsReqCount = 0;
    server.use(
      mockGetThreads((_req, res, ctx) => {
        getThreadsReqCount++;
        // Mock an error response from the server for the initial fetch
        return res(ctx.status(500));
      })
    );

    const {
      roomCtx: { RoomProvider, useThreads },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          {children}
        </RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() => expect(getThreadsReqCount).toBe(1));

    expect(result.current).toEqual({
      threads: [],
      isLoading: false,
      error: expect.any(Error),
    });

    // The first retry should be made after 5000ms * 2^0 (5000ms is the currently set error retry interval)
    jest.advanceTimersByTime(5000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getThreadsReqCount).toBe(2));

    // The second retry should be made after 5000ms * 2^1
    jest.advanceTimersByTime(5000 * Math.pow(2, 1));
    await waitFor(() => expect(getThreadsReqCount).toBe(3));

    // The third retry should be made after 5000ms * 2^2
    jest.advanceTimersByTime(5000 * Math.pow(2, 2));
    await waitFor(() => expect(getThreadsReqCount).toBe(4));

    // The fourth retry should be made after 5000ms * 2^3
    jest.advanceTimersByTime(5000 * Math.pow(2, 3));
    await waitFor(() => expect(getThreadsReqCount).toBe(5));

    // and so on...

    unmount();
  });

  test("should retry with exponential backoff with a maximum retry limit", async () => {
    let getThreadsReqCount = 0;

    server.use(
      mockGetThreads((_req, res, ctx) => {
        getThreadsReqCount++;
        // Mock an error response from the server
        return res(ctx.status(500));
      })
    );

    const {
      roomCtx: { RoomProvider, useThreads },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          {children}
        </RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() => expect(getThreadsReqCount).toBe(1));

    expect(result.current).toEqual({
      threads: [],
      isLoading: false,
      error: expect.any(Error),
    });

    // Simulate retries up to maximum retry count (currently set to 5)
    for (let i = 0; i < 5; i++) {
      const interval = 5000 * Math.pow(2, i); // 5000ms is the currently set error retry interval
      jest.advanceTimersByTime(interval);
      await waitFor(() => expect(getThreadsReqCount).toBe(i + 2));
    }

    expect(getThreadsReqCount).toBe(1 + 5); // initial request + 5 retries

    // No more retries should be made after the maximum number of retries
    await jest.advanceTimersByTimeAsync(5 * Math.pow(2, 5));

    // The number of requests should not have increased after the maximum number of retries
    expect(getThreadsReqCount).toBe(5 + 1);

    unmount();
  });

  test("should clear error state after a successful error retry", async () => {
    let getThreadsReqCount = 0;
    server.use(
      mockGetThreads((_req, res, ctx) => {
        getThreadsReqCount++;

        console.log("getThreadsReqCount", getThreadsReqCount);
        if (getThreadsReqCount === 1) {
          // Mock an error response from the server for the initial fetch
          return res(ctx.status(500));
        } else {
          // Mock a successful response from the server for the subsequent fetches
          return res(
            ctx.json({
              data: [],
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
      roomCtx: { RoomProvider, useThreads },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          {children}
        </RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() => expect(getThreadsReqCount).toBe(1));

    expect(result.current).toEqual({
      threads: [],
      isLoading: false,
      error: expect.any(Error),
    });

    // The first retry should be made after 5000ms * 2^0 (5000ms is the currently set error retry interval)
    jest.advanceTimersByTime(5000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getThreadsReqCount).toBe(2));

    expect(result.current).toEqual({
      threads: [],
      isLoading: false,
    });

    // No more retries should be made after successful retry
    await jest.advanceTimersByTimeAsync(5000 * Math.pow(2, 1));
    expect(getThreadsReqCount).toBe(2);

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
    let getThreadsReqCount = 0;

    const threads = [dummyThreadData()];

    const now = new Date().toISOString();

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        getThreadsReqCount++;
        return res(
          ctx.json({
            data: threads,
            inboxNotifications: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: now,
            },
          })
        );
      })
    );

    const {
      roomCtx: { RoomProvider, useThreads },
    } = createRoomContextForTest();

    const Room = () => {
      return (
        <RoomProvider id="room-id" initialPresence={{}}>
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
    jest.advanceTimersByTime(POLLING_INTERVAL);
    await waitFor(() => expect(getThreadsReqCount).toBe(2));

    // Advance time to simulate the polling interval
    jest.advanceTimersByTime(POLLING_INTERVAL);
    // Wait for the second polling to occur
    await waitFor(() => expect(getThreadsReqCount).toBe(3));

    unmount();
  });

  test("should not poll if useThreads or useRoomNotificationSettings isn't used", async () => {
    let hasCalledGetThreads = false;

    const threads = [dummyThreadData()];

    const now = new Date().toISOString();

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        hasCalledGetThreads = true;
        return res(
          ctx.json({
            data: threads,
            inboxNotifications: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: now,
            },
          })
        );
      })
    );

    const {
      roomCtx: { RoomProvider },
    } = createRoomContextForTest();

    const Room = () => {
      return (
        <RoomProvider id="room-id" initialPresence={{}}>
          <NoThreads />
        </RoomProvider>
      );
    };

    const NoThreads = () => {
      return null;
    };

    const { unmount } = render(<Room />);

    jest.advanceTimersByTime(POLLING_INTERVAL);
    await waitFor(() => expect(hasCalledGetThreads).toBe(false));

    jest.advanceTimersByTime(POLLING_INTERVAL);
    await waitFor(() => expect(hasCalledGetThreads).toBe(false));

    unmount();
  });
});

describe("WebSocket events", () => {
  test("COMMENT_CREATED event should refresh thread", async () => {
    const newThread = dummyThreadData();

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: [],
            inboxNotifications: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        );
      }),
      mockGetThread({ threadId: newThread.id }, async (_req, res, ctx) => {
        return res(
          ctx.json({
            thread: newThread,
            inboxNotification: undefined,
          })
        );
      })
    );

    const {
      roomCtx: { RoomProvider, useThreads },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          {children}
        </RoomProvider>
      ),
    });

    const sim = await websocketSimulator();

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [],
      })
    );

    sim.simulateIncomingMessage({
      type: ServerMsgCode.COMMENT_CREATED,
      threadId: newThread.id,
      commentId: newThread.comments[0].id,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [newThread],
      })
    );

    unmount();
  });

  test("COMMENT_DELETED event should delete thread if getThread return 404", async () => {
    const newThread = dummyThreadData();

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: [newThread],
            inboxNotifications: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        );
      }),
      mockGetThread({ threadId: newThread.id }, async (_req, res, ctx) => {
        return res(ctx.status(404));
      })
    );

    const {
      roomCtx: { RoomProvider, useThreads },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          {children}
        </RoomProvider>
      ),
    });

    const sim = await websocketSimulator();

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [newThread],
      })
    );

    // This should refresh the thread and get a 404
    sim.simulateIncomingMessage({
      type: ServerMsgCode.COMMENT_DELETED,
      threadId: newThread.id,
      commentId: newThread.comments[0].id,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [],
      })
    );

    unmount();
  });

  test("Websocket event should not refresh thread if updatedAt is earlier than the cached updatedAt", async () => {
    const now = new Date();
    const initialThread = dummyThreadData();
    initialThread.updatedAt = now;
    initialThread.metadata = { counter: 0 };

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
            deletedThreads: [],
            deletedInboxNotifications: [],
            meta: {
              requestedAt: new Date().toISOString(),
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
            })
          );
        } else if (callIndex === 1) {
          callIndex++;
          return res(
            ctx.json({
              thread: delayedThread,
              inboxNotification: undefined,
            })
          );
        } else {
          throw new Error("Only two calls to getThreads are expected");
        }
      })
    );

    const {
      roomCtx: { RoomProvider, useThreads },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          {children}
        </RoomProvider>
      ),
    });

    const sim = await websocketSimulator();

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [initialThread],
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
      })
    );

    unmount();
  });
});

describe("useThreadsSuspense", () => {
  test("should fetch threads", async () => {
    const threads = [dummyThreadData()];

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: threads,
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
      roomCtx: {
        RoomProvider,
        suspense: { useThreads },
      },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
        </RoomProvider>
      ),
    });

    expect(result.current).toEqual(null);

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads,
      })
    );

    unmount();
  });

  test("should be referentially stable after a re-render", async () => {
    const threads = [dummyThreadData()];

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: threads,
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
      roomCtx: {
        RoomProvider,
        suspense: { useThreads },
      },
    } = createRoomContextForTest();

    const { result, unmount, rerender } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
        </RoomProvider>
      ),
    });

    expect(result.current).toEqual(null);

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads,
      })
    );

    const oldResult = result.current;

    rerender();

    expect(oldResult).toBe(result.current);

    unmount();
  });

  test("should trigger error boundary if initial fetch throws an error", async () => {
    server.use(
      mockGetThreads((_req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    const {
      roomCtx: {
        RoomProvider,
        suspense: { useThreads },
      },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          <ErrorBoundary
            fallback={<div>There was an error while getting threads.</div>}
          >
            <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
          </ErrorBoundary>
        </RoomProvider>
      ),
    });

    expect(result.current).toEqual(null);

    await waitFor(() => {
      // Check if the error boundary's fallback UI is displayed
      expect(
        screen.getByText("There was an error while getting threads.")
      ).toBeInTheDocument();
    });

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

  test("should retry with exponential backoff on error and clear error boundary", async () => {
    let getThreadsReqCount = 0;
    server.use(
      mockGetThreads((_req, res, ctx) => {
        getThreadsReqCount++;

        if (getThreadsReqCount === 1) {
          // Mock an error response from the server
          return res(ctx.status(500));
        } else {
          // Mock a successful response from the server for the subsequent fetches
          return res(
            ctx.json({
              data: [],
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
      roomCtx: {
        RoomProvider,
        suspense: { useThreads },
      },
    } = createRoomContextForTest();

    function Fallback({ resetErrorBoundary }: FallbackProps) {
      return (
        <div>
          <p>There was an error while getting threads.</p>
          <button onClick={resetErrorBoundary}>Retry</button>
        </div>
      );
    }

    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          <ErrorBoundary FallbackComponent={Fallback}>
            <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
          </ErrorBoundary>
        </RoomProvider>
      ),
    });

    expect(result.current).toEqual(null);

    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() => expect(getThreadsReqCount).toBe(1));
    // Check if the error boundary's fallback UI is displayed
    expect(
      screen.getByText("There was an error while getting threads.")
    ).toBeInTheDocument();

    // The first retry should be made after 5000ms * 2^0 (5000ms is the currently set error retry interval)
    jest.advanceTimersByTime(5000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getThreadsReqCount).toBe(2));

    // Simulate clicking the retry button
    fireEvent.click(screen.getByText("Retry"));

    // The error boundary's fallback UI should be cleared
    expect(
      screen.queryByText("There was an error while getting threads.")
    ).not.toBeInTheDocument();

    unmount();
  });
});
