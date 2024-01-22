"use client";

import { ThreadMetadata, useThreads, useUser } from "@/liveblocks.config";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";
import styles from "./ThreadsTimeline.module.css";
import { ThreadData } from "@liveblocks/core";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Comment } from "@liveblocks/react-comments/primitives";
import { formatTime } from "@/components/Duration";
import { Mention } from "@/components/Mention";
import { Link } from "@/components/Link";
import { useState } from "react";

export function ThreadsTimeline() {
  return (
    // @ts-ignore
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
  const { user } = useUser(thread.comments?.[0].userId || "");
  const [highlightedPin, setHighlightedPin] = useState(false);

  // All comments deleted
  if (!thread.comments.length) {
    return null;
  }

  return (
    <div
      className={styles.pinnedThread}
      style={{ left: `${thread.metadata.timePercentage}%` }}
      data-highlight={highlightedPin || undefined}
    >
      <Tooltip.Root>
        <Tooltip.Trigger>
          <div className={styles.avatarPin}>
            <img src={user.avatar} alt={user.name} />
          </div>
        </Tooltip.Trigger>
        <Tooltip.Content className={styles.tooltip}>
          <div className={styles.tooltipHeader}>
            <img src={user.avatar} alt="" />
            {user.name}
          </div>
          <div className={styles.tooltipBody}>
            <span>{formatTime(thread.metadata.time) + " "}</span>
            <Comment.Body
              body={thread.comments[0].body}
              components={{
                Mention: (props) => (
                  <Comment.Mention asChild>
                    <Mention {...props} />
                  </Comment.Mention>
                ),
                Link: (props) => (
                  <Comment.Link asChild>
                    <Link {...props}>{props.children}</Link>
                  </Comment.Link>
                ),
              }}
            />
          </div>
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  );
}
