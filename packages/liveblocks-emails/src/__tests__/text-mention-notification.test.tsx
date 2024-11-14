import { Liveblocks } from "@liveblocks/node";
import { http, HttpResponse } from "msw";

import type { TextMentionNotificationData } from "../text-mention-notification";
import { extractTextMentionNotificationData } from "../text-mention-notification";
import {
  generateInboxNotificationId,
  generateThreadId,
  makeRoomWithTextEditor,
  makeTextMentionInboxNotification,
  makeTextMentionNotificationEvent,
  makeThreadInboxNotification,
  ROOM_TEST,
  server,
  SERVER_BASE_URL,
} from "./_helpers";
import {
  createTipTapMentionNodeWithContext,
  docUpdateBuffer as docUpdateBufferTiptap,
  MENTION_ID as MENTION_ID_TIPTAP,
  MENTIONED_USER_ID as MENTIONED_USER_ID_TIPTAP,
} from "./_tiptap-helpers";

describe("text mention notification", () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  const client = new Liveblocks({ secret: "sk_xxx" });

  describe("internals utils", () => {
    it("should extract `null` - bad bad notification kind", async () => {
      const warnMock1 = jest.fn();
      jest.spyOn(console, "warn").mockImplementation(warnMock1);

      const mentionId = generateInboxNotificationId();
      const badInboxNotification = makeThreadInboxNotification({
        threadId: generateThreadId(),
        notifiedAt: new Date("2024-09-10T08:10:00.000Z"),
        readAt: new Date("2024-09-10T08:12:00.000Z"),
      });

      const room = makeRoomWithTextEditor();

      server.use(
        http.get(
          `${SERVER_BASE_URL}/v2/users/:userId/inbox-notifications/:notificationId`,
          () => HttpResponse.json(badInboxNotification, { status: 200 })
        )
      );

      server.use(
        http.get(`${SERVER_BASE_URL}/v2/rooms/:roomId`, () =>
          HttpResponse.json(room, { status: 200 })
        )
      );

      const event = makeTextMentionNotificationEvent({
        userId: "user-0",
        mentionId,
        inboxNotificationId: badInboxNotification.id,
      });

      const extracted = await extractTextMentionNotificationData({
        client,
        event,
      });

      expect(extracted).toBeNull();
      expect(warnMock1).toHaveBeenCalledWith(
        'Inbox notification is not of kind "textMention"'
      );

      warnMock1.mockRestore();
    });

    it("should extract `null` - notification is already read", async () => {
      const mentionId = generateInboxNotificationId();
      const inboxNotification = makeTextMentionInboxNotification({
        mentionId,
        createdBy: "user-0",
        notifiedAt: new Date("2024-09-10T08:10:00.000Z"),
        readAt: new Date("2024-09-10T08:12:00.000Z"),
      });

      const room = makeRoomWithTextEditor();

      server.use(
        http.get(
          `${SERVER_BASE_URL}/v2/users/:userId/inbox-notifications/:notificationId`,
          () => HttpResponse.json(inboxNotification, { status: 200 })
        )
      );

      server.use(
        http.get(`${SERVER_BASE_URL}/v2/rooms/:roomId`, () =>
          HttpResponse.json(room, { status: 200 })
        )
      );

      const event = makeTextMentionNotificationEvent({
        userId: "user-2",
        mentionId,
        inboxNotificationId: inboxNotification.id,
      });

      const extracted = await extractTextMentionNotificationData({
        client,
        event,
      });

      expect(extracted).toBeNull();
    });

    it("should extract `null` - no text editor associated", async () => {
      const mentionId = generateInboxNotificationId();
      const inboxNotification = makeTextMentionInboxNotification({
        mentionId,
        createdBy: "user-0",
        notifiedAt: new Date("2024-09-10T08:10:00.000Z"),
      });

      server.use(
        http.get(
          `${SERVER_BASE_URL}/v2/users/:userId/inbox-notifications/:notificationId`,
          () => HttpResponse.json(inboxNotification, { status: 200 })
        )
      );

      server.use(
        http.get(`${SERVER_BASE_URL}/v2/rooms/:roomId`, () =>
          HttpResponse.json(ROOM_TEST, { status: 200 })
        )
      );

      const event = makeTextMentionNotificationEvent({
        userId: "user-1",
        mentionId,
        inboxNotificationId: inboxNotification.id,
      });

      const extracted = await extractTextMentionNotificationData({
        client,
        event,
      });

      expect(extracted).toBeNull();
    });

    it("should extract a text mention notification data", async () => {
      const inboxNotification = makeTextMentionInboxNotification({
        mentionId: MENTION_ID_TIPTAP,
        createdBy: "user-nimesh",
        notifiedAt: new Date("2024-09-10T08:10:00.000Z"),
      });

      const room = makeRoomWithTextEditor({ editor: "tiptap" });

      server.use(
        http.get(
          `${SERVER_BASE_URL}/v2/users/:userId/inbox-notifications/:notificationId`,
          () => HttpResponse.json(inboxNotification, { status: 200 })
        )
      );

      server.use(
        http.get(`${SERVER_BASE_URL}/v2/rooms/:roomId`, () =>
          HttpResponse.json(room, { status: 200 })
        )
      );

      server.use(
        http.get(`${SERVER_BASE_URL}/v2/rooms/:roomId/ydoc-binary`, () =>
          HttpResponse.arrayBuffer(docUpdateBufferTiptap)
        )
      );

      const event = makeTextMentionNotificationEvent({
        userId: MENTIONED_USER_ID_TIPTAP,
        mentionId: MENTION_ID_TIPTAP,
        inboxNotificationId: inboxNotification.id,
      });

      const extracted = await extractTextMentionNotificationData({
        client,
        event,
      });

      const mentionNodeWithContext = createTipTapMentionNodeWithContext({
        mentionId: MENTION_ID_TIPTAP,
        mentionedUserId: MENTIONED_USER_ID_TIPTAP,
      });

      const expected: TextMentionNotificationData = {
        editor: "tiptap",
        mentionNodeWithContext,
        createdAt: inboxNotification.notifiedAt,
        userId: inboxNotification.createdBy,
      };

      expect(extracted).toEqual(expected);
    });
  });
});
