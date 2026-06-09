"use client";

import { useMemo } from "react";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import { useRoom, useSelf } from "@liveblocks/react/suspense";
import { SuperDocEditor } from "@superdoc-dev/react";
import { AvatarStack } from "@liveblocks/react-ui";
import styles from "./CollaborativeEditor.module.css";
import "@superdoc-dev/react/style.css";
import "@liveblocks/react-ui/styles.css";

// Collaborative DOCX editor with live cursors and live avatars, powered by SuperDoc
export function CollaborativeEditor() {
  /// Set up Yjs
  const room = useRoom();
  const provider = getYjsProviderForRoom(room);

  // Get user info
  const userInfo = useSelf((me) => me.info);
  const userId = useSelf((me) => me.id);

  // Set up SuperDoc
  const modules = useMemo(
    () => ({
      collaboration: { ydoc: provider.getYDoc(), provider: provider as any },
    }),
    [provider]
  );

  return (
    <div className={styles.container}>
      <div className={styles.editorHeader}>
        <AvatarStack size={32} />
      </div>
      <div className={styles.editorContainer}>
        <SuperDocEditor
          documentMode="editing"
          // Place the current user's info into Yjs awareness for live cursors
          user={{
            email: userId,
            name: userInfo?.name ?? "Anonymous",
            image: userInfo?.avatar ?? undefined,
          }}
          modules={modules}
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
}
