"use client";

import { BlockNoteEditor } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import {
  useLiveblocksExtension,
  FloatingComposer,
} from "@liveblocks/react-tiptap";
import { useSelf } from "@liveblocks/react/suspense";
import { useCallback, useState } from "react";
import { Avatars } from "@/components/Avatars";
import styles from "./CollaborativeEditor.module.css";
import { MoonIcon, SunIcon } from "@/icons";
import { Button } from "@/primitives/Button";

// Collaborative text editor with simple rich text, live cursors, and live avatars
export function CollaborativeEditor() {
  const liveblocks = useLiveblocksExtension();

  // Get user info from Liveblocks authentication endpoint
  // const userInfo = useSelf((me) => me.info);

  const editor: BlockNoteEditor = useCreateBlockNote({
    _tiptapOptions: {
      extensions: [liveblocks],
    },
    // collaboration: {
    //   provider,
    //
    //   // Where to store BlockNote data in the Y.Doc:
    //   fragment: doc.getXmlFragment("document-store"),
    //
    //   // Information for this user:
    //   user: {
    //     name: userInfo.name,
    //     color: userInfo.color,
    //   },
    // },
  });

  const [theme, setTheme] = useState<"light" | "dark">("light");

  const changeTheme = useCallback(() => {
    const newTheme = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", newTheme);
    setTheme(newTheme);
  }, [theme]);

  return (
    <div className={styles.container}>
      <div className={styles.editorHeader}>
        <Button
          className={styles.button}
          variant="subtle"
          onClick={changeTheme}
          aria-label="Switch Theme"
        >
          {theme === "dark" ? (
            <SunIcon style={{ width: "18px" }} />
          ) : (
            <MoonIcon style={{ width: "18px" }} />
          )}
        </Button>

        <Button
          className={styles.button}
          variant="subtle"
          onClick={() => {
            if (!editor._tiptapEditor) {
              return;
            }

            editor._tiptapEditor.chain().focus().addPendingComment().run();
          }}
          aria-label="Add comment"
        >
          Comment
        </Button>

        <Avatars />
      </div>
      <div className={styles.editorPanel}>
        <BlockNoteView
          editor={editor}
          className={styles.editorContainer}
          theme={theme}
        >
          <FloatingComposer editor={editor._tiptapEditor as any} />
        </BlockNoteView>
      </div>
    </div>
  );
}
