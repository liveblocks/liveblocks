"use client";

import styles from "./Pinned.module.css";
import {
  PointerEvent,
  PointerEventHandler,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { ThreadData } from "@liveblocks/client";
import { Thread, Comment, Icon } from "@liveblocks/react-ui";
import { useNearEdge } from "@/lib/useNearEdge";
import { Tooltip as TooltipPrimitive } from "radix-ui";

type Props = {
  user: Liveblocks["UserMeta"]["info"];
  thread: ThreadData;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
  onFocus: () => void;
};

export function PinnedThread({
  user,
  thread,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onFocus,
  ...props
}: Props) {
  // Open pinned threads that have just been created
  const startMinimized = useMemo(() => {
    return Number(new Date()) - Number(new Date(thread.createdAt)) > 100;
  }, [thread]);

  const [minimized, setMinimized] = useState(startMinimized);
  const dragStart = useRef({ x: 0, y: 0 });

  // Flip pinnedContent away from edge of screen
  const ref = useRef(null);
  const { nearRightEdge, nearBottomEdge } = useNearEdge(ref);

  // Record starting click position
  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      dragStart.current = { x: e.clientX, y: e.clientY };
      onPointerDown(e);
    },
    [onPointerDown]
  );

  // If cursor moved, toggle minimized
  const handlePointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      onPointerUp(e);
      if (
        e.clientX === dragStart.current.x &&
        e.clientY === dragStart.current.y
      ) {
        setMinimized((min) => !min);
      }
    },
    [onPointerUp]
  );

  // If cursor moved, toggle minimized
  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      onPointerMove(e);
    },
    [onPointerMove]
  );

  return (
    <div ref={ref} className={styles.pinned} {...props} onClick={onFocus}>
      <div
        className={styles.avatarPin}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        data-draggable={true}
      >
        <img
          src={user.avatar}
          alt={user.name}
          width="28px"
          height="28px"
          draggable={false}
        />
      </div>
      {!minimized ? (
        <TooltipPrimitive.TooltipProvider>
          <div
            className={styles.pinnedContent}
            data-flip-vertical={nearBottomEdge || undefined}
            data-flip-horizontal={nearRightEdge || undefined}
          >
            <Thread
              thread={thread}
              indentCommentContent={false}
              onFocus={onFocus}
              components={{
                Comment: ({ comment, ...props }) => {
                  return (
                    <Comment
                      {...props}
                      comment={comment}
                      author={
                        <span className={styles.commentAuthor}>
                          <Comment.Author userId={comment.userId} />
                          {comment.metadata.userAgent ? (
                            <TooltipPrimitive.Root>
                              <TooltipPrimitive.Trigger
                                className={styles.userAgentTooltipTrigger}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <circle cx="12" cy="12" r="10" />
                                  <path d="M12 16v-4" />
                                  <path d="M12 8h.01" />
                                </svg>
                              </TooltipPrimitive.Trigger>
                              <TooltipPrimitive.Portal>
                                <TooltipPrimitive.Content
                                  sideOffset={8}
                                  className={styles.userAgentTooltipContent}
                                >
                                  {comment.metadata.userAgent}
                                </TooltipPrimitive.Content>
                              </TooltipPrimitive.Portal>
                            </TooltipPrimitive.Root>
                          ) : null}
                        </span>
                      }
                    />
                  );
                },
              }}
            />
          </div>
        </TooltipPrimitive.TooltipProvider>
      ) : null}
    </div>
  );
}
