import { Liveblocks } from "@liveblocks/node";
import { http, HttpResponse } from "msw";

import type {
  ConvertTextEditorNodesAsHtmlStyles,
  ConvertTextEditorNodesAsReactComponents,
} from "../liveblocks-text-editor";
import type {
  TextMentionNotificationData,
  TextMentionNotificationEmailBaseData,
  TextMentionNotificationEmailDataAsHtml,
  TextMentionNotificationEmailDataAsReact,
} from "../text-mention-notification";
import {
  extractTextMentionNotificationData,
  prepareTextMentionNotificationEmailAsHtml,
  prepareTextMentionNotificationEmailAsReact,
  prepareTextMentionNotificationEmailBaseData,
} from "../text-mention-notification";
import {
  generateInboxNotificationId,
  generateThreadId,
  makeRoomWithTextEditor,
  makeTextMentionInboxNotification,
  makeTextMentionNotificationEvent,
  makeThreadInboxNotification,
  RESOLVED_ROOM_INFO_TEST,
  resolveRoomInfo,
  resolveUsers,
  ROOM_ID_TEST,
  ROOM_TEST,
  server,
  SERVER_BASE_URL,
  textMentionContentAsReactToStaticMarkup,
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
      const warnMock2 = jest.fn();
      jest.spyOn(console, "warn").mockImplementation(warnMock2);

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
      expect(warnMock2).toHaveBeenCalledWith(
        `Room "${ROOM_ID_TEST}" does not a text editor associated with it`
      );

      warnMock2.mockRestore();
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

  describe("prepare text mention notification email base data", () => {
    it("should extract mention and nodes and prepare base email data", async () => {
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

      const [preparedWithUnresolvedRoomInfo, preparedWithResolvedRoomInfo] =
        await Promise.all([
          prepareTextMentionNotificationEmailBaseData({
            client,
            event,
          }),
          prepareTextMentionNotificationEmailBaseData({
            client,
            event,
            options: { resolveRoomInfo },
          }),
        ]);

      const base: Omit<TextMentionNotificationEmailBaseData, "roomInfo"> = {
        mention: {
          id: MENTION_ID_TIPTAP,
          roomId: room.id,
          userId: inboxNotification.createdBy,
          textEditorNodes: [
            {
              type: "text",
              text: "Hey this a tip tap ",
              bold: false,
              italic: false,
              strikethrough: false,
              code: false,
            },
            {
              type: "text",
              text: "example",
              bold: true,
              italic: true,
              strikethrough: false,
              code: false,
            },
            {
              type: "text",
              text: " hiha! ",
              bold: false,
              italic: false,
              strikethrough: false,
              code: false,
            },
            {
              type: "mention",
              userId: MENTIONED_USER_ID_TIPTAP,
            },
            {
              type: "text",
              text: " fun right?",
              bold: false,
              italic: false,
              strikethrough: false,
              code: false,
            },
          ],
          createdAt: inboxNotification.notifiedAt,
        },
      };

      const expected1: TextMentionNotificationEmailBaseData = {
        ...base,
        roomInfo: {
          name: ROOM_ID_TEST,
        },
      };
      const expected2: TextMentionNotificationEmailBaseData = {
        ...base,
        roomInfo: RESOLVED_ROOM_INFO_TEST,
      };

      expect(preparedWithUnresolvedRoomInfo).toEqual(expected1);
      expect(preparedWithResolvedRoomInfo).toEqual(expected2);
    });
  });

  describe("prepare text mention notification email as html", () => {
    const inboxNotification = makeTextMentionInboxNotification({
      mentionId: MENTION_ID_TIPTAP,
      createdBy: "user-1",
      notifiedAt: new Date("2024-09-10T08:10:00.000Z"),
    });

    const room = makeRoomWithTextEditor({ editor: "tiptap" });

    const event = makeTextMentionNotificationEvent({
      userId: MENTIONED_USER_ID_TIPTAP,
      mentionId: MENTION_ID_TIPTAP,
      inboxNotificationId: inboxNotification.id,
    });

    const styles: Partial<ConvertTextEditorNodesAsHtmlStyles> = {
      container: {
        fontSize: "16px",
      },
    };

    const expected1: TextMentionNotificationEmailDataAsHtml = {
      mention: {
        id: MENTION_ID_TIPTAP,
        roomId: room.id,
        author: { id: "user-1", info: { name: "user-1" } },
        createdAt: inboxNotification.notifiedAt,
        htmlContent:
          '<div style="font-size:16px;">Hey this a tip tap <em><strong style="font-weight:500;">example</strong></em> hiha! <span data-mention style="color:blue;">@user-0</span> fun right?</div>',
      },
      roomInfo: {
        name: ROOM_ID_TEST,
      },
    };

    const expected2: TextMentionNotificationEmailDataAsHtml = {
      mention: {
        id: MENTION_ID_TIPTAP,
        roomId: room.id,
        author: { id: "user-1", info: { name: "Mislav Abha" } },
        createdAt: inboxNotification.notifiedAt,
        htmlContent:
          '<div style="font-size:16px;">Hey this a tip tap <em><strong style="font-weight:500;">example</strong></em> hiha! <span data-mention style="color:blue;">@Charlie Layne</span> fun right?</div>',
      },
      roomInfo: RESOLVED_ROOM_INFO_TEST,
    };

    it.each<{
      withResolvers: boolean;
      promise: () => Promise<TextMentionNotificationEmailDataAsHtml | null>;
      expected: TextMentionNotificationEmailDataAsHtml;
    }>([
      {
        withResolvers: false,
        promise: () =>
          prepareTextMentionNotificationEmailAsHtml(client, event, { styles }),
        expected: expected1,
      },
      {
        withResolvers: true,
        promise: () =>
          prepareTextMentionNotificationEmailAsHtml(client, event, {
            styles,
            resolveUsers,
            resolveRoomInfo,
          }),
        expected: expected2,
      },
    ])(
      "should return text mention as html with resolvers: $withResolvers",
      async ({ promise, expected }) => {
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

        const textMentionNotificationEmailAsHtml = await promise();
        expect(textMentionNotificationEmailAsHtml).toEqual(expected);
      }
    );
  });

  describe("prepare text mention notification email as React", () => {
    const inboxNotification = makeTextMentionInboxNotification({
      mentionId: MENTION_ID_TIPTAP,
      createdBy: "user-1",
      notifiedAt: new Date("2024-09-10T08:10:00.000Z"),
    });

    const room = makeRoomWithTextEditor({ editor: "tiptap" });

    const event = makeTextMentionNotificationEvent({
      userId: MENTIONED_USER_ID_TIPTAP,
      mentionId: MENTION_ID_TIPTAP,
      inboxNotificationId: inboxNotification.id,
    });

    const components: Partial<ConvertTextEditorNodesAsReactComponents> = {
      Container: ({ children }) => <main>{children}</main>,
    };

    const expected1: TextMentionNotificationEmailDataAsReact = {
      mention: {
        id: MENTION_ID_TIPTAP,
        roomId: room.id,
        author: { id: "user-1", info: { name: "user-1" } },
        createdAt: inboxNotification.notifiedAt,
        reactContent: (
          <main>
            <span>Hey this a tip tap </span>
            <span>
              <em>
                <strong>example</strong>
              </em>
            </span>
            <span> hiha! </span>
            <span data-mention>@user-0</span>
            <span> fun right?</span>
          </main>
        ),
      },
      roomInfo: {
        name: ROOM_ID_TEST,
      },
    };

    it.each<{
      withResolvers: boolean;
      promise: () => Promise<TextMentionNotificationEmailDataAsReact | null>;
      expected: TextMentionNotificationEmailDataAsReact;
    }>([
      {
        withResolvers: false,
        promise: () =>
          prepareTextMentionNotificationEmailAsReact(client, event, {
            components,
          }),
        expected: expected1,
      },
    ])(
      "should return text mention as React with resolvers: $withResolvers",
      async ({ promise, expected }) => {
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

        const emailData = await promise();

        const emailDataWithStringContent =
          textMentionContentAsReactToStaticMarkup(emailData);
        const expectedWithStringContent =
          textMentionContentAsReactToStaticMarkup(expected);
        expect(emailDataWithStringContent).toEqual(expectedWithStringContent);
      }
    );
  });
});
