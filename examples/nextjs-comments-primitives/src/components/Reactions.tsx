import { CommentData } from "@liveblocks/client";
import {
  useAddReaction,
  useRemoveReaction,
  useSelf,
} from "@liveblocks/react/suspense";

export function Reactions({ comment }: { comment: CommentData }) {
  const userId = useSelf().id;
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();

  return comment.reactions.map((reaction) => {
    const hasPicked = reaction.users.some((u) => u.id === userId);
    const reactionObject = {
      threadId: comment.threadId,
      commentId: comment.id,
      emoji: reaction.emoji,
    };

    return (
      <button
        key={reaction.emoji}
        className="flex items-center gap-1.5 rounded-full border border-gray-200 px-1.5 py-0.5 text-gray-400 hover:bg-gray-100 data-[picked]:border-blue-200 data-[picked]:bg-blue-100 data-[picked]:text-blue-600"
        data-picked={hasPicked || undefined}
        onClick={() =>
          hasPicked
            ? removeReaction(reactionObject)
            : addReaction(reactionObject)
        }
      >
        {reaction.emoji}{" "}
        <span className="text-xs tabular-nums">{reaction.users.length}</span>
      </button>
    );
  });
}
