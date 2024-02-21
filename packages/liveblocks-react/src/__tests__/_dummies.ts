import type {
  BaseMetadata,
  CommentData,
  InboxNotificationData,
  ThreadData,
} from "@liveblocks/core";

import {
  createCommentId,
  createInboxNotificationId,
  createThreadId,
} from "../comments/lib/createIds";

export function dummyThreadData<
  TThreadMetadata extends BaseMetadata = BaseMetadata,
>(): ThreadData<TThreadMetadata> {
  const now = new Date();
  const threadId = createThreadId();

  const comment = dummyCommentData();
  comment.threadId = threadId;
  comment.createdAt = now;

  return {
    id: threadId,
    type: "thread",
    roomId: "room-id",
    createdAt: now,
    metadata: {}, // TODO Fix type
    updatedAt: now,
    comments: [comment],
  } as ThreadData<TThreadMetadata>;
}

export function dummyCommentData(): CommentData {
  const id = createCommentId();
  const threadId = createThreadId();
  const now = new Date();

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

export function dummyInboxNoficationData(): InboxNotificationData {
  const id = createInboxNotificationId();
  const threadId = createThreadId();
  const now = new Date();

  return {
    kind: "thread",
    roomId: "room-id",
    id,
    notifiedAt: now,
    threadId,
    readAt: null,
  };
}
