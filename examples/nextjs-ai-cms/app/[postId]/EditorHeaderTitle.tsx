"use client";

import { ClientSideSuspense, useStorage } from "@liveblocks/react/suspense";

function TitleFromStorage() {
  const title = useStorage((root) => root.post.title);
  return (
    <h1 className="truncate text-lg font-semibold text-zinc-900">
      {title?.trim() ? title : "Untitled post"}
    </h1>
  );
}

export function EditorHeaderTitle() {
  return (
    <ClientSideSuspense
      fallback={
        <h1 className="truncate text-lg font-semibold text-zinc-400">
          Untitled post
        </h1>
      }
    >
      <TitleFromStorage />
    </ClientSideSuspense>
  );
}
