"use client";

import * as Y from "yjs";
import LiveblocksProvider from "@liveblocks/yjs";
import {
  AwarenessList,
  TypedLiveblocksProvider,
  UserAwareness,
  useRoom,
  useSelf,
} from "@/liveblocks.config";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [awarenessUsers, setAwarenessUsers] = useState<AwarenessList>([]);

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

      // Add userInfo to Yjs awareness and set list of online users
      const localUser: UserAwareness["user"] = userInfo;
      yProvider.awareness.setLocalStateField("user", localUser);
      yProvider.awareness.on("change", () =>
        setAwarenessUsers([...yProvider.awareness.getStates()] as AwarenessList)
      );
      setAwarenessUsers([...yProvider.awareness.getStates()] as AwarenessList);

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

  // Insert awareness colours into cursors
  const styleSheet = useMemo(() => {
    let cursorStyles = "";

    for (const [clientId, client] of awarenessUsers) {
      if (client?.user) {
        cursorStyles += `
          .yRemoteSelection-${clientId}, 
          .yRemoteSelectionHead-${clientId}  {
            --user-color: ${client.user.color};
          }
          
          .yRemoteSelectionHead-${clientId}::after {
            content: "${client.user.name}";
          }
        `;
      }
    }

    return { __html: cursorStyles };
  }, [awarenessUsers]);

  return (
    <div className={styles.container}>
      <style dangerouslySetInnerHTML={styleSheet} />
      <div className={styles.editorHeader}>
        <div className={styles.editorFileName}>file.ts</div>
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
