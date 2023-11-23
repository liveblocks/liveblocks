import { act, renderHook } from "@testing-library/react";

import {
  createCacheManager,
  useAutomaticRevalidation,
  useRevalidateCache,
} from "../comments/lib/revalidation";

const mockVisibility = jest.spyOn(document, "visibilityState", "get");

describe("revalidation", () => {
  beforeEach(() => {
    mockVisibility.mockReturnValue("visible");
  });

  afterEach(() => {
    jest.clearAllMocks();
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

  test("should revalidate at specified intervals when online and document is visible", () => {
    jest.useFakeTimers();
    const mockFetcher = jest.fn().mockResolvedValue(42);
    const manager = createCacheManager<number>();
    const refreshInterval = 1000; // 1 second for example

    renderHook(() => {
      const revalidate = useRevalidateCache(manager, mockFetcher);
      useAutomaticRevalidation(manager, revalidate, {
        refreshInterval,
      });
    });

    // Simulate initial conditions: online and visible
    act(() => {
      mockVisibility.mockReturnValue("visible");
      window.dispatchEvent(new Event("online"));
    });

    // Fast-forward time by the specified interval
    act(() => {
      jest.advanceTimersByTime(refreshInterval);
    });

    expect(mockFetcher).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  test("should not revalidate at intervals when offline or document is hidden", () => {
    jest.useFakeTimers();
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

    // Fast-forward time by the specified interval
    act(() => {
      jest.advanceTimersByTime(refreshInterval);
    });

    expect(mockFetcher).not.toHaveBeenCalled();

    // Clean up fake timers
    jest.useRealTimers();
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
});
