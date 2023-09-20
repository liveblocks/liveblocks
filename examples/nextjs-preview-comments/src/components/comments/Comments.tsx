"use client";

import { ClientSideSuspense } from "@liveblocks/react";
import { Overlay } from "@/components/comments/Overlay";
import { Toolbar } from "@/components/comments/Toolbar";

export function Comments() {
  return (
    <ClientSideSuspense fallback={null}>
      {() => (
        <>
          <Toolbar />
          <Overlay />
        </>
      )}
    </ClientSideSuspense>
  );
}
