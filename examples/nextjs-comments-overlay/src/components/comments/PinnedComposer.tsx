"use client";

import styles from "./Pinned.module.css";
import { PointerEventHandler } from "react";
import { UserMeta } from "@/liveblocks.config";
import { Composer, ComposerProps } from "@liveblocks/react-comments";

type Props = {
  user: UserMeta["info"];
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
  return (
    <div className={styles.pinned} {...props}>
      <div
        className={styles.avatarPin}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <img src={user.avatar} alt={user.name} width="28px" height="28px" />
      </div>
      <div className={styles.pinnedContent}>
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
