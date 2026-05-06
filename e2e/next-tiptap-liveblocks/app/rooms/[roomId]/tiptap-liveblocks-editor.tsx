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
import { useMemo, useState } from "react";

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
  const { threads } = useThreads();
  const liveblocks = useLiveblocksExtension({
    collaborationMode: "liveblocks",
    field: "document",
    initialContent: INITIAL_CONTENT,
  });
  const [showDiagnostics, setShowDiagnostics] = useState(false);

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

        <button
          type="button"
          onClick={() => setShowDiagnostics((value) => !value)}
        >
          {showDiagnostics ? "Hide diagnostics" : "Show diagnostics"}
        </button>

        {showDiagnostics ? <Diagnostics editor={editor} /> : null}
        <Threads threads={threads} editor={editor} />
      </aside>
    </main>
  );
}

function Diagnostics({ editor }: { editor: Editor | null }) {
  const document = useStorage((root) => root.document);
  const [editorJson, setEditorJson] = useState<unknown>(null);

  const editorJsonText = useMemo(
    () => JSON.stringify(editorJson, null, 2),
    [editorJson]
  );
  const storageJsonText = useMemo(
    () => JSON.stringify(document, null, 2),
    [document]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setEditorJson(editor === null ? null : editor.getJSON());
        }}
      >
        Refresh editor JSON
      </button>

      <h3>Editor JSON</h3>
      <pre>{editorJsonText}</pre>

      <h3>Storage JSON</h3>
      <pre>{storageJsonText}</pre>
    </>
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
