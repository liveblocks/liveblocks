"use client";

import {
  FloatingComposer,
  FloatingThreads,
  FloatingToolbar,
  useLiveblocksExtension,
} from "@liveblocks/react-tiptap";
import { useThreads } from "@liveblocks/react/suspense";
import { useStorage, useSyncStatus } from "@liveblocks/react/suspense";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";

const INITIAL_CONTENT = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Hello from LiveText-backed Tiptap." }],
    },
  ],
};

export function TiptapLiveblocksEditor({ roomId }: { roomId: string }) {
  const syncStatus = useSyncStatus();
  const document = useStorage((root) => root.document);
  const { threads } = useThreads();
  const liveblocks = useLiveblocksExtension({
    collaborationMode: "liveblocks",
    field: "document",
    initialContent: INITIAL_CONTENT,
  });
  const [editorJson, setEditorJson] = useState<unknown>(null);

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "editor",
      },
    },
    extensions: [
      StarterKit.configure({
        undoRedo: false,
      }),
      liveblocks,
    ],
    onCreate({ editor }) {
      setEditorJson(editor.getJSON());
    },
    onUpdate({ editor }) {
      setEditorJson(editor.getJSON());
    },
  });

  return (
    <main>
      <section className="editor-shell">


        <EditorContent editor={editor} />
        <FloatingComposer editor={editor} style={{ width: 350 }} />
        <FloatingToolbar editor={editor} />
      </section>

      <aside className="diagnostics">
        <h2>Diagnostics</h2>
        <p>
          <strong>Room:</strong> {roomId}
        </p>
        <p>
          <strong>Sync:</strong> {syncStatus}
        </p>

        <h3>Editor JSON</h3>
        <pre>{JSON.stringify(editorJson, null, 2)}</pre>

        <h3>Storage JSON</h3>
        <pre>{JSON.stringify(document, null, 2)}</pre>

        <Threads threads={threads} editor={editor} />
      </aside>
    </main>
  );
}

function Threads({
  editor,
  threads,
}: {
  editor: Editor | null;
  threads: ReturnType<typeof useThreads>["threads"];
}) {
  if (!editor) {
    return null;
  }

  return (
    <>
      <FloatingThreads threads={threads} editor={editor} />
    </>
  );
}
