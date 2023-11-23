import { act, fireEvent, renderHook } from "@testing-library/react";

import {
  createCacheManager,
  useAutomaticRevalidation,
  useRevalidateCache,
} from "../comments/lib/revalidation";

describe("revalidation", () => {
  test("should not revalidate if browser is offline", () => {
    const mockFetcher = jest.fn().mockResolvedValue(42);

    const manager = createCacheManager<number>();

    renderHook(() => {
      const revalidate = useRevalidateCache(manager, mockFetcher);
      useAutomaticRevalidation(manager, revalidate, {
        revalidateOnFocus: true,
      });
    });

    act(() => {
      // Fire offline event to simulate browser being offline
      window.dispatchEvent(new Event("offline"));
      // Fire focus event. This should attempt to trigger revalidation (because revalidateOnFocus is set to true)
      fireEvent.focus(window);
    });

    expect(mockFetcher).not.toHaveBeenCalled();
  });
});
