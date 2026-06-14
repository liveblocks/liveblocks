import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";

/**
 * Generates an assistant reply and writes it back into the room's feed using
 * `@liveblocks/node`. The new message is delivered to every connected client in
 * realtime through `useFeedMessages`, so no streaming response is needed here.
 *
 * This mimics a back-end AI workflow (n8n, LangChain, a custom agent, …) adding
 * messages to a Liveblocks feed.
 */

type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT =
  "You are a friendly, concise assistant inside a realtime collaborative chat " +
  "powered by Liveblocks Feeds. Reply in clear Markdown. Keep answers short " +
  "unless asked for detail.";

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY,
  });

  const { roomId, feedId, messages, model } = (await request.json()) as {
    roomId: string;
    feedId: string;
    messages: ChatMessage[];
    model?: string;
  };

  // Only allow writing into this example's rooms.
  if (!roomId?.startsWith("liveblocks:examples:nextjs-ai-feeds") || !feedId) {
    return new NextResponse("Invalid room or feed", { status: 400 });
  }

  // Make sure the feed exists (idempotent safety net).
  try {
    await liveblocks.createFeed({ roomId, feedId, metadata: { title: "AI chat" } });
  } catch {
    // Feed already exists, ignore.
  }

  const reply = process.env.AI_GATEWAY_API_KEY
    ? await generateReply(messages, model)
    : mockReply(messages);

  await liveblocks.createFeedMessage({
    roomId,
    feedId,
    data: { ...reply, role: "assistant", model: reply.model ?? model },
  });

  return NextResponse.json({ ok: true });
}

type AssistantData = {
  content: string;
  model?: string;
  reasoning?: string;
  sources?: { title: string; url: string }[];
  suggestions?: string[];
};

async function generateReply(
  messages: ChatMessage[],
  model?: string
): Promise<AssistantData> {
  // Imported lazily so the example still builds and runs without an API key.
  const { generateText } = await import("ai");

  // AI SDK v6 resolves bare string model ids (e.g. "openai/gpt-4o-mini")
  // through the Vercel AI Gateway when AI_GATEWAY_API_KEY is set.
  const result = await generateText({
    model: model ?? "openai/gpt-4o-mini",
    system: SYSTEM_PROMPT,
    messages,
  });

  const sources = result.sources
    .filter((source) => source.sourceType === "url")
    .map((source) => ({
      title: source.title || source.url,
      url: source.url,
    }));

  return {
    content: result.text,
    reasoning: result.reasoningText || undefined,
    sources: sources.length > 0 ? sources : undefined,
  };
}

// A rich canned reply so the example fully works (and shows off reasoning,
// sources, and follow-up suggestions) without an AI provider key.
function mockReply(messages: ChatMessage[]): AssistantData {
  const lastUserMessage =
    [...messages].reverse().find((message) => message.role === "user")
      ?.content ?? "your message";

  return {
    content: [
      `Here's a mock reply to **"${lastUserMessage}"**.`,
      "",
      "This message was created on the server with `@liveblocks/node` and written into the room's feed, so it appeared for everyone in realtime via `useFeedMessages`.",
      "",
      "Add an `AI_GATEWAY_API_KEY` to `.env.local` to get real model responses.",
    ].join("\n"),
    model: "mock",
    reasoning:
      "No AI provider key is set, so I'm returning a canned response. " +
      "In a real workflow this is where the model's reasoning would appear.",
    sources: [
      {
        title: "AI collaboration — Liveblocks Docs",
        url: "https://liveblocks.io/docs/collaboration-features/ai-collaboration",
      },
      {
        title: "Feeds API reference",
        url: "https://liveblocks.io/docs",
      },
    ],
    suggestions: [
      "How do I trigger this from a backend?",
      "Show me the useFeedMessages hook",
      "What else can Feeds do?",
    ],
  };
}
