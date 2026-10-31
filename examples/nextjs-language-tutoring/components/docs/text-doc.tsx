"use client";

import {
  AnchoredThreads,
  FloatingComposer,
  FloatingThreads,
  FloatingToolbar,
  Toolbar,
  useLiveblocksExtension,
} from "@liveblocks/react-tiptap";
import { useThreads } from "@liveblocks/react/suspense";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import type { DocumentInfo } from "@/liveblocks.config";
import type { SnapshotProducer } from "./document-view";

const INITIAL_CONTENT = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Lesson notes" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Write together here. Select text to format it or to leave a comment.",
        },
      ],
    },
  ],
};

// A LiveText-backed Tiptap document. Several of these live in one room:
// `field` scopes the document in Storage, and the thread metadata scopes
// comments to it.
export function TextDoc({
  doc,
  registerProducer,
}: {
  doc: DocumentInfo;
  registerProducer: (producer: SnapshotProducer | null) => void;
}) {
  const liveblocks = useLiveblocksExtension({
    collaborationMode: "liveblocks",
    field: doc.id,
    initialContent: INITIAL_CONTENT,
  });

  const editor = useEditor({
    extensions: [
      liveblocks,
      StarterKit.configure({
        // The Liveblocks extension comes with its own history handling
        undoRedo: false,
      }),
    ],
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "lesson-editor outline-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    registerProducer(async () => ({ kind: "html", html: editor.getHTML() }));
    return () => registerProducer(null);
  }, [editor, registerProducer]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-neutral-200">
        <Toolbar editor={editor} className="!border-0 !bg-transparent" />
      </div>
      <div className="flex min-h-0 flex-1 justify-center overflow-y-auto">
        <div className="w-full max-w-5xl px-8 py-8 xl:grid xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-8">
          <div className="relative min-w-0">
            <EditorContent editor={editor} />
            <FloatingToolbar editor={editor} />
            <FloatingComposer
              editor={editor}
              metadata={{ docId: doc.id }}
              style={{ width: 350 }}
            />
          </div>
          <Threads editor={editor} docId={doc.id} />
        </div>
      </div>
    </div>
  );
}

function Threads({ editor, docId }: { editor: Editor | null; docId: string }) {
  const { threads } = useThreads({ query: { metadata: { docId } } });

  return (
    <>
      <div className="hidden xl:block">
        <AnchoredThreads editor={editor} threads={threads} />
      </div>
      <FloatingThreads
        editor={editor}
        threads={threads}
        className="xl:hidden"
        style={{ width: 350 }}
      />
    </>
  );
}
