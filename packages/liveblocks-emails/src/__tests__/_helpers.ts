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
import type { RoomData, ThreadNotificationEvent } from "@liveblocks/node";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import ReactDOMServer from "react-dom/server";

import type { CommentDataWithBody } from "../comment-with-body";

export const SERVER_BASE_URL = "https://api.liveblocks.io";

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
export const ROOM_TEST: RoomData = {
  type: "room",
  id: ROOM_ID_TEST,
  lastConnectionAt: new Date("2024-09-10T08:00:00.000Z"),
  createdAt: new Date("2024-09-10T06:00:00.000Z"),
  metadata: {},
  defaultAccesses: ["room:write"],
  groupsAccesses: {},
  usersAccesses: {},
};

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

export const commentBody5: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [
        { text: "Bold text", bold: true },
        { text: " and " },
        { text: "italic text", italic: true },
      ],
    },
  ],
};

export const commentBody6: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [
        { text: "Strikethrough text", strikethrough: true },
        { text: " and " },
        { text: "code text", code: true },
      ],
    },
  ],
};

export const commentBody7: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [
        { text: "Check out this " },
        { type: "link", url: "https://www.liveblocks.io", text: "example" },
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

export const makeCommentWithBody = ({
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

export const resolveUsers = <U extends BaseUserMeta = DU>({
  userIds,
}: ResolveUsersArgs): OptionalPromise<
  (U["info"] | undefined)[] | undefined
> => {
  const users: (U["info"] | undefined)[] = [];

  for (const userId of userIds) {
    const user = USERS_DB.find((u) => u.id === userId);
    if (user) {
      users.push({ name: user.name });
    }
  }

  return users;
};

export const RESOLVED_ROOM_INFO_TEST: DRI = {
  name: `${ROOM_ID_TEST}-resolved`,
  url: "https://resend.com/",
};
export const getResolvedCommentUrl = (commentId: string): string =>
  `https://resend.com/#${commentId}`;
export const resolveRoomInfo = (): OptionalPromise<DRI | undefined> => {
  return RESOLVED_ROOM_INFO_TEST;
};

export const server = setupServer(
  http.get(`${SERVER_BASE_URL}/v2/rooms`, () =>
    HttpResponse.json(
      {
        nextPage: "/v2/rooms?startingAfter=1",
        data: [ROOM_TEST],
      },
      { status: 200 }
    )
  ),
  http.get(`${SERVER_BASE_URL}/v2/rooms/:roomId`, () =>
    HttpResponse.json(ROOM_TEST, { status: 200 })
  )
);

export const renderToStaticMarkup = (reactNode: React.ReactNode): string =>
  ReactDOMServer.renderToStaticMarkup(reactNode);
