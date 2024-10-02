import useSWRInfinite from "swr/infinite";
import { getRoomsAndInfo } from "../actions/liveblocks";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const PAGE_LOAD_COUNT = 10; // Load 10 pages at a time
const INITIAL_PAGE_MULTIPLIER = 1; // Load 1 set of pages at start
const REFRESH_TIME_MS = 10_000; // Refresh every 10 seconds

const NO_CURSOR = Symbol();

// Fetch all pages for sidebar
export function usePageLinks() {
  const [reachedEnd, setReachedEnd] = useState(false);

  const result = useSWRInfinite(
    (pageIndex, previousPageData) => {
      // First set of pages requires no cursor
      if (pageIndex === 0 || !previousPageData) {
        return NO_CURSOR; // Symbol because falsy values halt fetching
      }

      // No cursor for next pages, reached end
      if (!previousPageData.nextCursor) {
        return null;
      }

      // Pass previous cursor to `getRoomsAndInfo`
      return previousPageData.nextCursor;
    },
    async (cursor) => {
      // Get data with cursor
      const data = await getRoomsAndInfo({
        cursor: cursor === NO_CURSOR ? undefined : cursor,
        limit: PAGE_LOAD_COUNT,
      });

      // If no cursor, end has been reached
      if (!data.nextCursor) {
        setReachedEnd(true);
      }

      return data;
    },
    {
      refreshInterval: REFRESH_TIME_MS,
      initialSize: INITIAL_PAGE_MULTIPLIER,
    }
  );

  const isLoadingMore =
    result.isLoading ||
    (result.size > 0 &&
      result.data &&
      typeof result.data[result.size - 1] === "undefined");

  // Update on page change
  const pathname = usePathname();
  useEffect(() => {
    result.mutate();
  }, [pathname]);

  return { ...result, reachedEnd, isLoadingMore };
}
