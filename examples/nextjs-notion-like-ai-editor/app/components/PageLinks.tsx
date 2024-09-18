"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { TypedRoomDataWithInfo } from "../utils/liveblocks";
import { usePageLinks } from "../hooks/usePageLinks";

// Infinitely load all pages
export function PageLinks() {
  const pathname = usePathname();

  // Fetch all pages for sidebar
  const { data, error, isLoading, size, setSize, reachedEnd, isLoadingMore } =
    usePageLinks();

  if (error) {
    return <div className="p-2">Error loading pages</div>;
  }

  if (isLoading) {
    const skeletonLength = Array.from({ length: 6 });

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
      className="flex justify-between items-center hover:bg-gray-200/80 transition-colors rounded text-medium text-gray-700 hover:text-gray-900 pr-2 text-sm font-medium data-[active]:bg-gray-200/80 data-[active]:text-gray-900 min-h-8"
    >
      <Link href={room.info.url} className="py-1.5 px-3 flex-1 truncate">
        {room.info.name || (
          <div className="italic font-normal">Empty title</div>
        )}
      </Link>
    </div>
  );
}
