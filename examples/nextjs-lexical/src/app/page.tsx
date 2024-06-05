"use client";

import { Room } from "@/app/Room";
import styles from "@/components/Page.module.css";
import CollaborativeEditor from "@/components/Editor";
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
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      resolveUsers={async ({ userIds }) => {
        const searchParams = new URLSearchParams(
          userIds.map((userId) => ["userIds", userId])
        );
        const response = await fetch(`/api/users?${searchParams}`);

        if (!response.ok) {
          throw new Error("Problem resolving users");
        }

        const users = await response.json();
        return users;
      }}
      resolveMentionSuggestions={async ({ text }) => {
        const response = await fetch(
          `/api/users/search?text=${encodeURIComponent(text)}`
        );

        if (!response.ok) {
          throw new Error("Problem resolving mention suggestions");
        }

        const userIds = await response.json();
        return userIds;
      }}
    >
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
