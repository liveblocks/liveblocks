"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePostLinks } from "../hooks/usePostLinks";

export function PostLinks() {
  const pathname = usePathname();
  const { data, error, isLoading, size, setSize, reachedEnd, isLoadingMore } =
    usePostLinks();

  if (error) {
    return <div className="p-2 text-sm text-red-600">Could not load posts</div>;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1 px-2 py-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-8 w-full animate-pulse rounded bg-zinc-100" />
        ))}
      </div>
    );
  }

  if (!data || data[0].rooms.length === 0) {
    return (
      <div className="px-2 py-3 text-sm text-zinc-500">
        No posts yet. Create one with <strong>New post</strong>.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {data.map((d) =>
        d.rooms.map((room) => (
          <Link
            key={room.id}
            href={room.info.url}
            data-active={pathname === room.info.url ? true : undefined}
            className="truncate rounded-md px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 data-[active]:bg-zinc-200/80 data-[active]:font-medium data-[active]:text-zinc-900"
          >
            {room.info.name || (
              <span className="italic text-zinc-400">Untitled</span>
            )}
          </Link>
        ))
      )}

      {!reachedEnd ? (
        <button
          type="button"
          onClick={() => setSize(size + 1)}
          disabled={isLoadingMore}
          className="mt-1 rounded-md py-1.5 text-center text-xs font-medium text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
        >
          {isLoadingMore ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </div>
  );
}
