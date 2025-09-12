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
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

import MockWebSocket from "./_MockWebSocket";
import {
  mockGetNotificationSettings,
  mockUpdateNotificationSettings,
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

describe("useNotificationSettings", () => {
  test("should fetch notification settings and be referentially stable", async () => {
    server.use(
      mockGetNotificationSettings(() => {
        return HttpResponse.json({
          email: {
            thread: true,
            textMention: false,
          },
          slack: {
            thread: true,
            textMention: false,
          },
          teams: {
            thread: true,
            textMention: false,
          },
          webPush: {
            thread: true,
            textMention: false,
          },
        });
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useNotificationSettings },
    } = createContextsForTest();

    const { result, unmount, rerender } = renderHook(
      () => useNotificationSettings(),
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
          slack: {
            thread: true,
            textMention: false,
          },
          teams: {
            thread: true,
            textMention: false,
          },
          webPush: {
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

  test("should update notification settings partially", async () => {
    server.use(
      mockGetNotificationSettings(() => {
        return HttpResponse.json({
          email: {
            thread: true,
            textMention: false,
          },
          slack: {
            thread: true,
            textMention: false,
          },
          teams: {
            thread: true,
            textMention: false,
          },
          webPush: {
            thread: true,
            textMention: false,
          },
        });
      }),
      mockUpdateNotificationSettings(() => {
        return HttpResponse.json({
          email: {
            thread: false,
            textMention: false,
          },
        });
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useNotificationSettings },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useNotificationSettings(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });

    expect(result.current[0]).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          email: {
            thread: true,
            textMention: false,
          },
          slack: {
            thread: true,
            textMention: false,
          },
          teams: {
            thread: true,
            textMention: false,
          },
          webPush: {
            thread: true,
            textMention: false,
          },
        },
      })
    );

    const updateNotificationSettings = result.current[1];

    act(() => {
      updateNotificationSettings({
        email: { thread: false },
      });
    });

    await waitFor(() =>
      // Notification settings response from the server should be updated accordingly
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          email: {
            thread: false,
            textMention: false,
          },
          slack: {
            thread: true,
            textMention: false,
          },
          teams: {
            thread: true,
            textMention: false,
          },
          webPush: {
            thread: true,
            textMention: false,
          },
        },
      })
    );

    unmount();
  });

  test("should update notification settings optimistically and revert the updates if error response from server", async () => {
    server.use(
      mockGetNotificationSettings(() => {
        return HttpResponse.json({
          email: {
            thread: true,
            textMention: false,
          },
          slack: {
            thread: true,
            textMention: false,
          },
          teams: {
            thread: true,
            textMention: false,
          },
          webPush: {
            thread: true,
            textMention: false,
          },
        });
      }),
      mockUpdateNotificationSettings(() => {
        return HttpResponse.json(null, { status: 500 });
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useNotificationSettings },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useNotificationSettings(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });

    expect(result.current[0]).toEqual({ isLoading: true });

    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          email: {
            thread: true,
            textMention: false,
          },
          slack: {
            thread: true,
            textMention: false,
          },
          teams: {
            thread: true,
            textMention: false,
          },
          webPush: {
            thread: true,
            textMention: false,
          },
        },
      })
    );

    const updateNotificationSettings = result.current[1];

    act(() => {
      updateNotificationSettings({
        email: { thread: false, textMention: false },
      });
    });

    // Notification settings should be updated optimistically
    expect(result.current[0]).toEqual({
      isLoading: false,
      settings: {
        email: {
          thread: false,
          textMention: false,
        },
        slack: {
          thread: true,
          textMention: false,
        },
        teams: {
          thread: true,
          textMention: false,
        },
        webPush: {
          thread: true,
          textMention: false,
        },
      },
    });

    await waitFor(() =>
      // Notification settings should be reverted to the original value after the error response from the server
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          email: {
            thread: true,
            textMention: false,
          },
          slack: {
            thread: true,
            textMention: false,
          },
          teams: {
            thread: true,
            textMention: false,
          },
          webPush: {
            thread: true,
            textMention: false,
          },
        },
      })
    );

    unmount();
  });
});

