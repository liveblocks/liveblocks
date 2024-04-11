"use client";

import styles from "./Editor.module.css";
import { Toolbar } from "@/components/Toolbar";
import { Avatars } from "./Avatars";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import {
  LexicalThread,
  LexicalThreadComposer,
  LiveblocksPluginProvider,
  ThreadMarkNode,
} from "@liveblocks/react-lexical";
import { useThreads } from "@/liveblocks.config";

// Set up editor config and theme
const initialConfig = {
  // NOTE: This is critical for collaboration plugin to set editor state to null. It
  // would indicate that the editor should not try to set any default state
  // (not even empty one), and let collaboration plugin do it instead
  editorState: null,
  namespace: "Demo",
  nodes: [ThreadMarkNode],
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
    threadMark: styles.threadMark,
  },
};

// Collaborative text editor with simple rich text, live cursors, and live avatars

export default function Editor() {
  return (
    <div className={styles.container}>
      <LexicalComposer initialConfig={initialConfig}>
        <div className={styles.editorHeader}>
          <Toolbar />
          <Avatars />
        </div>
        <div className={styles.editorContainer}>
          <div className={styles.editor}>
            <RichTextPlugin
              contentEditable={
                <ContentEditable className={styles.contentEditable} />
              }
              placeholder={
                <p className={styles.placeholder}>Start typing here…</p>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>

          <LiveblocksPluginProvider>
            <div className={styles.sidebar}>
              <LexicalThreadComposer className={styles.composer} />
              <Threads />
            </div>
          </LiveblocksPluginProvider>
        </div>
      </LexicalComposer>
    </div>
  );
}

function Threads() {
  const { threads } = useThreads();

  return (
    <div className={styles.threads}>
      {threads.map((thread) => {
        return (
          <LexicalThread
            key={thread.id}
            thread={thread}
            className={styles.thread}
          />
        );
      })}
    </div>
  );
}
