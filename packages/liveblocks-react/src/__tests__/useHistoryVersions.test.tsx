import "@testing-library/jest-dom";

import type { HistoryVersion } from "@liveblocks/core";
import { nanoid } from "@liveblocks/core";
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

import MockWebSocket from "./_MockWebSocket";
import { createContextsForTest } from "./_utils";

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

function mockListHistoryVersions(
  resolver: ResponseResolver<
    RestRequest<never, { roomId: string }>,
    RestContext,
    {
      versions: HistoryVersion[];
      meta: {
        requestedAt: string;
      };
    }
  >
) {
  return rest.get(
    "https://api.liveblocks.io/v2/c/rooms/:roomId/versions",
    resolver
  );
}

function mockGetHistoryVersionsSince(
  resolver: ResponseResolver<
    RestRequest<never, { roomId: string }>,
    RestContext,
    {
      versions: HistoryVersion[];
      meta: {
        requestedAt: string;
      };
    }
  >
) {
  return rest.get(
    "https://api.liveblocks.io/v2/c/rooms/:roomId/versions/delta",
    resolver
  );
}

describe("useHistoryVersions", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("should fetch room versions on mount", async () => {
    const roomId = nanoid();
    const versions: HistoryVersion[] = [
      {
        type: "historyVersion",
        kind: "yjs",
        createdAt: new Date(),
        id: "version_1",
        authors: [
          {
            id: "user-1",
          },
        ],
      },
    ];

    server.use(
      mockListHistoryVersions((_req, res, ctx) => {
        return res(
          ctx.json({
            versions,
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        );
      })
    );

    const {
      room: { RoomProvider, useHistoryVersions },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useHistoryVersions(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>{children}</RoomProvider>
      ),
    });

    expect(result.current).toEqual({
      isLoading: true,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        versions,
      })
    );

    unmount();
  });

  test("should return versions for the current room only", async () => {
    const roomId = nanoid();
    const versions: HistoryVersion[] = [
      {
        type: "historyVersion",
        kind: "yjs",
        createdAt: new Date(),
        id: "version_1",
        authors: [
          {
            id: "user-1",
          },
        ],
      },
    ];

    server.use(
      mockListHistoryVersions((_req, res, ctx) => {
        return res(
          ctx.json({
            versions,
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        );
      })
    );

    const {
      room: { RoomProvider, useHistoryVersions },
      umbrellaStore,
    } = createContextsForTest();

    umbrellaStore.historyVersions.update("room-1", [
      {
        type: "historyVersion",
        kind: "yjs",
        createdAt: new Date(),
        id: "version_1",
        authors: [{ id: "user-1" }],
      },
    ]);

    const { result, unmount } = renderHook(() => useHistoryVersions(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>{children}</RoomProvider>
      ),
    });

    expect(result.current).toEqual({
      isLoading: true,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        versions,
      })
    );

    unmount();
  });
});

describe("useHistoryVersions: error", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers(); // Restores the real timers
  });

  test("should return error if initial fetch throws an error", async () => {
    let listHistoryVersionsReqCount = 0;
    const roomId = nanoid();

    server.use(
      mockListHistoryVersions((_req, res, ctx) => {
        listHistoryVersionsReqCount++;
        return res(ctx.status(500));
      })
    );

    const {
      room: { RoomProvider, useHistoryVersions },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useHistoryVersions(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>{children}</RoomProvider>
      ),
    });

    expect(result.current).toEqual({ isLoading: true });

    // Wait until all fetch attempts have been done
    await jest.advanceTimersToNextTimerAsync(); // fetch attempt 1

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(listHistoryVersionsReqCount).toBe(2));

    // The second retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(listHistoryVersionsReqCount).toBe(3));

    // The third retry should be made after 10s
    await jest.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(listHistoryVersionsReqCount).toBe(4));

    // The fourth retry should be made after 15s
    await jest.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(listHistoryVersionsReqCount).toBe(5));

    await waitFor(() => {
      expect(result.current).toEqual({
        isLoading: false,
        error: expect.any(Error),
      });
    });

    // Wait for 5 second for the error to clear
    await jest.advanceTimersByTimeAsync(5_000);

    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() => expect(listHistoryVersionsReqCount).toBe(6));
    expect(result.current).toEqual({
      isLoading: true,
    });

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(listHistoryVersionsReqCount).toBe(7));

    // and so on...

    unmount();
  });
});

