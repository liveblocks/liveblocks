import { act, renderHook } from "@testing-library/react";

import { useRevalidateCache } from "../comments/lib/revalidation";
import { createCacheManager } from "./_utils";

const mockVisibility = jest.spyOn(document, "visibilityState", "get");

describe("useRevalidation", () => {
  beforeEach(() => {
    // Initial state is online (by default) and visible
    mockVisibility.mockReturnValue("visible");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should set the initial cache state correctly", () => {
    const mockFetcher = jest.fn().mockResolvedValue(42);
    const manager = createCacheManager<number>();
    renderHook(() => useRevalidateCache(manager, mockFetcher));

    expect(manager.cache).toBeUndefined();
  });

  test("should update the cache on successful revalidation", async () => {
    const mockFetcher = jest.fn().mockResolvedValue(42);
    const manager = createCacheManager<number>();

    const { result } = renderHook(() =>
      useRevalidateCache(manager, mockFetcher)
    );
    const revalidateCache = result.current;

    await act(() => revalidateCache(true));

    expect(manager.cache).toEqual({ isLoading: false, data: 42 });
  });

  test("should update the cache with an error on failed revalidation", async () => {
    const mockFetcher = jest.fn().mockRejectedValue(new Error("Fetch failed"));
    const manager = createCacheManager<number>();

    const { result } = renderHook(() =>
      useRevalidateCache(manager, mockFetcher)
    );
    const revalidateCache = result.current;

    await act(() => revalidateCache(true));

    expect(manager.cache).toEqual({
      isLoading: false,
      error: new Error("Fetch failed"),
    });
  });

  test("should dedupe multiple revalidations within the deduping interval", () => {
    jest.useFakeTimers();
    const mockFetcher = jest.fn();
    const manager = createCacheManager<number>();

    const { result } = renderHook(() =>
      useRevalidateCache(manager, mockFetcher, { dedupingInterval: 2000 })
    );
    const revalidateCache = result.current;

    act(() => revalidateCache(true));
    act(() => revalidateCache(true));

    jest.advanceTimersByTime(1000); // within deduping interval
    expect(mockFetcher).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});
