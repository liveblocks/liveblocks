import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { AI_USER_AVATAR, AI_USER_ID, AI_USER_NAME } from "@/app/database";

/**
 * Generates an assistant reply and streams it into the room's feed using
 * `@liveblocks/node`. We create one assistant message, then repeatedly call
 * `updateFeedMessage` as tokens (and reasoning) arrive. Every connected client
 * sees the message fill in live through `useFeedMessages` — no SSE needed.
 *
 * This mimics a back-end AI workflow (n8n, LangChain, a custom agent, …)
 * streaming into a Liveblocks feed.
 */

type ChatMessage = { role: "user" | "assistant"; content: string };
type Source = { title: string; url: string };
type ChainStep = {
  label: string;
  description?: string;
  status?: "complete" | "active" | "pending";
  search?: string[];
};
type ToolCall = {
  name: string;
  input: Record<string, string | number>;
  output?: string;
};

type AssistantUpdate = {
  content: string;
  reasoning?: string;
  sources?: Source[];
  suggestions?: string[];
  chainOfThought?: ChainStep[];
  tool?: ToolCall;
  usedTokens?: number;
  maxTokens?: number;
  streaming: boolean;
};

const MAX_TOKENS = 128_000;

const AUTHOR = {
  userId: AI_USER_ID,
  name: AI_USER_NAME,
  avatar: AI_USER_AVATAR,
} as const;

