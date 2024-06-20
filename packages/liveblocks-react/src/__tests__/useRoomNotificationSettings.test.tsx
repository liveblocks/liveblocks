import "@testing-library/jest-dom";

import type { BaseMetadata, JsonObject } from "@liveblocks/core";
import { createClient } from "@liveblocks/core";
import {
  act,
  fireEvent,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { setupServer } from "msw/node";
import React, { Suspense } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";

import { createLiveblocksContext } from "../liveblocks";
import { createRoomContext } from "../room";
import MockWebSocket from "./_MockWebSocket";
import {
  mockGetRoomNotificationSettings,
  mockUpdateRoomNotificationSettings,
} from "./_restMocks";

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

// TODO: Dry up and create utils that wrap renderHook
function createRoomContextForTest<M extends BaseMetadata>() {
  const client = createClient({
    publicApiKey: "pk_xxx",
    polyfills: {
      WebSocket: MockWebSocket as any,
    },
  });

  return {
    roomCtx: createRoomContext<JsonObject, never, never, never, M>(client),
    liveblocksCtx: createLiveblocksContext(client),
  };
}

describe("useRoomNotificationSettings", () => {
  test("should be referentially stable", async () => {
    server.use(
      mockGetRoomNotificationSettings(async (_req, res, ctx) => {
        return res(
          ctx.json({
            threads: "all",
          })
        );
      })
    );

    const {
      roomCtx: { RoomProvider, useRoomNotificationSettings },
    } = createRoomContextForTest();

    const { result, unmount, rerender } = renderHook(
      () => useRoomNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id">{children}</RoomProvider>
        ),
      }
    );

    expect(result.current[0]).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          threads: "all",
        },
      })
    );

    const oldResult = result.current;

    rerender();

    expect(result.current).toBe(oldResult);

    unmount();
  });

  test("should update room notification settings optimistically and revert the updates if error response from server", async () => {
    server.use(
      mockGetRoomNotificationSettings(async (_req, res, ctx) => {
        return res(
          ctx.json({
            threads: "all",
          })
        );
      }),
      mockUpdateRoomNotificationSettings((_req, res, ctx) =>
        res(ctx.status(500))
      )
    );

    const {
      roomCtx: { RoomProvider, useRoomNotificationSettings },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => useRoomNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id">{children}</RoomProvider>
        ),
      }
    );

    expect(result.current[0]).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          threads: "all",
        },
      })
    );

    const updateRoomNotificationSettings = result.current[1];
    // Update the room notification settings to none
    act(() => {
      updateRoomNotificationSettings({ threads: "none" });
    });

    // Notification settings should be updated optimistically
    expect(result.current[0]).toEqual({
      isLoading: false,
      settings: {
        threads: "none",
      },
    });

    await waitFor(() => {
      // Notification settings should be reverted to the original value ("all") after the error response from the server
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          threads: "all",
        },
      });
    });

    unmount();
  });
});

