"use client";

import styles from "./Pinned.module.css";
import { PointerEventHandler, useRef } from "react";

import { Composer, ComposerProps } from "@liveblocks/react-ui";
import { useNearEdge } from "@/lib/useNearEdge";

type Props = {
  user: Liveblocks["UserMeta"]["info"];
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
  onComposerSubmit: ComposerProps["onComposerSubmit"];
};

export function PinnedComposer({
  user,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onComposerSubmit,
  ...props
}: Props) {
  // Flip pinnedContent away from edge of screen
  const ref = useRef(null);
  const { nearRightEdge, nearBottomEdge } = useNearEdge(ref);

  return (
    <div ref={ref} className={styles.pinned} {...props}>
      <div
        className={styles.avatarPin}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
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
      <div
        className={styles.pinnedContent}
        data-flip-vertical={nearBottomEdge || undefined}
        data-flip-horizontal={nearRightEdge || undefined}
      >
        <Composer
          onComposerSubmit={onComposerSubmit}
          onClick={(e) => {
            // Don't send up a click event from emoji popout and close the composer
            e.stopPropagation();
          }}
          autoFocus={true}
        />
      </div>
    </div>
  );
}
