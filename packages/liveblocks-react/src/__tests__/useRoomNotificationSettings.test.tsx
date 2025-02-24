import "@testing-library/jest-dom";

import { nanoid } from "@liveblocks/core";
import {
  act,
  fireEvent,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { setupServer } from "msw/node";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import MockWebSocket from "./_MockWebSocket";
import {
  mockGetRoomNotificationSettings,
  mockUpdateRoomNotificationSettings,
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

describe("useRoomNotificationSettings", () => {
  test("should be referentially stable", async () => {
    const roomId = nanoid();

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
      room: { RoomProvider, useRoomNotificationSettings },
    } = createContextsForTest();

    const { result, unmount, rerender } = renderHook(
      () => useRoomNotificationSettings(),
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
        },
      })
    );

    const oldResult = result.current;

    rerender();

    expect(result.current).toBe(oldResult);

    unmount();
  });

  test("should update room notification settings optimistically and revert the updates if error response from server", async () => {
    const roomId = nanoid();

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
      room: { RoomProvider, useRoomNotificationSettings },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useRoomNotificationSettings(),
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
    const roomId = nanoid();

    let getRoomNotificationsSettingsCount = 0;
    server.use(
      mockGetRoomNotificationSettings((_req, res, ctx) => {
        getRoomNotificationsSettingsCount++;
        // Mock an error response from the server for the initial fetch
        return res(ctx.status(500));
      })
    );

    const {
      room: { RoomProvider, useRoomNotificationSettings },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useRoomNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current[0]).toEqual({ isLoading: true });

    // Wait for the first attempt to fetch room notification settings
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(1));

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(2));

    // The second retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(3));

    // The third retry should be made after 10s
    await jest.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(4));

    // The fourth retry should be made after 15s
    await jest.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(5));

    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        error: expect.any(Error),
      })
    );

    // Wait for 5 second for the error to clear
    await jest.advanceTimersByTimeAsync(5_000);
    expect(result.current[0]).toEqual({ isLoading: true });

    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(6));

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(7));
    expect(result.current[0]).toEqual({ isLoading: true });

    // and so on...

    unmount();
  });

  test("should clear error state after a successful error retry", async () => {
    const roomId = nanoid();

    let shouldReturnErrorResponse = true;
    let getRoomNotificationsSettingsCount = 0;
    server.use(
      mockGetRoomNotificationSettings((_req, res, ctx) => {
        getRoomNotificationsSettingsCount++;
        if (shouldReturnErrorResponse) {
          // Mock an error response from the server for the initial fetch
          return res(ctx.status(500));
        } else {
          return res(
            ctx.json({
              threads: "all",
            })
          );
        }
      })
    );

    const {
      room: { RoomProvider, useRoomNotificationSettings },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useRoomNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current[0]).toEqual({ isLoading: true });

    // Wait for the first attempt to fetch room notification settings
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(1));

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(2));

    // The second retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(3));

    // The third retry should be made after 10s
    await jest.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(4));

    // The fourth retry should be made after 15s
    await jest.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(5));

    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        error: expect.any(Error),
      })
    );

    // Advance by5 seconds and verify that error is cleared
    await jest.advanceTimersByTimeAsync(5_000);
    expect(result.current[0]).toEqual({ isLoading: true });

    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(6));

    // Switch the mock endpoint to return a successful response after 4 seconds
    shouldReturnErrorResponse = false;

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          threads: "all",
        },
      })
    );
    expect(getRoomNotificationsSettingsCount).toBe(7);

    unmount();
  });

  test("should poll room notification settings every x seconds", async () => {
    const roomId = nanoid();

    let getRoomNotificationsSettingsCount = 0;
    server.use(
      mockGetRoomNotificationSettings((_req, res, ctx) => {
        getRoomNotificationsSettingsCount++;
        if (getRoomNotificationsSettingsCount === 1) {
          return res(
            ctx.json({
              threads: "all",
            })
          );
        } else if (getRoomNotificationsSettingsCount === 2) {
          return res(
            ctx.json({
              threads: "none",
            })
          );
        } else {
          return res(
            ctx.json({
              threads: "replies_and_mentions",
            })
          );
        }
      })
    );

    const {
      room: { RoomProvider, useRoomNotificationSettings },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useRoomNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current[0]).toEqual({ isLoading: true });

    // Wait for the first attempt to fetch room notification settings
    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          threads: "all",
        },
      })
    );
    expect(getRoomNotificationsSettingsCount).toBe(1);

    // Advance by 1 minute so that and verify that the first poll is triggered
    jest.advanceTimersByTime(60_000);
    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          threads: "none",
        },
      })
    );
    expect(getRoomNotificationsSettingsCount).toBe(2);

    // Advance by another 1 minute so that and verify that the second poll is triggered
    jest.advanceTimersByTime(60_000);
    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          threads: "replies_and_mentions",
        },
      })
    );
    expect(getRoomNotificationsSettingsCount).toBe(3);

    // Advance by another 1 minute so that and verify that the third poll is triggered
    jest.advanceTimersByTime(60_000);
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(3));
    expect(result.current[0]).toEqual({
      isLoading: false,
      settings: {
        threads: "replies_and_mentions",
      },
    });

    unmount();
  });
});

describe("useRoomNotificationSettings suspense", () => {
  test("should be referentially stable", async () => {
    const roomId = nanoid();

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
      room: {
        suspense: { RoomProvider, useRoomNotificationSettings },
      },
    } = createContextsForTest();

    const { result, unmount, rerender } = renderHook(
      () => useRoomNotificationSettings(),
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
  const roomId = nanoid();

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers(); // Restores the real timers
  });

  test("should trigger error boundary if initial fetch throws an error", async () => {
    let getRoomNotificationsSettingsCount = 0;
    server.use(
      mockGetRoomNotificationSettings((_req, res, ctx) => {
        getRoomNotificationsSettingsCount++;
        // Mock an error response from the server for the initial fetch
        return res(ctx.status(500));
      })
    );

    const {
      room: {
        suspense: { RoomProvider, useRoomNotificationSettings },
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useRoomNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>
            <ErrorBoundary
              FallbackComponent={({ resetErrorBoundary }) => {
                return (
                  <>
                    <div>
                      There was an error while getting room notification
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

    // Wait for the first attempt to fetch room notification settings
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(1));

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(2));

    // The second retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(3));

    // The third retry should be made after 10s
    await jest.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(4));

    // The fourth retry should be made after 15s
    await jest.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(5));

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
    let getRoomNotificationsSettingsCount = 0;
    server.use(
      mockGetRoomNotificationSettings((_req, res, ctx) => {
        getRoomNotificationsSettingsCount++;
        // Mock an error response from the server for the initial fetch
        return res(ctx.status(500));
      })
    );

    const {
      room: {
        suspense: { RoomProvider, useRoomNotificationSettings },
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useRoomNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>
            <ErrorBoundary
              FallbackComponent={({ resetErrorBoundary }) => {
                return (
                  <>
                    <div>
                      There was an error while getting room notification
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

    // Wait for the first attempt to fetch room notification settings
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(1));

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(2));

    // The second retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(3));

    // The third retry should be made after 10s
    await jest.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(4));

    // The fourth retry should be made after 15s
    await jest.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(getRoomNotificationsSettingsCount).toBe(5));

    await waitFor(() =>
      // Check if the error boundary's fallback is displayed
      expect(
        screen.getByText(
          "There was an error while getting room notification settings."
        )
      ).toBeInTheDocument()
    );

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
