import { Liveblocks } from "@liveblocks/node";
import { http, HttpResponse } from "msw";

import type {
  ThreadNotificationData,
  ThreadNotificationRawData,
} from "../thread-notification";
import {
  extractThreadNotificationData,
  getLastUnreadCommentWithMention,
  getUnreadComments,
  prepareThreadNotificationEmailRawData,
} from "../thread-notification";
import {
  buildCommentBodyWithMention,
  commentBody1,
  commentBody2,
  commentBody3,
  generateThreadId,
  getResolvedCommentUrl,
  makeComment,
  makeThread,
  makeThreadInboxNotification,
  makeThreadNotificationComment,
  makeThreadNotificationEvent,
  RESOLVED_ROOM_INFO_TEST,
  resolveRoomInfo,
  ROOM_ID_TEST,
  server,
  SERVER_BASE_URL,
} from "./_helpers";

describe("thread notification", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  const client = new Liveblocks({ secret: "sk_xxx" });

  describe("internals utils", () => {
    it("should get unread comments ", () => {
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
      const inboxNotification = makeThreadInboxNotification({
        threadId,
        notifiedAt: new Date("2024-09-10T08:20:00.000Z"),
      });

      const expected = [comment2, comment3];
      const unreadComments = getUnreadComments({
        comments: [comment1, comment2, comment3],
        inboxNotification,
        userId: "user-dracula",
      });
      expect(unreadComments).toEqual(expected);
    });

    it("should get last unread comment with mention", () => {
      const threadId = generateThreadId();
      const comment1 = makeComment({
        userId: "user-dracula",
        threadId,
        body: buildCommentBodyWithMention({ mentionedUserId: "user-mina" }),
        createdAt: new Date("2024-09-10T08:10:00.000Z"),
      });
      const comment2 = makeComment({
        userId: "user-carmilla",
        threadId,
        body: commentBody1,
        createdAt: new Date("2024-09-10T08:12:00.000Z"),
      });

      const inboxNotification = makeThreadInboxNotification({
        threadId,
        notifiedAt: new Date("2024-09-10T08:20:00.000Z"),
      });

      const unreadComments1 = getUnreadComments({
        comments: [comment1, comment2],
        inboxNotification,
        userId: "user-mina",
      });
      const unreadComments2 = getUnreadComments({
        comments: [comment1, comment2],
        inboxNotification,
        userId: "user-dracula",
      });

      const lastCommentWithMention1 = getLastUnreadCommentWithMention({
        comments: unreadComments1,
        mentionedUserId: "user-mina",
      });
      const lastCommentWithMention2 = getLastUnreadCommentWithMention({
        comments: unreadComments2,
        mentionedUserId: "user-dracula",
      });

      expect(lastCommentWithMention1).toEqual(comment1);
      expect(lastCommentWithMention2).toBe(null);
    });

    it("should extract last unread comment with a mention from a thread notification", async () => {
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

      const extracted = await extractThreadNotificationData({ client, event });
      const expected: ThreadNotificationData = {
        type: "unreadMention",
        comment: makeThreadNotificationComment({ comment }),
      };
      expect(extracted).toEqual(expected);
    });

    it("should extract unread replies comments from a thread notification", async () => {
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
      const extracted = await extractThreadNotificationData({ client, event });
      const expected: ThreadNotificationData = {
        type: "unreadReplies",
        comments: [
          makeThreadNotificationComment({ comment: comment2 }),
          makeThreadNotificationComment({ comment: comment3 }),
        ],
      };
      expect(extracted).toEqual(expected);
    });
  });

  describe("prepare thread notification email data", () => {
    it("should prepare for last unread comment with mention", async () => {
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

      const [preparedWithUnresolvedRoomInfo, preparedWithResolvedRoomInfo] =
        await Promise.all([
          prepareThreadNotificationEmailRawData({ client, event }),
          prepareThreadNotificationEmailRawData({
            client,
            event,
            options: { resolveRoomInfo },
          }),
        ]);
      const expectedComment = makeThreadNotificationComment({ comment });
      const expected1: ThreadNotificationRawData = {
        type: "unreadMention",
        comment: {
          id: expectedComment.id,
          userId: expectedComment.userId,
          threadId: expectedComment.threadId,
          roomId: expectedComment.roomId,
          createdAt: expectedComment.createdAt,
          url: undefined,
          rawBody: expectedComment.body,
        },
        roomInfo: {
          name: ROOM_ID_TEST,
        },
      };
      const expected2: ThreadNotificationRawData = {
        type: "unreadMention",
        comment: {
          id: expectedComment.id,
          userId: expectedComment.userId,
          threadId: expectedComment.threadId,
          roomId: expectedComment.roomId,
          createdAt: expectedComment.createdAt,
          url: getResolvedCommentUrl(expectedComment.id),
          rawBody: expectedComment.body,
        },
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };
      expect(preparedWithUnresolvedRoomInfo).toEqual(expected1);
      expect(preparedWithResolvedRoomInfo).toEqual(expected2);
    });
  });
});
