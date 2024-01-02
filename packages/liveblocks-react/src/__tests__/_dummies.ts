import type {
  BaseMetadata,
  CommentDataPlain,
  ThreadDataPlain,
} from "@liveblocks/core";
import { createCommentId, createThreadId } from "../comments/lib/createIds";

export function dummyThreadDataPlain<
  TThreadMetadata extends BaseMetadata = BaseMetadata,
>(): ThreadDataPlain<TThreadMetadata> {
  const createdAt = new Date().toISOString();
  const threadId = createThreadId();

  const comment = dummyCommentDataPlain();
  (comment.threadId = threadId), (comment.createdAt = createdAt);

  return {
    id: threadId,
    type: "thread",
    roomId: "room-id",
    createdAt: createdAt,
    metadata: {}, // TODO Fix type
    updatedAt: undefined,
    comments: [comment],
  } as ThreadDataPlain<TThreadMetadata>;
}

export function dummyCommentDataPlain(): CommentDataPlain {
  const id = createCommentId();
  const threadId = createThreadId();
  const now = new Date().toISOString();

  return {
    id,
    type: "comment",
    threadId,
    userId: "user-id",
    roomId: "room-id",
    body: {
      version: 1,
      content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
    },
    deletedAt: undefined,
    createdAt: now,
    reactions: [],
  };
}
