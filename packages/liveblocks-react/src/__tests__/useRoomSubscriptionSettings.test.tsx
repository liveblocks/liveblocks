import { nanoid } from "@liveblocks/core";
import {
  act,
  fireEvent,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import MockWebSocket from "./_MockWebSocket";
import {
  mockGetRoomSubscriptionSettings,
  mockUpdateRoomSubscriptionSettings,
} from "./_restMocks";
import { createContextsForTest } from "./_utils";

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

describe("useRoomSubscriptionSettings", () => {
  test("should be referentially stable", async () => {
    const roomId = nanoid();

    server.use(
      mockGetRoomSubscriptionSettings(() => {
        return HttpResponse.json({
          threads: "all",
          textMentions: "mine",
        });
      })
    );

    const {
      room: { RoomProvider, useRoomSubscriptionSettings },
    } = createContextsForTest();

    const { result, unmount, rerender } = renderHook(
      () => useRoomSubscriptionSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current[0]).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          threads: "all",
          textMentions: "mine",
        },
      })
    );

    const oldResult = result.current;

    rerender();

    expect(result.current).toBe(oldResult);

    unmount();
  });

  test("should update room subscription settings optimistically and revert the updates if error response from server", async () => {
    const roomId = nanoid();

    server.use(
      mockGetRoomSubscriptionSettings(() => {
        return HttpResponse.json({
          threads: "all",
          textMentions: "mine",
        });
      }),
      mockUpdateRoomSubscriptionSettings(() => {
        return HttpResponse.json(null, { status: 500 });
      })
    );

    const {
      room: { RoomProvider, useRoomSubscriptionSettings },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useRoomSubscriptionSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current[0]).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          threads: "all",
          textMentions: "mine",
        },
      })
    );

    const updateRoomSubscriptionSettings = result.current[1];
    // Update the room subscription settings to none
    act(() => {
      updateRoomSubscriptionSettings({ threads: "none" });
    });

    // Subscription settings should be updated optimistically
    expect(result.current[0]).toEqual({
      isLoading: false,
      settings: {
        threads: "none",
        textMentions: "mine",
      },
    });

    await waitFor(() => {
      // Subscription settings should be reverted to the original value ("all") after the error response from the server
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          threads: "all",
          textMentions: "mine",
        },
      });
    });

    unmount();
  });
});

describe("useRoomSubscriptionSettings: error", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers(); // Restores the real timers
  });

  test("should include an error object in the returned value if initial fetch throws an error", async () => {
    const roomId = nanoid();

    let getRoomSubscriptionSettingsCount = 0;
    server.use(
      mockGetRoomSubscriptionSettings(() => {
        getRoomSubscriptionSettingsCount++;
        // Mock an error response from the server for the initial fetch
        return HttpResponse.json(null, { status: 500 });
      })
    );

    const {
      room: { RoomProvider, useRoomSubscriptionSettings },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useRoomSubscriptionSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current[0]).toEqual({ isLoading: true });

    // Wait for the first attempt to fetch room subscription settings
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(1));

    // The first retry should be made after 5s
    await vi.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(2));

    // The second retry should be made after 5s
    await vi.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(3));

    // The third retry should be made after 10s
    await vi.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(4));

    // The fourth retry should be made after 15s
    await vi.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(5));

    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        error: expect.any(Error),
      })
    );

    // Wait for 5 second for the error to clear
    await vi.advanceTimersByTimeAsync(5_000);
    expect(result.current[0]).toEqual({ isLoading: true });

    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(6));

    // The first retry should be made after 5s
    await vi.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(7));
    expect(result.current[0]).toEqual({ isLoading: true });

    // and so on...

    unmount();
  });

  test("should clear error state after a successful error retry", async () => {
    const roomId = nanoid();

    let shouldReturnErrorResponse = true;
    let getRoomSubscriptionSettingsCount = 0;
    server.use(
      mockGetRoomSubscriptionSettings(() => {
        getRoomSubscriptionSettingsCount++;
        if (shouldReturnErrorResponse) {
          // Mock an error response from the server for the initial fetch
          return HttpResponse.json(null, { status: 500 });
        } else {
          return HttpResponse.json({
            threads: "all",
            textMentions: "mine",
          });
        }
      })
    );

    const {
      room: { RoomProvider, useRoomSubscriptionSettings },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useRoomSubscriptionSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current[0]).toEqual({ isLoading: true });

    // Wait for the first attempt to fetch room subscription settings
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(1));

    // The first retry should be made after 5s
    await vi.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(2));

    // The second retry should be made after 5s
    await vi.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(3));

    // The third retry should be made after 10s
    await vi.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(4));

    // The fourth retry should be made after 15s
    await vi.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(5));

    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        error: expect.any(Error),
      })
    );

    // Advance by5 seconds and verify that error is cleared
    await vi.advanceTimersByTimeAsync(5_000);
    expect(result.current[0]).toEqual({ isLoading: true });

    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(6));

    // Switch the mock endpoint to return a successful response after 4 seconds
    shouldReturnErrorResponse = false;

    // The first retry should be made after 5s
    await vi.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          threads: "all",
          textMentions: "mine",
        },
      })
    );
    expect(getRoomSubscriptionSettingsCount).toBe(7);

    unmount();
  });

  test("should poll room subscription settings every x seconds", async () => {
    const roomId = nanoid();

    let getRoomSubscriptionSettingsCount = 0;
    server.use(
      mockGetRoomSubscriptionSettings(() => {
        getRoomSubscriptionSettingsCount++;
        if (getRoomSubscriptionSettingsCount === 1) {
          return HttpResponse.json({
            threads: "all",
            textMentions: "mine",
          });
        } else if (getRoomSubscriptionSettingsCount === 2) {
          return HttpResponse.json({
            threads: "none",
            textMentions: "none",
          });
        } else {
          return HttpResponse.json({
            threads: "replies_and_mentions",
            textMentions: "mine",
          });
        }
      })
    );

    const {
      room: { RoomProvider, useRoomSubscriptionSettings },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useRoomSubscriptionSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current[0]).toEqual({ isLoading: true });

    // Wait for the first attempt to fetch room subscription settings
    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          threads: "all",
          textMentions: "mine",
        },
      })
    );
    expect(getRoomSubscriptionSettingsCount).toBe(1);

    // Advance by 1 minute so that and verify that the first poll is triggered
    vi.advanceTimersByTime(60_000);
    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          threads: "none",
          textMentions: "none",
        },
      })
    );
    expect(getRoomSubscriptionSettingsCount).toBe(2);

    // Advance by another 1 minute so that and verify that the second poll is triggered
    vi.advanceTimersByTime(60_000);
    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          threads: "replies_and_mentions",
          textMentions: "mine",
        },
      })
    );
    expect(getRoomSubscriptionSettingsCount).toBe(3);

    // Advance by another 1 minute so that and verify that the third poll is triggered
    vi.advanceTimersByTime(60_000);
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(3));
    expect(result.current[0]).toEqual({
      isLoading: false,
      settings: {
        threads: "replies_and_mentions",
        textMentions: "mine",
      },
    });

    unmount();
  });
});

