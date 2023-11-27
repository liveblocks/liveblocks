import { act, renderHook } from "@testing-library/react";

import { useMutate, useRevalidateCache } from "../comments/lib/revalidation";
import { createCacheManager } from "./_utils";

const mockVisibility = jest.spyOn(document, "visibilityState", "get");

describe("useMutation", () => {
  beforeEach(() => {
    // Initial state is online (by default) and visible
    mockVisibility.mockReturnValue("visible");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should revalidate cache after successful mutation", async () => {
    const mockRevalidateCache = jest.fn();

    const manager = createCacheManager<number>();
    const { result } = renderHook(() =>
      useMutate(manager, mockRevalidateCache)
    );
    const mutate = result.current;

    await act(async () => {
      await mutate(Promise.resolve(), { optimisticData: 42 });
    });

    expect(manager.cache).toEqual({ isLoading: false, data: 42 });
    expect(mockRevalidateCache).toHaveBeenCalledWith(false);
  });

  test("should revert cache to initial state on mutation error", async () => {
    const mockRevalidateCache = jest.fn();

    // Set initial cache state to 42
    const manager = createCacheManager(42);

    const { result } = renderHook(() => {
      return useMutate(manager, mockRevalidateCache);
    });
    const mutate = result.current;

    await act(async () => {
      await expect(
        mutate(Promise.reject(new Error("Mutation error")), {
          optimisticData: 52,
        })
      ).rejects.toThrow("Mutation error");
    });

    expect(mockRevalidateCache).toHaveBeenCalledWith(false);
    // Verify that the cache has been reverted to its initial state
    expect(manager.cache).toEqual({ isLoading: false, data: 42 });
  });

  test("should reflect latest mutation in cache", async () => {
    const mockRevalidateCache = jest.fn();

    // Set initial cache state to 42
    const manager = createCacheManager(42);

    const { result } = renderHook(() => {
      return useMutate(manager, mockRevalidateCache);
    });
    const mutate = result.current;

    await act(() => {
      mutate(Promise.resolve(), { optimisticData: 52 });
      mutate(Promise.resolve(), { optimisticData: 62 });
    });

    expect(manager.cache).toEqual({ isLoading: false, data: 62 });
  });

  test("should handle race conditions in mutations correctly", async () => {
    const mockRevalidateCache = jest.fn();

    const manager = createCacheManager<number>(42);

    const { result } = renderHook(() => {
      return useMutate(manager, mockRevalidateCache);
    });
    const mutate = result.current;

    // Simulate delayed mutation promise
    const delayedMutation = new Promise((resolve) =>
      setTimeout(() => resolve(52), 100)
    );
    // Simulate immediate mutation promise
    const immediateMutation = Promise.resolve(62);

    await act(async () => {
      // Trigger two mutations - one delayed and one immediate
      mutate(delayedMutation, { optimisticData: 52 });
      mutate(immediateMutation, { optimisticData: 62 });

      // Wait for all promises to settle
      await Promise.allSettled([delayedMutation, immediateMutation]);
    });

    // The cache should reflect the data from the last mutation
    expect(manager.cache).toEqual({
      isLoading: false,
      data: 62,
    });

    // revalidateCache should have been called only once (for the last mutation)
    expect(mockRevalidateCache).toHaveBeenCalledTimes(1);
  });

  test("handles concurrent mutations and revalidations correctly", async () => {
    jest.useFakeTimers();

    const manager = createCacheManager<number>();

    // Simulate delayed mutation promise
    const delayedMutation = new Promise((resolve) =>
      setTimeout(() => resolve(42), 100)
    );

    const mockFetcher = jest
      .fn()
      .mockResolvedValueOnce(52)
      .mockResolvedValueOnce(62);

    const { result } = renderHook(() => {
      const revalidate = useRevalidateCache(manager, mockFetcher);
      const mutate = useMutate(manager, revalidate);
      return { revalidate, mutate };
    });
    const { revalidate, mutate } = result.current;

    await act(async () => {
      // Trigger mutation and while it's in flight, trigger a revalidation
      const mutationPromise = mutate(delayedMutation, {
        optimisticData: 52,
      });
      const revalidatePromise = revalidate(true);

      jest.runAllTimers(); // Complete all timers

      // Wait for both to settle
      await Promise.all([mutationPromise, revalidatePromise]);
    });

    // Final cache state should reflect the most recent update
    expect(manager.cache).toEqual({
      isLoading: false,
      data: 62,
    });
  });
});
