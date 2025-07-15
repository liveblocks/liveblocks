import type {
  Awaitable,
  BaseUserMeta,
  CommentBody,
  CommentData,
  DRI,
  DU,
  InboxNotificationTextMentionData,
  InboxNotificationThreadData,
  IUserInfo,
  MentionData,
  ResolveUsersArgs,
  ThreadData,
} from "@liveblocks/core";
import { nanoid } from "@liveblocks/core";
import type {
  RoomData,
  TextMentionNotificationEvent,
  ThreadNotificationEvent,
} from "@liveblocks/node";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import ReactDOMServer from "react-dom/server";

import type { CommentDataWithBody } from "../comment-with-body";
import type {
  MentionEmailData,
  TextMentionNotificationEmailData,
  TextMentionNotificationEmailDataAsReact,
} from "../text-mention-notification";
import type {
  CommentEmailData,
  ThreadNotificationEmailData,
  ThreadNotificationEmailDataAsReact,
} from "../thread-notification";

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
        { type: "mention", kind: "user", id: mentionedUserId },
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
        { type: "link", url: "https://www.liveblocks.io/", text: "example" },
      ],
    },
  ],
};

export const commentBodyWithHtml: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [{ text: "Trying with <b>inject html</b> !" }],
    },
  ],
};

export const commentBodyWithHtml2: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [
        { text: "Trying with " },
        {
          type: "link",
          url: "https://www.liveblocks.io",
          text: "<script>injected script</script>",
        },
        { text: " !" },
      ],
    },
  ],
};

export const commentBodyWithInvalidUrls: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [
        { text: "Trying with " },
        { type: "link", url: "javascript:alert('xss')", text: "this link" },
        { text: " and " },
        {
          type: "link",
          url: "data:text/html,<script>alert('xss')</script>",
          text: "this other link",
        },
      ],
    },
  ],
};

export const commentBodyWithValidUrls: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [
        { text: "Trying with " },
        { type: "link", url: "https://liveblocks.io", text: "this link" },
        { text: " and " },
        {
          type: "link",
          url: "www.liveblocks.io/docs?query=123#hash",
        },
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
  attachments: [],
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
}): ThreadData => {
  const at = comments[0]?.createdAt ?? new Date();
  return {
    id: threadId,
    type: "thread",
    roomId: ROOM_ID_TEST,
    metadata: {},
    resolved: false,
    createdAt: at,
    updatedAt: at,
    comments,
  };
};

export const makeThreadInboxNotification = ({
  threadId,
  notifiedAt,
  readAt,
}: {
  threadId: string;
  notifiedAt?: Date;
  readAt?: Date;
}): InboxNotificationThreadData => ({
  id: generateInboxNotificationId(),
  kind: "thread",
  threadId,
  roomId: ROOM_ID_TEST,
  notifiedAt: notifiedAt ?? new Date(),
  readAt: readAt ?? null,
});

export const makeThreadNotificationEvent = ({
  threadId,
  userId,
  inboxNotificationId,
  triggeredAt,
}: {
  threadId: string;
  userId: string;
  inboxNotificationId: string;
  triggeredAt: Date;
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
    triggeredAt: triggeredAt.toISOString(),
  },
});

