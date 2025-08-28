import type {
  BaseMetadata,
  CommentData,
  GroupData,
  InboxNotificationCustomData,
  InboxNotificationThreadData,
  SubscriptionData,
  ThreadData,
  ThreadDataWithDeleteInfo,
} from "@liveblocks/core";
import {
  createCommentId,
  createInboxNotificationId,
  createThreadId,
} from "@liveblocks/core";

type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export function dummyThreadData({
  roomId,
  ...overrides
}: AtLeast<
  ThreadDataWithDeleteInfo<BaseMetadata>,
  "roomId"
>): ThreadData<BaseMetadata> {
  const threadId = overrides.id ?? createThreadId();
  const createdAt = overrides.createdAt ?? new Date();
  const updatedAt = overrides.updatedAt ?? createdAt;
  return {
    type: "thread",
    id: threadId,
    createdAt,
    updatedAt,
    roomId,
    metadata: {},
    comments: [
      dummyCommentData({
        roomId,
        threadId,
        createdAt,
      }),
    ],
    resolved: false,
    ...overrides,
  };
}

export function dummyCommentData({
  roomId,
  ...overrides
}: AtLeast<CommentData, "roomId">): CommentData {
  const id = createCommentId();
  const threadId = createThreadId();
  const now = new Date();

  const conditionalProperties = overrides?.deletedAt
    ? {
        deletedAt: overrides.deletedAt,
        body: undefined,
      }
    : {
        body: overrides?.body ?? {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
        },
        deletedAt: undefined,
      };

  return {
    id,
    type: "comment",
    threadId,
    userId: "user-id",
    roomId,
    createdAt: now,
    reactions: [],
    attachments: [],
    ...overrides,
    ...conditionalProperties,
  };
}

export function dummyCustomInboxNoficationData(
  overrides?: Partial<InboxNotificationCustomData>
): InboxNotificationCustomData {
  const id = createInboxNotificationId();
  const now = new Date();

  return {
    kind: "$custom",
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

export function dummyThreadInboxNotificationData({
  roomId,
  ...overrides
}: AtLeast<
  InboxNotificationThreadData,
  "roomId"
>): InboxNotificationThreadData {
  const id = createInboxNotificationId();
  const threadId = createThreadId();
  const now = new Date();

  return {
    kind: "thread",
    roomId,
    id,
    notifiedAt: now,
    threadId,
    readAt: null,
    ...overrides,
  };
}

export function dummySubscriptionData(
  overrides: Partial<SubscriptionData>
): SubscriptionData {
  const now = new Date();

  return {
    kind: "thread",
    subjectId: createThreadId(),
    createdAt: now,
    ...overrides,
  };
}

export function dummyGroupData({
  id,
  ...overrides
}: AtLeast<GroupData, "id">): GroupData {
  const createdAt = overrides.createdAt ?? new Date();
  const updatedAt = overrides.updatedAt ?? createdAt;

  return {
    type: "group",
    id,
    createdAt,
    updatedAt,
    tenantId: "default",
    scopes: { mention: true },
    members: [],
    ...overrides,
  };
}