describe("useNotificationSettings: error", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers(); // Restores the real timers
  });

  test("should include an error object in the returned value if initial fetch throws an error", async () => {
    let getNotificationSettingsCount = 0;
    server.use(
      mockGetNotificationSettings(() => {
        getNotificationSettingsCount++;
        // Mock an error response from the server for the initial fetch
        return HttpResponse.json(null, { status: 500 });
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useNotificationSettings },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useNotificationSettings(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });

    expect(result.current[0]).toEqual({ isLoading: true });

    // Wait for the first attempt to fetch channel notification settings
    await waitFor(() => expect(getNotificationSettingsCount).toBe(1));

    // The first retry should be made after 5s
    await vi.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getNotificationSettingsCount).toBe(2));

    // The second retry should be made after 5s
    await vi.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getNotificationSettingsCount).toBe(3));

    // The third retry should be made after 10s
    await vi.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(getNotificationSettingsCount).toBe(4));

    // The fourth retry should be made after 15s
    await vi.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(getNotificationSettingsCount).toBe(5));

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
    await waitFor(() => expect(getNotificationSettingsCount).toBe(6));

    // The first retry should be made after 5s
    await vi.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getNotificationSettingsCount).toBe(7));
    expect(result.current[0]).toEqual({ isLoading: true });

    // and so on...

    unmount();
  });

  test("should clear error state after a successful error retry", async () => {
    let shouldReturnErrorResponse = true;
    let getNotificationSettingsCount = 0;

    server.use(
      mockGetNotificationSettings(() => {
        getNotificationSettingsCount++;
        if (shouldReturnErrorResponse) {
          // Mock an error response from the server for the initial fetch
          return HttpResponse.json(null, { status: 500 });
        }

        return HttpResponse.json({
          email: {
            thread: true,
            textMention: false,
          },
          slack: {
            thread: true,
            textMention: false,
          },
          teams: {
            thread: true,
            textMention: false,
          },
          webPush: {
            thread: true,
            textMention: false,
          },
        });
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useNotificationSettings },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useNotificationSettings(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });

    expect(result.current[0]).toEqual({ isLoading: true });

    // Wait for the first attempt to fetch channel notification settings
    await waitFor(() => expect(getNotificationSettingsCount).toBe(1));

    // The first retry should be made after 5s
    await vi.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getNotificationSettingsCount).toBe(2));

    // The second retry should be made after 5s
    await vi.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getNotificationSettingsCount).toBe(3));

    // The third retry should be made after 10s
    await vi.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(getNotificationSettingsCount).toBe(4));

    // The fourth retry should be made after 15s
    await vi.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(getNotificationSettingsCount).toBe(5));

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
    await waitFor(() => expect(getNotificationSettingsCount).toBe(6));

    // Switch the mock endpoint to return a successful response after 4 seconds
    shouldReturnErrorResponse = false;

    // The first retry should be made after 5s
    await vi.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the initial render
    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          email: {
            thread: true,
            textMention: false,
          },
          slack: {
            thread: true,
            textMention: false,
          },
          teams: {
            thread: true,
            textMention: false,
          },
          webPush: {
            thread: true,
            textMention: false,
          },
        },
      })
    );
    expect(getNotificationSettingsCount).toBe(7);

    unmount();
  });

  test("should poll notification settings every 5 mins", async () => {
    let getNotificationSettingsCount = 0;
    server.use(
      mockGetNotificationSettings(() => {
        getNotificationSettingsCount++;
        if (getNotificationSettingsCount === 1) {
          return HttpResponse.json({
            email: {
              thread: false,
              textMention: true,
            },
            slack: {
              thread: false,
              textMention: true,
            },
            teams: {
              thread: false,
              textMention: true,
            },
            webPush: {
              thread: false,
              textMention: true,
            },
          });
        } else if (getNotificationSettingsCount === 2) {
          return HttpResponse.json({
            email: {
              thread: false,
              textMention: false,
            },
            slack: {
              thread: false,
              textMention: false,
            },
            teams: {
              thread: false,
              textMention: false,
            },
            webPush: {
              thread: false,
              textMention: false,
            },
          });
        }

        return HttpResponse.json({
          email: {
            thread: true,
            textMention: false,
          },
          slack: {
            thread: true,
            textMention: false,
          },
          teams: {
            thread: true,
            textMention: false,
          },
          webPush: {
            thread: true,
            textMention: false,
          },
        });
      })
    );

    const {
      liveblocks: { LiveblocksProvider, useNotificationSettings },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useNotificationSettings(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });

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
          slack: {
            thread: false,
            textMention: true,
          },
          teams: {
            thread: false,
            textMention: true,
          },
          webPush: {
            thread: false,
            textMention: true,
          },
        },
      })
    );

    expect(getNotificationSettingsCount).toBe(1);

    // Advance by 5 minute so that and verify that the first poll is triggered
    vi.advanceTimersByTime(60_000 * 5);
    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          email: {
            thread: false,
            textMention: false,
          },
          slack: {
            thread: false,
            textMention: false,
          },
          teams: {
            thread: false,
            textMention: false,
          },
          webPush: {
            thread: false,
            textMention: false,
          },
        },
      })
    );
    expect(getNotificationSettingsCount).toBe(2);

    // Advance by another 5 minute so that and verify that the second poll is triggered
    vi.advanceTimersByTime(60_000 * 5);
    await waitFor(() =>
      expect(result.current[0]).toEqual({
        isLoading: false,
        settings: {
          email: {
            thread: true,
            textMention: false,
          },
          slack: {
            thread: true,
            textMention: false,
          },
          teams: {
            thread: true,
            textMention: false,
          },
          webPush: {
            thread: true,
            textMention: false,
          },
        },
      })
    );
    expect(getNotificationSettingsCount).toBe(3);

    unmount();
  });
});

