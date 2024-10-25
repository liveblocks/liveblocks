import type {
  Liveblocks,
  TextMentionNotificationEvent,
} from "@liveblocks/node";

type TextMentionNotificationData =
  | { textEditorType: "lexical" }
  | { textEditorType: "tiptap" };

/** @internal */
export const extractTextMentionNotificationData = async ({
  client,
  event,
}: {
  client: Liveblocks;
  event: TextMentionNotificationEvent;
}): Promise<TextMentionNotificationData | null> => {
  const { mentionId, roomId, userId, inboxNotificationId } = event.data;

  const [room, inboxNotification] = await Promise.all([
    client.getRoom(roomId),
    client.getInboxNotification({ inboxNotificationId, userId }),
  ]);

  // TODO: check if notification is read

  // TODO: check for editor type existence

  // TODO get document json

  return null;
};
