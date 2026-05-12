"use client";

import { ClientSideSuspense } from "@liveblocks/react/suspense";
import { AvatarStack } from "@liveblocks/react-ui";

export function EditorHeaderAvatars() {
  return (
    <ClientSideSuspense
      fallback={<div className="h-8 min-w-[2.5rem]" aria-hidden />}
    >
      <AvatarStack size={32} />
    </ClientSideSuspense>
  );
}
