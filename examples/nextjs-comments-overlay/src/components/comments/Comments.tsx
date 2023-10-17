"use client";

import { ClientSideSuspense } from "@liveblocks/react";
import { CommentsOverlay } from "@/components/comments/CommentsOverlay";
import { Toolbar } from "@/components/comments/Toolbar";

export function Comments() {
  return (
    <ClientSideSuspense fallback={null}>
      {() => (
        <>
          <Toolbar />
          <CommentsOverlay />
        </>
      )}
    </ClientSideSuspense>
  );
}
