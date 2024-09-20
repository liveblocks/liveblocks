import type {
  BaseUserMeta,
  CommentBody,
  CommentData,
  DRI,
  DU,
  InboxNotificationThreadData,
  IUserInfo,
  OptionalPromise,
  ResolveUsersArgs,
  ThreadData,
} from "@liveblocks/core";
import { nanoid } from "@liveblocks/core";
import type { ThreadNotificationEvent } from "@liveblocks/node";

import type { CommentDataWithBody } from "../comment-with-body";

export const USERS_DB: IUserInfo[] = [
  {
    id: "user-0",
    name: "Charlie Layne",
  },
  {
    id: "user-1",
    name: "Mislav Abha",
  },
  {
    id: "user-2",
    name: "Tatum Paolo",
  },
  {
    id: "user-3",
    name: "Anjali Wanda",
  },
];
export const ROOM_ID_TEST = "resend";

export const generateProjectId = (): string => "pr_" + nanoid();
export const generateCommentId = (): string => "cm_" + nanoid();
export const generateThreadId = (): string => "th_" + nanoid();
export const generateInboxNotificationId = (): string => "in_" + nanoid();

export const buildCommentBodyWithMention = ({
  mentionedUserId,
}: {
  mentionedUserId: string;
}): CommentBody => ({
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [
        { text: "Hello" },
        { text: " " },
        { type: "mention", id: mentionedUserId },
        { text: " " },
        { text: "!" },
      ],
    },
  ],
});

export const commentBody1: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [{ text: "What do you think of this team? 🤔" }],
    },
  ],
};

export const commentBody2: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [{ text: "I think it's really neat mate 👌" }],
    },
  ],
};

export const commentBody3: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [{ text: "Yeah dude let's ship it right away 🚀" }],
    },
  ],
};

export const commentBody4: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [
        { text: "I agree 😍 it completes well this guide: " },
        { type: "link", url: "https://www.liveblocks.io" },
      ],
    },
  ],
};

export const makeComment = ({
  userId,
  threadId,
  body,
  createdAt,
}: {
  userId: string;
  threadId: string;
  body?: CommentBody;
  createdAt?: Date;
}): CommentData => ({
  id: generateCommentId(),
  type: "comment",
  threadId,
  roomId: ROOM_ID_TEST,
  userId,
  createdAt: createdAt ?? new Date(),
  editedAt: undefined,
  reactions: [],
  ...(body !== undefined
    ? { body, deletedAt: undefined }
    : { body: undefined, deletedAt: new Date() }),
});

export const makeThread = ({
  threadId,
  comments = [],
}: {
  threadId: string;
  comments?: CommentData[];
}): ThreadData => ({
  id: threadId,
  type: "thread",
  roomId: ROOM_ID_TEST,
  metadata: {},
  resolved: false,
  createdAt: comments[0]?.createdAt ?? new Date(),
  comments,
});

export const makeThreadInboxNotification = ({
  threadId,
  notifiedAt,
}: {
  threadId: string;
  notifiedAt?: Date;
}): InboxNotificationThreadData => ({
  id: generateInboxNotificationId(),
  kind: "thread",
  threadId,
  roomId: ROOM_ID_TEST,
  notifiedAt: notifiedAt ?? new Date(),
  readAt: null,
});

export const makeThreadNotificationEvent = ({
  threadId,
  userId,
  inboxNotificationId,
}: {
  threadId: string;
  userId: string;
  inboxNotificationId: string;
}): ThreadNotificationEvent => ({
  type: "notification",
  data: {
    kind: "thread",
    channel: "email",
    projectId: generateProjectId(),
    roomId: ROOM_ID_TEST,
    userId,
    threadId,
    inboxNotificationId,
    createdAt: new Date().toISOString(),
  },
});

export const makeThreadNotificationComment = ({
  comment,
}: {
  comment: CommentData;
}): CommentDataWithBody => {
  const { body, ...rest } = comment;
  return {
    ...rest,
    body: body ?? commentBody1,
    deletedAt: undefined,
  };
};

export const resolveUsers = <U extends BaseUserMeta = DU>({
  userIds,
}: ResolveUsersArgs): OptionalPromise<
  (U["info"] | undefined)[] | undefined
> => {
  const users: (U["info"] | undefined)[] = [];

  for (const userId of userIds) {
    const user = USERS_DB.find((u) => u.id === userId);
    if (user) {
      users.push(user);
    }
  }

  return users;
};

const RESOLVED_ROOM_INFO_TEST: DRI = {
  name: `${ROOM_ID_TEST}-resolved`,
  url: "https://resend.com/",
};
export const resolveRoomInfo = (): OptionalPromise<DRI | undefined> => {
  return RESOLVED_ROOM_INFO_TEST;
};
