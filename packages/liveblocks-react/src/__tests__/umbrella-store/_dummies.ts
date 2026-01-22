import type {
  BaseMetadata,
  CommentAttachment,
  CommentData,
  ThreadDataWithDeleteInfo,
} from "@liveblocks/core";
import { nanoid } from "@liveblocks/core";

export function createThread(
  overrides: Partial<ThreadDataWithDeleteInfo<BaseMetadata>> = {}
): ThreadDataWithDeleteInfo<BaseMetadata> {
  const {
    id = `th_${nanoid()}`,
    roomId = `room_${nanoid()}`,
    deletedAt,
    comments = [],
    metadata = {},
    resolved = false,
  } = overrides;

  const createdAt = overrides.createdAt ?? new Date();
  const updatedAt = overrides.updatedAt ?? createdAt;
  return {
    type: "thread",
    id,
    roomId,
    createdAt,
    updatedAt,
    deletedAt,
    comments,
    metadata,
    resolved,
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
    attachments = [],
    metadata = {},
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
    attachments,
    metadata,
  };
}

export function createAttachment(
  overrides?: Partial<CommentAttachment>
): CommentAttachment {
  return {
    type: "attachment",
    id: `at_${nanoid()}`,
    name: "file.png",
    mimeType: "image/png",
    size: 100000,
    ...overrides,
  };
}
