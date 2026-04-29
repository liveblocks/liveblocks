"use client";

import {
  FloatingToolbar,
  useLiveblocksExtension,
} from "@liveblocks/react-tiptap";
import { useStorage, useSyncStatus } from "@liveblocks/react/suspense";
import { EditorContent, useEditor } from "@tiptap/react";
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
        <div className="toolbar">
          <button
            data-active={editor?.isActive("bold") ?? false}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            Bold
          </button>
          <button
            data-active={editor?.isActive("italic") ?? false}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            Italic
          </button>
          <button
            data-active={editor?.isActive("heading", { level: 2 }) ?? false}
            disabled={!editor}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            Heading
          </button>
          <button
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            Bullet list
          </button>
          <button disabled={!editor} onClick={() => editor?.commands.undo()}>
            Undo
          </button>
          <button disabled={!editor} onClick={() => editor?.commands.redo()}>
            Redo
          </button>
        </div>

        <EditorContent editor={editor} />
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
      </aside>
    </main>
  );
}