const SYSTEM_PROMPT =
  "You are a friendly, concise assistant inside a realtime collaborative chat " +
  "powered by Liveblocks Feeds. Reply in clear Markdown. Keep answers short " +
  "unless asked for detail. Separate ideas into proper paragraphs with a blank " +
  "line between them — never use <br> tags or manual line breaks to space out " +
  "text.";

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
  if (
    !roomId?.startsWith("liveblocks:examples:nextjs-ai-elements-realtime") ||
    !feedId
  ) {
    return new NextResponse("Invalid room or feed", { status: 400 });
  }

  // Make sure the feed exists (idempotent safety net).
  try {
    await liveblocks.createFeed({ roomId, feedId, metadata: { title: "AI chat" } });
  } catch {
    // Feed already exists, ignore.
  }

  // Create the (empty) assistant message we'll stream into.
  const created = await liveblocks.createFeedMessage({
    roomId,
    feedId,
    data: { role: "assistant", content: "", streaming: true, model, ...AUTHOR },
  });
  const messageId = created.id;

  // Patches the streaming message. `updateFeedMessage` replaces the message
  // data, so we always send the full object.
  const update = (data: AssistantUpdate) =>
    liveblocks.updateFeedMessage({
      roomId,
      feedId,
      messageId,
      data: { role: "assistant", model, ...AUTHOR, ...data },
    });

  try {
    if (process.env.AI_GATEWAY_API_KEY) {
      await streamRealReply(messages, model, update);
    } else {
      await streamMockReply(messages, update);
    }
  } catch (error) {
    // Make sure the message doesn't get stuck in the "streaming" state, and
    // surface the reason (e.g. an unknown model id) to make debugging easy.
    const reason = error instanceof Error ? error.message : "Unknown error";
    await update({
      content:
        created.data.content || `Sorry, something went wrong.\n\n\`${reason}\``,
      streaming: false,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

type UpdateFn = (data: AssistantUpdate) => Promise<unknown>;

async function streamRealReply(
  messages: ChatMessage[],
  model: string | undefined,
  update: UpdateFn
) {
  // Imported lazily so the example still builds and runs without an API key.
  const { streamText } = await import("ai");

  // AI SDK v6 resolves bare string model ids (e.g. "openai/gpt-5.5") through
  // the Vercel AI Gateway when AI_GATEWAY_API_KEY is set.
  const result = streamText({
    model: model ?? "openai/gpt-5.4-mini",
    system: SYSTEM_PROMPT,
    messages,
    // Turn reasoning on. Unknown options are ignored by providers that don't
    // support them, so this works across whichever model is selected.
    providerOptions: {
      openai: { reasoningEffort: "low", reasoningSummary: "auto" },
      anthropic: { thinking: { type: "enabled", budgetTokens: 4096 } },
      google: { thinkingConfig: { includeThoughts: true } },
    },
  });

  let content = "";
  let reasoning = "";
  let lastFlush = 0;

  const flush = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFlush < 100) {
      return;
    }
    lastFlush = now;
    await update({
      content,
      reasoning: reasoning || undefined,
      streaming: true,
    });
  };

  for await (const part of result.fullStream) {
    if (part.type === "text-delta") {
      content += part.text;
      await flush();
    } else if (part.type === "reasoning-delta") {
      reasoning += part.text;
      await flush();
    }
  }

  // Fallback: some models return reasoning only at the end rather than as
  // streamed deltas.
  if (!reasoning) {
    reasoning = (await result.reasoningText) ?? "";
  }

  const sources = (await result.sources)
    .filter((source) => source.sourceType === "url")
    .map((source) => ({ title: source.title || source.url, url: source.url }));

  const usage = await result.usage;

  await update({
    content,
    reasoning: reasoning || undefined,
    sources: sources.length > 0 ? sources : undefined,
    usedTokens: usage.totalTokens ?? 0,
    maxTokens: MAX_TOKENS,
    streaming: false,
  });
}

// Simulates a streamed, reasoning-capable reply so the example fully works
// (and visibly streams via `updateFeedMessage`) without an AI provider key.
async function streamMockReply(messages: ChatMessage[], update: UpdateFn) {
  const lastUserMessage =
    [...messages].reverse().find((message) => message.role === "user")
      ?.content ?? "your message";

  const reasoningText =
    "No AI provider key is set, so I'm streaming a canned response. " +
    "Each chunk is written on the server with updateFeedMessage — this is " +
    "where a real model's live reasoning would stream in.";

  const contentText = [
    `Here's a streamed mock reply to **"${lastUserMessage}"**.`,
    "",
    "Every chunk you see was written into the same feed message with `updateFeedMessage`, so it streams live to everyone in the room via `useFeedMessages`.",
    "",
    "Add an `AI_GATEWAY_API_KEY` to `.env.local` for real, reasoning-capable model responses.",
  ].join("\n");

  // Constant for the lifetime of this message — shown (collapsed) while the
  // text streams in.
  const chainOfThought: ChainStep[] = [
    {
      label: "Understand the request",
      description: "Parse what the user is asking for.",
      status: "complete",
    },
    {
      label: "Search the Liveblocks docs",
      status: "complete",
      search: ["Feeds", "useFeedMessages", "createFeedMessage"],
    },
    {
      label: "Write a concise, streamed answer",
      status: "complete",
    },
  ];

  const tool: ToolCall = {
    name: "searchDocs",
    input: { query: lastUserMessage, limit: 3 },
    output: "Found 3 relevant documentation sections about Liveblocks Feeds.",
  };

  const base = { chainOfThought, tool, maxTokens: MAX_TOKENS } as const;

  // Stream the reasoning first…
  let reasoning = "";
  for (const chunk of chunkText(reasoningText)) {
    reasoning += chunk;
    await update({ content: "", reasoning, ...base, streaming: true });
    await sleep(40);
  }

  // …then the answer, word by word.
  let content = "";
  for (const chunk of chunkText(contentText)) {
    content += chunk;
    await update({ content, reasoning, ...base, streaming: true });
    await sleep(55);
  }

  await update({
    content,
    reasoning,
    ...base,
    usedTokens: Math.round(content.length / 4) + 320,
    sources: [
      {
        title: "AI collaboration — Liveblocks Docs",
        url: "https://liveblocks.io/docs/collaboration-features/ai-collaboration",
      },
      { title: "Feeds API reference", url: "https://liveblocks.io/docs" },
    ],
    suggestions: [
      "How do I trigger this from a backend?",
      "Show me the useFeedMessages hook",
      "What else can Feeds do?",
    ],
    streaming: false,
  });
}

// Splits text into single words (keeping trailing whitespace) for streaming.
function chunkText(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [text];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
