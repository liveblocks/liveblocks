import type { DRI, OptionalPromise } from "@liveblocks/core";
import type {
  Liveblocks,
  TextMentionNotificationEvent,
} from "@liveblocks/node";

import type { SerializedRootNode } from "./lexical-editor";
import { getSerializedLexicalState } from "./lexical-editor";
// TODO: create a common shared type once thread notification are publicly released.
import type { ResolveRoomInfoArgs } from "./thread-notification";

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

export type MentionEmailBaseData = {
  id: string;
  roomId: string;
  // TODO: defined specific common type here for Lexical and TipTap.
  rawTextContent: unknown;
};

type PrepareTextMentionNotificationEmailBaseDataOptions = {
  /**
   * A function that returns room info from room IDs.
   */
  resolveRoomInfo?: (
    args: ResolveRoomInfoArgs
  ) => OptionalPromise<DRI | undefined>;
};

export type TextMentionNotificationEmailBaseData = (
  | { textEditorType: "lexical"; mention: MentionEmailBaseData }
  | { textEditorType: "tiptap"; mention: MentionEmailBaseData }
) & { roomInfo: DRI };

/** @internal */
export const prepareTextMentionNotificationEmailBaseData = async ({
  client,
  event,
  options = {},
}: {
  client: Liveblocks;
  event: TextMentionNotificationEvent;
  options?: PrepareTextMentionNotificationEmailBaseDataOptions;
}): Promise<TextMentionNotificationEmailBaseData | null> => {
  const { roomId, mentionId } = event.data;
  const roomInfo = options.resolveRoomInfo
    ? await options.resolveRoomInfo({ roomId })
    : undefined;

  const resolvedRoomInfo: DRI = {
    ...roomInfo,
    name: roomInfo?.name ?? roomId,
  };

  const data = await extractTextMentionNotificationData({ client, event });
  if (data === null) {
    return null;
  }

  switch (data.textEditorType) {
    case "lexical": {
      return {
        textEditorType: "lexical",
        mention: {
          id: mentionId,
          roomId,
          // TODO: get raw text content for Lexical
          rawTextContent: null,
        },
        roomInfo: resolvedRoomInfo,
      };
    }
    case "tiptap": {
      return {
        textEditorType: "tiptap",
        mention: {
          id: mentionId,
          roomId,
          // TODO: get raw text content for Tiptap
          rawTextContent: null,
        },
        roomInfo: resolvedRoomInfo,
      };
    }
  }
};
