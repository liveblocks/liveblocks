import type {
  CommentBody,
  CommentData,
  CommentDataWithBody,
  InboxNotificationThreadData,
  ResolveUsersArgs,
  ThreadData,
} from "@liveblocks/core";
import { nanoid } from "@liveblocks/core";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import type { RoomData } from "../client";
import { Liveblocks } from "../client";
import type {
  ThreadNotificationData,
  ThreadNotificationResolvedData,
} from "../thread-notification-helpers";
import {
  getThreadNotificationData,
  getThreadNotificationResolvedData,
} from "../thread-notification-helpers";
import { getBaseUrl } from "../utils";
import type { ThreadNotificationEvent } from "../webhooks";

const SERVER_BASE_URL = getBaseUrl();

const ROOM_ID_TEST = "resend";
const ROOM_TEST: RoomData = {
  type: "room",
  id: ROOM_ID_TEST,
  lastConnectionAt: new Date("2024-09-10T08:00:00.000Z"),
  createdAt: new Date("2024-09-10T06:00:00.000Z"),
  metadata: {},
  defaultAccesses: ["room:write"],
  groupsAccesses: {},
  usersAccesses: {},
};

const USERS_DB = [
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

const generateProjectId = (): string => "pr_" + nanoid();
const generateCommentId = (): string => "cm_" + nanoid();
const generateThreadId = (): string => "th_" + nanoid();
const generateInboxNotificationId = (): string => "in_" + nanoid();

const buildCommentBodyWithMention = ({
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

const commentBody1: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [{ text: "What do you think of this team? 🤔" }],
    },
  ],
};

const commentBody2: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [{ text: "I think it's really neat mate 👌" }],
    },
  ],
};

const commentBody3: CommentBody = {
  version: 1,
  content: [
    {
      type: "paragraph",
      children: [{ text: "Yeah dude let's ship it right away 🚀" }],
    },
  ],
};

