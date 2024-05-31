"use client";

import styles from "./Editor.module.css";
import { Avatars } from "@/components/Avatars";
import FloatingTextFormatToolbarPlugin from "@/components/FloatingToolbarPlugin/FloatingToolbarPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import {
  FloatingComposer,
  LiveblocksPluginProvider,
  ThreadPanel,
  liveblocksLexicalConfig,
} from "@liveblocks/react-lexical";
import { Composer } from "@liveblocks/react-comments";
import { useState } from "react";

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
    threadMark: styles.threadMark,
  },
};

// Collaborative text editor with simple rich text, live cursors, and live avatars

export default function Editor() {
  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null);
  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };
  return (
    <div className={styles.container}>
      <LexicalComposer initialConfig={liveblocksLexicalConfig(initialConfig)}>
        <LiveblocksPluginProvider>
          <div className={styles.editorHeader}>
            <Avatars />
          </div>
          <div className={styles.editorContainer}>
            <div className={styles.editor} ref={onRef}>
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
              {floatingAnchorElem && (
                <FloatingTextFormatToolbarPlugin
                  anchorElem={floatingAnchorElem}
                />
              )}

              <FloatingComposer
                className={styles.floatingComposer}
                sideOffset={5}
                alignOffset={5}
              />
            </div>

            <div className={styles.sidebar}>
              <Composer className={styles.composer} />
              <ThreadPanel />
            </div>
          </div>
        </LiveblocksPluginProvider>
      </LexicalComposer>
    </div>
  );
}
