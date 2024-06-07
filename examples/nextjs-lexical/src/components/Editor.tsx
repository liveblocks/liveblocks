"use client";

import styles from "./Editor.module.css";
import { Avatars } from "@/components/Avatars";
import { FloatingToolbarPlugin } from "@/components/FloatingToolbarPlugin/FloatingToolbarPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import {
  FloatingComposer,
  LiveblocksPlugin,
  ThreadPanel,
  liveblocksLexicalConfig,
} from "@liveblocks/react-lexical";

// Set up editor config and theme
const initialConfig = {
  editorState: null,
  namespace: "Demo",
  nodes: [],
  onError: (error: unknown) => {
    console.error(error);
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

// Collaborative text editor with simple rich text, live cursors, and live avatars

export default function Editor() {
  return (
    <div className={styles.container}>
      <LexicalComposer initialConfig={liveblocksLexicalConfig(initialConfig)}>
        <LiveblocksPlugin>
          {/* Header */}
          <div className={styles.header}>
            <Avatars />
          </div>

          {/* Editor content */}
          <div className={styles.editorContainer}>
            <div className={styles.editor}>
              <RichTextPlugin
                contentEditable={
                  <>
                    <ContentEditable className={styles.contentEditable} />
                  </>
                }
                placeholder={
                  <p className={styles.placeholder}>Start typing here…</p>
                }
                ErrorBoundary={LexicalErrorBoundary}
              />

              <FloatingToolbarPlugin />

              <FloatingComposer className={styles.floatingComposer} />
            </div>

            <div className={styles.sidebar}>
              <ThreadPanel />
            </div>
          </div>
        </LiveblocksPlugin>
      </LexicalComposer>
    </div>
  );
}