const commentBody4: CommentBody = {
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

const makeComment = ({
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
  body: body ?? {
    version: 1,
    content: [{ type: "paragraph", children: [{ text: "Hello!" }] }],
  },
});

const makeThread = ({
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

const makeThreadInboxNotification = ({
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

const makeThreadNotificationEvent = ({
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

const makeThreadNotificationComment = ({
  comment,
}: {
  comment: CommentData;
}): CommentDataWithBody => {
  const { body, ...rest } = comment;
  return {
    ...rest,
    body: body ?? { version: 1, content: [] },
    deletedAt: undefined,
  };
};

// eslint-disable-next-line @typescript-eslint/require-await
const resolveUsers = async ({ userIds }: ResolveUsersArgs) => {
  const users = [];

  for (const userId of userIds) {
    const user = USERS_DB.find((u) => u.id === userId);
    if (user) {
      users.push(user);
    }
  }

  return users;
};

const RESOLVED_ROOM_INFO_TEST = {
  name: `${ROOM_ID_TEST}-resolved`,
  url: "https://resend.com/",
};
// eslint-disable-next-line @typescript-eslint/require-await
const resolveRoomInfo = async () => {
  return RESOLVED_ROOM_INFO_TEST;
};

describe("thread notification helpers", () => {
  const server = setupServer(
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

  const client = new Liveblocks({ secret: "sk_xxx" });

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe("get thread notification data", () => {
    it("should get last unread comment with a mention", async () => {
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

      server.use(
        http.get(`${SERVER_BASE_URL}/v2/rooms/:roomId/threads/:threadId`, () =>
          HttpResponse.json(thread, { status: 200 })
        )
      );

      server.use(
        http.get(
          `${SERVER_BASE_URL}/v2/users/:userId/inbox-notifications/:notificationId`,
          () => HttpResponse.json(inboxNotification, { status: 200 })
        )
      );

      const event = makeThreadNotificationEvent({
        threadId,
        userId: "user-1",
        inboxNotificationId: inboxNotification.id,
      });
      const threadNotificationData = await getThreadNotificationData({
        client,
        event,
      });

      const expected: ThreadNotificationData = {
        type: "unreadMention",
        comments: [makeThreadNotificationComment({ comment })],
      };

      expect(threadNotificationData).toEqual(expected);
    });

    it("should get unread replies", async () => {
      const threadId = generateThreadId();
      const comment1 = makeComment({
        userId: "user-dracula",
        threadId,
        body: commentBody1,
        createdAt: new Date("2024-09-10T08:10:00.000Z"),
      });
      const comment2 = makeComment({
        userId: "user-mina",
        threadId,
        body: commentBody2,
        createdAt: new Date("2024-09-10T08:14:00.000Z"),
      });
      const comment3 = makeComment({
        userId: "user-carmilla",
        threadId,
        body: commentBody3,
        createdAt: new Date("2024-09-10T08:16:00.000Z"),
      });
      const thread = makeThread({
        threadId,
        comments: [comment1, comment2, comment3],
      });
      const inboxNotification = makeThreadInboxNotification({
        threadId,
        notifiedAt: new Date("2024-09-10T08:20:00.000Z"),
      });

      server.use(
        http.get(`${SERVER_BASE_URL}/v2/rooms/:roomId/threads/:threadId`, () =>
          HttpResponse.json(thread, { status: 200 })
        )
      );

      server.use(
        http.get(
          `${SERVER_BASE_URL}/v2/users/:userId/inbox-notifications/:notificationId`,
          () => HttpResponse.json(inboxNotification, { status: 200 })
        )
      );

      const event = makeThreadNotificationEvent({
        threadId,
        userId: "user-dracula",
        inboxNotificationId: inboxNotification.id,
      });
      const threadNotificationData = await getThreadNotificationData({
        client,
        event,
      });

      const expected: ThreadNotificationData = {
        type: "unreadReplies",
        comments: [
          makeThreadNotificationComment({ comment: comment2 }),
          makeThreadNotificationComment({ comment: comment3 }),
        ],
      };

      expect(threadNotificationData).toEqual(expected);
    });

    it("should get last unread comment with a mention even w/ unread replies", async () => {
      const threadId = generateThreadId();
      const comment1 = makeComment({
        userId: "user-leon",
        threadId,
        body: commentBody1,
        createdAt: new Date("2024-09-10T08:10:00.000Z"),
      });
      const comment2 = makeComment({
        userId: "user-trevor",
        threadId,
        body: commentBody2,
        createdAt: new Date("2024-09-10T08:14:00.000Z"),
      });
      const comment3 = makeComment({
        userId: "user-julius",
        threadId,
        body: buildCommentBodyWithMention({ mentionedUserId: "user-leon" }),
        createdAt: new Date("2024-09-10T08:16:00.000Z"),
      });
      const comment4 = makeComment({
        userId: "user-ritcher",
        threadId,
        body: commentBody3,
        createdAt: new Date("2024-09-10T08:18:00.000Z"),
      });

      const thread = makeThread({
        threadId,
        comments: [comment1, comment2, comment3, comment4],
      });
      const inboxNotification = makeThreadInboxNotification({
        threadId,
        notifiedAt: new Date("2024-09-10T08:20:00.000Z"),
      });

      server.use(
        http.get(`${SERVER_BASE_URL}/v2/rooms/:roomId/threads/:threadId`, () =>
          HttpResponse.json(thread, { status: 200 })
        )
      );

      server.use(
        http.get(
          `${SERVER_BASE_URL}/v2/users/:userId/inbox-notifications/:notificationId`,
          () => HttpResponse.json(inboxNotification, { status: 200 })
        )
      );

      const event = makeThreadNotificationEvent({
        threadId,
        userId: "user-leon",
        inboxNotificationId: inboxNotification.id,
      });

      const threadNotificationData = await getThreadNotificationData({
        client,
        event,
      });

      const expected: ThreadNotificationData = {
        type: "unreadMention",
        comments: [makeThreadNotificationComment({ comment: comment3 })],
      };

      expect(threadNotificationData).toEqual(expected);
    });
  });

  describe("get thread notification resolved data", () => {
    describe("unread mention", () => {
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
      });

      const expected1: ThreadNotificationResolvedData = {
        type: "unreadMention",
        comments: [
          {
            id: comment.id,
            threadId: thread.id,
            roomId: ROOM_ID_TEST,
            createdAt: comment.createdAt,
            author: {
              id: comment.userId,
              name: comment.userId,
            },
            body: "<p>Hello <span data-mention>@user-1</span> !</p>",
            commentUrl: undefined,
          },
        ],
        roomInfo: { name: ROOM_ID_TEST },
      };

      const expected2: ThreadNotificationResolvedData = {
        type: "unreadMention",
        comments: [
          {
            id: comment.id,
            threadId: thread.id,
            roomId: ROOM_ID_TEST,
            createdAt: comment.createdAt,
            author: {
              id: comment.userId,
              name: "Charlie Layne",
            },
            body: "<p>Hello <span data-mention>@Mislav Abha</span> !</p>",
            commentUrl: `https://resend.com/#${comment.id}`,
          },
        ],
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      const expected3: ThreadNotificationResolvedData = {
        type: "unreadMention",
        comments: [
          {
            id: comment.id,
            threadId: thread.id,
            roomId: ROOM_ID_TEST,
            createdAt: comment.createdAt,
            author: {
              id: comment.userId,
              name: comment.userId,
            },
            body: {
              version: 1,
              content: [
                {
                  type: "paragraph",
                  children: [
                    { text: "Hello" },
                    { text: " " },
                    { type: "mention", user: "@user-1" },
                    { text: " " },
                    { text: "!" },
                  ],
                },
              ],
            },
            commentUrl: undefined,
          },
        ],
        roomInfo: { name: ROOM_ID_TEST },
      };

      const expected4: ThreadNotificationResolvedData = {
        type: "unreadMention",
        comments: [
          {
            id: comment.id,
            threadId: thread.id,
            roomId: ROOM_ID_TEST,
            createdAt: comment.createdAt,
            author: {
              id: comment.userId,
              name: "Charlie Layne",
            },
            body: {
              version: 1,
              content: [
                {
                  type: "paragraph",
                  children: [
                    { text: "Hello" },
                    { text: " " },
                    { type: "mention", user: "@Mislav Abha" },
                    { text: " " },
                    { text: "!" },
                  ],
                },
              ],
            },
            commentUrl: `https://resend.com/#${comment.id}`,
          },
        ],
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      it.each<{
        format: "html" | "json";
        withFormatOption: "yes" | "no";
        withResolversOption: "yes" | "no";
        promise: () => Promise<ThreadNotificationResolvedData>;
        expected: ThreadNotificationResolvedData;
      }>([
        {
          format: "html",
          withFormatOption: "no",
          withResolversOption: "no",
          promise: () =>
            getThreadNotificationResolvedData({
              client,
              event,
            }),
          expected: expected1,
        },
        {
          format: "html",
          withFormatOption: "yes",
          withResolversOption: "no",
          promise: () =>
            getThreadNotificationResolvedData({
              client,
              event,
              options: { format: "html" },
            }),
          expected: expected1,
        },
        {
          format: "html",
          withFormatOption: "no",
          withResolversOption: "yes",
          promise: () =>
            getThreadNotificationResolvedData({
              client,
              event,
              options: { resolveUsers, resolveRoomInfo },
            }),
          expected: expected2,
        },
        {
          format: "html",
          withFormatOption: "yes",
          withResolversOption: "yes",
          promise: () =>
            getThreadNotificationResolvedData({
              client,
              event,
              options: { format: "html", resolveUsers, resolveRoomInfo },
            }),
          expected: expected2,
        },
        {
          format: "json",
          withFormatOption: "yes",
          withResolversOption: "no",
          promise: () =>
            getThreadNotificationResolvedData({
              client,
              event,
              options: { format: "json" },
            }),
          expected: expected3,
        },
        {
          format: "json",
          withFormatOption: "yes",
          withResolversOption: "yes",
          promise: () =>
            getThreadNotificationResolvedData({
              client,
              event,
              options: { format: "json", resolveUsers, resolveRoomInfo },
            }),
          expected: expected4,
        },
      ])(
        'should return unread mention in "$format" format with options { format: $withFormatOption; resolvers: $withResolversOption }',
        async ({ promise, expected }) => {
          server.use(
            http.get(
              `${SERVER_BASE_URL}/v2/rooms/:roomId/threads/:threadId`,
              () => HttpResponse.json(thread, { status: 200 })
            )
          );

          server.use(
            http.get(
              `${SERVER_BASE_URL}/v2/users/:userId/inbox-notifications/:notificationId`,
              () => HttpResponse.json(inboxNotification, { status: 200 })
            )
          );

          const unreadComments = await promise();
          expect(unreadComments).toEqual(expected);
        }
      );
    });

    describe("unread replies", () => {
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
      });

      const expected1: ThreadNotificationResolvedData = {
        type: "unreadReplies",
        comments: [
          {
            id: comment2.id,
            threadId: thread.id,
            roomId: ROOM_ID_TEST,
            createdAt: comment2.createdAt,
            author: {
              id: comment2.userId,
              name: comment2.userId,
            },
            body: '<p>I agree 😍 it completes well this guide: <a href="https://www.liveblocks.io" target="_blank" rel="noopener noreferrer">https://www.liveblocks.io</a></p>',
            commentUrl: undefined,
          },
        ],
        roomInfo: { name: ROOM_ID_TEST },
      };

      const expected2: ThreadNotificationResolvedData = {
        type: "unreadReplies",
        comments: [
          {
            id: comment2.id,
            threadId: thread.id,
            roomId: ROOM_ID_TEST,
            createdAt: comment2.createdAt,
            author: {
              id: comment2.userId,
              name: "Mislav Abha",
            },
            body: '<p>I agree 😍 it completes well this guide: <a href="https://www.liveblocks.io" target="_blank" rel="noopener noreferrer">https://www.liveblocks.io</a></p>',
            commentUrl: `https://resend.com/#${comment2.id}`,
          },
        ],
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      const expected3: ThreadNotificationResolvedData = {
        type: "unreadReplies",
        comments: [
          {
            id: comment2.id,
            threadId: thread.id,
            roomId: ROOM_ID_TEST,
            createdAt: comment2.createdAt,
            author: {
              id: comment2.userId,
              name: comment2.userId,
            },
            body: {
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
            },
            commentUrl: undefined,
          },
        ],
        roomInfo: { name: ROOM_ID_TEST },
      };

      const expected4: ThreadNotificationResolvedData = {
        type: "unreadReplies",
        comments: [
          {
            id: comment2.id,
            threadId: thread.id,
            roomId: ROOM_ID_TEST,
            createdAt: comment2.createdAt,
            author: {
              id: comment2.userId,
              name: "Mislav Abha",
            },
            body: {
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
            },
            commentUrl: `https://resend.com/#${comment2.id}`,
          },
        ],
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      it.each<{
        format: "html" | "json";
        withFormatOption: "yes" | "no";
        withResolversOption: "yes" | "no";
        promise: () => Promise<ThreadNotificationResolvedData>;
        expected: ThreadNotificationResolvedData;
      }>([
        {
          format: "html",
          withFormatOption: "no",
          withResolversOption: "no",
          promise: () =>
            getThreadNotificationResolvedData({
              client,
              event,
            }),
          expected: expected1,
        },
        {
          format: "html",
          withFormatOption: "yes",
          withResolversOption: "no",
          promise: () =>
            getThreadNotificationResolvedData({
              client,
              event,
              options: { format: "html" },
            }),
          expected: expected1,
        },
        {
          format: "html",
          withFormatOption: "no",
          withResolversOption: "yes",
          promise: () =>
            getThreadNotificationResolvedData({
              client,
              event,
              options: { resolveUsers, resolveRoomInfo },
            }),
          expected: expected2,
        },
        {
          format: "html",
          withFormatOption: "yes",
          withResolversOption: "yes",
          promise: () =>
            getThreadNotificationResolvedData({
              client,
              event,
              options: { format: "html", resolveUsers, resolveRoomInfo },
            }),
          expected: expected2,
        },
        {
          format: "json",
          withFormatOption: "yes",
          withResolversOption: "no",
          promise: () =>
            getThreadNotificationResolvedData({
              client,
              event,
              options: { format: "json" },
            }),
          expected: expected3,
        },
        {
          format: "json",
          withFormatOption: "yes",
          withResolversOption: "yes",
          promise: () =>
            getThreadNotificationResolvedData({
              client,
              event,
              options: { format: "json", resolveUsers, resolveRoomInfo },
            }),
          expected: expected4,
        },
      ])(
        'should return unread replies in "$format" format with options { format: $withFormatOption; resolvers: $withResolversOption }',
        async ({ promise, expected }) => {
          server.use(
            http.get(
              `${SERVER_BASE_URL}/v2/rooms/:roomId/threads/:threadId`,
              () => HttpResponse.json(thread, { status: 200 })
            )
          );

          server.use(
            http.get(
              `${SERVER_BASE_URL}/v2/users/:userId/inbox-notifications/:notificationId`,
              () => HttpResponse.json(inboxNotification, { status: 200 })
            )
          );

          const unreadComments = await promise();
          expect(unreadComments).toEqual(expected);
        }
      );
    });
  });
});
