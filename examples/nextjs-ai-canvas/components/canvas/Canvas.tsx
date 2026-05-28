"use client";

import { Tldraw, type Editor } from "tldraw";
import { htmlBoxShapeUtils } from "@/components/canvas/HtmlBoxShapeUtil";
import { useStorageStore } from "@/lib/useStorageStore";

export function Canvas({
  readonly,
  onEditorMount,
}: {
  readonly: boolean;
  onEditorMount: (editor: Editor) => void;
}) {
  const { store, isReady } = useStorageStore({
    shapeUtils: htmlBoxShapeUtils,
  });

  if (!isReady) {
    return (
      <div className="h-full w-full grid place-items-center text-sm text-neutral-500">
        Syncing canvas…
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Tldraw
        hideUi
        store={store}
        shapeUtils={htmlBoxShapeUtils}
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
