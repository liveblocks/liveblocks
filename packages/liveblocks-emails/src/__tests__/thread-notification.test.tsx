import type {
  BaseUserMeta,
  GroupData,
  InboxNotificationThreadData,
} from "@liveblocks/core";
import type { ThreadData } from "@liveblocks/node";
import { Liveblocks } from "@liveblocks/node";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";

import type { ConvertCommentBodyElements } from "../comment-body";
import { MENTION_CHARACTER } from "../lib/constants";
import type {
  ConvertCommentBodyAsHtmlStyles,
  ConvertCommentBodyAsReactComponents,
  ThreadNotificationData,
  ThreadNotificationEmailData,
  ThreadNotificationEmailDataAsHtml,
  ThreadNotificationEmailDataAsReact,
} from "../thread-notification";
import {
  extractThreadNotificationData,
  getLastUnreadCommentWithMention,
  getUnreadComments,
  prepareThreadNotificationEmail,
  prepareThreadNotificationEmailAsHtml,
  prepareThreadNotificationEmailAsReact,
} from "../thread-notification";
import {
  buildCommentBodyWithMention,
  commentBodiesAsReactToStaticMarkup,
  commentBody1,
  commentBody2,
  commentBody3,
  generateThreadId,
  getResolvedCommentUrl,
  makeComment,
  makeCommentEmailData,
  makeCommentWithBody,
  makeThread,
  makeThreadInboxNotification,
  makeThreadNotificationEvent,
  makeUnreadMentionDataset,
  makeUnreadRepliesDataset,
  RESOLVED_ROOM_INFO_TEST,
  resolveRoomInfo,
  resolveUsers,
  ROOM_ID_TEST,
  server,
  SERVER_BASE_URL,
} from "./_helpers";

