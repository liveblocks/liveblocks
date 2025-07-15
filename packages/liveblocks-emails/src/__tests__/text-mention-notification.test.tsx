import type {
  BaseUserMeta,
  InboxNotificationTextMentionData,
} from "@liveblocks/core";
import { Liveblocks, type RoomData } from "@liveblocks/node";
import { http, HttpResponse } from "msw";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import { MENTION_CHARACTER } from "../lib/constants";
import type { ConvertTextMentionContentElements } from "../text-mention-content";
import type {
  ConvertTextEditorNodesAsHtmlStyles,
  ConvertTextEditorNodesAsReactComponents,
  TextMentionNotificationData,
  TextMentionNotificationEmailData,
  TextMentionNotificationEmailDataAsHtml,
  TextMentionNotificationEmailDataAsReact,
} from "../text-mention-notification";
import {
  extractTextMentionNotificationData,
  prepareTextMentionNotificationEmail,
  prepareTextMentionNotificationEmailAsHtml,
  prepareTextMentionNotificationEmailAsReact,
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

  const setServerHandlers = ({
    room,
    inboxNotification,
    docBinaries,
  }: {
    room: RoomData;
    inboxNotification: InboxNotificationTextMentionData;
    docBinaries?: ArrayBuffer;
  }): void => {
    server.use(
      http.get(
        `${SERVER_BASE_URL}/v2/users/:userId/inbox-notifications/:notificationId`,
        () => HttpResponse.json(inboxNotification, { status: 200 })
      ),
      http.get(`${SERVER_BASE_URL}/v2/rooms/:roomId`, () =>
        HttpResponse.json(room, { status: 200 })
      )
    );

    if (docBinaries) {
      server.use(
        http.get(`${SERVER_BASE_URL}/v2/rooms/:roomId/ydoc-binary`, () =>
          HttpResponse.arrayBuffer(docBinaries)
        )
      );
    }
  };

  describe("internals utils", () => {
    test("should extract `null` - bad bad notification kind", async () => {
      const warnMock1 = vi.fn();
      vi.spyOn(console, "warn").mockImplementation(warnMock1);

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
        triggeredAt: new Date(),
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

    test("should extract `null` - notification is already read", async () => {
      const mentionId = generateInboxNotificationId();
      const inboxNotification = makeTextMentionInboxNotification({
        mentionId,
        mention: {
          kind: "user",
          id: "user-2",
        },
        createdBy: "user-0",
        notifiedAt: new Date("2024-09-10T08:10:00.000Z"),
        readAt: new Date("2024-09-10T08:12:00.000Z"),
      });

      const room = makeRoomWithTextEditor();
      setServerHandlers({ room, inboxNotification });

      const event = makeTextMentionNotificationEvent({
        userId: "user-2",
        mentionId,
        inboxNotificationId: inboxNotification.id,
        triggeredAt: new Date(),
      });

      const extracted = await extractTextMentionNotificationData({
        client,
        event,
      });

      expect(extracted).toBeNull();
    });

    test("should extract `null` - no text editor associated", async () => {
      const warnMock2 = vi.fn();
      vi.spyOn(console, "warn").mockImplementation(warnMock2);

      const mentionId = generateInboxNotificationId();
      const inboxNotification = makeTextMentionInboxNotification({
        mentionId,
        mention: {
          kind: "user",
          id: "user-1",
        },
        createdBy: "user-0",
        notifiedAt: new Date("2024-09-10T08:10:00.000Z"),
      });

      setServerHandlers({ room: ROOM_TEST, inboxNotification });

      const event = makeTextMentionNotificationEvent({
        userId: "user-1",
        mentionId,
        inboxNotificationId: inboxNotification.id,
        triggeredAt: new Date(),
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

    test("should extract a text mention notification data", async () => {
      const inboxNotification = makeTextMentionInboxNotification({
        mentionId: MENTION_ID_TIPTAP,
        mention: {
          kind: "user",
          id: MENTIONED_USER_ID_TIPTAP,
        },
        createdBy: "user-nimesh",
        notifiedAt: new Date("2024-09-10T08:10:00.000Z"),
      });

      const room = makeRoomWithTextEditor({ editor: "tiptap" });

      setServerHandlers({
        room,
        inboxNotification,
        docBinaries: docUpdateBufferTiptap,
      });

      const event = makeTextMentionNotificationEvent({
        userId: MENTIONED_USER_ID_TIPTAP,
        mentionId: MENTION_ID_TIPTAP,
        inboxNotificationId: inboxNotification.id,
        triggeredAt: new Date(),
      });

      const extracted = await extractTextMentionNotificationData({
        client,
        event,
      });

      const mentionNodeWithContext = createTipTapMentionNodeWithContext({
        mentionedId: MENTIONED_USER_ID_TIPTAP,
        textMentionId: MENTION_ID_TIPTAP,
      });

      const expected: TextMentionNotificationData = {
        editor: "tiptap",
        mentionNodeWithContext,
        createdAt: inboxNotification.notifiedAt,
        userId: MENTIONED_USER_ID_TIPTAP,
        createdBy: inboxNotification.createdBy,
      };

      expect(extracted).toEqual(expected);
    });
  });

  describe("prepare text mention notification email", () => {
    const elements: ConvertTextMentionContentElements<string, BaseUserMeta> = {
      container: ({ children }) => children.join(""),
      mention: ({ node, user, group }) =>
        `${MENTION_CHARACTER}${user?.name ?? group?.name ?? node.id}`,
      text: ({ node }) => node.text,
    };

    test("should extract mention and nodes and prepare base email data", async () => {
      const inboxNotification = makeTextMentionInboxNotification({
        mentionId: MENTION_ID_TIPTAP,
        mention: {
          kind: "user",
          id: MENTIONED_USER_ID_TIPTAP,
        },
        createdBy: "user-nimesh",
        notifiedAt: new Date("2024-09-10T08:10:00.000Z"),
      });

      const room = makeRoomWithTextEditor({ editor: "tiptap" });
      setServerHandlers({
        room,
        inboxNotification,
        docBinaries: docUpdateBufferTiptap,
      });

      const event = makeTextMentionNotificationEvent({
        userId: MENTIONED_USER_ID_TIPTAP,
        mentionId: MENTION_ID_TIPTAP,
        inboxNotificationId: inboxNotification.id,
        triggeredAt: new Date(),
      });

      const [preparedWithUnresolvedRoomInfo, preparedWithResolvedRoomInfo] =
        await Promise.all([
          prepareTextMentionNotificationEmail(
            client,
            event,
            {},
            elements,
            "test-suite"
          ),
          prepareTextMentionNotificationEmail(
            client,
            event,
            { resolveRoomInfo },
            elements,
            "test-suite"
          ),
        ]);

      const base: Omit<TextMentionNotificationEmailData<string>, "roomInfo"> = {
        mention: {
          textMentionId: MENTION_ID_TIPTAP,
          id: MENTIONED_USER_ID_TIPTAP,
          kind: "user",
          roomId: room.id,
          author: {
            id: "user-nimesh",
            info: { name: "user-nimesh" },
          },
          content: `Hey this a tip tap example hiha! @${MENTIONED_USER_ID_TIPTAP} fun right?`,
          createdAt: inboxNotification.notifiedAt,
        },
      };

      const expected1: TextMentionNotificationEmailData<string> = {
        ...base,
        roomInfo: {
          name: ROOM_ID_TEST,
        },
      };
      const expected2: TextMentionNotificationEmailData<string> = {
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
      mention: {
        kind: "user",
        id: MENTIONED_USER_ID_TIPTAP,
      },
      createdBy: "user-1",
      notifiedAt: new Date("2024-09-10T08:10:00.000Z"),
    });

    const room = makeRoomWithTextEditor({ editor: "tiptap" });

    const event = makeTextMentionNotificationEvent({
      userId: MENTIONED_USER_ID_TIPTAP,
      mentionId: MENTION_ID_TIPTAP,
      inboxNotificationId: inboxNotification.id,
      triggeredAt: new Date(),
    });

    const styles: Partial<ConvertTextEditorNodesAsHtmlStyles> = {
      container: {
        fontSize: "16px",
      },
    };

    const expected1: TextMentionNotificationEmailDataAsHtml = {
      mention: {
        textMentionId: MENTION_ID_TIPTAP,
        id: MENTIONED_USER_ID_TIPTAP,
        kind: "user",
        roomId: room.id,
        author: { id: "user-1", info: { name: "user-1" } },
        createdAt: inboxNotification.notifiedAt,
        content:
          '<div style="font-size:16px;">Hey this a tip tap <em><strong style="font-weight:500;">example</strong></em> hiha! <span data-mention style="color:blue;">@user-0</span> fun right?</div>',
      },
      roomInfo: {
        name: ROOM_ID_TEST,
      },
    };

    const expected2: TextMentionNotificationEmailDataAsHtml = {
      mention: {
        textMentionId: MENTION_ID_TIPTAP,
        id: MENTIONED_USER_ID_TIPTAP,
        kind: "user",
        roomId: room.id,
        author: { id: "user-1", info: { name: "Mislav Abha" } },
        createdAt: inboxNotification.notifiedAt,
        content:
          '<div style="font-size:16px;">Hey this a tip tap <em><strong style="font-weight:500;">example</strong></em> hiha! <span data-mention style="color:blue;">@Charlie Layne</span> fun right?</div>',
      },
      roomInfo: RESOLVED_ROOM_INFO_TEST,
    };

    test.each<{
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
        setServerHandlers({
          room,
          inboxNotification,
          docBinaries: docUpdateBufferTiptap,
        });

        const textMentionNotificationEmailAsHtml = await promise();
        expect(textMentionNotificationEmailAsHtml).toEqual(expected);
      }
    );
  });

  describe("prepare text mention notification email as React", () => {
    const inboxNotification = makeTextMentionInboxNotification({
      mentionId: MENTION_ID_TIPTAP,
      mention: {
        kind: "user",
        id: MENTIONED_USER_ID_TIPTAP,
      },
      createdBy: "user-1",
      notifiedAt: new Date("2024-09-10T08:10:00.000Z"),
    });

    const room = makeRoomWithTextEditor({ editor: "tiptap" });

    const event = makeTextMentionNotificationEvent({
      userId: MENTIONED_USER_ID_TIPTAP,
      mentionId: MENTION_ID_TIPTAP,
      inboxNotificationId: inboxNotification.id,
      triggeredAt: new Date(),
    });

    const components: Partial<ConvertTextEditorNodesAsReactComponents> = {
      Container: ({ children }) => <main>{children}</main>,
    };

    const expected1: TextMentionNotificationEmailDataAsReact = {
      mention: {
        textMentionId: MENTION_ID_TIPTAP,
        id: MENTIONED_USER_ID_TIPTAP,
        kind: "user",
        roomId: room.id,
        author: { id: "user-1", info: { name: "user-1" } },
        createdAt: inboxNotification.notifiedAt,
        content: (
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

    test.each<{
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
        setServerHandlers({
          room,
          inboxNotification,
          docBinaries: docUpdateBufferTiptap,
        });

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
