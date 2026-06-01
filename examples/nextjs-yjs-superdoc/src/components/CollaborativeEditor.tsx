"use client";

import { useEffect, useRef } from "react";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import { useRoom, useSelf } from "@liveblocks/react/suspense";
import styles from "./CollaborativeEditor.module.css";
import "superdoc/style.css";
import "@liveblocks/react-ui/styles.css";
import { AvatarStack } from "@liveblocks/react-ui";

// Collaborative DOCX editor with live cursors and live avatars, powered by SuperDoc
export function CollaborativeEditor() {
  const room = useRoom();
  // Set up the Liveblocks Yjs provider
  const provider = getYjsProviderForRoom(room);
  // Get user info from the Liveblocks authentication endpoint
  const userInfo = useSelf((me) => me.info);
  const userId = useSelf((me) => me.id);

  const superdocRef = useRef<{ destroy?: () => void } | null>(null);

  useEffect(() => {
    const yDoc = provider.getYDoc();
    let cancelled = false;

    async function initSuperDoc() {
      // SuperDoc relies on browser APIs, so it's imported on the client only
      const { SuperDoc } = await import("superdoc");

      if (cancelled) {
        return;
      }

      superdocRef.current = new SuperDoc({
        selector: "#superdoc",
        toolbar: "#superdoc-toolbar",
        documentMode: "editing",
        // Place the current user's info into Yjs awareness for live cursors
        user: {
          name: userInfo.name,
          email: userId,
        },
        modules: {
          // The collaboration contract is the same for every Yjs provider:
          // pass the shared `ydoc` and `provider`
          collaboration: {
            ydoc: yDoc,
            provider: provider as any,
          },
        },
      });
    }

    // Wait for the initial sync so the document isn't created twice
    if ((provider as any).synced) {
      initSuperDoc();
    } else {
      const handleSync = (synced: boolean) => {
        if (synced) {
          provider.off("sync", handleSync);
          initSuperDoc();
        }
      };
      provider.on("sync", handleSync);
    }

    return () => {
      cancelled = true;
      superdocRef.current?.destroy?.();
      superdocRef.current = null;
    };
  }, [provider, userInfo, userId]);

  return (
    <div className={styles.container}>
      <div className={styles.editorHeader}>
        <div id="superdoc-toolbar" className={styles.toolbar} />
        <AvatarStack size={32} />
      </div>
      <div className={styles.editorContainer}>
        <div id="superdoc" className={styles.editor} />
      </div>
    </div>
  );
}
