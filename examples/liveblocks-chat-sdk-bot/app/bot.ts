import { Chat } from "chat";
import { createLiveblocksAdapter, LiveblocksAdapter } from "@liveblocks/chat";
import { createMemoryState } from "@chat-adapter/state-memory";
import { BOT_USER_ID, BOT_USER_NAME, getUser } from "./database";

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
  await Promise.all([
    thread.adapter.addReaction(thread.id, message.id, "👀"),
    thread.post({
      ast: {
        type: "root",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                value: "Hello ",
              },
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: message.author.userName,
                  },
                ],
              },
              {
                type: "text",
                value: "!",
              },
            ],
          },
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                value: "I'm ",
              },
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: "Liveblocks Bot",
                  },
                ],
              },
              {
                type: "text",
                value:
                  ". You can @-mention me again or react to my messages to see me respond.",
              },
            ],
          },
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                value: "You can learn more about this demo by visiting the ",
              },
              {
                type: "link",
                url: "https://liveblocks.io/docs/examples/liveblocks-chat-sdk",
                children: [
                  {
                    type: "text",
                    value: "Liveblocks Chat SDK documentation",
                  },
                ],
              },
              {
                type: "text",
                value: ".",
              },
            ],
          },
        ],
      },
    }),
  ]);
});

bot.onReaction(async (event) => {
  // Ignore reactions that are not added
  if (!event.added) return;
  await event.adapter.postMessage(
    event.threadId,
    `${event.user.userName} reacted with "${event.emoji.name}"`
  );
});
