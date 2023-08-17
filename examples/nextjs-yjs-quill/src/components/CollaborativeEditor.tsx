"use client";

import Quill from "quill";
import ReactQuill from "react-quill";
import QuillCursors from "quill-cursors";
import { QuillBinding } from "y-quill";
import * as Y from "yjs";
import LiveblocksProvider from "@liveblocks/yjs";
import { useRoom, useSelf } from "@/liveblocks.config";
import { useCallback, useEffect, useRef, useState } from "react";
import { Toolbar } from "./Toolbar";
import styles from "./CollaborativeEditor.module.css";
import { Avatars } from "@/components/Avatars";

export type QuillEditorType = ReturnType<ReactQuill["getEditor"]>;
Quill.register("modules/cursors", QuillCursors);

// Collaborative text editor with simple rich text, live cursors, and live avatars
export function CollaborativeEditor() {
  const room = useRoom();
  const [text, setText] = useState<Y.Text>();
  const [provider, setProvider] = useState<any>();

  // Set up Liveblocks Yjs provider
  useEffect(() => {
    const yDoc = new Y.Doc();
    const yText = yDoc.getText("quill");
    const yProvider = new LiveblocksProvider(room, yDoc);
    setText(yText);
    setProvider(yProvider);

    return () => {
      yDoc?.destroy();
      yProvider?.destroy();
    };
  }, [room]);

  if (!text || !provider) {
    return null;
  }

  return <QuillEditor yText={text} provider={provider} />;
}

type EditorProps = {
  yText: Y.Text;
  provider: any;
};

function QuillEditor({ yText, provider }: EditorProps) {
  // Add user info to cursors from Liveblocks authentication endpoint
  const userInfo = useSelf((me) => me.info);
  useEffect(() => {
    const { name, color } = userInfo;
    provider.awareness.setLocalStateField("user", {
      name,
      color,
    });
  }, [userInfo]);

  const reactQuillRef = useRef<ReactQuill>(null);

  // Function to get the current Quill editor
  const getQuill = useCallback(() => {
    if (!reactQuillRef.current) {
      return null;
    }

    return reactQuillRef.current.getEditor();
  }, []);

  // Set up Yjs and Quill
  useEffect(() => {
    let quill: QuillEditorType;
    let binding: QuillBinding;

    if (!reactQuillRef.current) {
      return;
    }

    quill = reactQuillRef.current.getEditor();
    binding = new QuillBinding(yText, quill, provider.awareness);
    return () => {
      binding?.destroy?.();
    };
  }, [yText, provider]);

  return (
    <div className={styles.container}>
      <div className={styles.editorHeader}>
        <Toolbar getQuill={getQuill} />
        <Avatars />
      </div>
      <div className={styles.editorContainer}>
        <ReactQuill
          className={styles.editor}
          placeholder="Start typing here…"
          ref={reactQuillRef}
          theme="snow"
          modules={{
            cursors: true,
            toolbar: false,
            history: {
              // Local undo shouldn't undo changes from remote users
              userOnly: true,
            },
          }}
        />
      </div>
    </div>
  );
}

/*
function QuillEditor({ yText, provider }: EditorProps) {
  const editor = useCallback((node: HTMLDivElement | null) => {
    console.log(123, node);
    if (!node) {
      return;
    }

    node.innerHTML = "";

    const quill = new Quill(node, {
      modules: {
        cursors: true,
        toolbar: [
          // Adding basic Quill features
          ["bold", "italic", "underline"],
        ],
        history: {
          // Local undo shouldn't undo changes from remote users
          userOnly: true,
        },
      },
      placeholder: "Start collaborating...",
      theme: "snow", // 'bubble' is also great
    });

    console.log("wssfsafa");

    console.log("safasfgsag");

    const binding = new QuillBinding(yText, quill, provider.awareness);
  }, []);

  return <div ref={editor} />;
}
 */

/*
function TiptapEditor({ doc, provider }: EditorProps) {
  return (
    <div className={styles.container}>
      <div className={styles.editorHeader}>
        <Toolbar editor={editor} />
        <Avatars />
      </div>
      <EditorContent editor={editor} className={styles.editorContainer} />
    </div>
  );
}
 */
