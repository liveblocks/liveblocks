"use client";

import { useUpdateMyPresence } from "@liveblocks/react/suspense";
import { useCallback } from "react";
import { Tldraw, type Editor } from "tldraw";
import { useStorageStore } from "@/lib/useStorageStore";

export function Canvas({
  readonly,
  onEditorMount,
}: {
  readonly: boolean;
  onEditorMount: (editor: Editor) => void;
}) {
  const updateMyPresence = useUpdateMyPresence();
  const { store, isReady } = useStorageStore();

  const handlePointerLeave = useCallback(() => {
    updateMyPresence({ cursor: null });
  }, [updateMyPresence]);

  if (!isReady) {
    return (
      <div className="h-full w-full grid place-items-center text-sm text-neutral-500">
        Syncing canvas…
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full"
      onPointerMove={(event) => {
        updateMyPresence({
          cursor: {
            x: event.clientX,
            y: event.clientY,
          },
        });
      }}
      onPointerLeave={handlePointerLeave}
    >
      <Tldraw
        hideUi
        store={store}
        onMount={(editor) => {
          if (readonly) {
            editor.updateInstanceState({ isReadonly: true });
          }
          onEditorMount(editor);
        }}
      />
    </div>
  );
}
