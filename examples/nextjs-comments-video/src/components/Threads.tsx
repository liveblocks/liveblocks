"use client";

import {
  useThreads,
  useSelf,
  useEditCommentMetadata,
} from "@liveblocks/react/suspense";
import { ClientSideSuspense } from "@liveblocks/react";
import { Thread, Comment } from "@liveblocks/react-ui";
import { FormEvent, useCallback, useRef, useState } from "react";
import styles from "./Threads.module.css";
import {
  resetAllHighlights,
  useHighlightPin,
  useHighlightThreadListener,
  useSkipTo,
} from "@/utils";
import { ThreadData } from "@liveblocks/core";
import { formatTime } from "@/components/Duration";
import { TimeIcon } from "@/icons/Time";
import { EyeIcon } from "@/icons/Eye";

export function Threads() {
  return (
    <ClientSideSuspense fallback={null}>
      <ThreadList />
    </ClientSideSuspense>
  );
}

function ThreadList() {
  const { id: currentUserId } = useSelf();
  const { threads } = useThreads();

  if (threads.length === 0) {
    return <div className={styles.emptyState}>No comments yet!</div>;
  }

  return (
    <>
      {threads.sort(sortThreads).map((thread) => (
        <CustomThread
          key={thread.id}
          thread={thread}
          currentUserId={currentUserId}
        />
      ))}
    </>
  );
}

function CustomThread({
  thread,
  currentUserId,
}: {
  thread: ThreadData;
  currentUserId: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const threadHasTime = thread.metadata.timePercentage !== -1;
  const skipTo = useSkipTo();
  const highlightPin = useHighlightPin(thread.id);
  const editCommentMetadata = useEditCommentMetadata();

  const [highlightedThread, setHighlightedThread] = useState(false);

  // Send highlight event to thread timeline
  useHighlightThreadListener((threadId) => {
    if (thread.id !== threadId) {
      setHighlightedThread(false);
      return;
    }

    ref.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "nearest",
    });
    setHighlightedThread(false);
    setTimeout(() => setHighlightedThread(true));
  });

  // Skip to metadata time
  const handleButtonClick = useCallback(() => {
    if (!thread.metadata.timePercentage) {
      return;
    }

    skipTo(thread.metadata.timePercentage);
  }, [skipTo]);

  // Stop keyboard events firing on window when typing (i.e. prevent fullscreen with `f`)
  const handleKeyDown = useCallback((event: FormEvent<HTMLDivElement>) => {
    event.stopPropagation();
  }, []);

  return (
    <div
      ref={ref}
      className={styles.threadWrapper}
      onPointerEnter={highlightPin}
      onPointerLeave={resetAllHighlights}
      data-highlight={highlightedThread || undefined}
    >
      {threadHasTime ? (
        <button className={styles.threadTime} onClick={handleButtonClick}>
          <TimeIcon />
          {formatTime(thread.metadata.time)}
        </button>
      ) : null}
      <Thread
        className={styles.thread}
        thread={thread}
        indentCommentContent={true}
        onKeyDown={handleKeyDown}
        components={{
          Comment: ({ comment, ...props }) => {
            return (
              <Comment
                {...props}
                comment={comment}
                dropdownItems={({ children }) => {
                  // Add "Mark as spoiler" action for users' own comments
                  if (comment.userId === currentUserId) {
                    return (
                      <>
                        {children}
                        <Comment.DropdownItem
                          icon={<EyeIcon />}
                          onSelect={() => {
                            editCommentMetadata({
                              threadId: thread.id,
                              commentId: comment.id,
                              metadata: {
                                spoiler: !comment.metadata.spoiler,
                              },
                            });
                          }}
                        >
                          {comment.metadata.spoiler
                            ? "Unmark comment as spoiler"
                            : "Mark comment as spoiler"}
                        </Comment.DropdownItem>
                      </>
                    );
                  }

                  // For other comments, only show the default dropdown items
                  return children;
                }}
              >
                {({ children }) => {
                  return (
                    // Use a custom wrapper to blur spoilers
                    <div
                      className={styles.commentContentWrapper}
                      data-spoiler={comment.metadata.spoiler}
                    >
                      {children}
                    </div>
                  );
                }}
              </Comment>
            );
          },
        }}
      />
    </div>
  );
}

function sortThreads(a: ThreadData, b: ThreadData) {
  if (a.metadata.timePercentage > b.metadata.timePercentage) {
    return 1;
  }

  if (a.metadata.timePercentage < b.metadata.timePercentage) {
    return -1;
  }

  return 0;
}
