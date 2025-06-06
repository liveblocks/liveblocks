"use client";

import {
  Composer,
  ComposerEditorMentionSuggestionsProps,
} from "@liveblocks/react-ui/primitives";
import styles from "./MentionSuggestions.module.css";
import { Avatar } from "./Avatar";
import { Suspense } from "react";
import { User } from "./User";

export function MentionSuggestions({
  mentions,
}: ComposerEditorMentionSuggestionsProps) {
  return (
    <Composer.Suggestions className={styles.suggestions}>
      <Composer.SuggestionsList>
        {mentions.map((mention) => (
          <MentionSuggestion key={mention.id} userId={mention.id} />
        ))}
      </Composer.SuggestionsList>
    </Composer.Suggestions>
  );
}

function MentionSuggestion({ userId }: { userId: string }) {
  return (
    <Composer.SuggestionsListItem
      value={userId}
      className={styles.mentionSuggestion}
    >
      <Suspense>
        <Avatar userId={userId} width={20} height={20} />
        <User userId={userId} />
      </Suspense>
    </Composer.SuggestionsListItem>
  );
}
