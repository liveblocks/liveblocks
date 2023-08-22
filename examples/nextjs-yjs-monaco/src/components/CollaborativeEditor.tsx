"use client";

import * as Y from "yjs";
import LiveblocksProvider from "@liveblocks/yjs";
import { TypedLiveblocksProvider, useRoom } from "@/liveblocks.config";
import { useCallback, useEffect, useState } from "react";
import styles from "./CollaborativeEditor.module.css";
import { Avatars } from "@/components/Avatars";
import { Editor } from "@monaco-editor/react";
import { editor } from "monaco-editor";
import { MonacoBinding } from "y-monaco";
import { Awareness } from "y-protocols/awareness";
import { Cursors } from "@/components/Cursors";
import { Toolbar } from "@/components/Toolbar";

// Collaborative code editor with undo/redo, live cursors, and live avatars
export function CollaborativeEditor() {
  const room = useRoom();
  const [provider, setProvider] = useState<TypedLiveblocksProvider>();
  const [editorRef, setEditorRef] = useState<editor.IStandaloneCodeEditor>();

  // Set up Liveblocks Yjs provider and attach Monaco editor
  useEffect(() => {
    let yProvider: TypedLiveblocksProvider;
    let yDoc: Y.Doc;
    let binding: MonacoBinding;

    if (editorRef) {
      yDoc = new Y.Doc();
      const yText = yDoc.getText("monaco");
      yProvider = new LiveblocksProvider(room, yDoc);
      setProvider(yProvider);

      // Attach Yjs to Monaco
      binding = new MonacoBinding(
        yText,
        editorRef.getModel() as editor.ITextModel,
        new Set([editorRef]),
        yProvider.awareness as Awareness
      );
    }

    return () => {
      yDoc?.destroy();
      yProvider?.destroy();
      binding?.destroy();
    };
  }, [editorRef, room]);

  const handleOnMount = useCallback((e: editor.IStandaloneCodeEditor) => {
    setEditorRef(e);
  }, []);

  return (
    <div className={styles.container}>
      {provider ? <Cursors yProvider={provider} /> : null}
      <div className={styles.editorHeader}>
        <div>{editorRef ? <Toolbar editor={editorRef} /> : null}</div>
        <Avatars />
      </div>
      <div className={styles.editorContainer}>
        <Editor
          onMount={handleOnMount}
          height="100%"
          width="100hw"
          theme="vs-light"
          defaultLanguage="typescript"
          defaultValue=""
          options={{
            tabSize: 2,
          }}
        />
      </div>
    </div>
  );
}
