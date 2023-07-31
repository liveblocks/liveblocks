"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import * as Y from "yjs";
import LiveblocksProvider from "@liveblocks/yjs";
import { useRoom } from "@/liveblocks.config";
import { useEffect, useState } from "react";
import { Toolbar } from "./Toolbar";
import styles from "./CollaborativeEditor.module.css";
import { Avatars } from "@/components/Avatars";

export function CollaborativeEditor() {
  const room = useRoom();
  const [doc, setDoc] = useState<Y.Doc>();
  const [provider, setProvider] = useState<any>();

  useEffect(() => {
    const yDoc = new Y.Doc();
    const yProvider = new LiveblocksProvider(room, yDoc);
    setDoc(yDoc);
    setProvider(yProvider);
    return () => {
      if (yDoc) yDoc.destroy();
      if (yProvider) yProvider.destroy();
    };
  }, [room]);

  return doc && provider ? (
    <TiptapEditor doc={doc} provider={provider} />
  ) : null;
}

type EditorProps = {
  doc: Y.Doc;
  provider: any;
};

function TiptapEditor({ doc, provider }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // The Collaboration extension comes with its own history handling
        history: false,
      }),
      // Register the document with Tiptap
      Collaboration.configure({
        document: doc,
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: {
          name: "Mislav Abha",
          color: "#0000ff",
        },
      }),
    ],
  });
  return (
    <div className={styles.container}>
      <div className={styles.editorHeader}>
        <Toolbar editor={editor} />
        <Avatars />
      </div>
      <div className={styles.editor}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
