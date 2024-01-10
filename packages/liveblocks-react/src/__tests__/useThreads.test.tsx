import type { BaseMetadata, JsonObject } from "@liveblocks/core";
import {
  convertToThreadData,
  createClient,
  ServerMsgCode,
} from "@liveblocks/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { addSeconds } from "date-fns";
import { rest } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import React, { Suspense } from "react";

import { createRoomContext } from "../room";
import { dummyThreadDataPlain } from "./_dummies";
import MockWebSocket, { websocketSimulator } from "./_MockWebSocket";
import { mockGetThread, mockGetThreads } from "./_restMocks";

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
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: threads,
            inboxNotifications: [],
          })
        );
      })
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
      mockGetThreads(async (_req, res, ctx) => {
        getThreadsReqCount++;
        return res(
          ctx.json({
            data: threads,
            inboxNotifications: [],
          })
        );
      })
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

    expect(getThreadsReqCount).toBe(1);

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
      mockGetThreads(async (req, res, ctx) => {
        const { metadata } = await req.json<{ metadata: BaseMetadata }>();
        return res(
          ctx.json({
            data: [resolvedThread, unresolvedThread].filter(
              (thread) => thread.metadata.resolved === metadata.resolved
            ),
            inboxNotifications: [],
          })
        );
      })
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
      mockGetThreads(async (_req, res, ctx) => {
        getThreadsReqCount++;
        return res(
          ctx.json({
            data: threads,
            inboxNotifications: [],
          })
        );
      })
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
      mockGetThreads(async (req, res, ctx) => {
        const { metadata } = await req.json<{ metadata: BaseMetadata }>();
        return res(
          ctx.json({
            data: [resolvedThread, unresolvedThread].filter(
              (thread) => thread.metadata.resolved === metadata.resolved
            ),
            inboxNotifications: [],
          })
        );
      })
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
      isLoading: false,
      threads: [resolvedThread].map(convertToThreadData),
    });

    unmount();
  });

  test("multiple instances of RoomProvider should render their corresponding threads correctly", async () => {
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
              inboxNotifications: [],
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

  test("should correctly display threads if room id changed dynamically and should display threads instantly if query for the room already been done in the past", async () => {
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
              inboxNotifications: [],
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
            })
          );
        }
      )
    );

    const { RoomProvider, useThreads } = createRoomContextForTest();

    const RoomIdDispatchContext = React.createContext<
      ((value: string) => void) | null
    >(null);

    const wrapper = ({ children }: { children: ReactNode }) => {
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
      wrapper,
    });

    expect(result.current.state).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current.state).toEqual({
        isLoading: false,
        threads: room1Threads.map(convertToThreadData),
      })
    );

    act(() => {
      result.current.setRoomId?.("room2");
    });

    expect(result.current.state).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current.state).toEqual({
        isLoading: false,
        threads: room2Threads.map(convertToThreadData),
      })
    );

    act(() => {
      result.current.setRoomId?.("room1");
    });

    await waitFor(() =>
      expect(result.current.state).toEqual({
        isLoading: false,
        threads: room1Threads.map(convertToThreadData),
      })
    );

    unmount();
  });
});

describe("WebSocket events", () => {
  test("COMMENT_CREATED event should refresh thread", async () => {
    const newThread = dummyThreadDataPlain();

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: [],
            inboxNotifications: [],
          })
        );
      }),
      mockGetThread({ threadId: newThread.id }, async (_req, res, ctx) => {
        return res(
          ctx.json({
            ...newThread,
            inboxNotification: undefined,
          })
        );
      })
    );

    const { RoomProvider, useThreads } = createRoomContextForTest();

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
        threads: [convertToThreadData(newThread)],
      })
    );

    unmount();
  });

  test("COMMENT_DELETED event should delete thread if getThread return 404", async () => {
    const newThread = dummyThreadDataPlain();

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: [newThread],
            inboxNotifications: [],
          })
        );
      }),
      mockGetThread({ threadId: newThread.id }, async (_req, res, ctx) => {
        return res(ctx.status(404));
      })
    );

    const { RoomProvider, useThreads } = createRoomContextForTest();

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
        threads: [newThread].map(convertToThreadData),
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
    const initialThread = dummyThreadDataPlain();
    initialThread.updatedAt = now.toISOString();
    initialThread.metadata = { counter: 0 };

    const delayedThread = {
      ...initialThread,
      updatedAt: addSeconds(now, 1).toISOString(),
      metadata: { counter: 1 },
    };

    const latestThread = {
      ...initialThread,
      updatedAt: addSeconds(now, 2).toISOString(),
      metadata: { counter: 2 },
    };

    let callIndex = 0;

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: [initialThread],
            inboxNotifications: [],
          })
        );
      }),
      mockGetThread({ threadId: initialThread.id }, async (_req, res, ctx) => {
        if (callIndex === 0) {
          callIndex++;
          return res(
            ctx.json({
              ...latestThread,
              inboxNotification: undefined,
            })
          );
        } else if (callIndex === 1) {
          callIndex++;
          return res(
            ctx.json({
              ...delayedThread,
              inboxNotification: undefined,
            })
          );
        } else {
          throw new Error("Only two calls to getThreads are expected");
        }
      })
    );

    const { RoomProvider, useThreads } = createRoomContextForTest();

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
        threads: [convertToThreadData(initialThread)],
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
        threads: [convertToThreadData(latestThread)],
      })
    );

    unmount();
  });
});

describe("useThreadsSuspense", () => {
  test("should fetch threads", async () => {
    const threads = [dummyThreadDataPlain()];

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: threads,
            inboxNotifications: [],
          })
        );
      })
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
});
