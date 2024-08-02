"use client";

import { deleteRoom } from "@/actions/liveblocks";
import { getRoomId } from "@/config";

export function IssueActions({ issueId }: { issueId: string }) {
  return (
    <button
      className="text-red-600 text-sm"
      onClick={() => deleteRoom(getRoomId(issueId))}
    >
      Delete issue
    </button>
  );
}
