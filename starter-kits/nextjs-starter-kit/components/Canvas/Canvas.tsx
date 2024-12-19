"use client";

import "tldraw/tldraw.css";
import { ClientSideSuspense } from "@liveblocks/react";
import { useSelf } from "@liveblocks/react/suspense";
import { Tldraw } from "tldraw";
import { DocumentSpinner } from "@/primitives/Spinner";
import { useStorageStore } from "./useStorageStore";

export function Canvas() {
  return (
    <ClientSideSuspense fallback={<DocumentSpinner />}>
      <LiveblocksCanvas />
    </ClientSideSuspense>
  );
}

function LiveblocksCanvas() {
  // Getting authenticated user info. Doing this using selectors instead
  // of just `useSelf()` to prevent re-renders on Presence changes
  const id = useSelf((me) => me.id);
  const info = useSelf((me) => me.info);
  const canWrite = useSelf((me) => me.canWrite);

  const store = useStorageStore({
    user: { id, color: info.color, name: info.name },
  });

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Tldraw
        store={store}
        onMount={(editor) => {
          editor.updateInstanceState({ isReadonly: !canWrite });
        }}
        autoFocus
        inferDarkMode
      />
    </div>
  );
}
