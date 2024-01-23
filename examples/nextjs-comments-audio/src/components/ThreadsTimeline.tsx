"use client";

import { Link } from "@/components/Link";
import { Mention } from "@/components/Mention";
import { ThreadMetadata, useThreads, useUser } from "@/liveblocks.config";
import { useSkipTo } from "@/utils";
import { ThreadData } from "@liveblocks/core";
import { ClientSideSuspense } from "@liveblocks/react";
import { Comment } from "@liveblocks/react-comments/primitives";
import { CSSProperties, useCallback, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

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
    <div className="w-full">
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
    <button
      type="button"
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className="absolute inset-y-0 -translate-x-1/2 origin-[center_bottom]"
      style={{ left: `${thread.metadata.timePercentage}%` }}
      data-highlight={highlighted || undefined}
    >
      <img className="select-none size-6" src={user.avatar} alt={user.name} />
      {highlighted ? (
        <div
          className="absolute top-full mt-1 select-none whitespace-nowrap text-xs flex justify-center items-center gap-1.5 max-w-96 overflow-hidden text-ellipsis"
          style={tooltipStyles}
        >
          <div className="font-medium">{user.name}</div>
          <Comment.Body
            className="flex-1 overflow-hidden text-ellipsis [&>div]:inline-block text-secondary"
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
    </button>
  );
}
