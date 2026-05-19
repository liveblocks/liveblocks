"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react";

import { DocumentEditor } from "./DocumentEditor";
import styles from "./DocumentClient.module.css";

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
          <div className={styles.loading}>Connecting to {initialTitle}…</div>
        }
      >
        <DocumentEditor docId={docId} initialTitle={initialTitle} />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
