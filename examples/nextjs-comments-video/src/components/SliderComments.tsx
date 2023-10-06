import { ThreadMetadata, useThreads, useUser } from "@/liveblocks.config";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";
import styles from "./SliderComments.module.css";
import { Avatar } from "@/components/Avatars";
import { ThreadData } from "@liveblocks/core";

export function SliderComments() {
  return (
    <ErrorBoundary fallback={<div>error</div>}>
      <ClientSideSuspense fallback={null}>
        {() => <PinnedThreads />}
      </ClientSideSuspense>
    </ErrorBoundary>
  );
}

function PinnedThreads() {
  const { threads } = useThreads();

  return (
    <div className={styles.pinnedThreads}>
      {threads.map((thread) => (
        <PinnedThread thread={thread} />
      ))}
    </div>
  );
}

function PinnedThread({ thread }: { thread: ThreadData<ThreadMetadata> }) {
  // TODO check types correct when all comments deleted from thread
  const { user } = useUser(thread.comments?.[0].userId || "");

  // All comments deleted
  if (!thread.comments.length) {
    return null;
  }

  return (
    <div
      key={thread.id}
      className={styles.pinnedThread}
      style={{ left: `${thread.metadata.timePercentage}%` }}
    >
      <div className={styles.avatarPin}>
        <img src={user.avatar} alt={user.name} />
      </div>
    </div>
  );
}
