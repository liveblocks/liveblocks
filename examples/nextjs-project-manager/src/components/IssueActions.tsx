"use client";

import { deleteRoom } from "@/actions/liveblocks";
import { getRoomId } from "@/config";
import { useState } from "react";
import { Loading } from "@/components/Loading";

export function IssueActions({ issueId }: { issueId: string }) {
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      {deleting ? (
        <div className="inset-0 bg-gray-100/50 absolute">
          <Loading />
        </div>
      ) : null}
      <button
        className="text-red-600 text-sm"
        onClick={() => {
          setDeleting(true);
          deleteRoom(getRoomId(issueId));
        }}
      >
        Delete issue
      </button>
    </>
  );
}
