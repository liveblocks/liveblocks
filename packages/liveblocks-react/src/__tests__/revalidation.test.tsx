import { act, fireEvent, renderHook } from "@testing-library/react";

import createCacheManager from "../comments/lib/create-cache-manager";
import {
  useAutomaticRevalidation,
  useRevalidateCache,
} from "../comments/lib/revalidation";

describe("revalidation", () => {
  test("should not revalidate if browser is offline", () => {
    const mockFetcher = jest.fn().mockResolvedValue(42);

    const mananger = createCacheManager<number>();

    renderHook(() => {
      const revalidate = useRevalidateCache(mananger, mockFetcher);
      useAutomaticRevalidation(mananger, revalidate, {
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
