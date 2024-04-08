"use client";

import LiveblocksProvider from "@liveblocks/yjs";
import * as Y from "yjs";
import { useRoom, useSelf } from "@/liveblocks.config";
import styles from "./Editor.module.css";
import { Toolbar } from "@/components/Toolbar";
import { Avatars } from "./Avatars";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  LexicalEditor,
} from "lexical";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { CollaborationPlugin } from "@lexical/react/LexicalCollaborationPlugin";
import { Provider } from "@lexical/yjs";

// Set up editor config and theme
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
  theme: {
    text: {
      bold: styles.textBold,
      italic: styles.textItalic,
      underline: styles.textUnderline,
    },
    paragraph: styles.paragraph,
  },
};

// Define initial editor state
function initialEditorState(editor: LexicalEditor): void {
  const root = $getRoot();
  const paragraph = $createParagraphNode();
  const text = $createTextNode();
  paragraph.append(text);
  root.append(paragraph);
}

// Collaborative text editor with simple rich text, live cursors, and live avatars

export default function Editor() {
  // Get Liveblocks room, and user info from Liveblocks authentication endpoint
  const room = useRoom();
  const userInfo = useSelf((me) => me.info);

  return (
    <div className={styles.container}>
      <LexicalComposer initialConfig={initialConfig}>
        <div className={styles.editorHeader}>
          <Toolbar />
          <Avatars />
        </div>
        <div className={styles.editorContainer}>
          <RichTextPlugin
            contentEditable={<ContentEditable className={styles.editor} />}
            placeholder={
              <p className={styles.placeholder}>Start typing here…</p>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <CollaborationPlugin
            id="yjs-plugin"
            cursorColor={userInfo.color}
            username={userInfo.name}
            providerFactory={(id, yjsDocMap) => {
              // Set up Liveblocks Yjs provider
              const doc = new Y.Doc();
              yjsDocMap.set(id, doc);
              const provider = new LiveblocksProvider(room, doc) as Provider;
              return provider;
            }}
            initialEditorState={initialEditorState}
            shouldBootstrap={true}
          />
        </div>
      </LexicalComposer>
    </div>
  );
}
