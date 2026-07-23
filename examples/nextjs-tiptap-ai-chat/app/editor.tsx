"use client";

import {
  FloatingComposer,
  FloatingToolbar,
  Toolbar,
  useLiveblocksExtension,
} from "@liveblocks/react-tiptap";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import { EditorContent, useEditor } from "@tiptap/react";
import { GripVerticalIcon } from "lucide-react";
import { getBaseExtensions } from "./editor-extensions";
import { DOCUMENT_FIELD, INITIAL_DOCUMENT } from "./initial-document";
import { Threads } from "./threads";

/**
 * The collaborative Tiptap editor. With `collaborationMode: "liveblocks"`,
 * the document is stored in Liveblocks Storage (as a tree of LiveObjects and
 * LiveTexts) instead of a Yjs document — which is what lets the AI route edit
 * it on the server with `mutateStorage`.
 */
export function DocumentEditor() {
  const liveblocks = useLiveblocksExtension({
    collaborationMode: "liveblocks",
    field: DOCUMENT_FIELD,
    initialContent: INITIAL_DOCUMENT,
  });

  const editor = useEditor({
    extensions: [liveblocks, ...getBaseExtensions({ editable: true })],
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "outline-none",
      },
    },
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-neutral-950/5 px-2 py-1">
        <Toolbar editor={editor} className="!bg-transparent" />
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="relative mx-auto max-w-[720px] px-12 py-10">
          {editor ? (
            <DragHandle editor={editor}>
              <div className="drag-handle">
                <GripVerticalIcon className="size-4" />
              </div>
            </DragHandle>
          ) : null}
          <EditorContent editor={editor} />
        </div>

        <Threads editor={editor} />
        <FloatingToolbar editor={editor} />
        <FloatingComposer editor={editor} className="w-[350px]" />
      </div>
    </div>
  );
}
