"use client";

import {
  CommentBodyMentionProps,
  ComposerEditorMentionProps,
} from "@liveblocks/react-ui/primitives";
import { Suspense } from "react";
import { User } from "./User";

export function Mention({
  mention,
}: ComposerEditorMentionProps | CommentBodyMentionProps) {
  return (
    <span className="font-medium text-accent">
      @
      <Suspense fallback="…">
        <User userId={mention.id} />
      </Suspense>
    </span>
  );
}
