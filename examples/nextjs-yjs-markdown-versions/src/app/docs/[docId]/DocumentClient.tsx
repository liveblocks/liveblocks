"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react";
import dynamic from "next/dynamic";

// `y-monaco` and `monaco-editor` reach for `window` at module evaluation,
// so the editor tree must not render on the server. Dynamic-import with
// `ssr: false` keeps the whole interactive editor client-only.
const DocumentEditor = dynamic(
  () =>
    import("./DocumentEditor").then((mod) => ({ default: mod.DocumentEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="text-text-muted flex flex-1 items-center justify-center text-sm">
        Loading editor…
      </div>
    ),
  }
);

export function DocumentClient({
  roomId,
  docId,
  initialTitle,
}: {
  roomId: string;
  docId: string;
  initialTitle: string;
}) {
  return (
    <RoomProvider id={roomId} initialPresence={{}}>
      <ClientSideSuspense
        fallback={
          <div className="text-text-muted flex flex-1 items-center justify-center text-sm">
            Connecting to {initialTitle}…
          </div>
        }
      >
        <DocumentEditor docId={docId} initialTitle={initialTitle} />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
