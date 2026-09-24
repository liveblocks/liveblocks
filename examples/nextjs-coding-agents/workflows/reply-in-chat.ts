import { streamText, type ModelMessage } from "ai";
import { AI_USER_ID } from "@/lib/agent-user";
import { stripMentionTokens } from "@/lib/mentions";
import { buildChatReplySystemPrompt } from "@/lib/prompt";
import { getRepoName } from "@/lib/repo";
import { readDocuments } from "@/lib/server/documents";
import { getGitHubUsers } from "@/lib/server/github";
import { getLiveblocks } from "@/lib/server/liveblocks";
import { stripSkillTokens } from "@/lib/skills";
import type { AgentPart, ChatMessage, ChatMessageData } from "@/lib/types";

/**
 * Answers a message in the chat with a language model, for questions that
 * don't need the coding agent (see lib/server/triage.ts). The reply is an
 * agent message like any other, streamed in as it's generated, so it reads
 * the same in the UI, minus a work log.
 *
 * The model is reached through Vercel AI Gateway with the same credentials
 * as Jev; set `AI_CHAT_MODEL` to pick a different one.
 */
export const DEFAULT_CHAT_MODEL_ID = "anthropic/claude-haiku-4.5";

/** How much of the chat the model sees */
const CONTEXT_MESSAGES = 20;
const FLUSH_INTERVAL_MS = 100;

type ReplyInput = { roomId: string; feedId: string; messageId: string };

export async function replyInChat(input: ReplyInput) {
  "use workflow";

  const outcome = await streamReply(input);
  return outcome;
}

async function streamReply({ roomId, feedId, messageId }: ReplyInput) {
  "use step";

  const liveblocks = getLiveblocks();
  const [{ data: allMessages }, feed, documents] = await Promise.all([
    liveblocks.getFeedMessages({ roomId, feedId }),
    liveblocks.getFeed({ roomId, feedId }),
    readDocuments({ roomId, feedId }),
  ]);

  const target = allMessages.find((message) => message.id === messageId);
  if (!target) {
    return { status: "skipped" as const };
  }

  // The conversation up to and including the message being answered, with
  // people's names so the model can tell who said what
  const history = allMessages
    .filter((message) => message.createdAt <= target.createdAt)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-CONTEXT_MESSAGES);
  const logins = [
    ...new Set(
      history
        .filter((message) => message.data.role === "user")
        .map((message) => message.data.userId)
    ),
  ];
  const users = await getGitHubUsers(logins);

  const messages: ModelMessage[] = history.flatMap(
    (message): ModelMessage[] => {
      const text = messageText(message);
      if (!text) {
        return [];
      }
      if (message.data.role === "agent") {
        return [{ role: "assistant", content: text }];
      }
      const name = users.get(message.data.userId)?.name ?? message.data.userId;
      return [{ role: "user", content: `${name}: ${text}` }];
    }
  );

  const startedAt = Date.now();
  const reply = await liveblocks.createFeedMessage({
    roomId,
    feedId,
    data: agentMessageData({
      status: "running",
      parts: [],
      startedAt,
      repliesTo: [messageId],
    }),
  });

  let text = "";
  let lastFlush = 0;
  const write = (data: Partial<ChatMessageData>) =>
    liveblocks.updateFeedMessage({
      roomId,
      feedId,
      messageId: reply.id,
      data: agentMessageData({ startedAt, repliesTo: [messageId], ...data }),
    });
  const flush = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFlush < FLUSH_INTERVAL_MS) {
      return;
    }
    lastFlush = now;
    await write({ status: "running", parts: textParts(text) });
  };

  try {
    const result = streamText({
      model: process.env.AI_CHAT_MODEL || DEFAULT_CHAT_MODEL_ID,
      system: buildChatReplySystemPrompt({
        hasRepository: Boolean(feed.metadata.repoUrl),
        repoName: feed.metadata.repoUrl
          ? getRepoName(feed.metadata.repoUrl)
          : undefined,
        documents,
      }),
      messages,
    });

    for await (const delta of result.textStream) {
      text += delta;
      await flush();
    }

    await write({
      status: "done",
      parts: textParts(text),
      content: text,
      finishedAt: Date.now(),
    });
    return { status: "done" as const };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The reply could not be written";
    console.error("[reply-in-chat]", error);
    await write({
      status: "error",
      parts: [...textParts(text), { type: "error", text: message }],
      content: text,
      finishedAt: Date.now(),
    }).catch(() => {});
    return { status: "error" as const };
  }
}

function textParts(text: string): AgentPart[] {
  return text ? [{ type: "text", text }] : [];
}

function messageText(message: ChatMessage) {
  if (message.data.role === "agent") {
    return (
      (message.data.parts ?? [])
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n")
        .trim() || message.data.content.trim()
    );
  }
  return stripMentionTokens(stripSkillTokens(message.data.content));
}

function agentMessageData(
  fields: Partial<Omit<ChatMessageData, "role" | "userId">>
): ChatMessageData {
  return {
    role: "agent",
    userId: AI_USER_ID,
    kind: "reply",
    content: "",
    ...fields,
  };
}
