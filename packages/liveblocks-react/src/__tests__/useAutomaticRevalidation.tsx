import { act, renderHook } from "@testing-library/react";

import {
  useAutomaticRevalidation,
  useRevalidateCache,
} from "../comments/lib/revalidation";
import { createCacheManager } from "./_utils";

const mockVisibility = jest.spyOn(document, "visibilityState", "get");

describe("useAutomaticRevalidation", () => {
  beforeEach(() => {
    // Initial state is online (by default) and visible
    mockVisibility.mockReturnValue("visible");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("should not revalidate on focus if browser is offline", () => {
    const mockFetcher = jest.fn().mockResolvedValue(42);

    const manager = createCacheManager<number>();

    renderHook(() => {
      const revalidate = useRevalidateCache(manager, mockFetcher);
      useAutomaticRevalidation(manager, revalidate, {
        revalidateOnFocus: true,
      });
    });

    // Fire 'offline' event to simulate browser being offline
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    // Simulate document becoming visible and fire 'visibilitychange' event. This should attempt to trigger revalidation (because revalidateOnFocus is set to true)
    act(() => {
      mockVisibility.mockReturnValue("visible");
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(mockFetcher).not.toHaveBeenCalled();
  });

  test("should not revalidate on reconnect if document is not visible", () => {
    const mockFetcher = jest.fn().mockResolvedValue(42);

    const manager = createCacheManager<number>();

    renderHook(() => {
      const revalidate = useRevalidateCache(manager, mockFetcher);
      useAutomaticRevalidation(manager, revalidate, {
        revalidateOnReconnect: true,
      });
    });

    // Simuate document becoming hidden and fire 'visibilitychange' event
    act(() => {
      mockVisibility.mockReturnValue("hidden");
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Fire 'offline' event to simulate browser being online. This should attempt to trigger revalidation (because revalidateOnFocus is set to true)
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(mockFetcher).not.toHaveBeenCalled();
  });

  test("should revalidate when browser goes online and document is visible", () => {
    const mockFetcher = jest.fn().mockResolvedValue(42);
    const manager = createCacheManager<number>();

    renderHook(() => {
      const revalidate = useRevalidateCache(manager, mockFetcher);
      useAutomaticRevalidation(manager, revalidate, {
        revalidateOnReconnect: true,
      });
    });

    // Simulate initial offline state
    act(() => {
      window.dispatchEvent(new Event("offline"));
      mockVisibility.mockReturnValue("visible");
    });

    // Simulate browser going online
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    expect(mockFetcher).toHaveBeenCalledTimes(1);
  });

  test("should revalidate when document is visible and browser is online", () => {
    const mockFetcher = jest.fn().mockResolvedValue(42);
    const manager = createCacheManager<number>();

    renderHook(() => {
      const revalidate = useRevalidateCache(manager, mockFetcher);
      useAutomaticRevalidation(manager, revalidate, {
        revalidateOnFocus: true,
      });
    });

    // Simulate initial online state and document hidden
    act(() => {
      window.dispatchEvent(new Event("online"));
      mockVisibility.mockReturnValue("hidden");
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Simulate browser going online
    act(() => {
      mockVisibility.mockReturnValue("visible");
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(mockFetcher).toHaveBeenCalledTimes(1);
  });

  test("should revalidate at specified intervals when online and document is visible", async () => {
    const mockFetcher = jest.fn().mockResolvedValue(42);
    const manager = createCacheManager<number>();
    const dedupingInterval = 1000; // 1 second for example
    const refreshInterval = 2000; // 4 seconds for example

    renderHook(() => {
      const revalidate = useRevalidateCache(manager, mockFetcher, {
        dedupingInterval,
      });

      useAutomaticRevalidation(manager, revalidate, {
        refreshInterval,
      });
    });

    // Fast-forward time by the specified interval
    await act(() => {
      jest.advanceTimersByTime(refreshInterval);
    });

    expect(mockFetcher).toHaveBeenCalledTimes(1);

    // Advance timers by another interval
    await act(() => {
      jest.advanceTimersByTime(refreshInterval);
    });

    expect(mockFetcher).toHaveBeenCalledTimes(2);
  });

  test("should not revalidate at intervals when offline or document is hidden", async () => {
    const mockFetcher = jest.fn().mockResolvedValue(42);
    const manager = createCacheManager<number>();
    const refreshInterval = 1000; // 1 second for example

    renderHook(() => {
      const revalidate = useRevalidateCache(manager, mockFetcher);
      useAutomaticRevalidation(manager, revalidate, {
        refreshInterval,
      });
    });

    // Simulate offline and hidden conditions
    act(() => {
      window.dispatchEvent(new Event("offline"));
      mockVisibility.mockReturnValue("hidden");
    });

    // Fast-forward time by the specified interval and verify that revalidation is not triggered
    await act(() => {
      jest.advanceTimersByTime(refreshInterval);
    });
    expect(mockFetcher).not.toHaveBeenCalled();

    // Advance timers by another interval and verify that revalidation is still not triggered
    await act(() => {
      jest.advanceTimersByTime(refreshInterval);
    });
    expect(mockFetcher).not.toHaveBeenCalled();
  });

  test("should not trigger duplicate revalidations for multiple triggers", () => {
    const mockFetcher = jest.fn().mockResolvedValue(42);
    const manager = createCacheManager<number>();

    renderHook(() => {
      const revalidate = useRevalidateCache(manager, mockFetcher);
      useAutomaticRevalidation(manager, revalidate, {
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
      });
    });

    // Simulate rapid changes: online -> visible
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    act(() => {
      mockVisibility.mockReturnValue("visible");
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Since the revalidation should be debounced or controlled, it should not be called multiple times.
    expect(mockFetcher).toHaveBeenCalledTimes(1);
  });

  test("should clean up all event listeners and intervals on unmount", () => {
    const mockFetcher = jest.fn().mockResolvedValue(42);
    const manager = createCacheManager<number>();

    const { unmount } = renderHook(() => {
      const revalidate = useRevalidateCache(manager, mockFetcher);
      return useAutomaticRevalidation(manager, revalidate);
    });

    // Spy on cleanup functions
    const clearTimeoutSpy = jest.spyOn(window, "clearTimeout");
    const removeWindowEventListenerSpy = jest.spyOn(
      window,
      "removeEventListener"
    );
    const removeDocumentEventListenerSpy = jest.spyOn(
      document,
      "removeEventListener"
    );

    unmount();

    // Assert that cleanup functions are called
    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(removeWindowEventListenerSpy).toHaveBeenCalledWith(
      "online",
      expect.any(Function)
    );
    expect(removeDocumentEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
  });
});
