"use client";

import styles from "./Editor.module.css";
import { Toolbar } from "@/components/Toolbar";
import { Avatars } from "./Avatars";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { LiveblocksPlugin } from "@liveblocks/react-lexical";

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
          <RichTextPlugin
            contentEditable={<ContentEditable className={styles.editor} />}
            placeholder={
              <p className={styles.placeholder}>Start typing here…</p>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <LiveblocksPlugin />
        </div>
      </LexicalComposer>
    </div>
  );
}