describe("useHistoryVersions: suspense", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("should fetch user threads on render", async () => {
    const roomId = nanoid();
    const versions: HistoryVersion[] = [
      {
        type: "historyVersion",
        kind: "yjs",
        createdAt: new Date(),
        id: "version_1",
        authors: [
          {
            id: "user-1",
          },
        ],
      },
    ];

    server.use(
      mockListHistoryVersions((_req, res, ctx) => {
        return res(
          ctx.json({
            versions,
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        );
      })
    );

    const {
      room: {
        suspense: { RoomProvider, useHistoryVersions },
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useHistoryVersions(), {
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
        versions,
      })
    );

    unmount();
  });
});

describe("useHistoryVersions: error", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers(); // Restores the real timers
    server.resetHandlers();
  });

  test("should trigger error boundary if initial fetch throws an error", async () => {
    let listHistoryVersionsReqCount = 0;

    const roomId = nanoid();

    server.use(
      mockListHistoryVersions((_req, res, ctx) => {
        listHistoryVersionsReqCount++;
        return res(ctx.status(500));
      })
    );

    const {
      room: {
        suspense: { RoomProvider, useHistoryVersions },
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useHistoryVersions(), {
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
    await waitFor(() => expect(listHistoryVersionsReqCount).toBe(2));

    // The second retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(listHistoryVersionsReqCount).toBe(3));

    // The third retry should be made after 10s
    await jest.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(listHistoryVersionsReqCount).toBe(4));

    // The fourth retry should be made after 15s
    await jest.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(listHistoryVersionsReqCount).toBe(5));

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

describe("useHistoryVersions: polling", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
    server.resetHandlers();
  });
  test("should poll threads every x seconds", async () => {
    const roomId = nanoid();
    const versions: HistoryVersion[] = [
      {
        type: "historyVersion",
        kind: "yjs",
        createdAt: new Date(),
        id: "version_1",
        authors: [
          {
            id: "user-1",
          },
        ],
      },
    ];

    let getHistoryVersionsSinceCount = 0;

    server.use(
      mockListHistoryVersions((_req, res, ctx) => {
        return res(
          ctx.json({
            versions,
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        );
      }),
      mockGetHistoryVersionsSince((_req, res, ctx) => {
        getHistoryVersionsSinceCount++;
        return res(
          ctx.json({
            versions,
            meta: {
              requestedAt: new Date().toISOString(),
            },
          })
        );
      })
    );

    const {
      room: { RoomProvider, useHistoryVersions },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useHistoryVersions(), {
      wrapper: ({ children }) => (
        <RoomProvider id={roomId}>{children}</RoomProvider>
      ),
    });

    expect(result.current).toEqual({
      isLoading: true,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        versions,
      })
    );

    // A new fetch request for the history versions should have been made after the initial render but not for delta updates
    expect(getHistoryVersionsSinceCount).toBe(0);

    versions.push({
      type: "historyVersion",
      kind: "yjs",
      createdAt: new Date(),
      id: "version_2",
      authors: [
        {
          id: "user-2",
        },
      ],
    });

    // Wait for the first polling to occur after the initial render
    await jest.advanceTimersByTimeAsync(60_000);
    await waitFor(() => expect(getHistoryVersionsSinceCount).toBe(1));

    await waitFor(() =>
      expect(result.current).toEqual({
        isLoading: false,
        versions,
      })
    );
    // expect(getHistoryVersionsCount).toBe(1);

    unmount();
  });
});
