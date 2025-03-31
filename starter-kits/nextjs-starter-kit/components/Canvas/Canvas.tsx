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
  const canWrite = useSelf((me) => me.canWrite);
  const store = useStorageStore({});

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