export const resolveUsers = <U extends BaseUserMeta = DU>({
  userIds,
}: ResolveUsersArgs): Awaitable<(U["info"] | undefined)[] | undefined> => {
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
export const resolveRoomInfo = (): Awaitable<DRI | undefined> => {
  return RESOLVED_ROOM_INFO_TEST;
};

export const server = setupServer(
  http.get(`${SERVER_BASE_URL}/v2/rooms`, () =>
    HttpResponse.json(
      {
        nextCursor: "1",
        data: [ROOM_TEST],
      },
      { status: 200 }
    )
  ),
  http.get(`${SERVER_BASE_URL}/v2/rooms/:roomId`, () =>
    HttpResponse.json(ROOM_TEST, { status: 200 })
  )
);

export const makeUnreadMentionDataset = (): {
  threadId: string;
  comment: CommentData;
  thread: ThreadData;
  inboxNotification: InboxNotificationThreadData;
  event: ThreadNotificationEvent;
} => {
  const threadId = generateThreadId();
  const comment = makeComment({
    userId: "user-0",
    threadId,
    body: buildCommentBodyWithMention({ mentionedUserId: "user-1" }),
    createdAt: new Date("2024-09-10T08:04:00.000Z"),
  });
  const thread = makeThread({ threadId, comments: [comment] });
  const inboxNotification = makeThreadInboxNotification({
    threadId,
    notifiedAt: new Date("2024-09-10T08:10:00.000Z"),
  });
  const event = makeThreadNotificationEvent({
    threadId,
    userId: "user-1",
    inboxNotificationId: inboxNotification.id,
    triggeredAt: thread.createdAt,
  });

  return { threadId, comment, thread, inboxNotification, event };
};

export const makeUnreadRepliesDataset = (): {
  threadId: string;
  comment1: CommentData;
  comment2: CommentData;
  thread: ThreadData;
  inboxNotification: InboxNotificationThreadData;
  event: ThreadNotificationEvent;
} => {
  const threadId = generateThreadId();
  const comment1 = makeComment({
    userId: "user-0",
    threadId,
    body: commentBody1,
    createdAt: new Date("2024-09-10T08:10:00.000Z"),
  });
  const comment2 = makeComment({
    userId: "user-1",
    threadId,
    body: commentBody4,
    createdAt: new Date("2024-09-10T08:14:00.000Z"),
  });
  const thread = makeThread({
    threadId,
    comments: [comment1, comment2],
  });
  const inboxNotification = makeThreadInboxNotification({
    threadId,
    notifiedAt: new Date("2024-09-10T08:20:00.000Z"),
  });
  const event = makeThreadNotificationEvent({
    threadId,
    userId: "user-0",
    inboxNotificationId: inboxNotification.id,
    triggeredAt: comment1.createdAt,
  });

  return { threadId, comment1, comment2, thread, inboxNotification, event };
};

export function makeCommentEmailData<BodyType, U extends BaseUserMeta = DU>(
  comment: CommentData,
  body: BodyType,
  isRoomInfoResolved?: boolean
): CommentEmailData<BodyType, U> {
  return {
    id: comment.id,
    threadId: comment.threadId,
    roomId: comment.roomId,
    createdAt: comment.createdAt,
    url: isRoomInfoResolved ? getResolvedCommentUrl(comment.id) : undefined,
    author: {
      id: comment.userId,
      info: { name: comment.userId },
    } as U,
    body,
  };
}

export const renderToStaticMarkup = (reactNode: ReactNode): string =>
  ReactDOMServer.renderToStaticMarkup(reactNode);

// Note: Rendering React comments bodies as a string (e.g static markup)
// to ease testing and avoid unnecessary operations.
type ThreadNotificationEmailAsStaticMarkup = ThreadNotificationEmailData<
  string,
  BaseUserMeta,
  CommentEmailData<string, BaseUserMeta>
>;

export const commentBodiesAsReactToStaticMarkup = (
  threadNotificationEmailDataAsReact: ThreadNotificationEmailDataAsReact | null
): ThreadNotificationEmailAsStaticMarkup | null => {
  if (threadNotificationEmailDataAsReact === null) {
    return null;
  }
  switch (threadNotificationEmailDataAsReact.type) {
    case "unreadMention": {
      const { comment, ...rest } = threadNotificationEmailDataAsReact;

      const body = renderToStaticMarkup(comment.body);
      return {
        ...rest,
        comment: {
          ...comment,
          body,
        },
      };
    }
    case "unreadReplies": {
      const { comments, ...rest } = threadNotificationEmailDataAsReact;
      return {
        ...rest,
        comments: comments.map((comment) => {
          const body = renderToStaticMarkup(comment.body);
          return {
            ...comment,
            body,
          };
        }),
      };
    }
    default:
      return null;
  }
};

export const makeRoomWithTextEditor = ({
  editor = "lexical",
}: {
  editor?: "lexical" | "tiptap";
} = {}): RoomData => ({
  ...ROOM_TEST,
  // @ts-expect-error - Hidden property
  experimental_textEditor: {
    type: editor,
    rootKey: editor === "lexical" ? ["root"] : ["default"],
  },
});

export const makeTextMentionNotificationEvent = ({
  userId,
  mentionId,
  inboxNotificationId,
  triggeredAt,
}: {
  userId: string;
  mentionId: string;
  inboxNotificationId: string;
  triggeredAt: Date;
}): TextMentionNotificationEvent => ({
  type: "notification",
  data: {
    kind: "textMention",
    channel: "email",
    projectId: generateProjectId(),
    roomId: ROOM_ID_TEST,
    userId,
    mentionId,
    createdAt: new Date().toISOString(),
    inboxNotificationId,
    triggeredAt: triggeredAt.toISOString(),
  },
});

export const makeTextMentionInboxNotification = ({
  mention,
  mentionId,
  createdBy,
  notifiedAt,
  readAt,
}: {
  mention: MentionData;
  mentionId: string;
  createdBy: string;
  notifiedAt?: Date;
  readAt?: Date;
}): InboxNotificationTextMentionData => ({
  id: generateInboxNotificationId(),
  kind: "textMention",
  roomId: ROOM_ID_TEST,
  mention,
  mentionId,
  createdBy,
  notifiedAt: notifiedAt ?? new Date(),
  readAt: readAt ?? null,
});

// Note: Rendering React contents as a string (e.g static markup)
// to ease testing and avoid unnecessary operations.
type MentionEmailAsStaticMarkupData<U extends BaseUserMeta> = MentionEmailData<
  string,
  U
>;

type TextMentionNotificationEmailDataAsStaticMarkup =
  TextMentionNotificationEmailData<
    string,
    BaseUserMeta,
    MentionEmailAsStaticMarkupData<BaseUserMeta>
  >;

export const textMentionContentAsReactToStaticMarkup = (
  emailData: TextMentionNotificationEmailDataAsReact | null
): TextMentionNotificationEmailDataAsStaticMarkup | null => {
  if (emailData === null) {
    return null;
  }

  const { mention, ...rest } = emailData;
  const { content, ...restMention } = mention;

  return {
    mention: {
      ...restMention,
      content: renderToStaticMarkup(content),
    },
    ...rest,
  };
};
