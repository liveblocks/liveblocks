import type {
  Liveblocks,
  TextMentionNotificationEvent,
} from "@liveblocks/node";

import type { SerializedRootNode } from "./lexical-editor";
import { getSerializedLexicalState } from "./lexical-editor";

type TextMentionNotificationData =
  | { textEditorType: "lexical"; state: SerializedRootNode }
  | { textEditorType: "tiptap" };

/** @internal */
export const extractTextMentionNotificationData = async ({
  client,
  event,
}: {
  client: Liveblocks;
  event: TextMentionNotificationEvent;
}): Promise<TextMentionNotificationData | null> => {
  const { roomId, userId, inboxNotificationId } = event.data;

  const [room, inboxNotification] = await Promise.all([
    client.getRoom(roomId),
    client.getInboxNotification({ inboxNotificationId, userId }),
  ]);

  // Aligned behaviors w/ `@liveblocks/react-ui`.
  const isUnread =
    inboxNotification.readAt === null ||
    inboxNotification.notifiedAt > inboxNotification.readAt;

  // Notification read so do nothing
  if (!isUnread) {
    return null;
  }

  // Do nothing if the room as no text editor associated.
  // We do not throw not to impact the final developer experience.
  if (!room.textEditor) {
    console.warn(`Room ${room.id} do not have any text editor associated`);
    return null;
  }

  switch (room.textEditor.type) {
    case "lexical": {
      const buffer = await client.getYjsDocumentAsBinaryUpdate(roomId);

      const editorKey = room.textEditor.rootKey;
      // TODO: temporarily grab the first entrance, later we will handle multiple editors
      const key = Array.isArray(editorKey) ? editorKey[0]! : editorKey;

      const state = getSerializedLexicalState({ buffer, key });

      return {
        textEditorType: "lexical",
        state,
      };
    }
    case "tiptap": {
      // TODO: add logic to get tiptap state
      return {
        textEditorType: "tiptap",
      };
    }
  }
};
