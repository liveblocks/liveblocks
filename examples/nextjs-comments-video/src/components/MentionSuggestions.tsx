"use client";

import {
  Composer,
  ComposerEditorMentionSuggestionsProps,
} from "@liveblocks/react-comments/primitives";
import { useUser } from "@/liveblocks.config";
import styles from "./MentionSuggestions.module.css";

export function MentionSuggestions({
  userIds,
}: ComposerEditorMentionSuggestionsProps) {
  return (
    <Composer.Suggestions className={styles.suggestions}>
      <Composer.SuggestionsList>
        {userIds.map((userId) => (
          <MentionSuggestion key={userId} userId={userId} />
        ))}
      </Composer.SuggestionsList>
    </Composer.Suggestions>
  );
}

function MentionSuggestion({ userId }: { userId: string }) {
  const { user } = useUser(userId);

  return (
    <Composer.SuggestionsListItem
      value={userId}
      className={styles.mentionSuggestion}
    >
      <img src={user.avatar} width={20} height="20" alt={user.name} />
      {user.name}
    </Composer.SuggestionsListItem>
  );
}
