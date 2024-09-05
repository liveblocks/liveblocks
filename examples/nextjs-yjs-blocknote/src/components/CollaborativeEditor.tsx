"use client";

import { BlockNoteEditor } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import * as Y from "yjs";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { useRoom, useSelf } from "@liveblocks/react/suspense";
import { useEffect, useState } from "react";
import { Toolbar } from "./Toolbar";
import styles from "./CollaborativeEditor.module.css";
import { Avatars } from "@/components/Avatars";

// Collaborative text editor with simple rich text, live cursors, and live avatars
export function CollaborativeEditor() {
  const room = useRoom();
  const [doc, setDoc] = useState<Y.Doc>();
  const [provider, setProvider] = useState<any>();

  // Set up Liveblocks Yjs provider
  useEffect(() => {
    const yDoc = new Y.Doc();
    const yProvider = new LiveblocksYjsProvider(room, yDoc);
    setDoc(yDoc);
    setProvider(yProvider);

    return () => {
      yDoc?.destroy();
      yProvider?.destroy();
    };
  }, [room]);

  if (!doc || !provider) {
    return null;
  }

  return <BlockNote doc={doc} provider={provider} />;
}

type EditorProps = {
  doc: Y.Doc;
  provider: any;
};

function BlockNote({ doc, provider }: EditorProps) {
  // Get user info from Liveblocks authentication endpoint
  const userInfo = useSelf((me) => me.info);

  const editor: BlockNoteEditor = useCreateBlockNote({
    collaboration: {
      provider,

      // Where to store BlockNote data in the Y.Doc:
      fragment: doc.getXmlFragment("document-store"),

      // Information for this user:
      user: {
        name: userInfo.name,
        color: userInfo.color,
      },
    },
  });

  // Set default state if you wish
  // useEffect(() => {
  //   function setDefault() {
  //     if (!editor) {
  //       return;
  //     }
  //
  //     if (editor.document.length === 1) {
  //       editor.insertBlocks(
  //         [{ type: "paragraph", content: "Hello world" }],
  //         editor.document[0]
  //       );
  //     }
  //   }
  //
  //   if (provider.isReady) {
  //     setDefault();
  //   }
  //
  //   provider.on("sync", setDefault);
  //   return () => provider.off("sync", setDefault);
  // }, [provider, editor]);

  return (
    <div className={styles.container}>
      <div className={styles.editorHeader}>
        <Toolbar editor={editor} />
        <Avatars />
      </div>
      {/* In the code below, we disabled BlockNote's built-in menus and toolbars to get a plain editor. */}
      {/* Simply use <BlockNoteView editor={editor} className={styles.editorContainer} /> if you want a full-fledged editor experience. */}
      <BlockNoteView
        editor={editor}
        className={styles.editorContainer}
        theme="light"
        formattingToolbar={false}
        linkToolbar={false}
        sideMenu={false}
        slashMenu={false}
        filePanel={false}
        tableHandles={false}
      />
    </div>
  );
}