describe("useRoomNotificationSettings: error", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers(); // Restores the real timers
  });

  test("should include an error object in the returned value if initial fetch throws an error", async () => {
    server.use(
      mockGetRoomNotificationSettings((_req, res, ctx) => {
        // Mock an error response from the server for the initial fetch
        return res(ctx.status(500));
      })
    );

    const {
      roomCtx: { RoomProvider, useRoomNotificationSettings },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => useRoomNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id">{children}</RoomProvider>
        ),
      }
    );

    expect(result.current[0]).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        error: expect.any(Error),
      })
    );

    unmount();
  });

  test("should retry with exponential backoff on error", async () => {
    let getRoomNotificationSettingsReqCount = 0;

    server.use(
      mockGetRoomNotificationSettings((_req, res, ctx) => {
        getRoomNotificationSettingsReqCount++;
        // Mock an error response from the server
        return res(ctx.status(500));
      })
    );

    const {
      roomCtx: { RoomProvider, useRoomNotificationSettings },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => useRoomNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id">{children}</RoomProvider>
        ),
      }
    );

    expect(result.current[0]).toEqual({ isLoading: true });

    // A new fetch request for the room notification settings should have been made after the initial render
    await waitFor(() => expect(getRoomNotificationSettingsReqCount).toBe(1));

    expect(result.current[0]).toEqual({
      isLoading: false,
      error: expect.any(Error),
    });

    // The first retry should be made after 5000ms * 2^0 (5000ms is the currently set error retry interval)
    jest.advanceTimersByTime(5000);
    // A new fetch request for the room notification settings should have been made after the first retry
    await waitFor(() => expect(getRoomNotificationSettingsReqCount).toBe(2));

    // The second retry should be made after 5000ms * 2^1
    jest.advanceTimersByTime(5000 * Math.pow(2, 1));
    await waitFor(() => expect(getRoomNotificationSettingsReqCount).toBe(3));

    // The third retry should be made after 5000ms * 2^2
    jest.advanceTimersByTime(5000 * Math.pow(2, 2));
    await waitFor(() => expect(getRoomNotificationSettingsReqCount).toBe(4));

    // The fourth retry should be made after 5000ms * 2^3
    jest.advanceTimersByTime(5000 * Math.pow(2, 3));
    await waitFor(() => expect(getRoomNotificationSettingsReqCount).toBe(5));

    // and so on...

    unmount();
  });

  test("should retry with exponential backoff with a maximum retry limit", async () => {
    let getRoomNotificationSettingsReqCount = 0;

    server.use(
      mockGetRoomNotificationSettings((_req, res, ctx) => {
        getRoomNotificationSettingsReqCount++;
        // Mock an error response from the server
        return res(ctx.status(500));
      })
    );

    const {
      roomCtx: { RoomProvider, useRoomNotificationSettings },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => useRoomNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id">{children}</RoomProvider>
        ),
      }
    );

    expect(result.current[0]).toEqual({ isLoading: true });

    // A new fetch request for the room notification settings should have been made after the initial render
    await waitFor(() => expect(getRoomNotificationSettingsReqCount).toBe(1));

    expect(result.current[0]).toEqual({
      isLoading: false,
      error: expect.any(Error),
    });

    // Simulate retries up to maximum retry count (currently set to 5)
    for (let i = 0; i < 5; i++) {
      const interval = 5000 * Math.pow(2, i); // 5000ms is the currently set error retry interval
      jest.advanceTimersByTime(interval);
      await waitFor(() =>
        expect(getRoomNotificationSettingsReqCount).toBe(i + 2)
      );
    }

    expect(getRoomNotificationSettingsReqCount).toBe(1 + 5); // initial request + 5 retries

    // No more retries should be made after the maximum number of retries
    await jest.advanceTimersByTimeAsync(5 * Math.pow(2, 5));

    // The number of requests should not have increased after the maximum number of retries
    expect(getRoomNotificationSettingsReqCount).toBe(5 + 1);

    unmount();
  });

  test("should clear error state after a successful error retry", async () => {
    let getRoomNotificationSettingsReqCount = 0;

    server.use(
      mockGetRoomNotificationSettings((_req, res, ctx) => {
        getRoomNotificationSettingsReqCount++;
        if (getRoomNotificationSettingsReqCount === 1) {
          // Mock an error response from the server for the initial fetch
          return res(ctx.status(500));
        } else {
          // Mock a successful response from the server for the subsequent fetches
          return res(
            ctx.json({
              threads: "all",
            })
          );
        }
      })
    );

    const {
      roomCtx: { RoomProvider, useRoomNotificationSettings },
    } = createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => useRoomNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id">{children}</RoomProvider>
        ),
      }
    );

    expect(result.current[0]).toEqual({ isLoading: true });

    // A new fetch request for the room notification settings should have been made after the initial render
    await waitFor(() => expect(getRoomNotificationSettingsReqCount).toBe(1));

    expect(result.current[0]).toEqual({
      isLoading: false,
      error: expect.any(Error),
    });

    // The first retry should be made after 5000ms * 2^0 (5000ms is the currently set error retry interval)
    jest.advanceTimersByTime(5000);
    // A new fetch request for the room notification settings should have been made after the first retry
    await waitFor(() => expect(getRoomNotificationSettingsReqCount).toBe(2));

    expect(result.current[0]).toEqual({
      settings: {
        threads: "all",
      },
      isLoading: false,
    });

    // No more retries should be made after successful retry
    await jest.advanceTimersByTimeAsync(5000 * Math.pow(2, 1));
    expect(getRoomNotificationSettingsReqCount).toBe(2);

    unmount();
  });
});

