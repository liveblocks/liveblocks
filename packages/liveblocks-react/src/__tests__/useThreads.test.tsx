import type { ThreadData } from "@liveblocks/core";
import { createClient } from "@liveblocks/core";
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import type { ResponseComposition, RestContext, RestRequest } from "msw";
import { rest } from "msw";
import { setupServer } from "msw/node";
import React, { Suspense } from "react";

import { createRoomContext } from "../room";
import MockWebSocket from "./_MockWebSocket";

const THREADS_POLLING_INTERVAL_WITH_WS = 30000;

const client = createClient({
  publicApiKey: "pk_xxx",
  polyfills: {
    WebSocket: MockWebSocket as any,
  },
});

const threads: ThreadData[] = [
  {
    id: "th_xxx",
    metadata: {},
    roomId: "room",
    type: "thread",
    createdAt: new Date("2021-10-06T01:45:56.558Z"),
    comments: [],
  },
];

// Even if considered an antipattern (https://mswjs.io/docs/extensions/life-cycle-events#tracking-a-request),
// it's acceptable to detect our polling behavior
const fetchThreadsMock = jest.fn();

const server = setupServer(
  rest.post(
    "https://api.liveblocks.io/v2/c/rooms/room-id/threads/search",
    fetchThreadsMock
  )
);

beforeAll(() => server.listen());

beforeEach(() => {
  fetchThreadsMock.mockReset();
  fetchThreadsMock.mockImplementation(
    (_: RestRequest, res: ResponseComposition, ctx: RestContext) => {
      return res(
        ctx.json({
          data: threads,
        })
      );
    }
  );
  jest.useFakeTimers();
  MockWebSocket.instances = [];
});

afterEach(() => {
  MockWebSocket.instances = [];
  fetchThreadsMock.mockReset();
  jest.useRealTimers();
  server.resetHandlers();
});
afterAll(() => server.close());

const {
  RoomProvider,
  useThreads,
  useMyPresence,
  suspense: { useThreads: useThreadsSuspense },
} = createRoomContext(client);

describe("useThreads", () => {
  test("should poll threads every 30sec", async () => {
    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          {children}
        </RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

    await waitFor(() => expect(fetchThreadsMock).toHaveBeenCalledTimes(1));

    expect(result.current).toEqual({ isLoading: false, threads });

    jest.advanceTimersByTime(THREADS_POLLING_INTERVAL_WITH_WS);

    await waitFor(() => expect(fetchThreadsMock).toHaveBeenCalledTimes(2));

    unmount();
  });

  test("should stop polling threads on unmount", async () => {
    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          {children}
        </RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

    await waitFor(() => expect(fetchThreadsMock).toHaveBeenCalledTimes(1));

    expect(result.current).toEqual({ isLoading: false, threads });

    unmount();

    jest.advanceTimersByTime(THREADS_POLLING_INTERVAL_WITH_WS);

    await waitFor(() => expect(fetchThreadsMock).toHaveBeenCalledTimes(1));
  });

  test("should stop polling threads on unmount", async () => {
    const { result, unmount } = renderHook(() => useThreads(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          {children}
        </RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

    await waitFor(() => expect(fetchThreadsMock).toHaveBeenCalledTimes(1));

    expect(result.current).toEqual({ isLoading: false, threads });

    unmount();

    jest.advanceTimersByTime(THREADS_POLLING_INTERVAL_WITH_WS);

    await waitFor(() => expect(fetchThreadsMock).toHaveBeenCalledTimes(1));
  });

  // This isn't true anymore, multiple instances of useThreads with different filters won't dedupe requests
  test.skip("multiple instances of useThreads should not fetch threads multiple times (dedupe requests)", async () => {
    function MultipleUseThreads() {
      useThreads();
      useThreads();
      useThreads();
      return <></>;
    }

    const { unmount } = render(<MultipleUseThreads />, {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          {children}
        </RoomProvider>
      ),
    });

    await waitFor(() => expect(fetchThreadsMock).toHaveBeenCalledTimes(1));

    jest.advanceTimersByTime(THREADS_POLLING_INTERVAL_WITH_WS);

    await waitFor(() => expect(fetchThreadsMock).toHaveBeenCalledTimes(2));

    unmount();
  });

  test.skip("should stop polling threads only when all instances of useThreads are unmounted", async () => {
    function Threads() {
      useThreads();
      return <div></div>;
    }

    function Component({
      isFirstThreadsInstanceVisible,
    }: {
      isFirstThreadsInstanceVisible: boolean;
    }) {
      return (
        <>
          {isFirstThreadsInstanceVisible && <Threads />}
          <Threads />
        </>
      );
    }

    const { rerender, unmount } = render(
      <Component isFirstThreadsInstanceVisible={true} />,
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
        ),
      }
    );

    await waitFor(() => expect(fetchThreadsMock).toHaveBeenCalledTimes(2)); // We do not dedupe requests during initial revalidation anymore

    // We unmount the first instance of useThreads
    rerender(<Component isFirstThreadsInstanceVisible={false} />);

    jest.advanceTimersByTime(THREADS_POLLING_INTERVAL_WITH_WS);

    await waitFor(() => expect(fetchThreadsMock).toHaveBeenCalledTimes(2));

    unmount();

    jest.advanceTimersByTime(THREADS_POLLING_INTERVAL_WITH_WS);

    await waitFor(() => expect(fetchThreadsMock).toHaveBeenCalledTimes(2));
  });

  test("mounting the RoomProvider without using useThreads should not fetch threads", async () => {
    const { unmount } = renderHook(() => useMyPresence(), {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          {children}
        </RoomProvider>
      ),
    });

    await waitFor(() => expect(fetchThreadsMock).not.toHaveBeenCalled());

    jest.advanceTimersByTime(THREADS_POLLING_INTERVAL_WITH_WS);

    await waitFor(() => expect(fetchThreadsMock).not.toHaveBeenCalled());

    unmount();
  });
});

describe("useThreadsSuspense", () => {
  test("should poll threads", async () => {
    function Threads() {
      const { threads } = useThreadsSuspense();

      return <>{threads[0].id}</>;
    }

    const { getByText } = render(<Threads />, {
      wrapper: ({ children }) => (
        <RoomProvider id="room-id" initialPresence={{}}>
          <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
        </RoomProvider>
      ),
    });

    expect(getByText("Loading")).not.toBe(null);

    expect(await screen.findByText(threads[0].id)).not.toBe(null);
  });
});