describe("useRoomSubscriptionSettings suspense", () => {
  test("should be referentially stable", async () => {
    const roomId = nanoid();

    server.use(
      mockGetRoomSubscriptionSettings(() => {
        return HttpResponse.json({
          threads: "all",
          textMentions: "mine",
        });
      })
    );

    const {
      room: {
        suspense: { RoomProvider, useRoomSubscriptionSettings },
      },
    } = createContextsForTest();

    const { result, unmount, rerender } = renderHook(
      () => useRoomSubscriptionSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>
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
          textMentions: "mine",
        },
      })
    );

    const oldResult = result.current;

    rerender();

    expect(result.current).toBe(oldResult);

    unmount();
  });
});

describe("useRoomSubscriptionSettingsSuspense: error", () => {
  const roomId = nanoid();

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers(); // Restores the real timers
  });

  test("should trigger error boundary if initial fetch throws an error", async () => {
    let getRoomSubscriptionSettingsCount = 0;
    server.use(
      mockGetRoomSubscriptionSettings(() => {
        getRoomSubscriptionSettingsCount++;
        // Mock an error response from the server for the initial fetch
        return HttpResponse.json(null, { status: 500 });
      })
    );

    const {
      room: {
        suspense: { RoomProvider, useRoomSubscriptionSettings },
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useRoomSubscriptionSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>
            <ErrorBoundary
              FallbackComponent={({ resetErrorBoundary }) => {
                return (
                  <>
                    <div>
                      There was an error while getting room subscription
                      settings.
                    </div>
                    <button onClick={resetErrorBoundary}>Retry</button>
                  </>
                );
              }}
            >
              <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
            </ErrorBoundary>
          </RoomProvider>
        ),
      }
    );

    expect(result.current).toEqual(null);

    // Wait for the first attempt to fetch room subscription settings
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(1));

    // The first retry should be made after 5s
    await vi.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(2));

    // The second retry should be made after 5s
    await vi.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(3));

    // The third retry should be made after 10s
    await vi.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(4));

    // The fourth retry should be made after 15s
    await vi.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(5));

    await waitFor(() =>
      // Check if the error boundary's fallback is displayed
      expect(
        screen.getByText(
          "There was an error while getting room subscription settings."
        )
      ).toBeInTheDocument()
    );

    unmount();
  });

  test("should retry with exponential backoff on error and clear error boundary", async () => {
    let getRoomSubscriptionSettingsCount = 0;
    server.use(
      mockGetRoomSubscriptionSettings(() => {
        getRoomSubscriptionSettingsCount++;
        // Mock an error response from the server for the initial fetch
        return HttpResponse.json(null, { status: 500 });
      })
    );

    const {
      room: {
        suspense: { RoomProvider, useRoomSubscriptionSettings },
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useRoomSubscriptionSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>
            <ErrorBoundary
              FallbackComponent={({ resetErrorBoundary }) => {
                return (
                  <>
                    <div>
                      There was an error while getting room subscription
                      settings.
                    </div>
                    <button onClick={resetErrorBoundary}>Retry</button>
                  </>
                );
              }}
            >
              <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
            </ErrorBoundary>
          </RoomProvider>
        ),
      }
    );

    expect(result.current).toEqual(null);

    // Wait for the first attempt to fetch room subscription settings
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(1));

    // The first retry should be made after 5s
    await vi.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(2));

    // The second retry should be made after 5s
    await vi.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(3));

    // The third retry should be made after 10s
    await vi.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(4));

    // The fourth retry should be made after 15s
    await vi.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(getRoomSubscriptionSettingsCount).toBe(5));

    await waitFor(() =>
      // Check if the error boundary's fallback is displayed
      expect(
        screen.getByText(
          "There was an error while getting room subscription settings."
        )
      ).toBeInTheDocument()
    );

    // Wait until the error boundary auto-clears
    await vi.advanceTimersByTimeAsync(5_000);

    // Simulate clicking the retry button
    fireEvent.click(screen.getByText("Retry"));

    // The error boundary's fallback should be cleared
    await waitFor(() => {
      expect(screen.getByText("Loading")).toBeInTheDocument();
    });

    unmount();
  });
});
