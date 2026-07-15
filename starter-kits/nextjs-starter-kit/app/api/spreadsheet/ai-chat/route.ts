import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AI_USER_ID, aiUser } from "@/data/ai";
import { checkDocumentAccess } from "@/lib/ai/documentAccess";
import {
  commentsText,
  createSpreadsheetTools,
  readStorage,
  showAiEditing,
  snapshotText,
} from "@/lib/ai/spreadsheet/spreadsheet-server";
import { liveblocks } from "@/liveblocks.server.config";
import type { ChatFeedMessageData, Json, JsonObject } from "@/liveblocks.config";

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

type UpdateFn = (data: AssistantUpdate) => Promise<unknown>;

const MAX_TOKENS = 128_000;

const AUTHOR = {
  userId: AI_USER_ID,
  name: aiUser.name,
  avatar: aiUser.avatar,
};

const requestSchema = z.object({
  roomId: z.string().min(1),
  feedId: z.string().min(1),
  model: z.string().optional(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
});

const SYSTEM_PROMPT = [
  "You are an assistant embedded in a realtime, multiplayer spreadsheet.",
  "Use the provided tools to edit the spreadsheet directly - don't just describe",
  "changes, make them. Reference cells in A1 notation (e.g. B2, A1:C5).",
  "Prefer `setRangeValues` to fill tables in one call. You don't need to clear",
  "cells first - `setRangeValues` and `setCellValue` overwrite existing values.",
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

const CAPABILITIES = [
  "The assistant can ONLY do the following to the spreadsheet:",
  "- Set a single cell's value, or fill a rectangular range with values.",
  "- Write spreadsheet formulas in cells, e.g. `=SUM(A1:A5)`, `=A1*B1`,",
  '  `=AVERAGE(B2:B10)`, `=IF(A1>10,"high","low")`. They are evaluated',
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toJson(value: unknown): Json | undefined {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    const out: Json[] = [];
    for (const item of value) {
      const json = toJson(item);
      if (json !== undefined) {
        out.push(json);
      }
    }
    return out;
  }

  if (isRecord(value)) {
    const out: JsonObject = {};
    for (const [key, item] of Object.entries(value)) {
      const json = toJson(item);
      if (json !== undefined) {
        out[key] = json;
      }
    }
    return out;
  }

  return undefined;
}

function toJsonObject(value: unknown): JsonObject {
  const json = toJson(value);
  return isRecord(json) ? json : {};
}

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return new NextResponse("Invalid request", { status: 400 });
  }

  const { roomId, feedId, messages, model } = parsed.data;
  const access = await checkDocumentAccess(roomId, "write");
  if (access.error) {
    return new NextResponse(access.error.message, { status: access.error.code });
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
    data: {
      role: "assistant",
      content: "",
      streaming: true,
      model,
      ...AUTHOR,
    } satisfies ChatFeedMessageData,
  });
  const messageId = created.id;

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
      } satisfies ChatFeedMessageData,
    });

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

async function streamReply(
  client: typeof liveblocks,
  roomId: string,
  messages: ChatMessage[],
  model: string | undefined,
  update: UpdateFn
) {
  const { streamText, generateText, Output, stepCountIs } = await import("ai");

  showAiEditing(client, roomId, null);

  const storage = await readStorage(client, roomId);
  const comments = await commentsText(client, roomId, storage);
  const tools = await createSpreadsheetTools(client, roomId);

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
        input: toJsonObject(part.input ?? {}),
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

  let suggestions: string[] = [];
  try {
    const updatedStorage = await readStorage(client, roomId);
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
