"use client";

import { Link } from "@/components/Link";
import { Mention } from "@/components/Mention";
import { useThreads, useUser } from "@liveblocks/react/suspense";
import { useSkipTo } from "@/utils";
import { ThreadData } from "@liveblocks/core";
import { ClientSideSuspense } from "@liveblocks/react";
import { Comment } from "@liveblocks/react-ui/primitives";
import { CSSProperties, useCallback, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

export function ThreadsTimeline() {
  return (
    // @ts-ignore
    <ErrorBoundary fallback={<div>error</div>}>
      <ClientSideSuspense fallback={null}>
        <PinnedThreads />
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

function PinnedThread({ thread }: { thread: ThreadData }) {
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
      className="absolute inset-y-0 -translate-x-1/2 origin-[center_bottom] pointer-events-auto"
      style={{ left: `${thread.metadata.timePercentage}%` }}
      data-highlight={highlighted || undefined}
    >
      <img
        className="select-none size-6 rounded-sm shadow-md"
        src={user.avatar}
        alt={user.name}
      />
      {highlighted ? (
        <div
          className="absolute top-full mt-1.5 select-none whitespace-nowrap flex justify-center items-start gap-1 max-w-96 overflow-hidden"
          style={tooltipStyles}
        >
          <div className="font-medium text-xs">{user.name}</div>
          <Comment.Body
            className="flex-1 overflow-hidden text-ellipsis [&>div]:inline-block text-neutral-600 text-left text-xs line-clamp-1"
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
