"use client";

import { TypedRoomDataWithInfo } from "../lib/liveblocks";
import Link from "next/link";
import useSWR from "swr";
import { getRoomsAndInfo } from "../actions/liveblocks";
import { useParams } from "next/navigation";

export function PageLinks() {
  const params = useParams();

  const { data, error, isLoading, mutate } = useSWR(
    "/api/user",
    getRoomsAndInfo,
    {
      refreshInterval: 10000,
    }
  );

  if (error) {
    return <div className="p-2">Error loading pages</div>;
  }

  if (isLoading) {
    return (
      <div className="px-5 py-3.5 text-sm text-gray-700 font-medium">
        Error loading pages
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="px-5 py-3.5 text-sm text-gray-700 font-medium">
        No pages have been created
      </div>
    );
  }

  return (
    <div className="overflow-y-auto p-2 flex flex-col gap-0.5">
      {data.map((room) => (
        <PageLink
          key={room.id}
          room={room}
          active={params.pageId === room.metadata.pageId}
        />
      ))}
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
