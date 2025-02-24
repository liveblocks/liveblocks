import type { InboxNotificationThreadData } from "@liveblocks/core";
import type { ThreadData } from "@liveblocks/node";
import { Liveblocks } from "@liveblocks/node";
import { http, HttpResponse } from "msw";

import type {
  ConvertCommentBodyAsHtmlStyles,
  ConvertCommentBodyAsReactComponents,
} from "../comment-body";
import type {
  CommentEmailBaseData,
  ThreadNotificationData,
  ThreadNotificationEmailBaseData,
  ThreadNotificationEmailDataAsHtml,
  ThreadNotificationEmailDataAsReact,
} from "../thread-notification";
import {
  extractThreadNotificationData,
  getLastUnreadCommentWithMention,
  getUnreadComments,
  makeCommentEmailBaseData,
  prepareThreadNotificationEmailAsHtml,
  prepareThreadNotificationEmailAsReact,
  prepareThreadNotificationEmailBaseData,
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
  }: {
    thread: ThreadData;
    inboxNotification: InboxNotificationThreadData;
  }): void => {
    server.use(
      http.get(`${SERVER_BASE_URL}/v2/rooms/:roomId/threads/:threadId`, () =>
        HttpResponse.json(thread, { status: 200 })
      ),
      http.get(
        `${SERVER_BASE_URL}/v2/users/:userId/inbox-notifications/:notificationId`,
        () => HttpResponse.json(inboxNotification, { status: 200 })
      )
    );
  };

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

    it("should extract null (no last unread comment with a mention nor unread replies) from a thread notification", async () => {
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
        readAt: new Date("2024-09-10T08:12:00.000Z"),
      });

      setServerHandlers({ thread, inboxNotification });

      const event = makeThreadNotificationEvent({
        threadId,
        userId: "user-1",
        inboxNotificationId: inboxNotification.id,
      });

      const extracted = await extractThreadNotificationData({ client, event });
      expect(extracted).toBeNull();
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

      setServerHandlers({ thread, inboxNotification });

      const event = makeThreadNotificationEvent({
        threadId,
        userId: "user-1",
        inboxNotificationId: inboxNotification.id,
      });

      const extracted = await extractThreadNotificationData({ client, event });
      const expected: ThreadNotificationData = {
        type: "unreadMention",
        comment: makeCommentWithBody({ comment }),
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

      setServerHandlers({ thread, inboxNotification });

      const event = makeThreadNotificationEvent({
        threadId,
        userId: "user-dracula",
        inboxNotificationId: inboxNotification.id,
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

    it("should make a comment email base data", () => {
      const threadId = generateThreadId();
      const comment = makeComment({
        userId: "user-0",
        threadId,
        body: commentBody1,
      });

      const commentWithBody = makeCommentWithBody({ comment });
      const commentEmailBaseData1 = makeCommentEmailBaseData({
        roomInfo: undefined,
        comment: commentWithBody,
      });
      const commentEmailBaseData2 = makeCommentEmailBaseData({
        roomInfo: RESOLVED_ROOM_INFO_TEST,
        comment: commentWithBody,
      });

      const expected1: CommentEmailBaseData = {
        id: commentWithBody.id,
        userId: commentWithBody.userId,
        threadId: commentWithBody.threadId,
        roomId: commentWithBody.roomId,
        createdAt: commentWithBody.createdAt,
        url: undefined,
        rawBody: commentWithBody.body,
      };

      const expected2: CommentEmailBaseData = {
        id: commentWithBody.id,
        userId: commentWithBody.userId,
        threadId: commentWithBody.threadId,
        roomId: commentWithBody.roomId,
        createdAt: commentWithBody.createdAt,
        url: getResolvedCommentUrl(commentWithBody.id),
        rawBody: commentWithBody.body,
      };

      expect(commentEmailBaseData1).toEqual(expected1);
      expect(commentEmailBaseData2).toEqual(expected2);
    });
  });

  describe("prepare thread notification email base data", () => {
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

      setServerHandlers({ thread, inboxNotification });

      const event = makeThreadNotificationEvent({
        threadId,
        userId: "user-1",
        inboxNotificationId: inboxNotification.id,
      });

      const [preparedWithUnresolvedRoomInfo, preparedWithResolvedRoomInfo] =
        await Promise.all([
          prepareThreadNotificationEmailBaseData({ client, event }),
          prepareThreadNotificationEmailBaseData({
            client,
            event,
            options: { resolveRoomInfo },
          }),
        ]);
      const expectedComment = makeCommentWithBody({ comment });
      const expected1: ThreadNotificationEmailBaseData = {
        type: "unreadMention",
        comment: makeCommentEmailBaseData({
          roomInfo: undefined,
          comment: expectedComment,
        }),
        roomInfo: {
          name: ROOM_ID_TEST,
        },
      };
      const expected2: ThreadNotificationEmailBaseData = {
        type: "unreadMention",
        comment: makeCommentEmailBaseData({
          roomInfo: RESOLVED_ROOM_INFO_TEST,
          comment: expectedComment,
        }),
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };
      expect(preparedWithUnresolvedRoomInfo).toEqual(expected1);
      expect(preparedWithResolvedRoomInfo).toEqual(expected2);
    });

    it("should prepare for unread replies comments", async () => {
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

      setServerHandlers({ thread, inboxNotification });

      const event = makeThreadNotificationEvent({
        threadId,
        userId: "user-dracula",
        inboxNotificationId: inboxNotification.id,
      });

      const [preparedWithUnresolvedRoomInfo, preparedWithResolvedRoomInfo] =
        await Promise.all([
          prepareThreadNotificationEmailBaseData({ client, event }),
          prepareThreadNotificationEmailBaseData({
            client,
            event,
            options: { resolveRoomInfo },
          }),
        ]);
      const expectedComments = [
        makeCommentWithBody({ comment: comment2 }),
        makeCommentWithBody({ comment: comment3 }),
      ];

      const expected1: ThreadNotificationEmailBaseData = {
        type: "unreadReplies",
        comments: expectedComments.map((c) =>
          makeCommentEmailBaseData({ roomInfo: undefined, comment: c })
        ),
        roomInfo: {
          name: ROOM_ID_TEST,
        },
      };

      const expected2: ThreadNotificationEmailBaseData = {
        type: "unreadReplies",
        comments: expectedComments.map((c) =>
          makeCommentEmailBaseData({
            roomInfo: RESOLVED_ROOM_INFO_TEST,
            comment: c,
          })
        ),
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
          htmlBody:
            '<p style="font-size:14px;">Hello <span data-mention style="color:blue;">@user-1</span> !</p>',
          url: undefined,
        },
        roomInfo: { name: ROOM_ID_TEST },
      };

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
          htmlBody:
            '<p style="font-size:14px;">Hello <span data-mention style="color:blue;">@Mislav Abha</span> !</p>',
          url: getResolvedCommentUrl(comment.id),
        },
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      it.each<{
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
          htmlBody:
            '<p style="font-size:16px;">Hello <span data-mention style="color:purple;">@user-1</span> !</p>',
          url: undefined,
        },
        roomInfo: { name: ROOM_ID_TEST },
      };

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
          htmlBody:
            '<p style="font-size:16px;">Hello <span data-mention style="color:purple;">@Mislav Abha</span> !</p>',
          url: getResolvedCommentUrl(comment.id),
        },
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      it.each<{
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
          });

          const threadNotificationEmailAsHTML = await promise();
          expect(threadNotificationEmailAsHTML).toEqual(expected);
        }
      );
    });

    describe("unread replies w/o styles design tokens", () => {
      const { comment2, thread, inboxNotification, event } =
        makeUnreadRepliesDataset();

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
            htmlBody:
              '<p style="font-size:14px;">I agree 😍 it completes well this guide: <a href="https://www.liveblocks.io" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;">https://www.liveblocks.io</a></p>',
            url: undefined,
          },
        ],
        roomInfo: { name: ROOM_ID_TEST },
      };

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
            htmlBody:
              '<p style="font-size:14px;">I agree 😍 it completes well this guide: <a href="https://www.liveblocks.io" target="_blank" rel="noopener noreferrer" style="text-decoration:underline;">https://www.liveblocks.io</a></p>',
            url: getResolvedCommentUrl(comment2.id),
          },
        ],
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      it.each<{
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
            htmlBody:
              '<p style="font-size:16px;">I agree 😍 it completes well this guide: <a href="https://www.liveblocks.io" target="_blank" rel="noopener noreferrer" style="text-underline-offset:4px;">https://www.liveblocks.io</a></p>',
            url: undefined,
          },
        ],
        roomInfo: { name: ROOM_ID_TEST },
      };

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
            htmlBody:
              '<p style="font-size:16px;">I agree 😍 it completes well this guide: <a href="https://www.liveblocks.io" target="_blank" rel="noopener noreferrer" style="text-underline-offset:4px;">https://www.liveblocks.io</a></p>',
            url: getResolvedCommentUrl(comment2.id),
          },
        ],
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      it.each<{
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
          reactBody: (
            <div>
              <p>
                <span>Hello</span>
                <span> </span>
                <span data-mention>@user-1</span>
                <span> </span>
                <span>!</span>
              </p>
            </div>
          ),
          url: undefined,
        },
        roomInfo: { name: ROOM_ID_TEST },
      };

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
          reactBody: (
            <div>
              <p>
                <span>Hello</span>
                <span> </span>
                <span data-mention>@Mislav Abha</span>
                <span> </span>
                <span>!</span>
              </p>
            </div>
          ),
          url: getResolvedCommentUrl(comment.id),
        },
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      it.each<{
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
        Mention: ({ element, user }) => (
          <span>u#{user?.name ?? element.id}</span>
        ),
      };

      const { comment, thread, inboxNotification, event } =
        makeUnreadMentionDataset();

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
          reactBody: (
            <main>
              <p>
                <span>Hello</span>
                <span> </span>
                <span>u#user-1</span>
                <span> </span>
                <span>!</span>
              </p>
            </main>
          ),
          url: undefined,
        },
        roomInfo: { name: ROOM_ID_TEST },
      };

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
          reactBody: (
            <main>
              <p>
                <span>Hello</span>
                <span> </span>
                <span>u#Mislav Abha</span>
                <span> </span>
                <span>!</span>
              </p>
            </main>
          ),
          url: getResolvedCommentUrl(comment.id),
        },
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      it.each<{
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
            reactBody: (
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
            ),
            url: undefined,
          },
        ],
        roomInfo: { name: ROOM_ID_TEST },
      };

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
            reactBody: (
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
            ),
            url: getResolvedCommentUrl(comment2.id),
          },
        ],
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      it.each<{
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
            reactBody: (
              <main>
                <p>
                  <span>I agree 😍 it completes well this guide: </span>
                  <a href="https://www.liveblocks.io" data-link>
                    https://www.liveblocks.io
                  </a>
                </p>
              </main>
            ),
            url: undefined,
          },
        ],
        roomInfo: { name: ROOM_ID_TEST },
      };

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
            reactBody: (
              <main>
                <p>
                  <span>I agree 😍 it completes well this guide: </span>
                  <a href="https://www.liveblocks.io" data-link>
                    https://www.liveblocks.io
                  </a>
                </p>
              </main>
            ),
            url: getResolvedCommentUrl(comment2.id),
          },
        ],
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      it.each<{
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