describe("useRoomNotificationSettings suspense", () => {
  test("should be referentially stable", async () => {
    server.use(
      mockGetRoomNotificationSettings(async (_req, res, ctx) => {
        return res(
          ctx.json({
            threads: "all",
          })
        );
      })
    );

    const {
      roomCtx: {
        suspense: { RoomProvider, useRoomNotificationSettings },
      },
    } = createRoomContextForTest();

    const { result, unmount, rerender } = renderHook(
      () => useRoomNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id">
            <Suspense>{children}</Suspense>
          </RoomProvider>
        ),
      }
    );

    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          threads: "all",
        },
      })
    );

    const oldResult = result.current;

    rerender();

    expect(result.current).toBe(oldResult);

    unmount();
  });
});

describe("useRoomNotificationSettingsSuspense: error", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers(); // Restores the real timers
  });

  test("should trigger error boundary if initial fetch throws an error", async () => {
    server.use(
      mockGetRoomNotificationSettings((_req, res, ctx) => {
        // Mock an error response from the server for the initial fetch
        return res(ctx.status(500));
      })
    );

    const {
      roomCtx: {
        suspense: { RoomProvider, useRoomNotificationSettings },
      },
    } = createRoomContextForTest();

    function Fallback({ resetErrorBoundary }: FallbackProps) {
      return (
        <div>
          <p>There was an error while getting room notification settings.</p>
          <button onClick={resetErrorBoundary}>Retry</button>
        </div>
      );
    }

    const { result, unmount } = renderHook(
      () => useRoomNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id">
            <ErrorBoundary FallbackComponent={Fallback}>
              <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
            </ErrorBoundary>
          </RoomProvider>
        ),
      }
    );

    expect(result.current).toEqual(null);

    await waitFor(() =>
      // Check if the error boundary's fallback is displayed
      expect(
        screen.getByText(
          "There was an error while getting room notification settings."
        )
      ).toBeInTheDocument()
    );

    unmount();
  });

  test("should retry with exponential backoff on error and clear error boundary", async () => {
    let getRoomNotificationSettingsReqCount = 0;
    server.use(
      mockGetRoomNotificationSettings((_req, res, ctx) => {
        getRoomNotificationSettingsReqCount++;

        if (getRoomNotificationSettingsReqCount === 1) {
          // Mock an error response from the server
          return res(ctx.status(500));
        } else {
          // Mock a successful response from the server for the subsequent fetches
          return res(
            ctx.json({
              threads: "all",
            })
          );
        }
      })
    );

    const {
      roomCtx: {
        RoomProvider,
        suspense: { useRoomNotificationSettings },
      },
    } = createRoomContextForTest();

    function Fallback({ resetErrorBoundary }: FallbackProps) {
      return (
        <div>
          <p>There was an error while getting room notification settings.</p>
          <button onClick={resetErrorBoundary}>Retry</button>
        </div>
      );
    }

    const { result, unmount } = renderHook(
      () => useRoomNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id">
            <ErrorBoundary FallbackComponent={Fallback}>
              <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
            </ErrorBoundary>
          </RoomProvider>
        ),
      }
    );

    expect(result.current).toEqual(null);

    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() => expect(getRoomNotificationSettingsReqCount).toBe(1));
    // Check if the error boundary's fallback is displayed
    expect(
      screen.getByText(
        "There was an error while getting room notification settings."
      )
    ).toBeInTheDocument();

    // The first retry should be made after 5000ms * 2^0 (5000ms is the currently set error retry interval)
    jest.advanceTimersByTime(5000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getRoomNotificationSettingsReqCount).toBe(2));

    // Simulate clicking the retry button
    fireEvent.click(screen.getByText("Retry"));

    // The error boundary's fallback should be cleared
    expect(
      screen.queryByText(
        "There was an error while getting room notification settings."
      )
    ).not.toBeInTheDocument();

    expect(result.current[0]).toEqual({
      isLoading: false,
      settings: {
        threads: "all",
      },
    });

    unmount();
  });
});
