"use client";

import { useThreads, ClientSideSuspense } from "@liveblocks/react/suspense";
import { ThreadData } from "@liveblocks/client";
import { Composer, Thread } from "@liveblocks/react-ui";
import { useCallback, useRef, useState } from "react";

export function Comments() {
  return (
    <ClientSideSuspense fallback={null}>
      <div className="font-medium">Comments</div>
      <ThreadList />
      <Composer className="border border-gray-200 my-4 rounded-lg overflow-hidden shadow-sm bg-white" />
    </ClientSideSuspense>
  );
}

function ThreadList() {
  const { threads } = useThreads();

  if (threads.length === 0) {
    return null;
  }

  return (
    <div className="">
      {threads.map((thread) => (
        <CustomThread thread={thread} key={thread.id} />
      ))}
    </div>
  );
}

function CustomThread({ thread }: { thread: ThreadData }) {
  const [open, setOpen] = useState(!thread.resolved);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="border border-gray-200 my-4 rounded-lg overflow-hidden shadow-sm bg-white w-full text-sm text-left flex items-center h-10 px-3"
      >
        ✓ Thread resolved
      </button>
    );
  }

  return (
    <Thread
      thread={thread}
      key={thread.id}
      className="border border-gray-200 my-4 rounded-lg overflow-hidden shadow-sm bg-white"
      onResolvedChange={(resolved) => {
        if (resolved) {
          setOpen(false);
        }
      }}
    />
  );
}
