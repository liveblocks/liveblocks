import type {
  CommentBody,
  CommentData,
  InboxNotificationThreadData,
  ThreadData,
} from "@liveblocks/core";
import { nanoid } from "@liveblocks/core";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import type { RoomData } from "../client";
import { Liveblocks } from "../client";
import type {
  ThreadNotificationCommentData,
  ThreadNotificationData,
} from "../thread-notification-helpers";
import { getThreadNotificationData } from "../thread-notification-helpers";
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
}): ThreadNotificationCommentData => {
  const { body, ...rest } = comment;
  return {
    ...rest,
    body: body ?? { version: 1, content: [] },
    deletedAt: undefined,
  };
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
  });
});