describe("useNotificationSettings - Suspense", () => {
  test("should be referentially stable", async () => {
    server.use(
      mockGetNotificationSettings(() => {
        return HttpResponse.json({
          email: {
            thread: true,
            textMention: false,
          },
          slack: {
            thread: true,
            textMention: false,
          },
          teams: {
            thread: true,
            textMention: false,
          },
          webPush: {
            thread: true,
            textMention: false,
          },
        });
      })
    );

    const {
      liveblocks: {
        suspense: { LiveblocksProvider, useNotificationSettings },
      },
    } = createContextsForTest();

    const { result, unmount, rerender } = renderHook(
      () => useNotificationSettings(),
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
          slack: {
            thread: true,
            textMention: false,
          },
          teams: {
            thread: true,
            textMention: false,
          },
          webPush: {
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

describe("useNotificationSettings - Suspense: error", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers(); // Restores the real timers
  });

  test("should trigger error boundary if initial fetch throws an error", async () => {
    let getNotificationSettingsCount = 0;
    server.use(
      mockGetNotificationSettings(() => {
        getNotificationSettingsCount++;
        // Mock an error response from the server for the initial fetch
        return HttpResponse.json(null, { status: 500 });
      })
    );

    const {
      liveblocks: {
        suspense: { LiveblocksProvider, useNotificationSettings },
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useNotificationSettings(), {
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
    });

    expect(result.current).toEqual(null);

    // Wait for the first attempt to fetch channel notification settings
    await waitFor(() => expect(getNotificationSettingsCount).toBe(1));

    // The first retry should be made after 5s
    await vi.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getNotificationSettingsCount).toBe(2));

    // The second retry should be made after 5s
    await vi.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getNotificationSettingsCount).toBe(3));

    // The third retry should be made after 10s
    await vi.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(getNotificationSettingsCount).toBe(4));

    // The fourth retry should be made after 15s
    await vi.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(getNotificationSettingsCount).toBe(5));

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
    let getNotificationSettingsCount = 0;
    server.use(
      mockGetNotificationSettings(() => {
        getNotificationSettingsCount++;
        // Mock an error response from the server for the initial fetch
        return HttpResponse.json(null, { status: 500 });
      })
    );

    const {
      liveblocks: {
        suspense: { LiveblocksProvider, useNotificationSettings },
      },
    } = createContextsForTest();

    const { result, unmount } = renderHook(() => useNotificationSettings(), {
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
    });

    expect(result.current).toEqual(null);

    // Wait for the first attempt to fetch channel notification settings
    await waitFor(() => expect(getNotificationSettingsCount).toBe(1));

    // The first retry should be made after 5s
    await vi.advanceTimersByTimeAsync(5_000);
    // A new fetch request for the threads should have been made after the first retry
    await waitFor(() => expect(getNotificationSettingsCount).toBe(2));

    // The second retry should be made after 5s
    await vi.advanceTimersByTimeAsync(5_000);
    await waitFor(() => expect(getNotificationSettingsCount).toBe(3));

    // The third retry should be made after 10s
    await vi.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(getNotificationSettingsCount).toBe(4));

    // The fourth retry should be made after 15s
    await vi.advanceTimersByTimeAsync(15_000);
    await waitFor(() => expect(getNotificationSettingsCount).toBe(5));

    await waitFor(() =>
      // Check if the error boundary's fallback is displayed
      expect(
        screen.getByText(
          "There was an error while getting channel notification settings."
        )
      ).toBeInTheDocument()
    );

    // Wait until the error boundary auto-clears
    await vi.advanceTimersByTimeAsync(5_000);

    // Simulate clicking the retry button
    fireEvent.click(screen.getByText("Retry"));

    unmount();
  });
});
