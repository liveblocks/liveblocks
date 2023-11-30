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
import { ThreadMetadata, UserMeta } from "@/liveblocks.config";
import { Thread } from "@liveblocks/react-comments";

type Props = {
  user: UserMeta["info"];
  thread: ThreadData<ThreadMetadata>;
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

  return (
    <div className={styles.pinned} {...props} onClick={onFocus}>
      <div
        className={styles.avatarPin}
        onPointerDown={handlePointerDown}
        onPointerMove={onPointerMove}
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
        <div className={styles.pinnedContent}>
          <Thread
            thread={thread}
            indentCommentContent={false}
            onFocus={onFocus}
          />
        </div>
      ) : null}
    </div>
  );
}
