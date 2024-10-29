import type {
  BaseUserMeta,
  DRI,
  DU,
  OptionalPromise,
  ResolveUsersArgs,
} from "@liveblocks/core";
import type {
  Liveblocks,
  TextMentionNotificationEvent,
} from "@liveblocks/node";
import React from "react";

import type { LexicalMentionNodeWithContext } from "./lexical-editor";
import {
  findLexicalMentionNodeWithContext,
  getSerializedLexicalState,
} from "./lexical-editor";
// TODO: create a common shared type once thread notification are publicly released.
import type { ResolveRoomInfoArgs } from "./thread-notification";

type TextMentionNotificationData =
  | {
      textEditorType: "lexical";
      mentionNodeWithContext: LexicalMentionNodeWithContext;
    }
  | {
      textEditorType: "tiptap";
      // TODO: add mention node with context for TipTap
    };

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
      const mentionNodeWithContext = findLexicalMentionNodeWithContext({
        root: state,
        mentionedUserId: userId,
        inboxNotificationId,
      });

      // The mention node did not exists so we do not have to send an email.
      if (mentionNodeWithContext === null) {
        return null;
      }

      return {
        textEditorType: "lexical",
        mentionNodeWithContext,
      };
    }
    case "tiptap": {
      // TODO: add logic to get tiptap state and mention node with context
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

export type TextMentionNotificationEmailBaseData = {
  mention: MentionEmailBaseData;
  roomInfo: DRI;
};

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

  let rawTextContent;

  switch (data.textEditorType) {
    case "lexical": {
      // TODO: get raw text content for Lexical
      rawTextContent = null;
      break;
    }
    case "tiptap": {
      // TODO: get raw text content for Tiptap
      rawTextContent = null;
      break;
    }
  }

  return {
    mention: {
      id: mentionId,
      roomId,
      rawTextContent,
    },
    roomInfo: resolvedRoomInfo,
  };
};

export type MentionEmailAsReact<U extends BaseUserMeta = DU> = Omit<
  MentionEmailBaseData,
  "rawTextContent"
> & {
  author: U;
  reactTextContent: React.ReactNode;
};

export type PrepareTextMentionNotificationEmailAsReactOptions<
  U extends BaseUserMeta = DU,
> = PrepareTextMentionNotificationEmailBaseDataOptions & {
  /**
   * A function that returns info from user IDs.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => OptionalPromise<(U["info"] | undefined)[] | undefined>;

  // TODO: add components
};

export type TextMentionNotificationEmailDataAsReact = {
  mention: MentionEmailAsReact<BaseUserMeta>;
  roomInfo: DRI;
};

/**
 * Prepares data from a `TextMentionNotificationEvent` and convert content as React nodes.
 */
export async function prepareTextMentionNotificationEmailAsReact(
  client: Liveblocks,
  event: TextMentionNotificationEvent,
  options: PrepareTextMentionNotificationEmailAsReactOptions<BaseUserMeta> = {}
): Promise<TextMentionNotificationEmailDataAsReact | null> {
  const data = await prepareTextMentionNotificationEmailBaseData({
    client,
    event,
    options: {
      resolveRoomInfo: options.resolveRoomInfo,
    },
  });

  if (data === null) {
    return null;
  }

  // TODO: resolve author (use batch resolver)
  // TODO: resolved mention users (it can have multiple mentioned users in the text content)
  // TODO convert mention text content into React nodes
  const reactTextContent = <></>;

  return {
    mention: {
      id: data.mention.id,
      author: { id: "", info: {} },
      roomId: data.mention.roomId,
      reactTextContent,
    },
    roomInfo: data.roomInfo,
  };
}
