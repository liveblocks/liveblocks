import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import {
  AI_USER_ID,
  AI_USER_NAME,
  getUser,
  getUsers,
} from "@/app/database";

type FeedMessage = { userId: string; content: string };
type ChatMessage = { role: "user" | "assistant"; content: string };

const ROOM_ID_PREFIX = "liveblocks:examples:nextjs-messaging-app";

const SYSTEM_PROMPT = [
  "You are a helpful AI teammate in a Slack-like team chat.",
  "Keep replies SHORT and conversational.",
  "Use only basic markdown: **bold**, *italic*, `inline code`, and fenced code blocks.",
  "You may mention users with `<@userId>` tokens when relevant.",
  "",
  "Known users:",
  ...getUsers().map((user) => `- ${user.info.name} (<@${user.id}>)`),
  `- ${AI_USER_NAME} (<@${AI_USER_ID}>)`,
].join("\n");

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY,
    baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
  });

  const body: unknown = await request.json();
  if (!isRecord(body)) {
    return new NextResponse("Invalid request", { status: 400 });
  }

  const roomId = typeof body.roomId === "string" ? body.roomId : "";
  const feedId = typeof body.feedId === "string" ? body.feedId : "";
  const messages = isFeedMessages(body.messages) ? body.messages : [];

  if (!roomId.startsWith(ROOM_ID_PREFIX) || !feedId) {
    return new NextResponse("Invalid room or feed", { status: 400 });
  }

  try {
    await liveblocks.createFeed({
      roomId,
      feedId,
      metadata: { name: feedId },
    });
  } catch {
    // Feed already exists.
  }

  const created = await liveblocks.createFeedMessage({
    roomId,
    feedId,
    data: {
      userId: AI_USER_ID,
      content: "",
      streaming: true,
    },
  });
  const messageId = created.id;

  const update = (data: { content: string; streaming: boolean }) =>
    liveblocks.updateFeedMessage({
      roomId,
      feedId,
      messageId,
      data: {
        userId: AI_USER_ID,
        content: data.content,
        streaming: data.streaming,
      },
    });

  try {
    if (process.env.AI_GATEWAY_API_KEY) {
      await streamRealReply(messages, update);
    } else {
      await streamMockReply(messages, update);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    await update({
      content:
        created.data.content ||
        `Sorry, something went wrong while generating a reply.\n\n\`${reason}\``,
      streaming: false,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

type UpdateFn = (data: { content: string; streaming: boolean }) => Promise<unknown>;

async function streamRealReply(messages: FeedMessage[], update: UpdateFn) {
  const { streamText } = await import("ai");

  const result = streamText({
    model: "openai/gpt-5.4-mini",
    system: SYSTEM_PROMPT,
    messages: toChatMessages(messages),
  });

  let content = "";
  let lastFlush = 0;

  const flush = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFlush < 100) {
      return;
    }
    lastFlush = now;
    await update({ content, streaming: true });
  };

  for await (const part of result.fullStream) {
    if (part.type === "text-delta") {
      content += part.text;
      await flush();
    }
  }

  await update({ content, streaming: false });
}

async function streamMockReply(messages: FeedMessage[], update: UpdateFn) {
  const lastUserMessage =
    [...messages].reverse().find((message) => message.userId !== AI_USER_ID)
      ?.content ?? "your message";

  const mockReply = [
    "This is a **mock reply** because `AI_GATEWAY_API_KEY` is not set.",
    "",
    `You mentioned me about: "${replaceMentions(lastUserMessage)}".`,
    "",
    "Add an AI Gateway key to get real responses from the model.",
  ].join("\n");

  let content = "";
  for (const word of chunkText(mockReply)) {
    content += word;
    await update({ content, streaming: true });
    await sleep(40);
  }

  await update({ content, streaming: false });
}

function toChatMessages(messages: FeedMessage[]): ChatMessage[] {
  return messages.map((message) => {
    if (message.userId === AI_USER_ID) {
      return {
        role: "assistant",
        content: replaceMentions(message.content),
      };
    }

    const author = getUser(message.userId)?.info.name ?? "Unknown";
    return {
      role: "user",
      content: `${author}: ${replaceMentions(message.content)}`,
    };
  });
}

function replaceMentions(content: string) {
  return content.replace(/<@([^>]+)>/g, (_, userId: string) => {
    const user = getUser(userId);
    return user ? `@${user.info.name}` : `@${userId}`;
  });
}

function isFeedMessages(value: unknown): value is FeedMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.userId === "string" &&
        typeof item.content === "string"
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function chunkText(text: string) {
  return text.match(/\S+\s*/g) ?? [text];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
