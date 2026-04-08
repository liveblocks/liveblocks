import {
  AiAssistantMessage,
  AiFilePart,
  AiImagePart,
  AiMessage,
  AiMessagePart,
  AiUserMessage,
  Chat,
  Message,
  Thread,
} from "chat";
import {
  createLiveblocksAdapter,
  LiveblocksAdapter,
} from "@liveblocks/chat-sdk-adapter";
import { createMemoryState } from "@chat-adapter/state-memory";
import { BOT_USER_ID, BOT_USER_NAME, getUser } from "./database";
import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";

const SYSTEM_PROMPT = `You are a helpful assistant in a **demo app**: **Liveblocks Comments** (threads and replies in a room) integrated with the **Chat SDK** via **\`@liveblocks/chat-sdk-adapter\`**—Liveblocks' **adapter for the Chat SDK** (mapping comments to Chat SDK channels)—plus the Chat SDK's **in-memory state** adapter. You answer when someone @-mentions the bot.

**How replies are stored.** User messages and your replies are turned into Liveblocks **CommentBody**, not arbitrary Markdown. A comment is a list of **paragraph** blocks. Each paragraph only has **inline** nodes:

- Text runs with optional **bold**, *italic*, \`code\`, and ~~strikethrough~~
- **Links** (\`[label](url)\` in Markdown terms)
- **@mentions** of users or groups

There are **no** real block-level Markdown features in comments: headings, bullet/numbered lists, fenced code blocks, tables, and raw HTML are **not** preserved as such—the pipeline **flattens** them into plain paragraphs (e.g. headings and code fences become paragraph text; tables may become plain text). So prefer short, clear paragraphs and inline emphasis and links rather than relying on lists, headings, or code blocks for structure.`;

export const bot = new Chat<{ liveblocks: LiveblocksAdapter }>({
  userName: BOT_USER_NAME,
  adapters: {
    liveblocks: createLiveblocksAdapter({
      apiKey: process.env.LIVEBLOCKS_SECRET_KEY!,
      webhookSecret: process.env.LIVEBLOCKS_WEBHOOK_SECRET!,
      botUserId: BOT_USER_ID,
      botUserName: BOT_USER_NAME,
      resolveUsers: ({ userIds }) => {
        return userIds.map((id) => getUser(id)?.info);
      },
    }),
  },
  state: createMemoryState(),
});

// Handle @-mentions of the bot
bot.onNewMention(postAiResponse);

// ==========================================================================
// Optional: Automatically reply to further comments after the first mention
// This requires a permanent state adapter set up to persist the subscription
// e.g. import { createRedisState } from "@chat-adapter/state-redis";

// Handle @-mentions of the bot
// bot.onNewMention(async (thread, message) => {
//   // After AI is mentioned, subscribe to thread
//   await thread.subscribe();

//   await postAiResponse(thread, message);
// });

// Handle replying to further comments in the subscribed thread
// bot.onSubscribedMessage(async (thread, message) => {
//   await postAiResponse(thread, message);
// });
// ==========================================================================

// Generate an AI response to the message
async function postAiResponse(thread: Thread, message: Message) {
  await thread.adapter.addReaction(thread.id, message.id, "👀");

  const model = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })(
    "claude-sonnet-4-20250514"
  );

  const response = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: [await convertChatMessageToAiMessage(message)],
  });

  await thread.post(response.fullStream);
}

async function convertChatMessageToAiMessage(
  message: Message
): Promise<AiMessage> {
  let links = "";
  if (message.links.length > 0) {
    links +=
      "\n\nLinks:\n" +
      message.links
        .map((link) => {
          const parts: string[] = [];
          if (link.fetchMessage) {
            parts.push(`[Embedded message: ${link.url}]`);
          } else {
            parts.push(link.url);
          }
          if (link.title) {
            parts.push(`Title: ${link.title}`);
          }
          if (link.description) {
            parts.push(`Description: ${link.description}`);
          }
          if (link.siteName) {
            parts.push(`Site: ${link.siteName}`);
          }
          return parts.join("\n");
        })
        .join("\n\n");
  }

  if (message.author.isMe) {
    return {
      role: "assistant",
      content: message.text + links,
    } satisfies AiAssistantMessage;
  } else {
    const results: PromiseSettledResult<AiMessagePart | null>[] =
      await Promise.allSettled(
        message.attachments.map(async (attachment) => {
          if (attachment.type === "image") {
            if (attachment.url !== undefined) {
              return {
                type: "image",
                image: new URL(attachment.url),
                mediaType: attachment.mimeType,
              } satisfies AiImagePart;
            } else if (attachment.data !== undefined) {
              return {
                type: "image",
                image:
                  attachment.data instanceof Uint8Array
                    ? attachment.data
                    : new Uint8Array(await attachment.data.arrayBuffer()),
                mediaType: attachment.mimeType,
              } satisfies AiImagePart;
            } else if (attachment.fetchData !== undefined) {
              const buffer = await attachment.fetchData();
              return {
                type: "image",
                image: buffer,
                mediaType: attachment.mimeType,
              } satisfies AiImagePart;
            } else {
              return null;
            }
          } else if (attachment.type === "file") {
            if (attachment.data !== undefined) {
              return {
                type: "file",
                data:
                  attachment.data instanceof Blob
                    ? new Uint8Array(await attachment.data.arrayBuffer())
                    : attachment.data,
                mediaType: attachment.mimeType ?? "application/octet-stream",
              } satisfies AiFilePart;
            } else if (attachment.url !== undefined) {
              return {
                type: "file",
                data: new URL(attachment.url),
                mediaType: attachment.mimeType ?? "application/octet-stream",
              } satisfies AiFilePart;
            } else if (attachment.fetchData !== undefined) {
              const buffer = await attachment.fetchData();
              return {
                type: "file",
                data:
                  buffer instanceof Blob
                    ? new Uint8Array(await buffer.arrayBuffer())
                    : buffer,
                mediaType: attachment.mimeType ?? "application/octet-stream",
              } satisfies AiFilePart;
            } else {
              return null;
            }
          } else {
            return null;
          }
        })
      );

    return {
      role: "user",
      content: [
        {
          type: "text",
          text: `${message.author.userName}: ${message.text + links}`,
        },
        ...results
          .filter((result) => result.status === "fulfilled")
          .filter((result) => result.value !== null)
          .map((result) => result.value as AiMessagePart),
      ],
    } satisfies AiUserMessage;
  }
}
