import type { BaseMetadata, CommentData, ThreadData } from "@liveblocks/core";

export function upsertComment<TThreadMetadata extends BaseMetadata>(
  threads: Record<string, ThreadData<TThreadMetadata>>,
  newComment: CommentData
): Record<string, ThreadData<TThreadMetadata>> {
  const thread = threads[newComment.threadId];

  if (thread === undefined) {
    return threads;
  }

  const newComments: CommentData[] = [];
  let updated = false;

  for (const comment of thread.comments) {
    if (comment.id === newComment.id) {
      updated = true;
      newComments.push(newComment);
    } else {
      newComments.push(comment);
    }
  }

  if (!updated) {
    newComments.push(newComment);
  }

  return {
    ...threads,
    [thread.id]: {
      ...thread,
      comments: newComments,
    },
  };
}
