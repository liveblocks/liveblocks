"use client";

import { ThreadMetadata, useThreads, useUser } from "@/liveblocks.config";
import { ClientSideSuspense } from "@liveblocks/react";
import { ErrorBoundary } from "react-error-boundary";
import styles from "./ThreadsTimeline.module.css";
import { ThreadData } from "@liveblocks/core";
import { Comment } from "@liveblocks/react-comments/primitives";
import { Mention } from "@/components/Mention";
import { Link } from "@/components/Link";
import { CSSProperties, useCallback, useState } from "react";
import { useSkipTo } from "@/utils";

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
  const skipTo = useSkipTo();
  const { user } = useUser(thread.comments?.[0].userId || "");
  const [highlighted, setHighlighted] = useState(false);

  const handlePointerEnter = useCallback(() => {
    setHighlighted(true);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setHighlighted(false);
  }, []);

  const handleClick = useCallback(() => {
    skipTo(thread.metadata.time);
  }, [thread]);

  // All comments deleted
  if (!thread.comments.length) {
    return null;
  }

  const tooltipStyles: CSSProperties =
    thread.metadata.timePercentage > 50
      ? {
          right: 0,
          flexDirection: "row-reverse",
          justifyContent: "flex-start",
        }
      : {
          left: 0,
          flexDirection: "row",
          justifyContent: "flex-end",
        };

  return (
    <div
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={styles.pinnedThread}
      style={{ left: `${thread.metadata.timePercentage}%` }}
      data-highlight={highlighted || undefined}
    >
      <div className={styles.avatarPin}>
        <img src={user.avatar} alt={user.name} />
      </div>
      {highlighted ? (
        <div className={styles.tooltip} style={tooltipStyles}>
          <div className={styles.tooltipHeader}>{user.name}</div>
          <Comment.Body
            className={styles.tooltipBody}
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
      ) : null}
    </div>
  );
}
