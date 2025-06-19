import {
  type Awaitable,
  type BaseGroupInfo,
  type BaseUserMeta,
  type DGI,
  type DRI,
  type DU,
  html,
  htmlSafe,
  type MentionData,
  type ResolveGroupsInfoArgs,
  type ResolveUsersArgs,
} from "@liveblocks/core";
import type {
  Liveblocks,
  TextMentionNotificationEvent,
} from "@liveblocks/node";
import type { ComponentType, ReactNode } from "react";

import type { LexicalMentionNodeWithContext } from "./lexical-editor";
import {
  findLexicalMentionNodeWithContext,
  getSerializedLexicalState,
} from "./lexical-editor";
import { resolveAuthorsInfo } from "./lib/authors";
import { createBatchUsersResolver } from "./lib/batch-users-resolver";
import { MENTION_CHARACTER } from "./lib/constants";
import type { CSSProperties } from "./lib/css-properties";
import { toInlineCSSString } from "./lib/css-properties";
import type { ResolveRoomInfoArgs } from "./lib/types";
import type {
  LiveblocksTextEditorMentionNode,
  LiveblocksTextEditorNode,
  LiveblocksTextEditorTextNode,
} from "./liveblocks-text-editor";
import { transformAsLiveblocksTextEditorNodes } from "./liveblocks-text-editor";
import {
  convertMentionContent,
  type ConvertMentionContentElements,
} from "./mention-content";
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

  // The user ID mentioned
  userId: string;

  // The user ID who created the mention
  createdBy: string;
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
  // In context of a text mention notification `createdBy` is a user ID
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
        userId,
        createdBy: mentionAuthorUserId,
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
        userId,
        createdBy: mentionAuthorUserId,
      };
    }
  }
};

export type MentionEmailData<
  ContentType,
  U extends BaseUserMeta = DU,
> = MentionData & {
  textMentionId: string;
  roomId: string;
  author: U; // Author of the mention
  createdAt: Date;
  content: ContentType;
};

export type MentionEmailAsHtmlData<U extends BaseUserMeta = DU> =
  MentionEmailData<string, U>;

export type MentionEmailAsReactData<U extends BaseUserMeta = DU> =
  MentionEmailData<ReactNode, U>;

export type TextMentionNotificationEmailData<
  ContentType,
  U extends BaseUserMeta = DU,
  M extends MentionEmailData<ContentType, U> = MentionEmailData<ContentType, U>,
> = {
  mention: M;
  roomInfo: DRI;
};

type PrepareTextMentionNotificationEmailOptions<
  U extends BaseUserMeta = DU,
  GI extends BaseGroupInfo = DGI,
> = {
  /**
   * A function that returns room info from room IDs.
   */
  resolveRoomInfo?: (args: ResolveRoomInfoArgs) => Awaitable<DRI | undefined>;

  /**
   * A function that returns user info from user IDs.
   * You should return a list of user objects of the same size, in the same order.
   */
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => Awaitable<(U["info"] | undefined)[] | undefined>;

  /**
   * A function that returns group info from group IDs.
   * You should return a list of group info objects of the same size, in the same order.
   */
  resolveGroupsInfo?: (
    args: ResolveGroupsInfoArgs
  ) => Awaitable<(GI | undefined)[] | undefined>;
};

/**
 * @internal
 * exported for testing purposes.
 */
export async function prepareTextMentionNotificationEmail<
  ContentType,
  U extends BaseUserMeta = DU,
