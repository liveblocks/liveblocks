import type {
  BaseMetadata,
  CommentData,
  InboxNotificationCustomData,
  InboxNotificationThreadData,
  ThreadData,
} from "@liveblocks/core";

import {
  createCommentId,
  createInboxNotificationId,
  createThreadId,
} from "./_createIds";

export function dummyThreadData(
  overrides?: Partial<ThreadData<BaseMetadata>>
): ThreadData<BaseMetadata> {
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
    resolved: false,
    ...overrides,
  };
}

export function dummyCommentData(
  overrides?: Partial<Omit<CommentData, "deletedAt">>
): CommentData {
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
    ...overrides,
  };
}

export function dummyCustomInboxNoficationData(
  overrides?: Partial<InboxNotificationCustomData>
): InboxNotificationCustomData {
  const id = createInboxNotificationId();
  const now = new Date();

  return {
    kind: "$custom",
    roomId: "room-id",
    id,
    notifiedAt: now,
    readAt: null,
    subjectId: "subject-id",
    activities: [
      {
        id: "activity-id",
        createdAt: now,
        data: {
          type: "fileUploaded",
          fileName: "file.txt",
          fileSize: 1234,
          success: true,
        },
      },
    ],
    ...overrides,
  };
}

export function dummyThreadInboxNotificationData(
  overrides?: Partial<InboxNotificationThreadData>
): InboxNotificationThreadData {
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
    ...overrides,
  };
}
