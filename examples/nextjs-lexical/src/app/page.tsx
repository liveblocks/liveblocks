"use client";

import { Room } from "@/app/Room";
import styles from "@/components/Page.module.css";
import CollaborativeEditor from "@/components/Editor";
import { client } from "@/liveblocks.config";
import {
  ClientSideSuspense,
  LiveblocksProvider,
} from "@liveblocks/react/suspense";
import { Loading } from "@/components/Loading";
import Notifications from "./notifications";

// Learn how to structure your collaborative Next.js app
// https://liveblocks.io/docs/guides/how-to-use-liveblocks-with-nextjs-app-directory

export default function Page() {
  return (
    <LiveblocksProvider client={client}>
      <ClientSideSuspense fallback={<Loading />}>
        {() => (
          <main>
            <div className={styles.container}>
              <div className={styles.notificationsContainer}>
                <Notifications />
              </div>

              <div className={styles.editorContainer}>
                <Room>
                  <CollaborativeEditor />
                </Room>
              </div>
            </div>
          </main>
        )}
      </ClientSideSuspense>
    </LiveblocksProvider>
  );
}
