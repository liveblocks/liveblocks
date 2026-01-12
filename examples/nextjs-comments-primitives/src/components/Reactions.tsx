import { CommentData } from "@liveblocks/client";
import {
  useAddReaction,
  useRemoveReaction,
  useSelf,
} from "@liveblocks/react/suspense";
import { Icon } from "@liveblocks/react-ui";
import { AddReaction } from "./AddReaction";

export function Reactions({ comment }: { comment: CommentData }) {
  const userId = useSelf().id;
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();

  return (
    <>
      {comment.reactions.map((reaction) => {
        const hasPicked = reaction.users.some((u) => u.id === userId);
        const reactionObject = {
          threadId: comment.threadId,
          commentId: comment.id,
          emoji: reaction.emoji,
        };

        return (
          <button
            key={reaction.emoji}
            className="flex h-8 items-center gap-1.5 rounded-full border border-gray-200 py-0.5 pl-1.5 pr-2 text-gray-400 hover:bg-gray-100 data-picked:border-blue-200 data-picked:bg-blue-100 data-picked:text-blue-600"
            data-picked={hasPicked || undefined}
            onClick={() =>
              hasPicked
                ? removeReaction(reactionObject)
                : addReaction(reactionObject)
            }
          >
            {reaction.emoji}{" "}
            <span className="text-xs tabular-nums">
              {reaction.users.length}
            </span>
          </button>
        );
      })}
      <AddReaction comment={comment}>
        <button className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-100">
          <Icon.Emoji />
        </button>
      </AddReaction>
    </>
  );
}
