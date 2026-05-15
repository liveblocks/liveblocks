"use client";

import React, { Suspense } from "react";

import { CommentsFloatingToggle } from "@/components/comments/CommentsFloatingToggle";
import { CommentsRoomProvider } from "@/components/comments/CommentsRoomProvider";
import { CommentsRoomShell } from "@/components/comments/CommentsRoomShell";
import { cx } from "@/lib/utils";

import { Sidebar } from "@/components/ui/navigation/Sidebar";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };
  return (
    <div className="mx-auto max-w-(--breakpoint-2xl)">
      <Suspense fallback={null}>
        <CommentsRoomProvider>
          <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
          <main
            className={cx(
              isCollapsed ? "lg:pl-[60px]" : "lg:pl-64",
              "ease relative flex min-h-0 min-w-0 transform-gpu flex-col overflow-x-visible transition-all duration-100 will-change-transform lg:bg-neutral-50 lg:py-3 lg:pr-3 lg:dark:bg-black",
            )}
          >
            <CommentsFloatingToggle />
            <div
              className={cx(
                "flex min-h-0 min-w-0 flex-1 flex-col overflow-visible bg-white p-4 sm:p-6 lg:rounded-lg lg:border lg:border-neutral-200 dark:bg-neutral-950 lg:dark:border-neutral-900",
                "lg:min-h-[calc(100dvh-1.5rem)]",
              )}
            >
              <CommentsRoomShell>{children}</CommentsRoomShell>
            </div>
          </main>
        </CommentsRoomProvider>
      </Suspense>
    </div>
  );
}