describe("thread notification", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  const client = new Liveblocks({ secret: "sk_xxx" });

  const setServerHandlers = ({
    thread,
    inboxNotification,
    groups,
  }: {
    thread: ThreadData;
    inboxNotification: InboxNotificationThreadData;
    groups: GroupData[];
  }): void => {
    server.use(
      http.get(`${SERVER_BASE_URL}/v2/rooms/:roomId/threads/:threadId`, () =>
        HttpResponse.json(thread, { status: 200 })
      ),
      http.get(
        `${SERVER_BASE_URL}/v2/users/:userId/inbox-notifications/:notificationId`,
        () => HttpResponse.json(inboxNotification, { status: 200 })
      ),
      http.get(`${SERVER_BASE_URL}/v2/users/:userId/groups`, () =>
        HttpResponse.json({ data: groups, nextCursor: null }, { status: 200 })
      )
    );
  };

  describe("internals utils", () => {
    test("should get unread comments - all comments", () => {
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
        notificationTriggerAt: comment1.createdAt,
      });
      expect(unreadComments).toEqual(expected);
    });

    test("should get unread comments - only two comments", () => {
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
        notificationTriggerAt: comment2.createdAt,
      });
      expect(unreadComments).toEqual(expected);
    });

    test("should get last unread comment with mention - first comment is a mention", () => {
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

      const unreadComments = getUnreadComments({
        comments: [comment1, comment2],
        inboxNotification,
        userId: "user-mina",
        notificationTriggerAt: comment1.createdAt,
      });

      const lastCommentWithMention1 = getLastUnreadCommentWithMention({
        comments: unreadComments,
        groups: new Map(),
        mentionedUserId: "user-mina",
      });

      expect(lastCommentWithMention1).toEqual(comment1);
    });

    test("should get last unread comment with mention - last comment is a mention", () => {
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
        body: commentBody2,
        createdAt: new Date("2024-09-10T08:12:00.000Z"),
      });
      const comment3 = makeComment({
        userId: "user-carmilla",
        threadId,
        body: buildCommentBodyWithMention({ mentionedUserId: "user-mina" }),
        createdAt: new Date("2024-09-10T08:16:00.000Z"),
      });

      const inboxNotification = makeThreadInboxNotification({
        threadId,
        notifiedAt: new Date("2024-09-10T08:20:00.000Z"),
      });

      const unreadComments = getUnreadComments({
        comments: [comment1, comment2, comment3],
        inboxNotification,
        userId: "user-mina",
        notificationTriggerAt: comment1.createdAt,
      });

      const lastUnreadCommentWithMention = getLastUnreadCommentWithMention({
        groups: new Map(),
        comments: unreadComments,
        mentionedUserId: "user-mina",
      });

      expect(lastUnreadCommentWithMention).toEqual(comment3);
    });

    test("should extract null (no last unread comment with a mention nor unread replies) from a thread notification", async () => {
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
        notifiedAt: new Date("2024-09-10T08:04:00.000Z"),
        readAt: new Date("2024-09-10T08:12:00.000Z"),
      });

      setServerHandlers({ thread, inboxNotification, groups: [] });

      const event = makeThreadNotificationEvent({
        threadId,
        userId: "user-1",
        inboxNotificationId: inboxNotification.id,
        triggeredAt: new Date("2024-09-10T08:04:00.000Z"),
      });

      const extracted = await extractThreadNotificationData({ client, event });
      expect(extracted).toBeNull();
    });

    test("should extract last unread comment with a mention from a thread notification", async () => {
      const threadId = generateThreadId();
      const comment1 = makeComment({
        userId: "user-0",
        threadId,
        body: buildCommentBodyWithMention({ mentionedUserId: "user-1" }),
        createdAt: new Date("2024-09-10T08:04:00.000Z"),
      });
      const comment2 = makeComment({
        userId: "user-1",
        threadId,
        body: commentBody1,
        createdAt: new Date("2024-09-10T08:10:00.000Z"),
      });
      const thread = makeThread({ threadId, comments: [comment1, comment2] });
      const inboxNotification = makeThreadInboxNotification({
        threadId,
        notifiedAt: new Date("2024-09-10T08:10:00.000Z"),
      });

      setServerHandlers({ thread, inboxNotification, groups: [] });

      const event = makeThreadNotificationEvent({
        threadId,
        userId: "user-1",
        inboxNotificationId: inboxNotification.id,
        triggeredAt: comment1.createdAt,
      });

      const extracted = await extractThreadNotificationData({ client, event });
      const expected: ThreadNotificationData = {
        type: "unreadMention",
        comment: makeCommentWithBody({ comment: comment1 }),
      };
      expect(extracted).toEqual(expected);
    });

    test("should extract unread replies comments from a thread notification", async () => {
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

      setServerHandlers({ thread, inboxNotification, groups: [] });

      const event = makeThreadNotificationEvent({
        threadId,
        userId: "user-dracula",
        inboxNotificationId: inboxNotification.id,
        triggeredAt: comment1.createdAt,
      });
      const extracted = await extractThreadNotificationData({ client, event });
      const expected: ThreadNotificationData = {
        type: "unreadReplies",
        comments: [
          makeCommentWithBody({ comment: comment2 }),
          makeCommentWithBody({ comment: comment3 }),
        ],
      };
      expect(extracted).toEqual(expected);
    });

    test("should extract only unread replies from a thread notification - no mentions", async () => {
      const threadId = generateThreadId();
      const comment1 = makeComment({
        userId: "user-0",
        threadId,
        body: buildCommentBodyWithMention({ mentionedUserId: "user-dante" }),
        createdAt: new Date("2024-09-10T08:04:00.000Z"),
      });
      const comment2 = makeComment({
        userId: "user-1",
        threadId,
        body: commentBody1,
        createdAt: new Date("2024-09-10T08:10:00.000Z"),
      });
      const comment3 = makeComment({
        userId: "user-2",
        threadId,
        body: commentBody2,
        createdAt: new Date("2024-09-10T08:12:00.000Z"),
      });

      const thread = makeThread({
        threadId,
        comments: [comment1, comment2, comment3],
      });
      const inboxNotification = makeThreadInboxNotification({
        threadId,
        notifiedAt: new Date("2024-09-10T08:12:00.000Z"),
      });

      setServerHandlers({ thread, inboxNotification, groups: [] });

      const event = makeThreadNotificationEvent({
        threadId,
        userId: "user-dante",
        inboxNotificationId: inboxNotification.id,
        triggeredAt: comment2.createdAt,
      });

      const extracted = await extractThreadNotificationData({ client, event });
      const expected: ThreadNotificationData = {
        type: "unreadReplies",
        comments: [
          makeCommentWithBody({ comment: comment2 }),
          makeCommentWithBody({ comment: comment3 }),
        ],
      };
      expect(extracted).toEqual(expected);
    });
  });

  describe("prepare thread notification email", () => {
    // As plain text
    const elements: ConvertCommentBodyElements<string, BaseUserMeta> = {
      container: ({ children }) => children.join("\n"),
      paragraph: ({ children }) => children.join(""),
      text: ({ element }) => element.text,
      link: ({ element }) => element.text ?? element.url,
      mention: ({ element, user, group }) =>
        `${MENTION_CHARACTER}${user?.name ?? group?.name ?? element.id}`,
    };

    test("should prepare for last unread comment with mention", async () => {
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

      setServerHandlers({ thread, inboxNotification, groups: [] });

      const event = makeThreadNotificationEvent({
        threadId,
        userId: "user-1",
        inboxNotificationId: inboxNotification.id,
        triggeredAt: comment.createdAt,
      });

      const [preparedWithUnresolvedRoomInfo, preparedWithResolvedRoomInfo] =
        await Promise.all([
          prepareThreadNotificationEmail(
            client,
            event,
            {},
            elements,
            "test-suite"
          ),
          prepareThreadNotificationEmail(
            client,
            event,
            {
              resolveRoomInfo,
            },
            elements,
            "test-suite"
          ),
        ]);

      const expectedComment1 = makeCommentEmailData<string>(
        comment,
        "Hello @user-1 !",
        false
      );

      const expectedComment2 = makeCommentEmailData<string>(
        comment,
        "Hello @user-1 !",
        true
      );

      const expected1: ThreadNotificationEmailData<string> = {
        type: "unreadMention",
        comment: expectedComment1,
        roomInfo: {
          name: ROOM_ID_TEST,
        },
      };
      const expected2: ThreadNotificationEmailData<string> = {
        type: "unreadMention",
        comment: expectedComment2,
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      expect(preparedWithUnresolvedRoomInfo).toEqual(expected1);
      expect(preparedWithResolvedRoomInfo).toEqual(expected2);
    });

    test("should prepare for unread replies comments", async () => {
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

      setServerHandlers({ thread, inboxNotification, groups: [] });

      const event = makeThreadNotificationEvent({
        threadId,
        userId: "user-dracula",
        inboxNotificationId: inboxNotification.id,
        triggeredAt: comment1.createdAt,
      });

      const [preparedWithUnresolvedRoomInfo, preparedWithResolvedRoomInfo] =
        await Promise.all([
          prepareThreadNotificationEmail(
            client,
            event,
            {},
            elements,
            "test-suite"
          ),
          prepareThreadNotificationEmail(
            client,
            event,
            {
              resolveRoomInfo,
            },
            elements,
            "test-suite"
          ),
        ]);
      const expectedComments1 = [
        makeCommentEmailData<string>(
          comment2,
          "I think it's really neat mate 👌",
          false
        ),
        makeCommentEmailData<string>(
          comment3,
          "Yeah dude let's ship it right away 🚀",
          false
        ),
      ];

      const expected1: ThreadNotificationEmailData<string> = {
        type: "unreadReplies",
        comments: expectedComments1,
        roomInfo: {
          name: ROOM_ID_TEST,
        },
      };

      const expectedComments2 = [
        makeCommentEmailData<string>(
          comment2,
          "I think it's really neat mate 👌",
          true
        ),
        makeCommentEmailData<string>(
          comment3,
          "Yeah dude let's ship it right away 🚀",
          true
        ),
      ];

      const expected2: ThreadNotificationEmailData<string> = {
        type: "unreadReplies",
        comments: expectedComments2,
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      expect(preparedWithUnresolvedRoomInfo).toEqual(expected1);
      expect(preparedWithResolvedRoomInfo).toEqual(expected2);
    });
  });

  describe("prepare thead notification email as html", () => {
    describe("unread mention w/o styles design tokens", () => {
      const { comment, thread, inboxNotification, event } =
        makeUnreadMentionDataset();

      const body1 =
        '<p style="font-size:14px;">Hello <span data-mention style="color:blue;">@user-1</span> !</p>';
      const expected1: ThreadNotificationEmailDataAsHtml = {
        type: "unreadMention",
        comment: {
          id: comment.id,
          threadId: thread.id,
          roomId: ROOM_ID_TEST,
          createdAt: comment.createdAt,
          author: {
            id: comment.userId,
            info: {
              name: comment.userId,
            },
          },
          body: body1,
          url: undefined,
        },
        roomInfo: { name: ROOM_ID_TEST },
      };

      const body2 =
        '<p style="font-size:14px;">Hello <span data-mention style="color:blue;">@Mislav Abha</span> !</p>';
      const expected2: ThreadNotificationEmailDataAsHtml = {
        type: "unreadMention",
        comment: {
          id: comment.id,
          threadId: thread.id,
          roomId: ROOM_ID_TEST,
          createdAt: comment.createdAt,
          author: {
            id: comment.userId,
            info: {
              name: "Charlie Layne",
            },
          },
          body: body2,
          url: getResolvedCommentUrl(comment.id),
        },
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      test.each<{
        withResolvers: boolean;
        promise: () => Promise<ThreadNotificationEmailDataAsHtml | null>;
        expected: ThreadNotificationEmailDataAsHtml;
      }>([
        {
          withResolvers: false,
          promise: () => prepareThreadNotificationEmailAsHtml(client, event),
          expected: expected1,
        },
        {
          withResolvers: true,
          promise: () =>
            prepareThreadNotificationEmailAsHtml(client, event, {
              resolveUsers,
              resolveRoomInfo,
            }),
          expected: expected2,
        },
      ])(
        "should return unread mention as html with resolvers: $withResolvers",
        async ({ promise, expected }) => {
          setServerHandlers({
            thread,
            inboxNotification,
            groups: [],
          });

          const threadNotificationEmailAsHTML = await promise();
          expect(threadNotificationEmailAsHTML).toEqual(expected);
        }
      );
    });

    describe("unread mention w/ custom styles design tokens", () => {
      const styles: Partial<ConvertCommentBodyAsHtmlStyles> = {
        paragraph: {
          fontSize: "16px",
        },
        mention: {
          color: "purple",
        },
      };
      const { comment, thread, inboxNotification, event } =
        makeUnreadMentionDataset();

      const body1 =
        '<p style="font-size:16px;">Hello <span data-mention style="color:purple;">@user-1</span> !</p>';
      const expected1: ThreadNotificationEmailDataAsHtml = {
        type: "unreadMention",
        comment: {
          id: comment.id,
          threadId: thread.id,
          roomId: ROOM_ID_TEST,
          createdAt: comment.createdAt,
          author: {
            id: comment.userId,
            info: {
              name: comment.userId,
            },
          },
          body: body1,
          url: undefined,
        },
        roomInfo: { name: ROOM_ID_TEST },
      };

      const body2 =
        '<p style="font-size:16px;">Hello <span data-mention style="color:purple;">@Mislav Abha</span> !</p>';
      const expected2: ThreadNotificationEmailDataAsHtml = {
        type: "unreadMention",
        comment: {
          id: comment.id,
          threadId: thread.id,
          roomId: ROOM_ID_TEST,
          createdAt: comment.createdAt,
          author: {
            id: comment.userId,
            info: {
              name: "Charlie Layne",
            },
          },
          body: body2,
          url: getResolvedCommentUrl(comment.id),
        },
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      test.each<{
        withResolvers: boolean;
        promise: () => Promise<ThreadNotificationEmailDataAsHtml | null>;
        expected: ThreadNotificationEmailDataAsHtml;
      }>([
        {
          withResolvers: false,
          promise: () =>
            prepareThreadNotificationEmailAsHtml(client, event, {
              styles,
            }),
          expected: expected1,
        },
        {
          withResolvers: true,
          promise: () =>
            prepareThreadNotificationEmailAsHtml(client, event, {
              resolveUsers,
              resolveRoomInfo,
              styles,
            }),
          expected: expected2,
        },
      ])(
        "should return unread mention as html with resolvers: $withResolvers",
        async ({ promise, expected }) => {
          setServerHandlers({
            thread,
            inboxNotification,
            groups: [],
          });

          const threadNotificationEmailAsHTML = await promise();
          expect(threadNotificationEmailAsHTML).toEqual(expected);
        }
      );
    });

    describe("unread replies w/o styles design tokens", () => {
      const { comment2, thread, inboxNotification, event } =
        makeUnreadRepliesDataset();

      const body1 =
        '<p style="font-size:14px;">I agree 😍 it completes well this guide: <a href="https://www.liveblocks.io" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;">https://www.liveblocks.io</a></p>';
      const expected1: ThreadNotificationEmailDataAsHtml = {
        type: "unreadReplies",
        comments: [
          {
            id: comment2.id,
            threadId: thread.id,
            roomId: ROOM_ID_TEST,
            createdAt: comment2.createdAt,
            author: {
              id: comment2.userId,
              info: {
                name: comment2.userId,
              },
            },
            body: body1,
            url: undefined,
          },
        ],
        roomInfo: { name: ROOM_ID_TEST },
      };

      const body2 =
        '<p style="font-size:14px;">I agree 😍 it completes well this guide: <a href="https://www.liveblocks.io" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;">https://www.liveblocks.io</a></p>';
      const expected2: ThreadNotificationEmailDataAsHtml = {
        type: "unreadReplies",
        comments: [
          {
            id: comment2.id,
            threadId: thread.id,
            roomId: ROOM_ID_TEST,
            createdAt: comment2.createdAt,
            author: {
              id: comment2.userId,
              info: { name: "Mislav Abha" },
            },
            body: body2,
            url: getResolvedCommentUrl(comment2.id),
          },
        ],
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      test.each<{
        withResolvers: boolean;
        promise: () => Promise<ThreadNotificationEmailDataAsHtml | null>;
        expected: ThreadNotificationEmailDataAsHtml;
      }>([
        {
          withResolvers: false,
          promise: () => prepareThreadNotificationEmailAsHtml(client, event),
          expected: expected1,
        },
        {
          withResolvers: true,
          promise: () =>
            prepareThreadNotificationEmailAsHtml(client, event, {
              resolveUsers,
              resolveRoomInfo,
            }),
          expected: expected2,
        },
      ])(
        "should return unread replies as html with resolvers: $withResolvers",
        async ({ promise, expected }) => {
          setServerHandlers({
            thread,
            inboxNotification,
            groups: [],
          });

          const threadNotificationEmailAsHTML = await promise();
          expect(threadNotificationEmailAsHTML).toEqual(expected);
        }
      );
    });

    describe("unread replies w/ custom styles design tokens", () => {
      const styles: Partial<ConvertCommentBodyAsHtmlStyles> = {
        paragraph: {
          fontSize: "16px",
        },
        link: {
          textUnderlineOffset: "4px",
        },
      };

      const { comment2, thread, inboxNotification, event } =
        makeUnreadRepliesDataset();

      const body1 =
        '<p style="font-size:16px;">I agree 😍 it completes well this guide: <a href="https://www.liveblocks.io" target="_blank" rel="noopener noreferrer" style="text-underline-offset:4px;">https://www.liveblocks.io</a></p>';
      const expected1: ThreadNotificationEmailDataAsHtml = {
        type: "unreadReplies",
        comments: [
          {
            id: comment2.id,
            threadId: thread.id,
            roomId: ROOM_ID_TEST,
            createdAt: comment2.createdAt,
            author: {
              id: comment2.userId,
              info: {
                name: comment2.userId,
              },
            },
            body: body1,
            url: undefined,
          },
        ],
        roomInfo: { name: ROOM_ID_TEST },
      };

      const body2 =
        '<p style="font-size:16px;">I agree 😍 it completes well this guide: <a href="https://www.liveblocks.io" target="_blank" rel="noopener noreferrer" style="text-underline-offset:4px;">https://www.liveblocks.io</a></p>';
      const expected2: ThreadNotificationEmailDataAsHtml = {
        type: "unreadReplies",
        comments: [
          {
            id: comment2.id,
            threadId: thread.id,
            roomId: ROOM_ID_TEST,
            createdAt: comment2.createdAt,
            author: {
              id: comment2.userId,
              info: { name: "Mislav Abha" },
            },
            body: body2,
            url: getResolvedCommentUrl(comment2.id),
          },
        ],
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      test.each<{
        withResolvers: boolean;
        promise: () => Promise<ThreadNotificationEmailDataAsHtml | null>;
        expected: ThreadNotificationEmailDataAsHtml;
      }>([
        {
          withResolvers: false,
          promise: () =>
            prepareThreadNotificationEmailAsHtml(client, event, {
              styles,
            }),
          expected: expected1,
        },
        {
          withResolvers: true,
          promise: () =>
            prepareThreadNotificationEmailAsHtml(client, event, {
              resolveUsers,
              resolveRoomInfo,
              styles,
            }),
          expected: expected2,
        },
      ])(
        "should return unread replies as html with resolvers: $withResolvers",
        async ({ promise, expected }) => {
          setServerHandlers({
            thread,
            inboxNotification,
            groups: [],
          });

          const threadNotificationEmailAsHTML = await promise();
          expect(threadNotificationEmailAsHTML).toEqual(expected);
        }
      );
    });
  });

  describe("prepare thread notification email as React", () => {
    describe("unread mention w/o custom components", () => {
      const { comment, thread, inboxNotification, event } =
        makeUnreadMentionDataset();

      const body1 = (
        <div>
          <p>
            <span>Hello</span>
            <span> </span>
            <span data-mention>@user-1</span>
            <span> </span>
            <span>!</span>
          </p>
        </div>
      );
      const expected1: ThreadNotificationEmailDataAsReact = {
        type: "unreadMention",
        comment: {
          id: comment.id,
          threadId: thread.id,
          roomId: ROOM_ID_TEST,
          createdAt: comment.createdAt,
          author: {
            id: comment.userId,
            info: {
              name: comment.userId,
            },
          },
          body: body1,
          url: undefined,
        },
        roomInfo: { name: ROOM_ID_TEST },
      };

      const body2 = (
        <div>
          <p>
            <span>Hello</span>
            <span> </span>
            <span data-mention>@Mislav Abha</span>
            <span> </span>
            <span>!</span>
          </p>
        </div>
      );
      const expected2: ThreadNotificationEmailDataAsReact = {
        type: "unreadMention",
        comment: {
          id: comment.id,
          threadId: thread.id,
          roomId: ROOM_ID_TEST,
          createdAt: comment.createdAt,
          author: {
            id: comment.userId,
            info: {
              name: "Charlie Layne",
            },
          },
          body: body2,
          url: getResolvedCommentUrl(comment.id),
        },
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      test.each<{
        withResolvers: boolean;
        promise: () => Promise<ThreadNotificationEmailDataAsReact | null>;
        expected: ThreadNotificationEmailDataAsReact;
      }>([
        {
          withResolvers: false,
          promise: () => prepareThreadNotificationEmailAsReact(client, event),
          expected: expected1,
        },
        {
          withResolvers: true,
          promise: () =>
            prepareThreadNotificationEmailAsReact(client, event, {
              resolveUsers,
              resolveRoomInfo,
            }),
          expected: expected2,
        },
      ])(
        "should return unread mention as React with resolvers: $withResolvers",
        async ({ promise, expected }) => {
          setServerHandlers({
            thread,
            inboxNotification,
            groups: [],
          });

          const threadNotificationEmailAsReact = await promise();

          const resultConverted = commentBodiesAsReactToStaticMarkup(
            threadNotificationEmailAsReact
          );
          const expectedConverted =
            commentBodiesAsReactToStaticMarkup(expected);

          expect(resultConverted).toEqual(expectedConverted);
        }
      );
    });

    describe("unread mention w/ custom components", () => {
      const components: Partial<ConvertCommentBodyAsReactComponents> = {
        Container: ({ children }) => <main>{children}</main>,
        Mention: ({ element, user, group }) => (
          <span>u#{user?.name ?? group?.name ?? element.id}</span>
        ),
      };

      const { comment, thread, inboxNotification, event } =
        makeUnreadMentionDataset();

      const body1 = (
        <main>
          <p>
            <span>Hello</span>
            <span> </span>
            <span>u#user-1</span>
            <span> </span>
            <span>!</span>
          </p>
        </main>
      );

      const expected1: ThreadNotificationEmailDataAsReact = {
        type: "unreadMention",
        comment: {
          id: comment.id,
          threadId: thread.id,
          roomId: ROOM_ID_TEST,
          createdAt: comment.createdAt,
          author: {
            id: comment.userId,
            info: {
              name: comment.userId,
            },
          },
          body: body1,
          url: undefined,
        },
        roomInfo: { name: ROOM_ID_TEST },
      };

      const body2 = (
        <main>
          <p>
            <span>Hello</span>
            <span> </span>
            <span>u#Mislav Abha</span>
            <span> </span>
            <span>!</span>
          </p>
        </main>
      );

      const expected2: ThreadNotificationEmailDataAsReact = {
        type: "unreadMention",
        comment: {
          id: comment.id,
          threadId: thread.id,
          roomId: ROOM_ID_TEST,
          createdAt: comment.createdAt,
          author: {
            id: comment.userId,
            info: {
              name: "Charlie Layne",
            },
          },
          body: body2,
          url: getResolvedCommentUrl(comment.id),
        },
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      test.each<{
        withResolvers: boolean;
        promise: () => Promise<ThreadNotificationEmailDataAsReact | null>;
        expected: ThreadNotificationEmailDataAsReact;
      }>([
        {
          withResolvers: false,
          promise: () =>
            prepareThreadNotificationEmailAsReact(client, event, {
              components,
            }),
          expected: expected1,
        },
        {
          withResolvers: true,
          promise: () =>
            prepareThreadNotificationEmailAsReact(client, event, {
              resolveUsers,
              resolveRoomInfo,
              components,
            }),
          expected: expected2,
        },
      ])(
        "should return unread mention as React with resolvers: $withResolvers",
        async ({ promise, expected }) => {
          setServerHandlers({
            thread,
            inboxNotification,
            groups: [],
          });

          const threadNotificationEmailAsReact = await promise();

          const resultConverted = commentBodiesAsReactToStaticMarkup(
            threadNotificationEmailAsReact
          );
          const expectedConverted =
            commentBodiesAsReactToStaticMarkup(expected);

          expect(resultConverted).toEqual(expectedConverted);
        }
      );
    });

    describe("unread replies w/o custom components", () => {
      const { comment2, thread, inboxNotification, event } =
        makeUnreadRepliesDataset();

      const body1 = (
        <div>
          <p>
            <span>I agree 😍 it completes well this guide: </span>
            <a
              href="https://www.liveblocks.io"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://www.liveblocks.io
            </a>
          </p>
        </div>
      );
      const expected1: ThreadNotificationEmailDataAsReact = {
        type: "unreadReplies",
        comments: [
          {
            id: comment2.id,
            threadId: thread.id,
            roomId: ROOM_ID_TEST,
            createdAt: comment2.createdAt,
            author: {
              id: comment2.userId,
              info: {
                name: comment2.userId,
              },
            },
            body: body1,
            url: undefined,
          },
        ],
        roomInfo: { name: ROOM_ID_TEST },
      };

      const body2 = (
        <div>
          <p>
            <span>I agree 😍 it completes well this guide: </span>
            <a
              href="https://www.liveblocks.io"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://www.liveblocks.io
            </a>
          </p>
        </div>
      );
      const expected2: ThreadNotificationEmailDataAsReact = {
        type: "unreadReplies",
        comments: [
          {
            id: comment2.id,
            threadId: thread.id,
            roomId: ROOM_ID_TEST,
            createdAt: comment2.createdAt,
            author: {
              id: comment2.userId,
              info: { name: "Mislav Abha" },
            },
            body: body2,
            url: getResolvedCommentUrl(comment2.id),
          },
        ],
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      test.each<{
        withResolvers: boolean;
        promise: () => Promise<ThreadNotificationEmailDataAsReact | null>;
        expected: ThreadNotificationEmailDataAsReact;
      }>([
        {
          withResolvers: false,
          promise: () => prepareThreadNotificationEmailAsReact(client, event),
          expected: expected1,
        },
        {
          withResolvers: true,
          promise: () =>
            prepareThreadNotificationEmailAsReact(client, event, {
              resolveUsers,
              resolveRoomInfo,
            }),
          expected: expected2,
        },
      ])(
        "should return unread replies as React with resolvers: $withResolvers",
        async ({ promise, expected }) => {
          setServerHandlers({
            thread,
            inboxNotification,
            groups: [],
          });

          const threadNotificationEmailAsReact = await promise();

          const resultConverted = commentBodiesAsReactToStaticMarkup(
            threadNotificationEmailAsReact
          );
          const expectedConverted =
            commentBodiesAsReactToStaticMarkup(expected);

          expect(resultConverted).toEqual(expectedConverted);
        }
      );
    });

    describe("unread replies w/ custom components", () => {
      const components: Partial<ConvertCommentBodyAsReactComponents> = {
        Container: ({ children }) => <main>{children}</main>,
        Link: ({ element, href }) => (
          <a href={href} data-link>
            {element.text ?? element.url}
          </a>
        ),
      };

      const { comment2, thread, inboxNotification, event } =
        makeUnreadRepliesDataset();

      const body1 = (
        <main>
          <p>
            <span>I agree 😍 it completes well this guide: </span>
            <a href="https://www.liveblocks.io" data-link>
              https://www.liveblocks.io
            </a>
          </p>
        </main>
      );
      const expected1: ThreadNotificationEmailDataAsReact = {
        type: "unreadReplies",
        comments: [
          {
            id: comment2.id,
            threadId: thread.id,
            roomId: ROOM_ID_TEST,
            createdAt: comment2.createdAt,
            author: {
              id: comment2.userId,
              info: {
                name: comment2.userId,
              },
            },
            body: body1,
            url: undefined,
          },
        ],
        roomInfo: { name: ROOM_ID_TEST },
      };

      const body2 = (
        <main>
          <p>
            <span>I agree 😍 it completes well this guide: </span>
            <a href="https://www.liveblocks.io" data-link>
              https://www.liveblocks.io
            </a>
          </p>
        </main>
      );
      const expected2: ThreadNotificationEmailDataAsReact = {
        type: "unreadReplies",
        comments: [
          {
            id: comment2.id,
            threadId: thread.id,
            roomId: ROOM_ID_TEST,
            createdAt: comment2.createdAt,
            author: {
              id: comment2.userId,
              info: { name: "Mislav Abha" },
            },
            body: body2,
            url: getResolvedCommentUrl(comment2.id),
          },
        ],
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      test.each<{
        withResolvers: boolean;
        promise: () => Promise<ThreadNotificationEmailDataAsReact | null>;
        expected: ThreadNotificationEmailDataAsReact;
      }>([
        {
          withResolvers: false,
          promise: () =>
            prepareThreadNotificationEmailAsReact(client, event, {
              components,
            }),
          expected: expected1,
        },
        {
          withResolvers: true,
          promise: () =>
            prepareThreadNotificationEmailAsReact(client, event, {
              resolveUsers,
              resolveRoomInfo,
              components,
            }),
          expected: expected2,
        },
      ])(
        "should return unread replies as React with resolvers: $withResolvers",
        async ({ promise, expected }) => {
          setServerHandlers({
            thread,
            inboxNotification,
            groups: [],
          });

          const threadNotificationEmailAsReact = await promise();

          const resultConverted = commentBodiesAsReactToStaticMarkup(
            threadNotificationEmailAsReact
          );
          const expectedConverted =
            commentBodiesAsReactToStaticMarkup(expected);

          expect(resultConverted).toEqual(expectedConverted);
        }
      );
    });
  });
});
