import { nanoid } from "../lib/nanoid";
import type { BaseMetadata } from "../types/BaseMetadata";
import type { CommentData } from "../types/CommentData";
import type { ThreadDataWithDeleteInfo } from "../types/ThreadData";

export function createThread(
  overrides: Partial<ThreadDataWithDeleteInfo<BaseMetadata>> = {}
): ThreadDataWithDeleteInfo<BaseMetadata> {
  const {
    id = `th_${nanoid()}`,
    roomId = `room_${nanoid()}`,
    createdAt = new Date(),
    updatedAt,
    deletedAt,
    comments = [],
    metadata = {},
  } = overrides;

  return {
    type: "thread",
    id,
    roomId,
    createdAt,
    updatedAt,
    deletedAt,
    comments,
    metadata,
  };
}

export function createComment(
  overrides: Partial<CommentData> = {}
): CommentData {
  const now = new Date();

  const {
    id = `c_${nanoid()}`,
    threadId = `th_${nanoid()}`,
    roomId = `room_${nanoid()}`,
    userId = `user_${nanoid()}`,
    createdAt = now,
    editedAt,
    body = {
      version: 1,
      content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
    },
    reactions = [],
  } = overrides;

  return {
    type: "comment",
    id,
    threadId,
    roomId,
    userId,
    createdAt,
    editedAt,
    body,
    reactions,
  };
}
