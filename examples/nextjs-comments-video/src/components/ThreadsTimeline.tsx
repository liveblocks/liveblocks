import { ThreadMetadata, useThreads, useUser } from "@/liveblocks.config";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";
import styles from "./ThreadsTimeline.module.css";
import { ThreadData } from "@liveblocks/core";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Comment } from "@liveblocks/react-comments/primitives";
import { useHighlightThread } from "@/utils";

export function ThreadsTimeline() {
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
        <PinnedThread key={thread.id} thread={thread} />
      ))}
    </div>
  );
}

function PinnedThread({ thread }: { thread: ThreadData<ThreadMetadata> }) {
  // TODO check types correct when all comments deleted from thread
  const { user } = useUser(thread.comments?.[0].userId || "");
  const highlightThread = useHighlightThread(thread.id);

  // All comments deleted
  if (!thread.comments.length) {
    return null;
  }

  return (
    <div
      className={styles.pinnedThread}
      onClick={highlightThread}
      onMouseOver={highlightThread}
      style={{ left: `${thread.metadata.timePercentage}%` }}
    >
      <Tooltip.Root>
        <Tooltip.Trigger>
          <div className={styles.avatarPin}>
            <img src={user.avatar} alt={user.name} />
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content className={styles.tooltip}>
          <div className={styles.tooltipName}>{user.name}</div>
          <Comment.Body
            body={thread.comments[0].body}
            className={styles.tooltipBody}
          />
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  );
}
