import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { AI_USER_AVATAR, AI_USER_ID, AI_USER_NAME } from "@/app/database";
import { INITIAL_SLIDE_ID } from "@/app/slide-doc";
import { STARTER_SLIDE_HTML } from "@/app/slide-html";
import {
  extractHtmlProposal,
  extractStreamingHtml,
  stripHtmlFencesForChat,
  type HtmlProposal,
} from "./html-proposals";

/**
 * Generates an assistant reply and streams it into the room's feed using
 * `@liveblocks/node`. Chat content excludes fenced HTML while streaming; the
 * completed HTML document is attached as a proposal for clients to apply.
 */

type ChatMessage = { role: "user" | "assistant"; content: string };
type SlideContext = { id: string; html: string };
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
  proposals?: HtmlProposal[];
  proposalStatus?: "pending" | "applied" | "rejected";
  usedTokens?: number;
  maxTokens?: number;
  streaming: boolean;
};

const ROOM_ID_PREFIX = "liveblocks:examples:nextjs-ai-slideshow";
const MAX_TOKENS = 128_000;

const AUTHOR = {
  userId: AI_USER_ID,
  name: AI_USER_NAME,
  avatar: AI_USER_AVATAR,
} as const;

const SYSTEM_PROMPT = [
  "You are an expert slide designer inside a multiplayer slideshow builder.",
  "Reply with a SHORT conversational message.",
  "The HTML must be a full self-contained document with inline <style>, designed for a 1280x720 16:9 slide.",
  // External resources don't survive the client-side PPTX snapshot (CORS), so
  // the slide must be renderable entirely offline.
  "Strictly no external resources: no <link> stylesheets or font imports, no <img> or background images from URLs. Use system font stacks (e.g. Inter, ui-sans-serif, system-ui) and CSS gradients/shapes for visuals.",
  "Keep the design polished, readable, and presentation-ready.",
  "You may edit any existing slides and/or add new slides.",
  "For each existing slide you want to change, output the COMPLETE HTML document in a fenced code block whose info string is ```html id=<slideId>.",
  "For each new slide you want to append, output the COMPLETE HTML document in a fenced code block whose info string is ```html new.",
  "A plain ```html fenced block targets the slide currently viewed by the user.",
  "Only output fenced HTML blocks for slides you want to change.",
].join("\n");

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY,
  });

  const body: unknown = await request.json();
  if (!isRecord(body)) {
    return new NextResponse("Invalid request", { status: 400 });
  }

  const roomId = typeof body.roomId === "string" ? body.roomId : "";
  const feedId = typeof body.feedId === "string" ? body.feedId : "";
  const model = typeof body.model === "string" ? body.model : undefined;
  const messages = isChatMessages(body.messages) ? body.messages : [];
  const slides = parseSlides(body.slides);
  const currentSlideId =
    typeof body.currentSlideId === "string" ? body.currentSlideId : undefined;

  if (!slides) {
    return new NextResponse("Invalid slides", { status: 400 });
  }

  const deckSlides =
    slides.length > 0
      ? slides
      : [{ id: currentSlideId ?? INITIAL_SLIDE_ID, html: STARTER_SLIDE_HTML }];
  const effectiveCurrentSlideId =
    currentSlideId && deckSlides.some((slide) => slide.id === currentSlideId)
      ? currentSlideId
      : deckSlides[0].id;

  // Only allow writing into this example's rooms.
  if (!roomId?.startsWith(ROOM_ID_PREFIX) || !feedId) {
    return new NextResponse("Invalid room or feed", { status: 400 });
  }

  // Make sure the feed exists (idempotent safety net).
  try {
    await liveblocks.createFeed({
      roomId,
      feedId,
      metadata: { title: "AI slideshow" },
    });
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

  // `updateFeedMessage` replaces message data, so every update sends the full
  // assistant data object, preserving author/model fields and proposal fields.
  const update = (data: AssistantUpdate) =>
    liveblocks.updateFeedMessage({
      roomId,
      feedId,
      messageId,
      data: { role: "assistant", model, ...AUTHOR, ...data },
    });

  try {
    if (process.env.AI_GATEWAY_API_KEY) {
      await streamRealReply(
        messages,
        deckSlides,
        effectiveCurrentSlideId,
        model,
        update
      );
    } else {
      await streamMockReply(messages, effectiveCurrentSlideId, update);
    }
  } catch (error) {
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
  slides: SlideContext[],
  currentSlideId: string,
  model: string | undefined,
  update: UpdateFn
) {
  // Imported lazily so the example still builds and runs without an API key.
  const { streamText } = await import("ai");

  const result = streamText({
    model: model ?? "openai/gpt-5.4-mini",
    system: `${SYSTEM_PROMPT}\n\nCurrent deck:\n${formatDeckContext(slides, currentSlideId)}`,
    messages,
    providerOptions: {
      openai: { reasoningEffort: "low", reasoningSummary: "auto" },
      anthropic: { thinking: { type: "enabled", budgetTokens: 4096 } },
      google: { thinkingConfig: { includeThoughts: true } },
    },
  });

  let rawContent = "";
  let reasoning = "";
  let lastFlush = 0;

  const flush = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFlush < 100) {
      return;
    }
    lastFlush = now;
    await update({
      content: stripHtmlFencesForChat(rawContent),
      reasoning: reasoning || undefined,
      // Stream the partial HTML too, so the proposal card shows up (in a
      // loading state) as soon as the model starts writing the fenced block.
      proposals: extractStreamingHtml(rawContent, currentSlideId),
      streaming: true,
    });
  };

  for await (const part of result.fullStream) {
    if (part.type === "text-delta") {
      rawContent += part.text;
      await flush();
    } else if (part.type === "reasoning-delta") {
      reasoning += part.text;
      await flush();
    }
  }

  if (!reasoning) {
    reasoning = (await result.reasoningText) ?? "";
  }

  const sources = (await result.sources)
    .filter((source) => source.sourceType === "url")
    .map((source) => ({ title: source.title || source.url, url: source.url }));

  const usage = await result.usage;
  const proposal = extractHtmlProposal(rawContent, currentSlideId);

  await update({
    content: proposal.content || stripHtmlFencesForChat(rawContent),
    reasoning: reasoning || undefined,
    sources: sources.length > 0 ? sources : undefined,
    proposals: proposal.proposals.length > 0 ? proposal.proposals : undefined,
    proposalStatus: proposal.proposals.length > 0 ? "pending" : undefined,
    usedTokens: usage.totalTokens ?? 0,
    maxTokens: MAX_TOKENS,
    streaming: false,
  });
}

