import {
  BaseMetadata,
  convertToThreadData,
  createClient,
} from "@liveblocks/core";
import { renderHook, waitFor } from "@testing-library/react";
import React, { Suspense } from "react";

import { createRoomContext } from "../room";
import MockWebSocket from "./_MockWebSocket";
import { mockGetThreads } from "./_restMocks";
import { dummyThreadDataPlain } from "./_dummies";
import { setupServer } from "msw/node";

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

  return createRoomContext<{}, never, never, never, TThreadMetadata>(client);
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
        const { metadata } = await req.json();
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
        const { metadata } = await req.json();
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
