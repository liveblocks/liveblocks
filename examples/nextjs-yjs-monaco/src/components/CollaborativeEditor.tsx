"use client";

import * as Y from "yjs";
import LiveblocksProvider from "@liveblocks/yjs";
import { TypedLiveblocksProvider, useRoom, useSelf } from "@/liveblocks.config";
import { useCallback, useEffect, useState } from "react";
import styles from "./CollaborativeEditor.module.css";
import { Avatars } from "@/components/Avatars";
import { Editor } from "@monaco-editor/react";
import { editor } from "monaco-editor";
import { MonacoBinding } from "y-monaco";
import { Awareness } from "y-protocols/awareness";

// Collaborative text editor with simple rich text, live cursors, and live avatars
export function CollaborativeEditor() {
  const [editorRef, setEditorRef] = useState<editor.IStandaloneCodeEditor>();
  const room = useRoom();

  // Get user info from Liveblocks authentication endpoint
  const userInfo = useSelf((me) => me.info);

  // Set up Liveblocks Yjs provider and attach Monaco editor
  useEffect(() => {
    let yProvider: TypedLiveblocksProvider;
    let yDoc: Y.Doc;
    let binding: MonacoBinding;

    if (editorRef) {
      yDoc = new Y.Doc();
      const yText = yDoc.getText("monaco");
      yProvider = new LiveblocksProvider(room, yDoc);

      // Add user color to awareness and render in cursors
      const localUser: UserAwareness = {
        color: userInfo.color,
      };
      yProvider.awareness.setLocalStateField("user", localUser);
      yProvider.awareness.on("change", () => renderCursors(yProvider));
      renderCursors(yProvider);

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
  }, [editorRef, room, userInfo]);

  const handleOnMount = useCallback((e: editor.IStandaloneCodeEditor) => {
    setEditorRef(e);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.editorHeader}>
        <div className={styles.editorFileName}>file.ts</div>
        <Avatars />
      </div>
      <Editor
        onMount={handleOnMount}
        height="100vh"
        width="100hw"
        theme="vs-light"
        defaultLanguage="typescript"
        defaultValue=""
        options={{
          tabSize: 2,
        }}
      />
    </div>
  );
}

type UserAwareness =
  | {
      color: string;
    }
  | undefined;

// Insert a style tag into the page and set cursor styles for each online user
function renderCursors(yProvider: TypedLiveblocksProvider) {
  const id = "monaco-cursors-styles";
  let style: HTMLStyleElement | null = document.querySelector(`style#${id}`);

  if (!style) {
    style = document.createElement("style");
    style.id = id;
    document.head.appendChild(style);
  }

  for (const [clientId, client] of yProvider.awareness.getStates()) {
    const user: UserAwareness = (client as any).user;

    if (user) {
      const selector = `.yRemoteSelection-${clientId}, .yRemoteSelectionHead-${clientId}`;
      style.sheet!.insertRule(`${selector} { --user-color: ${user.color}; }`);
    }
  }
}
