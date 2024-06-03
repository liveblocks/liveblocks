"use client";

import { Room } from "@/app/Room";
import styles from "@/components/Page.module.css";
import CollaborativeEditor from "@/components/Editor";
import { LiveblocksProvider } from "@/liveblocks.config";
import { ClientSideSuspense } from "@liveblocks/react";
import { Loading } from "@/components/Loading";
import Notifications from "./notifications";

// Learn how to structure your collaborative Next.js app
// https://liveblocks.io/docs/guides/how-to-use-liveblocks-with-nextjs-app-directory

export default function Page() {
  return (
    <main>
      <div className={styles.container}>
        {/* Notifications */}
        <div className={styles.notificationsContainer}>
          <LiveblocksProvider>
            <ClientSideSuspense fallback={<Loading />}>
              {() => <Notifications />}
            </ClientSideSuspense>
          </LiveblocksProvider>
        </div>

        {/* Editor */}
        <div className={styles.editorContainer}>
          <Room>
            <CollaborativeEditor />
          </Room>
        </div>

        {/* Notifications */}
        <div className={styles.notificationsContainer}>
          <LiveblocksProvider>
            <ClientSideSuspense fallback={<Loading />}>
              {() => <Notifications />}
            </ClientSideSuspense>
          </LiveblocksProvider>
        </div>
      </div>
    </main>
  );
}