>(
  client: Liveblocks,
  event: TextMentionNotificationEvent,
  options: PrepareTextMentionNotificationEmailOptions<U>,
  elements: ConvertMentionContentElements<ContentType, U>,
  callerName: string
): Promise<TextMentionNotificationEmailData<ContentType, U> | null> {
  const { roomId, mentionId } = event.data;

  const data = await extractTextMentionNotificationData({ client, event });
  if (data === null) {
    return null;
  }

  const roomInfo = options.resolveRoomInfo
    ? await options.resolveRoomInfo({ roomId: event.data.roomId })
    : undefined;

  const resolvedRoomInfo: DRI = {
    ...roomInfo,
    name: roomInfo?.name ?? event.data.roomId,
  };

  const batchUsersResolver = createBatchUsersResolver<U>({
    resolveUsers: options.resolveUsers,
    callerName,
  });

  const authorsInfoPromise = resolveAuthorsInfo({
    userIds: [data.createdBy],
    resolveUsers: batchUsersResolver.resolveUsers,
  });

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

  const contentPromise = convertMentionContent<ContentType, U>(
    textEditorNodes,
    {
      resolveUsers: batchUsersResolver.resolveUsers,
      elements,
    }
  );

  await batchUsersResolver.resolve();

  const [authorsInfo, content] = await Promise.all([
    authorsInfoPromise,
    contentPromise,
  ]);

  const authorInfo = authorsInfo.get(data.createdBy);

  return {
    mention: {
      // TODO: When introducing new mention kinds (e.g. group mentions), this should be updated
      kind: "user",
      id: data.userId,
      textMentionId: mentionId,
      roomId,
      author: {
        id: data.createdBy,
        info: authorInfo ?? { name: data.createdBy },
      } as U,
      content,
      createdAt: data.createdAt,
    },
    roomInfo: resolvedRoomInfo,
  };
}

export type TextEditorContainerComponentProps = {
  /**
   * The nodes of the text editor
   */
  children: ReactNode;
};

export type TextEditorMentionComponentProps<U extends BaseUserMeta = DU> = {
  /**
   * The mention element.
   */
  element: LiveblocksTextEditorMentionNode;
  /**
   * The mention's user info, if the `resolvedUsers` option was provided.
   */
  user?: U["info"];
};

export type TextEditorTextComponentProps = {
  /**
   * The text element.
   */
  element: LiveblocksTextEditorTextNode;
};

export type ConvertTextEditorNodesAsReactComponents<
  U extends BaseUserMeta = DU,
> = {
  /**
   *
   * The component used to act as a container to wrap text editor nodes,
   */
  Container: ComponentType<TextEditorContainerComponentProps>;

  /**
   * The component used to display mentions.
   */
  Mention: ComponentType<TextEditorMentionComponentProps<U>>;

  /**
   * The component used to display text nodes.
   */
  Text: ComponentType<TextEditorTextComponentProps>;
};

const baseComponents: ConvertTextEditorNodesAsReactComponents<BaseUserMeta> = {
  Container: ({ children }) => <div>{children}</div>,
  Mention: ({ element, user }) => (
    <span data-mention>
      {MENTION_CHARACTER}
      {user?.name ?? element.id}
    </span>
  ),
  Text: ({ element }) => {
    // Note: construction following the schema 👇
    // <code><s><em><strong>{element.text}</strong></s></em></code>
    let children: ReactNode = element.text;

    if (element.bold) {
      children = <strong>{children}</strong>;
    }

    if (element.italic) {
      children = <em>{children}</em>;
    }

    if (element.strikethrough) {
      children = <s>{children}</s>;
    }

    if (element.code) {
      children = <code>{children}</code>;
    }

    return <span>{children}</span>;
  },
};

export type PrepareTextMentionNotificationEmailAsReactOptions<
  U extends BaseUserMeta = DU,
> = PrepareTextMentionNotificationEmailOptions & {
  /**
   * The components used to customize the resulting React nodes. Each components has
   * priority over the base components inherited.
   */
  components?: Partial<ConvertTextEditorNodesAsReactComponents<U>>;
};

export type TextMentionNotificationEmailDataAsReact<
  U extends BaseUserMeta = DU,