async function streamMockReply(
  messages: ChatMessage[],
  currentSlideId: string,
  update: UpdateFn
) {
  const lastUserMessage =
    [...messages].reverse().find((message) => message.role === "user")
      ?.content ?? "your request";

  const slide = MOCK_SLIDES[Math.floor(Date.now() / 1000) % MOCK_SLIDES.length];
  const contentText = [
    `I drafted a slide proposal for **"${lastUserMessage}"**.`,
    "",
    "Review the HTML below, then apply it to the shared deck when you are ready.",
  ].join("\n");

  let content = "";
  for (const chunk of chunkText(contentText)) {
    content += chunk;
    await update({ content, maxTokens: MAX_TOKENS, streaming: true });
    await sleep(45);
  }

  // Stream the slide HTML into the proposal card, like a real model would.
  for (let i = 1; i <= 20; i++) {
    await update({
      content,
      proposals: [
        {
          slideId: currentSlideId,
          html: slide.slice(0, Math.ceil((slide.length * i) / 20)),
        },
      ],
      maxTokens: MAX_TOKENS,
      streaming: true,
    });
    await sleep(90);
  }

  await update({
    content,
    proposals: [{ slideId: currentSlideId, html: slide }],
    proposalStatus: "pending",
    usedTokens: Math.round(content.length / 4) + 280,
    suggestions: [
      "Make the headline bolder",
      "Create a calmer executive version",
      "Turn this into a metrics slide",
    ],
    streaming: false,
  });
}

function formatDeckContext(slides: SlideContext[], currentSlideId: string) {
  return slides
    .map((slide, index) => {
      const current =
        slide.id === currentSlideId ? ", currently viewed by the user" : "";
      return [
        `Slide ${index + 1} of ${slides.length} (id: ${slide.id})${current}`,
        "```",
        slide.html,
        "```",
      ].join("\n");
    })
    .join("\n\n");
}

function parseSlides(value: unknown): SlideContext[] | undefined {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    return undefined;
  }

  const slides: SlideContext[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      return undefined;
    }
    if (typeof item.id !== "string" || typeof item.html !== "string") {
      return undefined;
    }
    slides.push({ id: item.id, html: item.html });
  }

  return slides;
}

