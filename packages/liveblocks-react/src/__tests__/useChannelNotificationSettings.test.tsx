import "@testing-library/jest-dom";

import {
  act,
  fireEvent,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { setupServer } from "msw/node";
import React, { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import MockWebSocket from "./_MockWebSocket";
import {
  mockGetChannelNotificationSettings,
  mockUpdateChannelNotificationSettings,
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

describe("useChannelNotificationSettings", () => {
  test("should fetch channel notification settings and be referentially stable", async () => {
    server.use(
      mockGetChannelNotificationSettings(async (_req, res, ctx) => {
        return res(
          ctx.json({
            email: {
              thread: true,
              textMention: false,
            },
          })
        );
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useChannelNotificationSettings },
    } = createContextsForTest();

    const { result, unmount, rerender } = renderHook(
      () => useChannelNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    expect(result.current[0]).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          email: {
            thread: true,
            textMention: false,
          },
        },
      })
    );

    const oldResult = result.current;
    rerender();

    expect(result.current).toBe(oldResult);

    unmount();
  });

  test("should update channel notification settings optimistically and revert the updates if error response from server", async () => {
    server.use(
      mockGetChannelNotificationSettings(async (_req, res, ctx) => {
        return res(
          ctx.json({
            email: {
              thread: true,
              textMention: false,
            },
          })
        );
      }),
      mockUpdateChannelNotificationSettings((_req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useChannelNotificationSettings },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useChannelNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    expect(result.current[0]).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          email: {
            thread: true,
            textMention: false,
          },
        },
      })
    );

    const updateChannelNotificationSettings = result.current[1];

    act(() => {
      updateChannelNotificationSettings({
        email: { thread: false, textMention: false },
      });
    });

    // Channel notification settings should be updated optimistically
    expect(result.current[0]).toEqual({
      isLoading: false,
      settings: {
        email: {
          thread: false,
          textMention: false,
        },
      },
    });

    await waitFor(() =>
      // Channel notification settings should be reverted to the original value after the error response from the server
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          email: {
            thread: true,
            textMention: false,
          },
        },
      })
    );

    unmount();
  });
});

describe("useChannelNotificationSettings: error", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers(); // Restores the real timers
  });

  test("should include an error object in the returned value if initial fetch throws an error", async () => {
    let getChannelNotificationSettingsCount = 0;
    server.use(
      mockGetChannelNotificationSettings(async (_req, res, ctx) => {
        getChannelNotificationSettingsCount++;
        // Mock an error response from the server for the initial fetch
        return res(ctx.status(500));
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useChannelNotificationSettings },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useChannelNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    expect(result.current[0]).toEqual({ isLoading: true });

    // Wait for the first attempt to fetch channel notification settings
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(1));

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(2));

    // The second retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(3));

    // The third retry should be made after 10s
    await jest.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(4));

    // The fourth retry should be made after 15s
    await jest.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(5));

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
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(6));

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(7));
    expect(result.current[0]).toEqual({ isLoading: true });

    // and so on...

    unmount();
  });

  test("should clear error state after a successful error retry", async () => {
    let shouldReturnErrorResponse = true;
    let getChannelNotificationSettingsCount = 0;

    server.use(
      mockGetChannelNotificationSettings(async (_req, res, ctx) => {
        getChannelNotificationSettingsCount++;
        if (shouldReturnErrorResponse) {
          // Mock an error response from the server for the initial fetch
          return res(ctx.status(500));
        }

        return res(
          ctx.json({
            email: {
              thread: true,
              textMention: false,
            },
          })
        );
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useChannelNotificationSettings },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useChannelNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    expect(result.current[0]).toEqual({ isLoading: true });

    // Wait for the first attempt to fetch channel notification settings
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(1));

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(2));

    // The second retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(3));

    // The third retry should be made after 10s
    await jest.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(4));

    // The fourth retry should be made after 15s
    await jest.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(5));

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
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(6));

    // Switch the mock endpoint to return a successful response after 4 seconds
    shouldReturnErrorResponse = false;

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          email: {
            thread: true,
            textMention: false,
          },
        },
      })
    );
    expect(getChannelNotificationSettingsCount).toBe(7);

    unmount();
  });

  test("should poll channel notification settings every 5 mins", async () => {
    let getChannelNotificationSettingsCount = 0;
    server.use(
      mockGetChannelNotificationSettings(async (_req, res, ctx) => {
        getChannelNotificationSettingsCount++;
        if (getChannelNotificationSettingsCount === 1) {
          return res(
            ctx.json({
              email: {
                thread: false,
                textMention: true,
              },
            })
          );
        } else if (getChannelNotificationSettingsCount === 2) {
          return res(
            ctx.json({
              email: {
                thread: false,
                textMention: false,
              },
            })
          );
        }

        return res(
          ctx.json({
            email: {
              thread: true,
              textMention: false,
            },
          })
        );
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useChannelNotificationSettings },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useChannelNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    expect(result.current[0]).toEqual({ isLoading: true });

    // Wait for the first attempt to fetch channel notification settings
    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          email: {
            thread: false,
            textMention: true,
          },
        },
      })
    );

    expect(getChannelNotificationSettingsCount).toBe(1);

    // Advance by 5 minute so that and verify that the first poll is triggered
    jest.advanceTimersByTime(60_000 * 5);
    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          email: {
            thread: false,
            textMention: false,
          },
        },
      })
    );
    expect(getChannelNotificationSettingsCount).toBe(2);

    // Advance by another 5 minute so that and verify that the second poll is triggered
    jest.advanceTimersByTime(60_000 * 5);
    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          email: {
            thread: true,
            textMention: false,
          },
        },
      })
    );
    expect(getChannelNotificationSettingsCount).toBe(3);

    unmount();
  });
});

