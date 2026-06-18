import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { AI_USER_AVATAR, AI_USER_ID, AI_USER_NAME } from "@/database";
import {
  addComment,
  clearRange,
  deleteColumn,
  deleteComment,
  deleteRow,
  formatCells,
  insertColumn,
  insertRow,
  readStorage,
  setCellValue,
  setRangeValues,
  showAiEditing,
  snapshotText,
  sortByColumn,
} from "@/lib/spreadsheet-server";
import { lettersToColIndex } from "@/lib/a1";
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

const FOLLOW_UPS = [
  "Format the header row",
  "Add a totals row",
  "Sort by the first column",
];

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
  "Keep your chat replies short (one or two sentences) and describe what you",
  "did. Reply in Markdown.",
].join(" ");

async function streamReply(
  liveblocks: Liveblocks,
  roomId: string,
  messages: ChatMessage[],
  model: string | undefined,
  update: UpdateFn
) {
  const { streamText, tool, stepCountIs } = await import("ai");
  const { z } = await import("zod");

  showAiEditing(liveblocks, roomId, null);

  const storage = await readStorage(liveblocks, roomId);

  const formatSchema = z
    .object({
      bold: z.boolean().optional(),
      italic: z.boolean().optional(),
      underline: z.boolean().optional(),
      strike: z.boolean().optional(),
      align: z.enum(["left", "center", "right"]).optional(),
      color: z.string().optional(),
      background: z.string().optional(),
      numberFormat: z.enum(["general", "currency", "percent"]).optional(),
    })
    .describe("Formatting to apply. Colors are hex strings, e.g. #ef4444.");

  const tools = {
    setCellValue: tool({
      description: "Set the value of a single cell.",
      inputSchema: z.object({
        cell: z.string().describe('A1 reference, e.g. "B2".'),
        value: z.string(),
      }),
      execute: ({ cell, value }) =>
        setCellValue(liveblocks, roomId, cell, value),
    }),
    setRangeValues: tool({
      description:
        "Fill a rectangular range starting at a cell with a 2D array of values (row-major).",
      inputSchema: z.object({
        start: z.string().describe('Top-left A1 cell, e.g. "A1".'),
        rows: z.array(z.array(z.string())),
      }),
      execute: ({ start, rows }) =>
        setRangeValues(liveblocks, roomId, start, rows),
    }),
    clearRange: tool({
      description: "Clear the values in a range.",
      inputSchema: z.object({
        range: z.string().describe('A1 range, e.g. "A1:C5".'),
      }),
      execute: ({ range }) => clearRange(liveblocks, roomId, range),
    }),
    formatCells: tool({
      description: "Apply formatting (bold, color, alignment, …) to a range.",
      inputSchema: z.object({
        range: z.string().describe('A1 range, e.g. "A1:C1".'),
        format: formatSchema,
      }),
      execute: ({ range, format }) => {
        const patch = { ...format };
        if (patch.numberFormat === "general") {
          patch.numberFormat = undefined;
        }
        return formatCells(liveblocks, roomId, range, patch);
      },
    }),
    sortByColumn: tool({
      description: "Sort all rows by the values in a column.",
      inputSchema: z.object({
        column: z.string().describe('Column letter, e.g. "B".'),
        direction: z.enum(["asc", "desc"]),
      }),
      execute: ({ column, direction }) =>
        sortByColumn(liveblocks, roomId, column, direction),
    }),
    insertRow: tool({
      description: "Insert an empty row at a 1-based row number.",
      inputSchema: z.object({ rowNumber: z.number().int().min(1) }),
      execute: ({ rowNumber }) => insertRow(liveblocks, roomId, rowNumber - 1),
    }),
    deleteRow: tool({
      description: "Delete the row at a 1-based row number.",
      inputSchema: z.object({ rowNumber: z.number().int().min(1) }),
      execute: ({ rowNumber }) => deleteRow(liveblocks, roomId, rowNumber - 1),
    }),
    insertColumn: tool({
      description: "Insert an empty column at a column letter.",
      inputSchema: z.object({ column: z.string() }),
      execute: ({ column }) =>
        insertColumn(
          liveblocks,
          roomId,
          Math.max(0, lettersToColIndex(column))
        ),
    }),
    deleteColumn: tool({
      description: "Delete the column at a column letter.",
      inputSchema: z.object({ column: z.string() }),
      execute: ({ column }) =>
        deleteColumn(
          liveblocks,
          roomId,
          Math.max(0, lettersToColIndex(column))
        ),
    }),
    addComment: tool({
      description: "Leave a comment thread anchored to a cell.",
      inputSchema: z.object({ cell: z.string(), text: z.string() }),
      execute: ({ cell, text }) => addComment(liveblocks, roomId, cell, text),
    }),
    deleteComment: tool({
      description: "Delete the comment thread(s) anchored to a cell.",
      inputSchema: z.object({
        cell: z.string().describe('A1 reference, e.g. "B2".'),
      }),
      execute: ({ cell }) => deleteComment(liveblocks, roomId, cell),
    }),
  };

  const result = streamText({
    model: model ?? "openai/gpt-5.4-mini",
    system: `${SYSTEM_PROMPT}\n\n${snapshotText(storage)}`,
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

  await update({
    content,
    reasoning: reasoning || undefined,
    tools: toolsDisplay.length ? toolsDisplay : undefined,
    suggestions: FOLLOW_UPS,
    usedTokens: usage.totalTokens ?? 0,
    maxTokens: MAX_TOKENS,
    streaming: false,
  });
}
