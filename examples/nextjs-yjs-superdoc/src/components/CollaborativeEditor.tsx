"use client";

import { useMemo } from "react";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import { useRoom, useSelf } from "@liveblocks/react/suspense";
import { SuperDocEditor } from "@superdoc-dev/react";
import { Avatars } from "@/components/Avatars";
import styles from "./CollaborativeEditor.module.css";
import "@superdoc-dev/react/style.css";

// Collaborative DOCX editor with live cursors and live avatars, powered by SuperDoc
export function CollaborativeEditor() {
  const room = useRoom();
  // Set up the Liveblocks Yjs provider
  const provider = getYjsProviderForRoom(room);
  // Get user info from the Liveblocks authentication endpoint
  const userInfo = useSelf((me) => me.info);
  const userId = useSelf((me) => me.id);

  // The `<SuperDocEditor />` rebuilds when `modules` changes, so keep it stable
  const modules = useMemo(
    () => ({
      // The collaboration contract is the same for every Yjs provider:
      // pass the shared `ydoc` and `provider`
      collaboration: { ydoc: provider.getYDoc(), provider: provider as any },
    }),
    [provider]
  );

  return (
    <div className={styles.container}>
      <div className={styles.editorHeader}>
        <Avatars />
      </div>
      <div className={styles.editorContainer}>
        <SuperDocEditor
          documentMode="editing"
          // Place the current user's info into Yjs awareness for live cursors
          user={{ name: userInfo.name, email: userId }}
          modules={modules}
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
}
