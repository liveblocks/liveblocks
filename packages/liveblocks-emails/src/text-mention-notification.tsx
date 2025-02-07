import type {
  Awaitable,
  BaseUserMeta,
  DRI,
  DU,
  ResolveUsersArgs,
} from "@liveblocks/core";
import type {
  Liveblocks,
  TextMentionNotificationEvent,
} from "@liveblocks/node";
import type { ReactNode } from "react";

import type { LexicalMentionNodeWithContext } from "./lexical-editor";
import {
  findLexicalMentionNodeWithContext,
  getSerializedLexicalState,
} from "./lexical-editor";
import { resolveAuthorsInfo } from "./lib/authors";
import { createBatchUsersResolver } from "./lib/batch-users-resolver";
import type { ResolveRoomInfoArgs } from "./lib/types";
import type {
  ConvertTextEditorNodesAsHtmlStyles,
  ConvertTextEditorNodesAsReactComponents,
  LiveblocksTextEditorNode,
} from "./liveblocks-text-editor";
import {
  convertTextEditorNodesAsHtml,
  convertTextEditorNodesAsReact,
  transformAsLiveblocksTextEditorNodes,
} from "./liveblocks-text-editor";
import type { TiptapMentionNodeWithContext } from "./tiptap-editor";
import {
  findTiptapMentionNodeWithContext,
  getSerializedTiptapState,
} from "./tiptap-editor";

/** @internal hidden types */
type RoomTextEditor = {
  type: "lexical" | "tiptap";
  rootKey: string[];
};

export type TextMentionNotificationData = (
  | {
      editor: "lexical";
      mentionNodeWithContext: LexicalMentionNodeWithContext;
    }
  | {
      editor: "tiptap";
      mentionNodeWithContext: TiptapMentionNodeWithContext;
    }
) & {
  createdAt: Date;
  userId: string; // Author of the mention
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

  // Check for notification kind
  if (inboxNotification.kind !== "textMention") {
    console.warn('Inbox notification is not of kind "textMention"');
    return null;
  }

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
  // @ts-expect-error - Hidden property
  const textEditor = room.experimental_textEditor as RoomTextEditor | undefined;
  if (!textEditor) {
    console.warn(`Room "${room.id}" does not a text editor associated with it`);
    return null;
  }

  // For now we use the `notifiedAt` inbox notification data
  // to represent the creation date as we have currently
  // a 1 - 1 notification <> activity
  const mentionCreatedAt = inboxNotification.notifiedAt;
  // In context of a text mention notification `createdBy` is a `userId`
  const mentionAuthorUserId = inboxNotification.createdBy;

  const buffer = await client.getYjsDocumentAsBinaryUpdate(roomId);
  const editorKey = textEditor.rootKey;
  // TODO: temporarily grab the first entrance, later we will handle multiple editors
  const key = Array.isArray(editorKey) ? editorKey[0]! : editorKey;

  switch (textEditor.type) {
    case "lexical": {
      const state = getSerializedLexicalState({ buffer, key });
      const mentionNodeWithContext = findLexicalMentionNodeWithContext({
        root: state,
        mentionedUserId: userId,
        mentionId: inboxNotification.mentionId,
      });

      // The mention node did not exists so we do not have to send an email.
      if (mentionNodeWithContext === null) {
        return null;
      }

      return {
        editor: "lexical",
        mentionNodeWithContext,
        createdAt: mentionCreatedAt,
        userId: mentionAuthorUserId,
      };
    }
    case "tiptap": {
      const state = getSerializedTiptapState({ buffer, key });
      const mentionNodeWithContext = findTiptapMentionNodeWithContext({
        root: state,
        mentionedUserId: userId,
        mentionId: inboxNotification.mentionId,
      });

      // The mention node did not exists so we do not have to send an email.
      if (mentionNodeWithContext === null) {
        return null;
      }

      return {
        editor: "tiptap",
        mentionNodeWithContext,
        createdAt: mentionCreatedAt,
        userId: mentionAuthorUserId,
      };
    }
  }
};

export type MentionEmailBaseData = {
  id: string;
  roomId: string;
  userId: string; // Author of the mention
  textEditorNodes: LiveblocksTextEditorNode[];
  createdAt: Date;
};

type PrepareTextMentionNotificationEmailBaseDataOptions = {
  /**
   * A function that returns room info from room IDs.
   */
  resolveRoomInfo?: (args: ResolveRoomInfoArgs) => Awaitable<DRI | undefined>;
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

  switch (data.editor) {
    case "lexical": {
      textEditorNodes = transformAsLiveblocksTextEditorNodes({
        editor: "lexical",
        mention: data.mentionNodeWithContext,
      });
      break;
    }
    case "tiptap": {
      textEditorNodes = transformAsLiveblocksTextEditorNodes({
        editor: "tiptap",
        mention: data.mentionNodeWithContext,
      });
      break;
    }
  }

  return {
    mention: {
      id: mentionId,
      roomId,
      textEditorNodes,
      createdAt: data.createdAt,
      userId: data.userId,
    },
    roomInfo: resolvedRoomInfo,
  };
};

export type MentionEmailAsReactData<U extends BaseUserMeta = DU> = Omit<
  MentionEmailBaseData,
  "userId" | "textEditorNodes"