> = TextMentionNotificationEmailData<ReactNode, U, MentionEmailAsReactData<U>>;

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
  const Components = { ...baseComponents, ...options.components };
  const data = await prepareTextMentionNotificationEmail<
    ReactNode,
    BaseUserMeta
  >(
    client,
    event,
    {
      resolveRoomInfo: options.resolveRoomInfo,
      resolveUsers: options.resolveUsers,
    },
    {
      container: ({ children }) => (
        <Components.Container key="lb-text-editor-container">
          {children}
        </Components.Container>
      ),
      mention: ({ node, user }, index) => (
        <Components.Mention
          key={`lb-text-editor-mention-${index}`}
          element={node}
          user={user}
        />
      ),
      text: ({ node }, index) => (
        <Components.Text key={`lb-text-editor-text-${index}`} element={node} />
      ),
    },
    "prepareTextMentionNotificationEmailAsReact"
  );

  if (data === null) {
    return null;
  }

  return data;
}

export type ConvertTextEditorNodesAsHtmlStyles = {
  /**
   * The default inline CSS styles used to display container element.
   */
  container: CSSProperties;
  /**
   * The default inline CSS styles used to display text `<strong />` elements.
   */
  strong: CSSProperties;
  /**
   * The default inline CSS styles used to display text `<code />` elements.
   */
  code: CSSProperties;
  /**
   * The default inline CSS styles used to display mentions.
   */
  mention: CSSProperties;
};

export const baseStyles: ConvertTextEditorNodesAsHtmlStyles = {
  container: {
    fontSize: "14px",
  },
  strong: {
    fontWeight: 500,
  },
  code: {
    fontFamily:
      'ui-monospace, Menlo, Monaco, "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", "Oxygen Mono", "Ubuntu Mono", "Source Code Pro", "Fira Mono", "Droid Sans Mono", "Consolas", "Courier New", monospace',
    backgroundColor: "rgba(0,0,0,0.05)",
    border: "solid 1px rgba(0,0,0,0.1)",
    borderRadius: "4px",
  },
  mention: {
    color: "blue",
  },
};

export type PrepareTextMentionNotificationEmailAsHtmlOptions =
  PrepareTextMentionNotificationEmailOptions & {
    /**
     * The styles used to customize the html elements in the resulting html safe string.
     * Each styles has priority over the base styles inherited.
     */
    styles?: Partial<ConvertTextEditorNodesAsHtmlStyles>;
  };

export type TextMentionNotificationEmailDataAsHtml<
  U extends BaseUserMeta = DU,
> = TextMentionNotificationEmailData<string, U, MentionEmailAsHtmlData<U>>;

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
  options: PrepareTextMentionNotificationEmailAsHtmlOptions = {}
): Promise<TextMentionNotificationEmailDataAsHtml | null> {
  const styles = { ...baseStyles, ...options.styles };
  const data = await prepareTextMentionNotificationEmail<string, BaseUserMeta>(
    client,
    event,
    {
      resolveRoomInfo: options.resolveRoomInfo,
      resolveUsers: options.resolveUsers,
    },
    {
      container: ({ children }) => {
        const content = [
          // prettier-ignore
          html`<div style="${toInlineCSSString(styles.container)}">${htmlSafe(children.join(""))}</div>`,
        ];

        return content.join("\n"); //NOTE: to represent a valid HTML string
      },
      mention: ({ node, user, group }) => {
        // prettier-ignore
        return html`<span data-mention style="${toInlineCSSString(styles.mention)}">${MENTION_CHARACTER}${user?.name ? html`${user?.name}` : group?.name ? html`${group?.name}` : node.id}</span>`
      },
      text: ({ node }) => {
        // Note: construction following the schema 👇
        // <code><s><em><strong>{node.text}</strong></s></em></code>
        let children = node.text;
        if (!children) {
          return html`${children}`;
        }

        if (node.bold) {
          // prettier-ignore
          children = html`<strong style="${toInlineCSSString(styles.strong)}">${children}</strong>`;
        }

        if (node.italic) {
          // prettier-ignore
          children = html`<em>${children}</em>`;
        }

        if (node.strikethrough) {
          // prettier-ignore
          children = html`<s>${children}</s>`;
        }

        if (node.code) {
          // prettier-ignore
          children = html`<code style="${toInlineCSSString(styles.code)}">${children}</code>`;
        }

        return html`${children}`;
      },
    },
    "prepareTextMentionNotificationEmailAsHtml"
  );

  if (data === null) {
    return null;
  }

  return data;
}
