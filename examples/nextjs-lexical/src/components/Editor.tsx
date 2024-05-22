"use client";

import styles from "./Editor.module.css";
import { INSERT_THREAD_COMMAND, Toolbar } from "@/components/Toolbar";
import { Avatars } from "@/components/Avatars";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import {
  ActiveSelection,
  LiveblocksPlugin,
  liveblocksLexicalConfig,
  Mention as LexicalMention,
} from "@liveblocks/react-lexical";
import { useThreads } from "@/liveblocks.config";
import { Composer, Thread } from "@liveblocks/react-comments";
import { useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { COMMAND_PRIORITY_EDITOR } from "lexical";
import { ThreadData } from "@liveblocks/client";

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
  return (
    <div className={styles.container}>
      <LexicalComposer
        initialConfig={liveblocksLexicalConfig(initialConfig, {
          // components: {
          //   Mention: ({ userId }) => {
          //     return (
          //       <LexicalMention className="lb-lexical-composer-mention">
          //         {userId}
          //       </LexicalMention>
          //     );
          //   },
          // },
        })}
      >
        <div className={styles.editorHeader}>
          <Toolbar />
          <Avatars />
        </div>
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
          </div>

          <LiveblocksPlugin />

          <div className={styles.sidebar}>
            <ComposerWrapper />
            <Threads />
          </div>
        </div>
      </LexicalComposer>
    </div>
  );
}

function Threads() {
  const { threads } = useThreads();

  if (threads.length === 0) {
    return <div className={styles.noThreads}>No threads yet</div>;
  }

  return (
    <div className={styles.threads}>
      {threads.map((thread) => {
        return <Thread thread={thread} className={styles.thread} />;
      })}
    </div>
  );
}

function ComposerWrapper() {
  const [editor] = useLexicalComposerContext();
  const [showComposer, setShowComposer] = useState(false);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState: state, tags }) => {
      // Ignore selection updates related to collaboration
      if (tags.has("collaboration")) return;
      state.read(() => setShowComposer(false));
    });
  }, [editor, setShowComposer]);

  useEffect(() => {
    return editor.registerCommand(
      INSERT_THREAD_COMMAND,
      () => {
        setShowComposer(true);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  });

  if (!showComposer) return null;

  return (
    <>
      <ActiveSelection />
      <Composer autoFocus className={styles.composer} />
    </>
  );
}
