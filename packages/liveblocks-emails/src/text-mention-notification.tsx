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
import type React from "react";

import type { LexicalMentionNodeWithContext } from "./lexical-editor";
import {
  findLexicalMentionNodeWithContext,
  getSerializedLexicalState,
} from "./lexical-editor";
import { createBatchUsersResolver } from "./lib/batch-users-resolver";
import type {
  ConvertLiveblocksTextEditorNodesAsReactComponents,
  LiveblocksTextEditorNode,
} from "./liveblocks-text-editor";
import {
  convertLiveblocksTextEditorNodesAsReact,
  transformAsLiveblocksTextEditorNodes,
} from "./liveblocks-text-editor";
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
  textEditorNodes: LiveblocksTextEditorNode[];
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

  let textEditorNodes: LiveblocksTextEditorNode[] = [];

  switch (data.textEditorType) {
    case "lexical": {
      textEditorNodes = transformAsLiveblocksTextEditorNodes({
        textEditorType: "lexical",
        mention: data.mentionNodeWithContext,
      });
      break;
    }
    case "tiptap": {
      textEditorNodes = [];
      break;
    }
  }

  return {
    mention: {
      id: mentionId,
      roomId,
      textEditorNodes,
    },
    roomInfo: resolvedRoomInfo,
  };
};

export type MentionEmailAsReact<U extends BaseUserMeta = DU> = Omit<
  MentionEmailBaseData,
  "textEditorNodes"
> & {
  author: U;
  reactContent: React.ReactNode;
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

  /**
   * The components used to customize the resulting React nodes. Each components has
   * priority over the base components inherited.
   */
  components?: Partial<ConvertLiveblocksTextEditorNodesAsReactComponents<U>>;
};

export type TextMentionNotificationEmailDataAsReact = {
  mention: MentionEmailAsReact<BaseUserMeta>;
  roomInfo: DRI;
};

/**
 * Prepares data from a `TextMentionNotificationEvent` and convert content as React nodes.
 *
 * @param client The `Liveblocks` node client
 * @param event The `TextMentionNotificationEvent` received in the webhook handler
 * @param options The optional options to provide to resolve users, resolve room info and customize comment bodies React components.
 *
 * It returns a `TextMentionNotificationEmailDataAsReact` or `null` if there are no existing text mention.
 *
 * @example
 * import { Liveblocks} from "@liveblocks/node"
 * import { prepareTextMentionNotificationEmailAsReact } from "@liveblocks/emails"
 *
 * const liveblocks = new Liveblocks({ secret: "sk_..." })
 * const emailData = prepareTextMentionNotificationEmailAsReact(
 *  liveblocks,
 *  event,
 *  {
 *    resolveUsers,
 *    resolveRoomInfo,
 *    components,
 *  }
 * )
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

  const batchUsersResolver = createBatchUsersResolver<BaseUserMeta>({
    resolveUsers: options.resolveUsers,
    callerName: "prepareTextMentionNotificationEmailAsReact",
  });

  // TODO: resolve author (use batch resolver)

  const liveblocksTextEditorPromise = convertLiveblocksTextEditorNodesAsReact(
    data.mention.textEditorNodes,
    {
      resolveUsers: batchUsersResolver.resolveUsers,
      components: options.components,
    }
  );

  await batchUsersResolver.resolve();
  const [reactContent] = await Promise.all([
    // TODO: add author promise
    liveblocksTextEditorPromise,
  ]);

  return {
    mention: {
      id: data.mention.id,
      // TODO: replace with author from promise
      author: { id: "", info: {} },
      roomId: data.mention.roomId,
      reactContent,
    },
    roomInfo: data.roomInfo,
  };
}
