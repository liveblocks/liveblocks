import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { AI_USER_AVATAR, AI_USER_ID, AI_USER_NAME } from "@/app/database";
import {
  applyDocumentOperation,
  readDocument,
  type DocumentOperation,
} from "./document";

/**
 * Generates an assistant reply and streams it into the room's feed using
 * `@liveblocks/node`. We create one assistant message, then repeatedly call
 * `updateFeedMessage` as tokens (and reasoning) arrive. Every connected client
 * sees the message fill in live through `useFeedMessages` — no SSE needed.
 *
 * The assistant can also edit the shared Tiptap document. Edits are applied
 * with `mutateStorage`, so they merge with what users are typing at the same
 * time. Before its first edit of a reply, the route snapshots the room with
 * `createVersionHistorySnapshot`, and stores the version id on the feed
 * message so the chat can offer a "Revert" action.
 */

type ChatMessage = { role: "user" | "assistant"; content: string };

type DocumentEdit = {
  name: string;
  input: Record<string, string | number>;
  output?: string;
};

type AssistantUpdate = {
  content: string;
  reasoning?: string;
  suggestions?: string[];
  edits?: DocumentEdit[];
  revertVersionId?: string;
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

const SYSTEM_PROMPT = `You are a writing assistant living next to a collaborative rich-text document. Everyone in the room sees the same document and this same chat.

The current document is included below as Markdown. Each top-level block is prefixed with its index, like "[3]".

You have tools to edit the document. Rules:
- Only edit when the user asks for changes; otherwise just answer in chat.
- Make targeted edits: prefer replacing or inserting the specific blocks involved. Never rewrite the whole document unless explicitly asked.
- Block indices always refer to the *current* document. After every edit you receive the updated document — use its fresh indices for further edits.
- Tool markdown must contain the block content only (no index prefixes).
- Other people may be editing at the same time; your text edits merge with theirs automatically.

Reply in clear, concise Markdown. After editing, summarize what you changed in one or two sentences. Separate ideas into proper paragraphs with a blank line between them — never use <br> tags or manual line breaks to space out text.`;

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY,
    baseUrl: process.env.LIVEBLOCKS_BASE_URL,
  });

  const { roomId, feedId, messages, model } = (await request.json()) as {
    roomId: string;
    feedId: string;
    messages: ChatMessage[];
    model?: string;
  };

  // Only allow writing into this example's rooms.
  if (
    !roomId?.startsWith("liveblocks:examples:nextjs-tiptap-ai-chat") ||
    !feedId
  ) {
    return new NextResponse("Invalid room or feed", { status: 400 });
  }

  // Make sure the feed exists (idempotent safety net).
  try {
    await liveblocks.createFeed({
      roomId,
      feedId,
      metadata: { title: "AI chat" },
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

  // Everything the assistant does to the document during this reply.
  const edits: DocumentEdit[] = [];
  let revertVersionId: string | undefined;

  // Patches the streaming message. `updateFeedMessage` replaces the message
  // data, so we always send the full object.
  const update = (data: AssistantUpdate) =>
    liveblocks.updateFeedMessage({
      roomId,
      feedId,
      messageId,
      data: {
        role: "assistant",
        model,
        ...AUTHOR,
        ...data,
        edits: data.edits ?? (edits.length > 0 ? [...edits] : undefined),
        revertVersionId: data.revertVersionId ?? revertVersionId,
      },
    });

  // Snapshot the room right before the first document edit of this reply, so
  // the whole edit can be reverted from the chat or the version history.
  let snapshotFailed = false;
  const ensureSnapshot = async () => {
    if (revertVersionId === undefined && !snapshotFailed) {
      try {
        const snapshot = await liveblocks.createVersionHistorySnapshot(roomId);
        revertVersionId = snapshot.data.id;
      } catch {
        // Version history may not be available (e.g. on the local Liveblocks
        // dev server). Edits still work, they just can't be reverted.
        snapshotFailed = true;
      }
    }
  };

  const runOperation = async (
    name: string,
    input: Record<string, string | number>,
    operation: DocumentOperation
  ) => {
    await ensureSnapshot();
    const { summary, document } = await applyDocumentOperation(
      liveblocks,
      roomId,
      operation
    );
    edits.push({ name, input, output: summary });
    return `${summary}\n\nThe document is now:\n\n${document}`;
  };

  try {
    if (process.env.AI_GATEWAY_API_KEY) {
      await streamRealReply(liveblocks, roomId, messages, model, update, runOperation);
    } else {
      await streamMockReply(messages, update, runOperation);
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
type RunOperationFn = (
  name: string,
  input: Record<string, string | number>,
  operation: DocumentOperation
) => Promise<string>;

async function streamRealReply(
  liveblocks: Liveblocks,
  roomId: string,
  messages: ChatMessage[],
  model: string | undefined,
  update: UpdateFn,
  runOperation: RunOperationFn
) {
  // Imported lazily so the example still builds and runs without an API key.
  const [{ streamText, tool, stepCountIs }, { z }] = await Promise.all([
    import("ai"),
    import("zod"),
  ]);

  const document = await readDocument(liveblocks, roomId);

  const tools = {
    insertBlocks: tool({
      description:
        "Insert new blocks into the document, written as Markdown. `index` is the block position to insert at: 0 inserts at the top, and an index equal to the number of blocks appends at the end.",
      inputSchema: z.object({
        index: z.number().int().min(0),
        markdown: z.string(),
      }),
      execute: ({ index, markdown }) =>
        runOperation("insertBlocks", { index, markdown }, {
          type: "insert",
          index,
          markdown,
        }),
    }),
    replaceBlocks: tool({
      description:
        "Replace the blocks from `fromIndex` to `toIndex` (inclusive) with new Markdown content. When replacing a single block with a single block of the same type, the change is applied as character-level edits that merge with concurrent user edits.",
      inputSchema: z.object({
        fromIndex: z.number().int().min(0),
        toIndex: z.number().int().min(0),
        markdown: z.string(),
      }),
      execute: ({ fromIndex, toIndex, markdown }) =>
        runOperation("replaceBlocks", { fromIndex, toIndex, markdown }, {
          type: "replace",
          fromIndex,
          toIndex,
          markdown,
        }),
    }),
    deleteBlocks: tool({
      description:
        "Delete the blocks from `fromIndex` to `toIndex` (inclusive).",
      inputSchema: z.object({
        fromIndex: z.number().int().min(0),
        toIndex: z.number().int().min(0),
      }),
      execute: ({ fromIndex, toIndex }) =>
        runOperation("deleteBlocks", { fromIndex, toIndex }, {
          type: "delete",
          fromIndex,
          toIndex,
        }),
    }),
  };

  // AI SDK v6 resolves bare string model ids (e.g. "openai/gpt-5.5") through
  // the Vercel AI Gateway when AI_GATEWAY_API_KEY is set.
  const result = streamText({
    model: model ?? "openai/gpt-5.4-mini",
    system: `${SYSTEM_PROMPT}\n\nCurrent document:\n\n${document}`,
    messages,
    tools,
    stopWhen: stepCountIs(8),
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
    } else if (part.type === "tool-result") {
      // An edit just landed in the document: show it in the chat right away.
      await flush(true);
    }
  }

  // Fallback: some models return reasoning only at the end rather than as
  // streamed deltas.
  if (!reasoning) {
    reasoning = (await result.reasoningText) ?? "";
  }

  const usage = await result.usage;

  await update({
    content,
    reasoning: reasoning || undefined,
    usedTokens: usage.totalTokens ?? 0,
    maxTokens: MAX_TOKENS,
    streaming: false,
  });
}

// Simulates a streamed reply so the example fully works (and visibly streams
// via `updateFeedMessage`) without an AI provider key. It also makes a real
// document edit through `mutateStorage`, so the multiplayer editing loop —
// including the version snapshot and the "Revert" action — can be tried
// without any AI key.
async function streamMockReply(
  messages: ChatMessage[],
  update: UpdateFn,
  runOperation: RunOperationFn
) {
  const lastUserMessage =
    [...messages].reverse().find((message) => message.role === "user")
      ?.content ?? "your message";

  const reasoningText =
    "No AI provider key is set, so I'm streaming a canned response. " +
    "I'll still make a real edit to the shared document with mutateStorage — " +
    "this is where a real model would decide which blocks to change.";

  // Stream the reasoning first…
  let reasoning = "";
  for (const chunk of chunkText(reasoningText)) {
    reasoning += chunk;
    await update({ content: "", reasoning, streaming: true });
    await sleep(40);
  }

  // …then make a real, revertible document edit…
  await runOperation(
    "insertBlocks",
    {
      index: 9999,
      markdown: `> ✏️ **Mock AI edit** — you asked: “${lastUserMessage.slice(0, 120)}”. Add an \`AI_GATEWAY_API_KEY\` to \`.env.local\` and the AI will actually edit this document.`,
    },
    {
      type: "insert",
      index: 9999,
      markdown: `> ✏️ **Mock AI edit** — you asked: “${lastUserMessage.slice(0, 120)}”. Add an \`AI_GATEWAY_API_KEY\` to \`.env.local\` and the AI will actually edit this document.`,
    }
  );
  await update({ content: "", reasoning, streaming: true });

  const contentText = [
    `Here's a streamed mock reply to **"${lastUserMessage}"** — and I just appended a quote block to the shared document.`,
    "",
    "The edit was written with `mutateStorage`, so it merged into everyone's editor live, and a version snapshot was taken first — use the **Revert** button above, or the version history, to undo it.",
    "",
    "Add an `AI_GATEWAY_API_KEY` to `.env.local` for real, reasoning-capable replies that edit the document on request.",
  ].join("\n");

  // …then the answer, word by word.
  let content = "";
  for (const chunk of chunkText(contentText)) {
    content += chunk;
    await update({ content, reasoning, streaming: true });
    await sleep(55);
  }

  await update({
    content,
    reasoning,
    usedTokens: Math.round(content.length / 4) + 320,
    maxTokens: MAX_TOKENS,
    suggestions: [
      "Rewrite the goals as a numbered list",
      "Add a Risks section",
      "Make the timeline more detailed",
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
