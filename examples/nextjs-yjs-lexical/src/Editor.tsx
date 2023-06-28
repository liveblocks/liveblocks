"use client";

import { useRoom } from "../liveblocks.config";
import "@liveblocks/react";
import * as Y from "yjs";
import LiveblocksProvider from "@liveblocks/yjs";
import {
  $getRoot,
  $createParagraphNode,
  $createTextNode,
  LexicalEditor,
} from "lexical";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { CollaborationPlugin } from "@lexical/react/LexicalCollaborationPlugin";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { Provider } from "@lexical/yjs";
import styles from "./Editor.module.css";
import { USER_INFO } from "./constants";

function initialEditorState(editor: LexicalEditor): void {
  const root = $getRoot();
  const paragraph = $createParagraphNode();
  const text = $createTextNode();
  paragraph.append(text);
  root.append(paragraph);
}

export default function Editor() {
  const room = useRoom();
  const user = USER_INFO[Math.floor(Math.random() * USER_INFO.length)];
  const initialConfig = {
    // NOTE: This is critical for collaboration plugin to set editor state to null. It
    // would indicate that the editor should not try to set any default state
    // (not even empty one), and let collaboration plugin do it instead
    editorState: null,
    namespace: "Demo",
    nodes: [],
    onError: (error: unknown) => {
      throw error;
    },
    theme: {},
  };

  return (
    <div className={styles.container}>
      <LexicalComposer initialConfig={initialConfig}>
        <PlainTextPlugin
          contentEditable={<ContentEditable className={styles.editor} />}
          placeholder={
            <div className={styles.placeholder}>Start typing here…</div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <CollaborationPlugin
          id="yjs-plugin"
          cursorColor={user.color}
          username={user.name}
          providerFactory={(id, yjsDocMap) => {
            const doc = new Y.Doc();
            yjsDocMap.set(id, doc);
            const provider = new LiveblocksProvider(room, doc) as Provider;
            return provider;
          }}
          initialEditorState={initialEditorState}
          shouldBootstrap={true}
        />
      </LexicalComposer>
    </div>
  );
}
