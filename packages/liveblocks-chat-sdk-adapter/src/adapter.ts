import {
  type Awaitable,
  type BaseGroupInfo,
  type BaseUserMeta,
  type CommentBody,
  type CommentBodyInlineElement,
  type CommentBodyParagraph,
  getMentionsFromCommentBody,
  isCommentBodyLink,
  isCommentBodyMention,
  isCommentBodyText,
  type ResolveGroupsInfoArgs,
  type ResolveUsersArgs,
} from "@liveblocks/core";
import {
  type CommentData,
  Liveblocks,
  LiveblocksError,
  type WebhookEvent,
  WebhookHandler,
} from "@liveblocks/node";
import {
  type Adapter,
  type AdapterPostableMessage,
  type Attachment,
  type CardChild,
  type CardElement,
  type ChannelInfo,
  type ChatInstance,
  ConsoleLogger,
  defaultEmojiResolver,
  type EmojiValue,
  type FetchOptions,
  type FetchResult,
  type FormattedContent,
  type Link,
  type ListThreadsOptions,
  type ListThreadsResult,
  type Logger,
  Message,
  type Paragraph,
  parseMarkdown,
  type RawMessage,
  type Root,
  tableToAscii,
  type Text,
  type ThreadInfo,
  toPlainText,
  type WebhookOptions,
  type Delete,
  type Emphasis,
  type InlineCode,
  type Strong,
} from "chat";

type PhrasingContent = Paragraph["children"][number];

const ADAPTER_PREFIX = "liveblocks";
export class LiveblocksAdapter<
  U extends BaseUserMeta = BaseUserMeta,
  DGI extends BaseGroupInfo = BaseGroupInfo,
