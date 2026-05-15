"use client";

import { useCommentsSidebar } from "@/components/comments/CommentsSidebarContext";
import { ThreadsPanel } from "@/components/comments/ThreadsPanel";
import { COMMENTS_ROOM_ID_BASE } from "@/lib/comments/constants";
import { cx } from "@/lib/utils";
import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { XIcon } from "lucide-react";
import React from "react";
import { useSearchParams } from "next/navigation";

function useExampleRoomId(roomId: string) {
  const params = useSearchParams();
  const exampleId = params?.get("exampleId");

  return React.useMemo(() => {
    return exampleId ? `${roomId}-${exampleId}` : roomId;
  }, [roomId, exampleId]);
}

export function CommentsRoomShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const roomId = useExampleRoomId(COMMENTS_ROOM_ID_BASE);

  return (
    <RoomProvider id={roomId}>
      <CommentsSidebarLayout>{children}</CommentsSidebarLayout>
    </RoomProvider>
  );
}

function CommentsSidebarLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { open, setOpen } = useCommentsSidebar();

  return (
    <div className="comments-room-shell flex min-h-0 min-w-0 flex-1 flex-col overflow-visible lg:flex-row lg:items-stretch lg:gap-6">
      <div className="relative min-h-0 min-w-0 flex-1 overflow-visible">
        {children}
      </div>

      <div
        aria-hidden={!open}
        className={cx(
          "fixed inset-0 z-40 bg-black/40 lg:hidden",
          !open && "hidden"
        )}
        onClick={() => setOpen(false)}
      />
      <aside
        aria-hidden={!open}
        className={cx(
          "comments-sidebar lb-root fixed inset-y-0 right-0 z-50 w-full max-w-[370px] flex-col overflow-hidden rounded-none border-l border-neutral-200 bg-white shadow-none dark:border-neutral-800 dark:bg-neutral-950",
          "lg:relative lg:z-0 lg:max-w-none lg:w-[350px] lg:shrink-0 lg:rounded-br-lg lg:rounded-l-none lg:rounded-tr-lg lg:border-neutral-200 lg:shadow-none dark:lg:border-neutral-800",
          "lg:-mt-6 lg:-mr-6 lg:-mb-6",
          open ? "flex flex-col" : "hidden"
        )}
      >
        <div className="flex shrink-0 items-center justify-between pt-3 pb-0">
          <span className="pl-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Comments
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mr-2 inline-flex size-8 items-center justify-center rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900"
            aria-label="Close comments"
          >
            <XIcon className="size-4 opacity-70" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ClientSideSuspense
            fallback={<div className="text-sm text-neutral-500">Loading…</div>}
          >
            <ThreadsPanel />
          </ClientSideSuspense>
        </div>
      </aside>
    </div>
  );
}
