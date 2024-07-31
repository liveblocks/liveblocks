"use client";

import { ClientSideSuspense, useRoom } from "@liveblocks/react/suspense";
import { deleteRoom } from "@/actions/liveblocks";

export function IssueActions() {
  return (
    <ClientSideSuspense
      fallback={
        <div className="bg-red-100/40 animate-pulse h-6 w-[81px] rounded-lg" />
      }
    >
      <DeleteButton />
    </ClientSideSuspense>
  );
}

function DeleteButton() {
  const room = useRoom();
  return (
    <button
      className="text-red-600 text-sm"
      onClick={() => deleteRoom(room.id)}
    >
      Delete issue
    </button>
  );
}
