"use client";

import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/Drawer";
import { useCommentsSidebar } from "@/components/comments/CommentsSidebarContext";
import { ThreadsPanel } from "@/components/comments/ThreadsPanel";
import { cx } from "@/lib/utils";
import { RiLoader2Fill } from "@remixicon/react";
import { ClientSideSuspense } from "@liveblocks/react/suspense";
import { XIcon } from "lucide-react";
import React from "react";

export function CommentsRoomShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <CommentsSidebarLayout>{children}</CommentsSidebarLayout>;
}

function CommentsSidebarLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { open, setOpen } = useCommentsSidebar();
  const isLg = useIsMinWidthLg();

  const threadsSuspense = (
    <ClientSideSuspense fallback={<CommentsSuspenseFallback />}>
      <ThreadsPanel />
    </ClientSideSuspense>
  );

  return (
    <div className="comments-room-shell flex min-h-0 min-w-0 flex-1 flex-col overflow-visible lg:flex-row lg:items-stretch lg:gap-6">
      <div className="relative min-h-0 min-w-0 flex-1 overflow-visible">
        {children}
      </div>

      {!isLg ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="sm:max-w-lg">
            <DrawerHeader>
              <DrawerTitle>Comments</DrawerTitle>
            </DrawerHeader>
            <DrawerBody className="flex min-h-0 flex-1 flex-col overflow-y-auto py-0">
              <div className="comments-sidebar lb-root flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                {threadsSuspense}
              </div>
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      ) : (
        <aside
          aria-hidden={!open}
          className={cx(
            "comments-sidebar lb-root hidden flex-col overflow-hidden rounded-none bg-white shadow-none dark:bg-neutral-950 lg:relative lg:z-0 lg:max-w-none lg:w-[350px] lg:shrink-0 lg:rounded-br-lg lg:rounded-l-none lg:rounded-tr-lg lg:border-l lg:border-neutral-200 lg:shadow-none dark:lg:border-neutral-800",
            "lg:-mt-6 lg:-mr-6 lg:-mb-6",
            open ? "lg:flex" : "lg:hidden"
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
            {threadsSuspense}
          </div>
        </aside>
      )}
    </div>
  );
}

function CommentsSuspenseFallback() {
  return (
    <div
      className="flex min-h-[120px] flex-1 items-center justify-center py-8"
      role="status"
    >
      <RiLoader2Fill
        className="size-4 shrink-0 animate-spin text-neutral-400 dark:text-neutral-500"
        aria-hidden="true"
      />
      <span className="sr-only">Loading comments</span>
    </div>
  );
}

function subscribeMinWidthLg(onStoreChange: () => void) {
  const mq = window.matchMedia("(min-width: 1024px)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getMinWidthLgSnapshot() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

function useIsMinWidthLg() {
  return React.useSyncExternalStore(
    subscribeMinWidthLg,
    getMinWidthLgSnapshot,
    () => true
  );
}

