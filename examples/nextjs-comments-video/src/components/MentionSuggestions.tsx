import {
  Composer,
  ComposerEditorMentionSuggestionsProps,
} from "@liveblocks/react-comments/primitives";
import { useUser } from "@/liveblocks.config";

// TODO add styles
export function MentionSuggestions({
  userIds,
  selectedUserId,
}: ComposerEditorMentionSuggestionsProps) {
  return (
    <Composer.Suggestions>
      <Composer.SuggestionsList>
        {userIds.map((userId) => (
          <MentionSuggestion
            key={userId}
            userId={userId}
            selected={userId === selectedUserId}
          />
        ))}
      </Composer.SuggestionsList>
    </Composer.Suggestions>
  );
}

function MentionSuggestion({
  userId,
  selected,
}: {
  userId: string;
  selected: boolean;
}) {
  const { user } = useUser(userId);

  return (
    <Composer.SuggestionsListItem value={userId} data-selected={selected}>
      <img src={user.avatar} height="20" alt="" />
      {user.name}
    </Composer.SuggestionsListItem>
  );
}
