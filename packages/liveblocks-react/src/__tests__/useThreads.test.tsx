import "@testing-library/jest-dom";

import type { BaseMetadata, JsonObject } from "@liveblocks/core";
import { convertToThreadData, createClient } from "@liveblocks/core";
import { renderHook, screen, waitFor } from "@testing-library/react";
import { rest } from "msw";
import { setupServer } from "msw/node";
import React, { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { createRoomContext } from "../factory";
import { dummyThreadDataPlain } from "./_dummies";
import MockWebSocket from "./_MockWebSocket";

const mockVisibility = jest.spyOn(document, "visibilityState", "get");

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

beforeEach(() => {
  MockWebSocket.reset();
  jest.useFakeTimers();
  // Initial state is online (by default) and visible
  mockVisibility.mockReturnValue("visible");
});

afterEach(() => {
  MockWebSocket.reset();
  jest.useRealTimers();
  server.resetHandlers();
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

  return createRoomContext<JsonObject, never, never, never, TThreadMetadata>(
    client
  );
}

describe("useThreads", () => {
  test("should fetch threads", async () => {
    const threads = [dummyThreadDataPlain()];

    server.use(
      rest.post(
        "https://api.liveblocks.io/v2/c/rooms/room-id/threads/search",
        async (_req, res, ctx) => {
          return res(
            ctx.json({
              data: threads,
            })
          );
        }
      )
    );

    const { RoomProvider, useThreads } = createRoomContextForTest();

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
        threads: threads.map(convertToThreadData),
      })
    );

    unmount();
  });

  test("multiple instances of useThreads should not fetch threads multiple times (dedupe requests)", async () => {
    let getThreadsReqCount = 0;

    const threads = [dummyThreadDataPlain()];
    server.use(
      rest.post(
        "https://api.liveblocks.io/v2/c/rooms/room-id/threads/search",
        async (_req, res, ctx) => {
          getThreadsReqCount++;
          return res(
            ctx.json({
              data: threads,
            })
          );
        }
      )
    );

    const { RoomProvider, useThreads } = createRoomContextForTest();

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

    await waitFor(() => expect(getThreadsReqCount).toBe(1));

    unmount();
  });

  test("should fetch threads for a given query", async () => {
    const resolvedThread = dummyThreadDataPlain();
    resolvedThread.metadata = {
      resolved: true,
    };

    const unresolvedThread = dummyThreadDataPlain();
    unresolvedThread.metadata = {
      resolved: false,
    };

    server.use(
      rest.post(
        "https://api.liveblocks.io/v2/c/rooms/room-id/threads/search",
        async (req, res, ctx) => {
          const { metadata } = await req.json<{ metadata: BaseMetadata }>();

          return res(
            ctx.json({
              data: [resolvedThread, unresolvedThread].filter(
                (thread) => thread.metadata.resolved === metadata.resolved
              ),
            })
          );
        }
      )
    );

    const { RoomProvider, useThreads } = createRoomContextForTest<{
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
        threads: [resolvedThread].map(convertToThreadData),
      })
    );

    unmount();
  });

  test("should dedupe fetch threads for a given query", async () => {
    let getThreadsReqCount = 0;

    const threads = [dummyThreadDataPlain()];
    server.use(
      rest.post(
        "https://api.liveblocks.io/v2/c/rooms/room-id/threads/search",
        async (_req, res, ctx) => {
          getThreadsReqCount++;
          return res(
            ctx.json({
              data: threads,
            })
          );
        }
      )
    );

    const { RoomProvider, useThreads } = createRoomContextForTest<{
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
    const resolvedThread = dummyThreadDataPlain();
    resolvedThread.metadata = {
      resolved: true,
    };

    const unresolvedThread = dummyThreadDataPlain();
    unresolvedThread.metadata = {
      resolved: false,
    };

    server.use(
      rest.post(
        "https://api.liveblocks.io/v2/c/rooms/room-id/threads/search",
        async (req, res, ctx) => {
          const { metadata } = await req.json<{ metadata: BaseMetadata }>();
          return res(
            ctx.json({
              data: [resolvedThread, unresolvedThread].filter(
                (thread) => thread.metadata.resolved === metadata.resolved
              ),
            })
          );
        }
      )
    );

    const { RoomProvider, useThreads } = createRoomContextForTest<{
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
        threads: [resolvedThread].map(convertToThreadData),
      })
    );

    rerender({ resolved: false });

    expect(result.current).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [unresolvedThread].map(convertToThreadData),
      })
    );

    rerender({ resolved: true });

    // Resolved threads are displayed instantly because we already fetched them previously
    expect(result.current).toEqual({
      isLoading: true,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        threads: [resolvedThread].map(convertToThreadData),
      })
    );

    unmount();
  });

  test("mounting the RoomProvider without using useThreads should not fetch threads", async () => {
    let getThreadsReqCount = 0;

    const threads = [dummyThreadDataPlain()];
    server.use(
      rest.post(
        "https://api.liveblocks.io/v2/c/rooms/room-id/threads/search",
        async (_req, res, ctx) => {
          getThreadsReqCount++;
          return res(
            ctx.json({
              data: threads,
            })
          );
        }
      )
    );

    const { RoomProvider, useMyPresence } = createRoomContextForTest();

    const { unmount } = renderHook(
      () => {
        useMyPresence();
      },
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
        ),
      }
    );

    await waitFor(() => expect(getThreadsReqCount).toBe(0));

    unmount();
  });

  test("should include any error object in the returned value if initial fetch throws an error", async () => {
    server.use(
      rest.post(
        "https://api.liveblocks.io/v2/c/rooms/room-id/threads/search",
        async (_req, res, ctx) => {
          return res(ctx.status(500));
        }
      )
    );

    const { RoomProvider, useThreads } = createRoomContextForTest();

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

  test("should render threads correctly for multiple RoomProvider", async () => {
    const room1Threads = [dummyThreadDataPlain()];
    room1Threads.map((thread) => (thread.roomId = "room1"));

    const room2Threads = [dummyThreadDataPlain()];
    room2Threads.map((thread) => (thread.roomId = "room2"));

    server.use(
      rest.post(
        "https://api.liveblocks.io/v2/c/rooms/room1/threads/search",
        async (_req, res, ctx) => {
          return res(
            ctx.json({
              data: room1Threads,
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
            })
          );
        }
      )
    );

    const { RoomProvider, useThreads } = createRoomContextForTest();

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
        threads: room1Threads.map(convertToThreadData),
      })
    );

    await waitFor(() =>
      expect(room2Result.current).toEqual({
        isLoading: false,
        threads: room2Threads.map(convertToThreadData),
      })
    );

    unmountRoom1();
    unmountRoom2();
  });
});

describe("useThreadsSuspense", () => {
  test("should fetch threads", async () => {
    const threads = [dummyThreadDataPlain()];

    server.use(
      rest.post(
        "https://api.liveblocks.io/v2/c/rooms/room-id/threads/search",
        async (_req, res, ctx) => {
          return res(
            ctx.json({
              data: threads,
            })
          );
        }
      )
    );

    const {
      RoomProvider,
      suspense: { useThreads },
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
        threads: threads.map(convertToThreadData),
      })
    );

    unmount();
  });

  test("should trigger error boundary if initial fetch throws an error", async () => {
    server.use(
      rest.post(
        "https://api.liveblocks.io/v2/c/rooms/room-id/threads/search",
        async (_req, res, ctx) => {
          return res(ctx.status(500));
        }
      )
    );

    const {
      RoomProvider,
      suspense: { useThreads },
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
