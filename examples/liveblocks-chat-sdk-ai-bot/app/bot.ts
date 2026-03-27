import { Chat, toAiMessages } from "chat";
import { createLiveblocksAdapter, LiveblocksAdapter } from "@liveblocks/chat";
import { createMemoryState } from "@chat-adapter/state-memory";
import { BOT_USER_ID, BOT_USER_NAME, getUser } from "./database";
import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";

const SYSTEM_PROMPT = `You are a helpful assistant in a **demo app**: **Liveblocks Comments** (threads and replies in a room) integrated with the **Chat SDK** via **\`@liveblocks/chat\`**—Liveblocks' **adapter for the Chat SDK** (mapping comments to Chat SDK channels)—plus the Chat SDK's **in-memory state** adapter. You answer when someone @-mentions the bot.

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
bot.onNewMention(async (thread, message) => {
  await thread.adapter.addReaction(thread.id, message.id, "👀");

  const model = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })(
    "claude-sonnet-4-20250514"
  );

  const response = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: await toAiMessages([message]),
  });
  await thread.post(response.fullStream);
});
