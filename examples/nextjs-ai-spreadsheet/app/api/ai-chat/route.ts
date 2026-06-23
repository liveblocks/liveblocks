import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { AI_USER_AVATAR, AI_USER_ID, AI_USER_NAME } from "@/database";
import {
  commentsText,
  createSpreadsheetTools,
  readStorage,
  showAiEditing,
  snapshotText,
} from "@/lib/spreadsheet-server";
import type { JsonObject } from "@/liveblocks.config";

/**
 * Generates an assistant reply that *edits the spreadsheet* and streams its
 * answer into the room's chat feed using `@liveblocks/node`.
 *
 * The model runs with tools that write to Storage via `mutateStorage` and show
 * the AI's live selection via `setPresence` — so everyone connected sees both
 * the chat text and the grid fill in, in realtime, as the model works.
 */

type ChatMessage = { role: "user" | "assistant"; content: string };

type ToolDisplay = {
  name: string;
  input: JsonObject;
  output?: string;
};

type AssistantUpdate = {
  content: string;
  reasoning?: string;
  tools?: ToolDisplay[];
  suggestions?: string[];
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

  if (
    !roomId?.startsWith("liveblocks:examples:nextjs-ai-spreadsheet") ||
    !feedId
  ) {
    return new NextResponse("Invalid room or feed", { status: 400 });
  }

  try {
    await liveblocks.createFeed({
      roomId,
      feedId,
      metadata: { title: "AI chat" },
    });
  } catch {
    // Feed already exists, ignore.
  }

  const created = await liveblocks.createFeedMessage({
    roomId,
    feedId,
    data: { role: "assistant", content: "", streaming: true, model, ...AUTHOR },
  });
  const messageId = created.id;

  const update = (data: AssistantUpdate) =>
    liveblocks.updateFeedMessage({
      roomId,
      feedId,
      messageId,
      data: { role: "assistant", model, ...AUTHOR, ...data },
    });

  // No mock fallback — the spreadsheet AI needs a real, tool-calling model.
  if (!process.env.AI_GATEWAY_API_KEY) {
    await update({
      content:
        "I can't edit the spreadsheet without an AI provider key. Add an " +
        "`AI_GATEWAY_API_KEY` to `.env.local` (see the Vercel AI Gateway docs) " +
        "and try again.",
      streaming: false,
    });
    return NextResponse.json({ ok: true });
  }

  try {
    await streamReply(liveblocks, roomId, messages, model, update);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    await update({
      content: `Sorry, something went wrong.\n\n\`${reason}\``,
      streaming: false,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

type UpdateFn = (data: AssistantUpdate) => Promise<unknown>;

const SYSTEM_PROMPT = [
  "You are an assistant embedded in a realtime, multiplayer spreadsheet.",
  "Use the provided tools to edit the spreadsheet directly — don't just describe",
  "changes, make them. Reference cells in A1 notation (e.g. B2, A1:C5).",
  "Prefer `setRangeValues` to fill tables in one call. You don't need to clear",
  "cells first — `setRangeValues` and `setCellValue` overwrite existing values.",
  "You can write spreadsheet formulas as cell values (anything starting with",
  "`=`, e.g. `=SUM(A1:A5)`, `=A2*B2`, `=AVERAGE(B:B)`); they're evaluated",
  "automatically by HyperFormula. Prefer formulas over pre-computed numbers for",
  "totals and other derived values, so they stay correct when inputs change.",
  "Keep your chat replies short (one or two sentences) and describe what you",
  "did. Reply in Markdown.",
  "Always check that cells use the right number format for their data: apply",
  "the currency format to money, the percent format to rates/ratios, and keep",
  "general for plain numbers and text. When you add or edit values, set (or",
  "correct) the format with `formatCells` so columns stay consistent.",
  "Use comments to highlight problems in the sheet: when you spot an error,",
  "inconsistency, or something that needs the user's attention (e.g. a wrong",
  "total, a typo, a suspicious value, or a missing entry), leave a short comment",
  "on that cell with `addComment` explaining the issue, instead of silently",
  "fixing it or only mentioning it in chat.",
].join(" ");

// What the AI's tools can actually do — used to keep generated follow-up
const CAPABILITIES = [
  "The assistant can ONLY do the following to the spreadsheet:",
  "- Set a single cell's value, or fill a rectangular range with values.",
  "- Write spreadsheet formulas in cells, e.g. `=SUM(A1:A5)`, `=A1*B1`,",
  '  `=AVERAGE(B2:B10)`, `=IF(A1>10,"high","low")`. They\'re evaluated',
  "  automatically (HyperFormula, ~Excel-compatible functions).",
  "- Clear the values in a range.",
  "- Format cells: bold, italic, underline, strikethrough, horizontal",
  "  alignment (left/center/right), text color, fill (background) color, and",
  "  number format (general, currency, or percent).",
  "- Sort all rows by a column (ascending or descending).",
  "- Insert or delete a row or a column.",
  "- Add or delete a comment thread on a cell.",
  "It CANNOT: add borders, merge cells, create charts, freeze rows/columns,",
  "add images, or change fonts/font sizes.",
  "Only suggest actions from the supported list above.",
].join("\n");

async function streamReply(
  liveblocks: Liveblocks,
  roomId: string,
  messages: ChatMessage[],
  model: string | undefined,
  update: UpdateFn
) {
  const { streamText, generateText, Output, stepCountIs } = await import("ai");
  const { z } = await import("zod");

  showAiEditing(liveblocks, roomId, null);

  const storage = await readStorage(liveblocks, roomId);
  const comments = await commentsText(liveblocks, roomId, storage);

  const tools = await createSpreadsheetTools(liveblocks, roomId);

  const result = streamText({
    model: model ?? "openai/gpt-5.4-mini",
    system: `${SYSTEM_PROMPT}\n\n${snapshotText(storage)}${
      comments ? `\n\n${comments}` : ""
    }`,
    messages,
    tools,
    stopWhen: stepCountIs(16),
    providerOptions: {
      openai: { reasoningEffort: "low", reasoningSummary: "auto" },
      anthropic: { thinking: { type: "enabled", budgetTokens: 4096 } },
      google: { thinkingConfig: { includeThoughts: true } },
    },
  });

  let content = "";
  let reasoning = "";
  const toolsDisplay: ToolDisplay[] = [];
  const toolIndexById = new Map<string, number>();
  let lastFlush = 0;

  const flush = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFlush < 80) {
      return;
    }
    lastFlush = now;
    await update({
      content,
      reasoning: reasoning || undefined,
      tools: toolsDisplay.length ? toolsDisplay : undefined,
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
    } else if (part.type === "tool-call") {
      toolIndexById.set(part.toolCallId, toolsDisplay.length);
      toolsDisplay.push({
        name: part.toolName,
        // Tool-call args from the AI SDK are JSON-serializable by construction.
        input: (part.input ?? {}) as JsonObject,
      });
      await flush(true);
    } else if (part.type === "tool-result") {
      const index = toolIndexById.get(part.toolCallId);
      if (index !== undefined && toolsDisplay[index]) {
        toolsDisplay[index].output = String(part.output ?? "");
      }
      await flush(true);
    }
  }

  if (!reasoning) {
    reasoning = (await result.reasoningText) ?? "";
  }
  const usage = await result.usage;

  // Generate three contextual follow-up suggestions based on the updated sheet
  let suggestions: string[] = [];
  try {
    const updatedStorage = await readStorage(liveblocks, roomId);
    const { output } = await generateText({
      model: model ?? "openai/gpt-5.4-mini",
      output: Output.object({
        schema: z.object({
          suggestions: z
            .array(z.string())
            .length(3)
            .describe("Three short next prompts the user might send."),
        }),
      }),
      system:
        "You suggest the user's likely next message in a spreadsheet AI chat. " +
        "Return exactly 3 short, specific, actionable prompts (max ~6 words " +
        "each) the user could tap next, as imperative phrases with no numbering. " +
        "Every suggestion must be something the assistant can actually do.\n\n" +
        CAPABILITIES,
      prompt:
        `Current spreadsheet:\n${snapshotText(updatedStorage)}\n\n` +
        `The assistant just replied:\n${content || "(made edits to the sheet)"}\n\n` +
        "Suggest 3 useful next prompts.",
    });
    if (output.suggestions?.length) {
      suggestions = output.suggestions.slice(0, 3);
    }
  } catch {
    // Keep the static fallback suggestions.
  }

  await update({
    content,
    reasoning: reasoning || undefined,
    tools: toolsDisplay.length ? toolsDisplay : undefined,
    suggestions,
    usedTokens: usage.totalTokens ?? 0,
    maxTokens: MAX_TOKENS,
    streaming: false,
  });
}
