"use client";

import {
  CommentBodyMentionProps,
  ComposerEditorMentionProps,
} from "@liveblocks/react-comments/primitives";
import styles from "./Mention.module.css";
import { Suspense } from "react";
import { User } from "./User";

export function Mention({
  userId,
}: ComposerEditorMentionProps | CommentBodyMentionProps) {
  return (
    <span className={styles.mention}>
      @
      <Suspense>
        <User userId={userId} />
      </Suspense>
    </span>
  );
}