describe("useChannelNotificationSettings - Suspense", () => {
  test("should be referentially stable", async () => {
    server.use(
      mockGetChannelNotificationSettings(async (_req, res, ctx) => {
        return res(
          ctx.json({
            email: {
              thread: true,
              textMention: false,
            },
          })
        );
      })
    );

    const {
      liveblocks: {
        suspense: { LiveblocksProvider, useChannelNotificationSettings },
      },
    } = createContextsForTest();

    const { result, unmount, rerender } = renderHook(
      () => useChannelNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>
            <Suspense>{children}</Suspense>
          </LiveblocksProvider>
        ),
      }
    );

    expect(result.current).toEqual(null);

    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          email: {
            thread: true,
            textMention: false,
          },
        },
      })
    );

    const oldResult = result.current;

    rerender();

    expect(result.current).toBe(oldResult);

    unmount();
  });
});

describe("useChannelNotificationSettings - Suspense: error", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers(); // Restores the real timers
  });

  test("should trigger error boundary if initial fetch throws an error", async () => {
    let getChannelNotificationSettingsCount = 0;
    server.use(
      mockGetChannelNotificationSettings(async (_req, res, ctx) => {
        getChannelNotificationSettingsCount++;
        // Mock an error response from the server for the initial fetch
        return res(ctx.status(500));
      })
    );

    const {
      liveblocks: {
        suspense: { LiveblocksProvider, useChannelNotificationSettings },
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useChannelNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>
            <ErrorBoundary
              FallbackComponent={({ resetErrorBoundary }) => {
                return (
                  <>
                    <div>
                      There was an error while getting channel notification
                      settings.
                    </div>
                    <button onClick={resetErrorBoundary}>Retry</button>
                  </>
                );
              }}
            >
              <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
            </ErrorBoundary>
          </LiveblocksProvider>
        ),
      }
    );

    expect(result.current).toEqual(null);

    // Wait for the first attempt to fetch channel notification settings
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(1));

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(2));

    // The second retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(3));

    // The third retry should be made after 10s
    await jest.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(4));

    // The fourth retry should be made after 15s
    await jest.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(5));

    await waitFor(() =>
      // Check if the error boundary's fallback is displayed
      expect(
        screen.getByText(
          "There was an error while getting channel notification settings."
        )
      ).toBeInTheDocument()
    );

    unmount();
  });

  test("should retry with exponential backoff on error and clear error boundary", async () => {
    let getChannelNotificationSettingsCount = 0;
    server.use(
      mockGetChannelNotificationSettings(async (_req, res, ctx) => {
        getChannelNotificationSettingsCount++;
        // Mock an error response from the server for the initial fetch
        return res(ctx.status(500));
      })
    );

    const {
      liveblocks: {
        suspense: { LiveblocksProvider, useChannelNotificationSettings },
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => useChannelNotificationSettings(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>
            <ErrorBoundary
              FallbackComponent={({ resetErrorBoundary }) => {
                return (
                  <>
                    <div>
                      There was an error while getting channel notification
                      settings.
                    </div>
                    <button onClick={resetErrorBoundary}>Retry</button>
                  </>
                );
              }}
            >
              <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
            </ErrorBoundary>
          </LiveblocksProvider>
        ),
      }
    );

    expect(result.current).toEqual(null);

    // Wait for the first attempt to fetch channel notification settings
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(1));

    // The first retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(2));

    // The second retry should be made after 5s
    await jest.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(3));

    // The third retry should be made after 10s
    await jest.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(4));

    // The fourth retry should be made after 15s
    await jest.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(getChannelNotificationSettingsCount).toBe(5));

    await waitFor(() =>
      // Check if the error boundary's fallback is displayed
      expect(
        screen.getByText(
          "There was an error while getting channel notification settings."
        )
      ).toBeInTheDocument()
    );

    // Wait until the error boundary auto-clears
    await jest.advanceTimersByTimeAsync(5_000);

    // Simulate clicking the retry button
    fireEvent.click(screen.getByText("Retry"));

    unmount();
  });
});
