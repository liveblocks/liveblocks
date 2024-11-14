import { Liveblocks } from "@liveblocks/node";
import { http, HttpResponse } from "msw";

import { extractTextMentionNotificationData } from "../text-mention-notification";
import {
  generateInboxNotificationId,
  generateThreadId,
  makeRoomWithTextEditor,
  makeTextMentionNotificationEvent,
  makeThreadInboxNotification,
  server,
  SERVER_BASE_URL,
} from "./_helpers";
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
  });
});
