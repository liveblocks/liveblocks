"use client";

import {
  useThreads,
  useRoom,
  ClientSideSuspense,
} from "@liveblocks/react/suspense";
import { ThreadData } from "@liveblocks/client";
import { Composer, Thread, Comment, Icon } from "@liveblocks/react-ui";
import { useState } from "react";
import { getIssueId } from "@/config";

export function Comments() {
  return (
    <>
      <div className="font-medium">Comments</div>
      <ClientSideSuspense
        fallback={
          <>
            <div className="bg-gray-100/80 animate-pulse h-[130px] rounded-lg my-6" />
          </>
        }
      >
        <ThreadList />
        <Composer className="border border-neutral-200 !my-4 rounded-lg overflow-hidden shadow-sm bg-white" />
      </ClientSideSuspense>
    </>
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
        <CustomThread key={thread.id} thread={thread} />
      ))}
    </div>
  );
}

function CustomThread({ thread }: { thread: ThreadData }) {
  const [open, setOpen] = useState(!thread.resolved);
  const room = useRoom();
  const issueId = getIssueId(room.id);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="border border-neutral-200 my-4 rounded-lg overflow-hidden shadow-sm bg-white w-full text-sm text-left flex items-center h-10 px-3"
      >
        <Icon.Check className="mr-1.5" /> Thread resolved
      </button>
    );
  }

  return (
    <Thread
      key={thread.id}
      thread={thread}
      className="border border-neutral-200 my-4 rounded-lg overflow-hidden shadow-sm bg-white"
      onResolvedChange={(resolved) => {
        if (resolved) {
          setOpen(false);
        }
      }}
      // Adding a custom dropdown item to each comment
      commentDropdownItems={({ children, comment }) => (
        <>
          <Comment.DropdownItem
            onSelect={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/issue/${issueId}#${comment.id}`
              );
            }}
            icon={<Icon.Copy className="m-[0.5px] mt-px mb-0" />}
          >
            Copy link
          </Comment.DropdownItem>
          {children}
        </>
      )}
    />
  );
}