function isChatMessages(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string"
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function chunkText(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [text];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MOCK_SLIDES = [
  `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 1280px; height: 720px; overflow: hidden; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #fff; }
      body { background: linear-gradient(135deg, #111827 0%, #4c0519 52%, #fb7185 100%); }
      .slide { width: 1280px; height: 720px; padding: 76px; display: flex; flex-direction: column; justify-content: space-between; }
      .tag { width: max-content; border: 1px solid rgba(255,255,255,.24); border-radius: 999px; padding: 12px 18px; color: #fecdd3; font-size: 20px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
      h1 { margin: 0; max-width: 880px; font-size: 88px; line-height: .96; letter-spacing: -.06em; }
      p { margin: 24px 0 0; max-width: 660px; color: #ffe4e6; font-size: 30px; line-height: 1.35; }
      .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
      .metric { border-radius: 26px; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.16); padding: 26px; backdrop-filter: blur(16px); }
      .metric strong { display: block; font-size: 42px; letter-spacing: -.04em; }
      .metric span { color: #fecdd3; font-size: 18px; }
    </style>
  </head>
  <body>
    <main class="slide">
      <div class="tag">Live collaboration</div>
      <section>
        <h1>Turn one prompt into a shared presentation asset.</h1>
        <p>AI proposes the structure, Yjs keeps the HTML editable, and comments keep decisions visible.</p>
      </section>
      <section class="metrics">
        <div class="metric"><strong>3x</strong><span>faster iteration loops</span></div>
        <div class="metric"><strong>100%</strong><span>multiplayer review</span></div>
        <div class="metric"><strong>1</strong><span>source of truth</span></div>
      </section>
    </main>
  </body>
</html>`,
  `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 1280px; height: 720px; overflow: hidden; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #111827; background: #fff; }
      .slide { width: 1280px; height: 720px; padding: 72px; background: radial-gradient(circle at 78% 18%, #ffe4e6 0 18%, transparent 32%), linear-gradient(135deg, #ffffff 0%, #fafafa 100%); }
      .grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 54px; height: 100%; align-items: center; }
      .eyebrow { color: #e11d48; font-size: 22px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
      h1 { margin: 22px 0; font-size: 78px; line-height: .98; letter-spacing: -.06em; }
      p { margin: 0; color: #475569; font-size: 30px; line-height: 1.35; }
      .steps { display: grid; gap: 18px; }
      .step { border-radius: 28px; border: 1px solid rgba(15,23,42,.08); box-shadow: 0 20px 60px rgba(15,23,42,.08); padding: 28px; background: rgba(255,255,255,.86); }
      .step b { display: block; color: #e11d48; font-size: 18px; margin-bottom: 8px; }
      .step span { display: block; color: #0f172a; font-size: 28px; font-weight: 750; letter-spacing: -.03em; }
    </style>
  </head>
  <body>
    <main class="slide">
      <section class="grid">
        <div>
          <div class="eyebrow">AI workflow</div>
          <h1>From chat to slide, without losing control.</h1>
          <p>Every proposal is reviewable HTML. Applying it performs a Yjs diff so collaborators keep context.</p>
        </div>
        <div class="steps">
          <div class="step"><b>01</b><span>Prompt the slide designer</span></div>
          <div class="step"><b>02</b><span>Apply the proposal into code</span></div>
          <div class="step"><b>03</b><span>Comment and export to PPTX</span></div>
        </div>
      </section>
    </main>
  </body>
</html>`,
  `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 1280px; height: 720px; overflow: hidden; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #1f2937; background: #fff7ed; }
      .slide { width: 1280px; height: 720px; padding: 68px; background: linear-gradient(120deg, #fff7ed, #fff1f2); }
      .panel { height: 100%; border-radius: 44px; padding: 62px; background: #fff; border: 1px solid rgba(15,23,42,.08); box-shadow: 0 28px 90px rgba(225,29,72,.12); display: grid; grid-template-columns: 1fr 360px; gap: 50px; align-items: center; }
      h1 { margin: 0; font-size: 80px; line-height: .98; letter-spacing: -.06em; color: #111827; }
      p { margin: 26px 0 0; color: #64748b; font-size: 30px; line-height: 1.35; }
      .orb { width: 340px; height: 340px; border-radius: 50%; background: conic-gradient(from 210deg, #fb7185, #fdba74, #fda4af, #fb7185); display: grid; place-items: center; color: white; font-size: 88px; font-weight: 900; letter-spacing: -.08em; box-shadow: inset 0 0 60px rgba(255,255,255,.35), 0 30px 70px rgba(244,63,94,.28); }
      .caption { margin-top: 24px; text-align: center; color: #e11d48; font-weight: 800; font-size: 22px; }
    </style>
  </head>
  <body>
    <main class="slide">
      <section class="panel">
        <div>
          <h1>Creative reviews that happen in context.</h1>
          <p>Pin feedback directly on the generated slide, then keep iterating with the AI or in the shared code editor.</p>
        </div>
        <div>
          <div class="orb">AI</div>
          <div class="caption">Collaborative by default</div>
        </div>
      </section>
    </main>
  </body>
</html>`,
];
