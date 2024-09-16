"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import useSWRInfinite from "swr/infinite";
import { getRoomsAndInfo } from "../actions/liveblocks";
import { TypedRoomDataWithInfo } from "../utils/liveblocks";

const PAGE_LOAD_COUNT = 10;
const NO_CURSOR = Symbol();

// Infinitely load all pages
export function PageLinks() {
  const pathname = usePathname();
  const [reachedEnd, setReachedEnd] = useState(false);

  // Fetch all pages for sidebar
  const { data, error, isLoading, mutate, size, setSize } = useSWRInfinite(
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
      /// Refresh every 10 seconds
      refreshInterval: 10000,

      // On load, fetch `initialSize * PAGE_LOAD_COUNT` pages
      initialSize: 1,
    }
  );

  const isLoadingMore =
    isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");

  if (error) {
    return <div className="p-2">Error loading pages</div>;
  }

  if (isLoading) {
    const skeletonLength = Array.from({ length: 6 /* PAGE_LOAD_COUNT + 1 */ });
    return (
      <div className="flex flex-col gap-px px-5 py-3">
        {skeletonLength.map((_, index) => (
          <div key={index} className="h-8 flex items-center w-full">
            <div className="bg-gray-200/60 h-5 w-40 max-w-full rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data[0].rooms.length === 0) {
    return (
      <div className="px-5 py-3.5 text-sm text-gray-700 font-medium">
        No pages have been created
      </div>
    );
  }

  return (
    <div className="overflow-y-auto p-2 flex flex-col gap-0.5">
      {data.map((d) =>
        d.rooms.map((room) => (
          <PageLink
            key={room.id}
            room={room}
            active={pathname === `/${room.metadata.pageId}`}
          />
        ))
      )}

      {!reachedEnd ? (
        <button
          onClick={() => setSize(size + 1)}
          disabled={isLoadingMore}
          className="text-center py-1.5 px-3 bg-gray-200/60 transition-colors rounded text-medium text-gray-700 hover:text-gray-900 pr-2 text-sm font-medium data-[active]:bg-gray-200/80 data-[active]:text-gray-900 disabled:opacity-70 disabled:aniamte-pulse"
        >
          {isLoadingMore ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </div>
  );
}

function PageLink({
  room,
  active,
}: {
  room: TypedRoomDataWithInfo;
  active: boolean;
}) {
  return (
    <div
      data-active={active || undefined}
      className="flex justify-between items-center hover:bg-gray-200/80 transition-colors rounded text-medium text-gray-700 hover:text-gray-900 pr-2 text-sm font-medium data-[active]:bg-gray-200/80 data-[active]:text-gray-900"
    >
      <Link href={room.info.url} className="py-1.5 px-3 flex-1 truncate">
        {room.info.name}
      </Link>
    </div>
  );
}