> & {
  author: U;
  reactContent: ReactNode;
};

export type MentionEmailAsHtmlData<U extends BaseUserMeta = DU> = Omit<
  MentionEmailBaseData,
  "userId" | "textEditorNodes"
> & {
  author: U;
  htmlContent: string;
};

export type PrepareTextMentionNotificationEmailAsReactOptions<
  U extends BaseUserMeta = DU,
> = PrepareTextMentionNotificationEmailBaseDataOptions & {
  /**
   * A function that returns info from user IDs.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => Awaitable<(U["info"] | undefined)[] | undefined>;

  /**
   * The components used to customize the resulting React nodes. Each components has
   * priority over the base components inherited.
   */
  components?: Partial<ConvertTextEditorNodesAsReactComponents<U>>;
};

export type TextMentionNotificationEmailData<
  U extends BaseUserMeta,
  M extends MentionEmailAsReactData<U> | MentionEmailAsHtmlData<U>,
> = {
  mention: M;
  roomInfo: DRI;
};

export type TextMentionNotificationEmailDataAsReact =
  TextMentionNotificationEmailData<BaseUserMeta, MentionEmailAsReactData>;

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
  const { mention, roomInfo } = data;

  const batchUsersResolver = createBatchUsersResolver<BaseUserMeta>({
    resolveUsers: options.resolveUsers,
    callerName: "prepareTextMentionNotificationEmailAsReact",
  });

  const authorsInfoPromise = resolveAuthorsInfo({
    userIds: [mention.userId],
    resolveUsers: batchUsersResolver.resolveUsers,
  });
  const contentPromise = convertTextEditorNodesAsReact(
    mention.textEditorNodes,
    {
      resolveUsers: batchUsersResolver.resolveUsers,
      components: options.components,
    }
  );

  await batchUsersResolver.resolve();

  const [authorsInfo, reactContent] = await Promise.all([
    authorsInfoPromise,
    contentPromise,
  ]);

  const authorInfo = authorsInfo.get(mention.userId);

  return {
    mention: {
      id: mention.id,
      author: {
        id: mention.userId,
        info: authorInfo ?? { name: mention.userId },
      },
      roomId: mention.roomId,
      reactContent,
      createdAt: mention.createdAt,
    },
    roomInfo,
  };
}

export type PrepareTextMentionNotificationEmailAsHtmlOptions<
  U extends BaseUserMeta = DU,
> = PrepareTextMentionNotificationEmailBaseDataOptions & {
  /**
   * A function that returns info from user IDs.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => Awaitable<(U["info"] | undefined)[] | undefined>;

  /**
   * The styles used to customize the html elements in the resulting html safe string.
   * Each styles has priority over the base styles inherited.
   */
  styles?: Partial<ConvertTextEditorNodesAsHtmlStyles>;
};

export type TextMentionNotificationEmailDataAsHtml =
  TextMentionNotificationEmailData<BaseUserMeta, MentionEmailAsHtmlData>;

/**
 * Prepares data from a `TextMentionNotificationEvent` and convert content  as an html safe string.
 *
 * @param client The `Liveblocks` node client
 * @param event The `TextMentionNotificationEvent` received in the webhook handler
 * @param options The optional options to provide to resolve users, resolve room info and customize comment bodies React components.
 *
 * It returns a `TextMentionNotificationEmailDataAsReact` or `null` if there are no existing text mention.
 *
 * @example
 * import { Liveblocks} from "@liveblocks/node"
 * import { prepareTextMentionNotificationEmailAsHtml } from "@liveblocks/emails"
 *
 * const liveblocks = new Liveblocks({ secret: "sk_..." })
 * const emailData = prepareTextMentionNotificationEmailAsHtml(
 *  liveblocks,
 *  event,
 *  {
 *    resolveUsers,
 *    resolveRoomInfo,
 *    styles,
 *  }
 * )
 */
export async function prepareTextMentionNotificationEmailAsHtml(
  client: Liveblocks,
  event: TextMentionNotificationEvent,
  options: PrepareTextMentionNotificationEmailAsHtmlOptions<BaseUserMeta> = {}
): Promise<TextMentionNotificationEmailDataAsHtml | null> {
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
  const { mention, roomInfo } = data;

  const batchUsersResolver = createBatchUsersResolver<BaseUserMeta>({
    resolveUsers: options.resolveUsers,
    callerName: "prepareTextMentionNotificationEmailAsHtml",
  });

  const authorsInfoPromise = resolveAuthorsInfo({
    userIds: [mention.userId],
    resolveUsers: batchUsersResolver.resolveUsers,
  });

  const contentPromise = convertTextEditorNodesAsHtml(mention.textEditorNodes, {
    resolveUsers: batchUsersResolver.resolveUsers,
    styles: options.styles,
  });

  await batchUsersResolver.resolve();

  const [authorsInfo, htmlContent] = await Promise.all([
    authorsInfoPromise,
    contentPromise,
  ]);

  const authorInfo = authorsInfo.get(mention.userId);

  return {
    mention: {
      id: mention.id,
      author: {
        id: mention.userId,
        info: authorInfo ?? { name: mention.userId },
      },
      roomId: mention.roomId,
      htmlContent,
      createdAt: mention.createdAt,
    },
    roomInfo,
  };
}