> implements Adapter<{ roomId: string; threadId: string }, CommentData>
{
  readonly name = "liveblocks";
  readonly userName: string;
  readonly #client: Liveblocks;
  readonly #webhookHandler: WebhookHandler;
  readonly #resolveUsers:
    | ((
        args: ResolveUsersArgs
      ) => Awaitable<(U["info"] | undefined)[] | undefined>)
    | undefined;
  readonly #resolveGroupsInfo:
    | ((
        args: ResolveGroupsInfoArgs
      ) => Awaitable<(DGI | undefined)[] | undefined>)
    | undefined;
  readonly #logger: Logger;
  readonly #botUserId: string;
  #chat: ChatInstance | null = null;
  constructor(config: LiveblocksAdapterConfig<U, DGI>) {
    this.#client = new Liveblocks({ secret: config.apiKey });
    this.#webhookHandler = new WebhookHandler(config.webhookSecret);
    this.#resolveUsers = config.resolveUsers;
    this.#resolveGroupsInfo = config.resolveGroupsInfo;
    this.#botUserId = config.botUserId;
    this.userName = config.botUserName ?? "liveblocks-bot";
    this.#logger =
      config.logger ?? new ConsoleLogger("info").child(ADAPTER_PREFIX);
  }

  async initialize(chat: ChatInstance): Promise<void> {
    this.#chat = chat;
  }

  async handleWebhook(
    request: Request,
    options?: WebhookOptions
  ): Promise<Response> {
    let event: WebhookEvent;
    try {
      event = this.#webhookHandler.verifyRequest({
        headers: request.headers,
        rawBody: await request.text(),
      });
    } catch (error) {
      this.#logger.error("Failed to verify webhook request", { error });
      return new Response("Invalid webhook request", { status: 401 });
    }

    if (event.type === "commentCreated") {
      const threadId = this.encodeThreadId({
        roomId: event.data.roomId,
        threadId: event.data.threadId,
      });

      const comment = await this.#client.getComment({
        roomId: event.data.roomId,
        threadId: event.data.threadId,
        commentId: event.data.commentId,
      });
      if (comment.deletedAt !== undefined) {
        return new Response(null, { status: 200 });
      }

      this.#chat?.processMessage(
        this,
        threadId,
        () => this.#convertLiveblocksCommentDataToChatMessage(comment),
        options
      );
    } else if (
      event.type === "commentReactionAdded" ||
      event.type === "commentReactionRemoved"
    ) {
      const threadId = this.encodeThreadId({
        roomId: event.data.roomId,
        threadId: event.data.threadId,
      });

      const userId =
        event.type === "commentReactionAdded"
          ? event.data.addedBy
          : event.data.removedBy;

      const resolvedUsers = await this.#resolveUsers?.({ userIds: [userId] });
      const user = resolvedUsers?.[0];

      this.#chat?.processReaction(
        {
          added: event.type === "commentReactionAdded",
          emoji: defaultEmojiResolver.fromGChat(event.data.emoji),
          rawEmoji: event.data.emoji,
          messageId: event.data.commentId,
          threadId,
          user: {
            userId,
            userName: user?.name ?? userId,
            fullName: user?.name ?? userId,
            // This assumes that the current bot is the only bot in the thread; if we want
            // to support multiple bots, we need to add a way to determine the bot's user id.
            isBot: userId === this.#botUserId,
            isMe: userId === this.#botUserId,
          },
          raw: event.data,
          adapter: this,
        },
        options
      );
    }

    return new Response(null, { status: 200 });
  }

  async postMessage(
    threadId: string,
    message: AdapterPostableMessage
  ): Promise<RawMessage<CommentData>> {
    const { roomId, threadId: threadId_liveblocks } =
      this.decodeThreadId(threadId);
    const comment = await this.#client.createComment({
      roomId,
      threadId: threadId_liveblocks,
      data: {
        userId: this.#botUserId,
        body: convertPostableMessageToCommentBody(message),
      },
    });
    return { id: comment.id, threadId, raw: comment };
  }

  async editMessage(
    threadId: string,
    messageId: string,
    message: AdapterPostableMessage
  ): Promise<RawMessage<CommentData>> {
    const { roomId, threadId: threadId_liveblocks } =
      this.decodeThreadId(threadId);

    const comment = await this.#client.editComment({
      roomId,
      threadId: threadId_liveblocks,
      commentId: messageId,
      data: {
        body: convertPostableMessageToCommentBody(message),
      },
    });

    return { id: comment.id, threadId, raw: comment };
  }

  async deleteMessage(threadId: string, messageId: string): Promise<void> {
    const { roomId, threadId: threadId_liveblocks } =
      this.decodeThreadId(threadId);
    await this.#client.deleteComment({
      roomId,
      threadId: threadId_liveblocks,
      commentId: messageId,
    });
  }

  async addReaction(
    threadId: string,
    messageId: string,
    emoji: EmojiValue | string
  ): Promise<void> {
    const { roomId, threadId: threadId_liveblocks } =
      this.decodeThreadId(threadId);

    await this.#client.addCommentReaction({
      roomId,
      threadId: threadId_liveblocks,
      commentId: messageId,
      data: {
        // Liveblocks expects unicode emoji; 'toGChat' converts normalized names (e.g. 'thumbs_up') to unicode ('👍').
        // Unknown normalized names (e.g. 'custom_emoji') will fail Liveblocks validation since they are not valid unicode emoji.
        emoji: defaultEmojiResolver.toGChat(emoji),
        userId: this.#botUserId,
      },
    });
  }

  async removeReaction(
    threadId: string,
    messageId: string,
    emoji: EmojiValue | string
  ): Promise<void> {
    const { roomId, threadId: threadId_liveblocks } =
      this.decodeThreadId(threadId);

    await this.#client.removeCommentReaction({
      roomId,
      threadId: threadId_liveblocks,
      commentId: messageId,
      data: {
        emoji: defaultEmojiResolver.toGChat(emoji),
        userId: this.#botUserId,
      },
    });
  }

  async fetchMessages(
    threadId: string,
    options?: FetchOptions
  ): Promise<FetchResult<CommentData>> {
    const { roomId, threadId: threadId_liveblocks } =
      this.decodeThreadId(threadId);

    const thread = await this.#client.getThread({
      roomId,
      threadId: threadId_liveblocks,
    });

    const comments = thread.comments.filter(
      (comment) => comment.deletedAt === undefined
    );

    const direction = options?.direction ?? "backward";
    const limit = options?.limit;
    const startingAfter = options?.cursor;

    // The 'Get thread' API returns all comments in the thread in chronological order,
    // so we perform in-memory pagination to match Chat SDK's expected behavior.
    const sliced = slicePageByCreatedAt(comments, {
      direction: direction === "forward" ? "ascending" : "descending",
      limit,
      startingAfter,
    });

    const messages = await Promise.all(
      sliced.data.map((comment) =>
        this.#convertLiveblocksCommentDataToChatMessage(comment)
      )
    );

    return { messages, nextCursor: sliced.nextCursor };
  }

  async fetchThread(threadId: string): Promise<ThreadInfo> {
    const { roomId, threadId: threadId_liveblocks } =
      this.decodeThreadId(threadId);

    const thread = await this.#client.getThread({
      roomId,
      threadId: threadId_liveblocks,
    });

    return {
      id: threadId,
      channelId: `${ADAPTER_PREFIX}:${roomId}`,
      metadata: {
        resolved: thread.resolved,
        ...thread.metadata,
      },
      channelName: thread.roomId,
      isDM: false,
    };
  }

  async fetchMessage(
    threadId: string,
    messageId: string
  ): Promise<Message<CommentData> | null> {
    try {
      const { roomId, threadId: threadId_liveblocks } =
        this.decodeThreadId(threadId);

      const comment = await this.#client.getComment({
        roomId,
        threadId: threadId_liveblocks,
        commentId: messageId,
      });
      if (comment.deletedAt !== undefined) {
        return null;
      }
      return this.#convertLiveblocksCommentDataToChatMessage(comment);
    } catch (error) {
      if (error instanceof LiveblocksError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async listThreads(
    channelId: string,
    options?: ListThreadsOptions
  ): Promise<ListThreadsResult<CommentData>> {
    const roomId = getRoomIdFromChannelId(channelId);
    const { data } = await this.#client.getThreads({ roomId });
    const threads = data
      .map((thread) => {
        const nonDeletedComments = thread.comments
          .filter((comment) => comment.deletedAt === undefined)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        const firstNonDeletedComment = nonDeletedComments[0];
        if (firstNonDeletedComment === undefined) return null;

        return {
          id: this.encodeThreadId({
            roomId,
            threadId: thread.id,
          }),
          updatedAt: thread.updatedAt,
          numOfComments: nonDeletedComments.length,
          firstComment: firstNonDeletedComment,
        };
      })
      .filter((thread) => thread !== null);

    const limit = options?.limit;
    const startingAfter = options?.cursor;

    // The 'Get threads' API returns all threads in the room in chronological order,
    // so we perform in-memory pagination to match Chat SDK's expected behavior.
    const sliced = slicePageByUpdatedAt(threads, {
      limit,
      startingAfter,
    });

    return {
      threads: await Promise.all(
        sliced.data.map(async (thread) => ({
          id: thread.id,
          rootMessage: await this.#convertLiveblocksCommentDataToChatMessage(
            thread.firstComment
          ),
          lastReplyAt: thread.updatedAt,
          replyCount: thread.numOfComments - 1,
        }))
      ),
      nextCursor: sliced.nextCursor,
    };
  }

  async fetchChannelInfo(channelId: string): Promise<ChannelInfo> {
    const room = await this.#client.getRoom(getRoomIdFromChannelId(channelId));
    return {
      id: room.id,
      name: room.id,
      isDM: false,
      metadata: {},
    };
  }

  async fetchChannelMessages(
    channelId: string,
    options?: FetchOptions
  ): Promise<FetchResult<CommentData>> {
    const roomId = getRoomIdFromChannelId(channelId);
    const { data } = await this.#client.getThreads({ roomId });

    // The 'Get threads' API returns all comments in the thread in chronological order,
    // so we perform in-memory pagination to match Chat SDK's expected behavior.
    const comments = data
      .map((thread) => {
        const nonDeletedComments = thread.comments
          .filter((comment) => comment.deletedAt === undefined)
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        const firstNonDeletedComment = nonDeletedComments[0];
        if (firstNonDeletedComment !== undefined) {
          return firstNonDeletedComment;
        }
        return null;
      })
      .filter((comment) => comment !== null);

    const direction = options?.direction ?? "backward";
    const limit = options?.limit;
    const startingAfter = options?.cursor;

    // The 'Get threads' API returns all comments in the thread in chronological order,
    // so we perform in-memory pagination to match Chat SDK's expected behavior.
    const sliced = slicePageByCreatedAt(comments, {
      direction: direction === "forward" ? "ascending" : "descending",
      limit,
      startingAfter,
    });

    const messages = await Promise.all(
      sliced.data.map((comment) =>
        this.#convertLiveblocksCommentDataToChatMessage(comment)
      )
    );

    return { messages, nextCursor: sliced.nextCursor };
  }

  async postChannelMessage(
    channelId: string,
    message: AdapterPostableMessage
  ): Promise<RawMessage<CommentData>> {
    const roomId = getRoomIdFromChannelId(channelId);
    const thread = await this.#client.createThread({
      roomId,
      data: {
        comment: {
          userId: this.#botUserId,
          body: convertPostableMessageToCommentBody(message),
        },
      },
    });
    const firstComment = thread.comments[0];
    if (firstComment === undefined) {
      throw new Error(`Failed to create thread in room ${channelId}`);
    }
    return {
      id: firstComment.id,
      threadId: this.encodeThreadId({
        roomId,
        threadId: thread.id,
      }),
      raw: firstComment,
    };
  }

  // This method isn't used by the Chat SDK, but it's required to implement the Adapter interface,
  // so we will return a less rich message here. We have a separate (asynchronous) method for converting a comment to a message.
  parseMessage(data: CommentData): Message<CommentData> {
    return new Message({
      id: data.id,
      threadId: this.encodeThreadId({
        roomId: data.roomId,
        threadId: data.threadId,
      }),
      raw: data,
      formatted: { type: "root", children: [] },
      text: "",
      author: {
        userId: data.userId,
        userName: data.userId,
        fullName: data.userId,
        isBot: data.userId === this.#botUserId,
        isMe: data.userId === this.#botUserId,
      },
      metadata: {
        dateSent: data.createdAt,
        edited: !!data.editedAt,
        editedAt: data.editedAt,
      },
      attachments: data.attachments.map((att) =>
        this.#createAttachment(data.roomId, att)
      ),
    });
  }

  renderFormatted(content: FormattedContent): string {
    // Liveblocks comments do not support markdown as input, so we convert the content to plain text.
    return toPlainText(content);
  }

  channelIdFromThreadId(threadId: string): string {
    const { roomId } = this.decodeThreadId(threadId);
    return `${ADAPTER_PREFIX}:${roomId}`;
  }

  /**
   * This method is a no-op as typing indicators are not supported by Liveblocks Comments.
   */
  startTyping(_threadId: string, _status?: string): Promise<void> {
    return Promise.resolve();
  }

  #createAttachment(
    roomId: string,
    att: CommentData["attachments"][number]
  ): Attachment {
    const client = this.#client;
    return {
      type: getAttachmentType(att.mimeType),
      name: att.name,
      mimeType: att.mimeType,
      size: att.size,
      fetchData: async () => {
        const { url } = await client.getAttachment({
          roomId,
          attachmentId: att.id,
        });
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch attachment "${att.name}": ${response.status} ${response.statusText}`
          );
        }
        return Buffer.from(await response.arrayBuffer());
      },
    };
  }

  /**
   * Encodes a Liveblocks room ID and thread ID into a single thread ID string.
   *
   * Format: `liveblocks:{roomId}:{threadId}`
   *
   * **Note**: Room IDs may contain colons (':'), which are preserved during encoding/decoding.
   * However, Liveblocks thread IDs must not contain colons as the last colon is used as the delimiter when decoding.
   */
  encodeThreadId(data: { roomId: string; threadId: string }): string {
    return `${ADAPTER_PREFIX}:${data.roomId}:${data.threadId}`;
  }

  /**
   * Decodes an encoded thread ID string back into its room ID and thread ID components.
   *
   * @throws {Error} If the thread ID format is invalid
   */
  decodeThreadId(threadId: string): { roomId: string; threadId: string } {
    const parts = threadId.split(":");
    if (parts.length < 3 || parts[0] !== ADAPTER_PREFIX) {
      throw new Error(
        `Invalid thread ID: ${threadId}. Expected format: liveblocks:{roomId}:{threadId}`
      );
    }
    return {
      roomId: parts.slice(1, -1).join(":"),
      threadId: parts[parts.length - 1]!,
    };
  }

  async #convertLiveblocksCommentDataToChatMessage(
    comment: Extract<CommentData, { body: CommentBody }>
  ): Promise<Message<CommentData>> {
    const mentions = getMentionsFromCommentBody(comment.body);
    const userIds = new Set<string>([comment.userId]); // Initialize with the author's user id
    const groupIds = new Set<string>();
    for (const mention of mentions) {
      if (mention.kind === "user") {
        userIds.add(mention.id);
      } else if (mention.kind === "group") {
        groupIds.add(mention.id);
      }
    }

    const [users, groups] = await Promise.all([
      this.#resolveUsers
        ? this.#resolveUsers({ userIds: Array.from(userIds) })
        : undefined,
      this.#resolveGroupsInfo && groupIds.size > 0
        ? this.#resolveGroupsInfo({ groupIds: Array.from(groupIds) })
        : undefined,
    ]);

    const resolvedUsers = new Map<string, U["info"]>();
    if (users !== undefined) {
      for (const [index, userId] of Array.from(userIds).entries()) {
        const user = users[index];
        if (user === undefined) continue;
        resolvedUsers.set(userId, user);
      }
    }
    const resolvedGroups = new Map<string, DGI>();
    if (groups !== undefined) {
      for (const [index, groupId] of Array.from(groupIds).entries()) {
        const group = groups[index];
        if (group === undefined) continue;
        resolvedGroups.set(groupId, group);
      }
    }

    const links = new Set<string>();

    const nodes: Paragraph[] = comment.body.content.map((block) => {
      const children: Array<
        Text | Link | Emphasis | Strong | InlineCode | Delete
      > = [];
      for (const inline of block.children) {
        if (isCommentBodyMention(inline)) {
          if (inline.kind === "user") {
            children.push({
              type: "text",
              value: resolvedUsers.get(inline.id)?.name ?? inline.id,
            });
          } else {
            children.push({
              type: "text",
              value: resolvedGroups.get(inline.id)?.name ?? inline.id,
            });
          }
        } else if (isCommentBodyLink(inline)) {
          links.add(inline.url);
          children.push({
            type: "link",
            children: [{ type: "text", value: inline.text ?? "" }],
            url: inline.url,
          });
        } else if (isCommentBodyText(inline)) {
          if (inline.code) {
            children.push({
              type: "inlineCode",
              value: inline.text,
            });
          } else {
            // Build nested structure for combined styles (bold, italic, strikethrough)
            let node: Text | Emphasis | Strong | Delete = {
              type: "text",
              value: inline.text,
            };

            if (inline.strikethrough) {
              node = { type: "delete", children: [node] };
            }
            if (inline.italic) {
              node = { type: "emphasis", children: [node] };
            }
            if (inline.bold) {
              node = { type: "strong", children: [node] };
            }

            children.push(node);
          }
        }
      }
      return { type: "paragraph", children };
    });

    const text = comment.body.content.reduce((acc, block) => {
      return (
        acc +
        block.children.reduce((acc, inline) => {
          if (isCommentBodyMention(inline)) {
            if (inline.kind === "user") {
              return acc + (resolvedUsers.get(inline.id)?.name ?? inline.id);
            } else {
              return acc + (resolvedGroups.get(inline.id)?.name ?? inline.id);
            }
          } else if (isCommentBodyLink(inline)) {
            if (inline.text) {
              return acc + inline.text;
            } else {
              return acc + inline.url;
            }
          } else if (isCommentBodyText(inline)) {
            return acc + inline.text;
          }
          return acc;
        }, "")
      );
    }, "");

    return new Message({
      id: comment.id,
      threadId: this.encodeThreadId({
        roomId: comment.roomId,
        threadId: comment.threadId,
      }),
      raw: comment,
      formatted: { type: "root", children: nodes },
      text,
      isMention: resolvedUsers.has(this.#botUserId),
      links: Array.from(links.values()).map((url) => ({ url })),
      author: {
        userId: comment.userId,
        userName: resolvedUsers.get(comment.userId)?.name ?? comment.userId,
        fullName: resolvedUsers.get(comment.userId)?.name ?? comment.userId,
        // This assumes that the current bot is the only bot in the thread; if we want
        // to support multiple bots, we need to add a way to determine the bot's user id.
        isBot: comment.userId === this.#botUserId,
        isMe: comment.userId === this.#botUserId,
      },
      metadata: {
        dateSent: comment.createdAt,
        edited: comment.editedAt !== undefined,
        editedAt: comment.editedAt,
      },
      attachments: comment.attachments.map((attachment) =>
        this.#createAttachment(comment.roomId, attachment)
      ),
    });
  }
}

/**
 * Parses a Chat SDK channel id into the Liveblocks room id for REST API calls.
 *
 * @throws {Error} If `channelId` is missing the `liveblocks:` prefix or has an empty room segment.
 */
export function getRoomIdFromChannelId(channelId: string): string {
  const prefix = `${ADAPTER_PREFIX}:`;
  if (!channelId.startsWith(prefix)) {
    throw new Error(
      `Invalid channel ID: "${channelId}". Expected format: ${prefix}{roomId}`
    );
  }
  const roomId = channelId.slice(prefix.length);
  if (roomId === "") {
    throw new Error(
      `Invalid channel ID: "${channelId}". Expected format: ${prefix}{roomId}`
    );
  }
  return roomId;
}

export function convertPostableMessageToCommentBody(
  message: AdapterPostableMessage
): CommentBody {
  if (typeof message === "string") {
    return convertChatRootElementToCommentBodyRootElement(
      parseMarkdown(message)
    );
  } else if ("raw" in message) {
    return convertChatRootElementToCommentBodyRootElement(
      parseMarkdown(message.raw)
    );
  } else if ("markdown" in message) {
    return convertChatRootElementToCommentBodyRootElement(
      parseMarkdown(message.markdown)
    );
  } else if ("ast" in message) {
    return convertChatRootElementToCommentBodyRootElement(message.ast);
  } else if ("card" in message) {
    // Liveblocks comments do not support cards and card elements, so we convert the message to markdown and then to a comment body
    return convertChatRootElementToCommentBodyRootElement(
      parseMarkdown(
        message.fallbackText ?? convertCardToMarkdownString(message.card)
      )
    );
  } else if ("type" in message && message.type === "card") {
    return convertChatRootElementToCommentBodyRootElement(
      parseMarkdown(convertCardToMarkdownString(message))
    );
  } else {
    console.error(`Unexpected message type: ${JSON.stringify(message)}`);
    return {
      version: 1,
      content: [],
    };
  }
}

function convertCardToMarkdownString(card: CardElement): string {
  const parts: string[] = [];
  if (card.title) {
    parts.push(`**${card.title}**`);
  }
  if (card.subtitle) {
    parts.push(card.subtitle);
  }
  for (const child of card.children) {
    parts.push(convertCardChildToMarkdownString(child));
  }
  return parts.join("\n");
}

function convertCardChildToMarkdownString(child: CardChild): string {
  switch (child.type) {
    case "text":
      return child.content;
    case "fields":
      return child.children
        .map((field) => `**${field.label}**: ${field.value}`)
        .join("\n");
    case "actions":
      // Actions are interactive-only — exclude from fallback text. See: https://docs.slack.dev/reference/methods/chat.postMessage
      return "";
    case "table": {
      let markdown = "|";
      for (const header of child.headers) {
        markdown += ` ${header} |`;
      }
      markdown += "\n|";
      for (const _ of child.headers) {
        markdown += "--- |";
      }
      markdown += "\n";
      for (const row of child.rows) {
        markdown += "|";
        for (const cell of row) {
          markdown += ` ${cell} |`;
        }
        markdown += "\n";
      }
      return markdown;
    }
    case "section":
      return child.children
        .map((c) => convertCardChildToMarkdownString(c))
        .filter(Boolean)
        .join("\n");
    case "link":
      return `[${child.label}](${child.url})`;
    case "divider":
      return "---";
    case "image":
      return `![${child.alt ?? ""}](${child.url})`;
    default:
      return "";
  }
}

function convertChatRootElementToCommentBodyRootElement(
  root: Root
): CommentBody {
  return {
    version: 1,
    content: root.children.flatMap((child) =>
      convertChatBlockElementToCommentBodyBlockElement(child)
    ),
  };
}

function convertChatBlockElementToCommentBodyBlockElement(
  node: Root["children"][number]
): CommentBodyParagraph | CommentBodyParagraph[] {
  switch (node.type) {
    case "paragraph": {
      const children: CommentBodyInlineElement[] = [];
      for (const child of node.children) {
        children.push(
          convertChatInlineElementToCommentBodyInlineElement(child)
        );
      }
      return {
        type: "paragraph",
        children,
      };
    }
    case "blockquote": {
      return node.children.flatMap((child) => {
        return convertChatBlockElementToCommentBodyBlockElement(child);
      });
    }
    case "list": {
      return node.children.flatMap((child) => {
        return convertChatBlockElementToCommentBodyBlockElement(child);
      });
    }
    case "listItem": {
      return node.children.flatMap((child) => {
        return convertChatBlockElementToCommentBodyBlockElement(child);
      });
    }
    case "heading": {
      // Render headings as paragraphs as Liveblocks comments do not support headings
      return convertChatBlockElementToCommentBodyBlockElement({
        type: "paragraph",
        children: node.children,
      });
    }
    case "code": {
      // Render code blocks as paragraphs as Liveblocks comments do not support code blocks
      return convertChatBlockElementToCommentBodyBlockElement({
        type: "paragraph",
        children: [{ type: "text", value: node.value }],
      });
    }
    case "html": {
      // Render HTML as paragraphs as Liveblocks comments do not support HTML
      return convertChatBlockElementToCommentBodyBlockElement({
        type: "paragraph",
        children: [{ type: "text", value: node.value }],
      });
    }
    case "table": {
      // Convert table to ASCII table string and render as paragraph as Liveblocks comments do not support tables
      return {
        type: "paragraph",
        children: [{ text: tableToAscii(node) }],
      };
    }
    case "link":
    case "image":
    case "strong":
    case "emphasis":
    case "inlineCode":
    case "delete":
    case "text": {
      return {
        type: "paragraph",
        children: [convertChatInlineElementToCommentBodyInlineElement(node)],
      };
    }
    case "break":
    case "thematicBreak":
    case "definition":
    case "tableCell":
    case "tableRow":
    case "yaml":
    case "footnoteDefinition":
    case "footnoteReference":
    case "imageReference":
    case "linkReference":
    default: {
      return [];
    }
  }
}

function convertChatInlineElementToCommentBodyInlineElement(
  inline: PhrasingContent
): CommentBodyInlineElement {
  switch (inline.type) {
    case "text":
      return { text: inline.value };
    case "link":
      return {
        type: "link",
        url: inline.url,
        // Link elements in Liveblocks comments are considered leaf nodes (i.e. they do not have inline elements as children),
        // so we convert the children to plain text to match the expected format
        text: inline.children
          .map((child) => {
            return convertChatInlineElementToPlainText(child);
          })
          .join(""),
      };
    case "image":
      return { text: inline.url };
    case "emphasis":
      return {
        // Emphasis elements in Liveblocks comments are considered leaf nodes (i.e. they do not have inline elements as children),
        // so we convert the children to plain text to match the expected format
        text: inline.children
          .map((child) => {
            return convertChatInlineElementToPlainText(child);
          })
          .join(""),
        italic: true,
      };
    case "strong":
      return {
        text: inline.children
          .map((child) => {
            return convertChatInlineElementToPlainText(child);
          })
          .join(""),
        bold: true,
      };
    case "delete":
      return {
        text: inline.children
          .map((child) => {
            return convertChatInlineElementToPlainText(child);
          })
          .join(""),
        strikethrough: true,
      };
    case "inlineCode":
      return {
        text: inline.value,
        code: true,
      };
    case "html":
      return { text: inline.value };
    case "break":
    case "linkReference":
    case "imageReference":
    case "footnoteReference":
    default: {
      return { text: "" };
    }
  }
}

function convertChatInlineElementToPlainText(inline: PhrasingContent): string {
  switch (inline.type) {
    case "text":
      return inline.value;
    case "link":
      return inline.children
        .map((child) => {
          return convertChatInlineElementToPlainText(child);
        })
        .join("");
    case "image":
      return inline.url;
    case "emphasis":
      return inline.children
        .map((child) => {
          return convertChatInlineElementToPlainText(child);
        })
        .join("");
    case "strong":
      return inline.children
        .map((child) => {
          return convertChatInlineElementToPlainText(child);
        })
        .join("");
    case "delete":
      return inline.children
        .map((child) => {
          return convertChatInlineElementToPlainText(child);
        })
        .join("");
    case "inlineCode":
      return inline.value;
    case "html":
      return inline.value;
    case "break":
    case "linkReference":
    case "imageReference":
    case "footnoteReference":
    default:
      return "";
  }
}

/**
 * Encode a pagination cursor using the format `base64url( [["id", <string>], ["createdAt", <number>]] )`
 */
export function encodePaginationCursorByCreatedAt(
  id: string,
  createdAt: Date
): string {
  return base64UrlEncode(
    JSON.stringify([
      ["id", id],
      ["createdAt", createdAt.getTime()],
    ])
  );
}

export function decodePaginationCursorByCreatedAt(cursor: string): {
  id: string;
  createdAt: Date;
} {
  try {
    const parsed = JSON.parse(base64UrlDecode(cursor));
    if (
      !Array.isArray(parsed) ||
      parsed.length !== 2 ||
      parsed[0]?.[0] !== "id" ||
      parsed[1]?.[0] !== "createdAt"
    ) {
      throw new Error("Invalid cursor structure");
    }
    return {
      id: parsed[0][1] as string,
      createdAt: new Date(parsed[1][1] as number),
    };
  } catch {
    throw new Error(`Invalid pagination cursor: ${cursor}`);
  }
}

export function encodePaginationCursorByUpdatedAt(
  id: string,
  updatedAt: Date
): string {
  return base64UrlEncode(
    JSON.stringify([
      ["id", id],
      ["updatedAt", updatedAt.getTime()],
    ])
  );
}

export function decodePaginationCursorByUpdatedAt(cursor: string): {
  id: string;
  updatedAt: Date;
} {
  try {
    const parsed = JSON.parse(base64UrlDecode(cursor));
    if (
      !Array.isArray(parsed) ||
      parsed.length !== 2 ||
      parsed[0]?.[0] !== "id" ||
      parsed[1]?.[0] !== "updatedAt"
    ) {
      throw new Error("Invalid cursor structure");
    }
    return {
      id: parsed[0][1] as string,
      updatedAt: new Date(parsed[1][1] as number),
    };
  } catch {
    throw new Error(`Invalid pagination cursor: ${cursor}`);
  }
}

function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const binary = atob(s);
  const bytes = Uint8Array.from(binary, (c) => c.codePointAt(0)!);
  return new TextDecoder().decode(bytes);
}

/**
 * Slice a page from an in-memory list sorted by `createdAt` (oldest first).
 *
 * Cursors use the same `[["id", ...], ["createdAt", ...]]` format as the
 * Liveblocks REST API so that they will be forward-compatible if the backend
 * adds server-side pagination.
 *
 * The cursor is always built from the boundary item of the current page and
 * means "start after this item" in the current traversal direction — matching
 * the `startingAfter` semantics used throughout the backend.
 *
 * When no `limit` is provided, all matching items are returned (preserving the
 * pre-pagination behaviour of returning the full list).
 */
function slicePageByCreatedAt<T extends { id: string; createdAt: Date }>(
  data: T[],
  options: {
    /**
     * The direction to slice the page in.
     * - "ascending": Slice the page from the oldest item to the newest item.
     * - "descending": Slice the page from the newest item to the oldest item.
     */
    direction: "ascending" | "descending";
    limit?: number;
    startingAfter?: string;
  }
): { data: T[]; nextCursor: string | undefined } {
  const { direction, limit, startingAfter } = options;

  // Sort data by 'createdAt' (oldest first) and use 'id' as a tie-breaker
  data = data.slice().sort((a, b) => {
    if (a.createdAt.getTime() !== b.createdAt.getTime()) {
      return a.createdAt.getTime() - b.createdAt.getTime();
    }
    return b.id.localeCompare(a.id);
  });

  let startIndex: number;
  let endIndex: number;

  if (direction === "descending") {
    if (startingAfter) {
      const cursor = decodePaginationCursorByCreatedAt(startingAfter);
      // Find the cursor's position in sort order, then take everything before it.
      endIndex = data.findIndex(
        (c) =>
          c.createdAt.getTime() > cursor.createdAt.getTime() ||
          (c.createdAt.getTime() === cursor.createdAt.getTime() &&
            c.id <= cursor.id)
      );
      if (endIndex === -1) {
        endIndex = data.length;
      }
    } else {
      endIndex = data.length;
    }
    startIndex = limit !== undefined ? Math.max(0, endIndex - limit) : 0;
  } else {
    if (startingAfter) {
      const cursor = decodePaginationCursorByCreatedAt(startingAfter);
      // Find the first item strictly after the cursor in sort order.
      startIndex = data.findIndex(
        (c) =>
          c.createdAt.getTime() > cursor.createdAt.getTime() ||
          (c.createdAt.getTime() === cursor.createdAt.getTime() &&
            c.id < cursor.id)
      );
      if (startIndex === -1) {
        return { data: [], nextCursor: undefined };
      }
    } else {
      startIndex = 0;
    }
    endIndex =
      limit !== undefined
        ? Math.min(data.length, startIndex + limit)
        : data.length;
  }

  const page = data.slice(startIndex, endIndex);

  if (page.length === 0) {
    return { data: [], nextCursor: undefined };
  }

  let nextCursor: string | undefined;
  if (direction === "descending") {
    nextCursor =
      startIndex > 0
        ? encodePaginationCursorByCreatedAt(page[0]!.id, page[0]!.createdAt)
        : undefined;
  } else {
    nextCursor =
      endIndex < data.length
        ? encodePaginationCursorByCreatedAt(
            page[page.length - 1]!.id,
            page[page.length - 1]!.createdAt
          )
        : undefined;
  }

  return { data: page, nextCursor };
}

/**
 * Same as {@link slicePageByCreatedAt} (descending direction only) but sorts and
 * paginates on `updatedAt`. Thread listing does not expose forward pagination.
 */
function slicePageByUpdatedAt<T extends { id: string; updatedAt: Date }>(
  data: T[],
  options: {
    limit?: number;
    startingAfter?: string;
  }
): { data: T[]; nextCursor: string | undefined } {
  const { limit, startingAfter } = options;

  // Sort data by 'updatedAt' (oldest first) and use 'id' as a tie-breaker
  data = data.slice().sort((a, b) => {
    if (a.updatedAt.getTime() !== b.updatedAt.getTime()) {
      return a.updatedAt.getTime() - b.updatedAt.getTime();
    }
    return b.id.localeCompare(a.id);
  });

  let endIndex: number;
  if (startingAfter) {
    const cursor = decodePaginationCursorByUpdatedAt(startingAfter);
    // Find the cursor's position in sort order, then take everything before it.
    endIndex = data.findIndex(
      (c) =>
        c.updatedAt.getTime() > cursor.updatedAt.getTime() ||
        (c.updatedAt.getTime() === cursor.updatedAt.getTime() &&
          c.id <= cursor.id)
    );
    if (endIndex === -1) {
      endIndex = data.length;
    }
  } else {
    endIndex = data.length;
  }
  const startIndex = limit !== undefined ? Math.max(0, endIndex - limit) : 0;

  const page = data.slice(startIndex, endIndex);

  if (page.length === 0) {
    return { data: [], nextCursor: undefined };
  }

  const nextCursor =
    startIndex > 0
      ? encodePaginationCursorByUpdatedAt(page[0]!.id, page[0]!.updatedAt)
      : undefined;

  return { data: page, nextCursor };
}

function getAttachmentType(mimeType: string): Attachment["type"] {
  if (mimeType.startsWith("image/")) {
    return "image";
  } else if (mimeType.startsWith("video/")) {
    return "video";
  } else if (mimeType.startsWith("audio/")) {
    return "audio";
  }
  return "file";
}

export interface LiveblocksAdapterConfig<
  U extends BaseUserMeta,
  DGI extends BaseGroupInfo,
> {
  apiKey: string;
  webhookSecret: string;
  resolveUsers?: (
    args: ResolveUsersArgs
  ) => Awaitable<(U["info"] | undefined)[] | undefined>;
  resolveGroupsInfo?: (
    args: ResolveGroupsInfoArgs
  ) => Awaitable<(DGI | undefined)[] | undefined>;
  botUserId: string;
  botUserName?: string;
  logger?: Logger;
}

export function createLiveblocksAdapter<
  U extends BaseUserMeta = BaseUserMeta,
  DGI extends BaseGroupInfo = BaseGroupInfo,
>(config: LiveblocksAdapterConfig<U, DGI>): LiveblocksAdapter<U, DGI> {
  return new LiveblocksAdapter(config);
}
