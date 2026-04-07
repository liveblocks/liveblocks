import { Chat, Thread, toAiMessages } from "chat";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createMemoryState } from "@chat-adapter/state-memory";
import { createRedisState } from "@chat-adapter/state-redis";
import {
  createLiveblocksAdapter,
  type LiveblocksAdapter,
} from "@liveblocks/chat-sdk-adapter";
import { createAnthropic } from "@ai-sdk/anthropic";
import { tool, ToolLoopAgent } from "ai";
import { z } from "zod";
import {
  Liveblocks,
  type JsonObject,
  type PlainLsonObject,
} from "@liveblocks/node";
import type { CommentBody, LiveList } from "@liveblocks/core";
import { botUserInfo, getBotUserId } from "./lib/users";

type RowData = Record<string, string>;
type StorageRoot = {
  rows: LiveList<RowData>;
  columns: LiveList<string>;
  title: string;
};

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

const BOT_USER_ID = getBotUserId();
const APP_URL = process.env.APP_URL || "http://localhost:3000";

function generateRoomId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const timestamp = Date.now().toString(36);
  return `doc-${slug}-${timestamp}`;
}

function buildStorageDocument(
  title: string,
  columns: string[],
  rows: Record<string, string>[]
): PlainLsonObject {
  return {
    liveblocksType: "LiveObject",
    data: {
      title,
      columns: {
        liveblocksType: "LiveList",
        data: columns,
      },
      rows: {
        liveblocksType: "LiveList",
        data: rows.map((row, index) => ({
          liveblocksType: "LiveObject",
          data: {
            id: `row-${index + 1}`,
            ...row,
          },
        })),
      },
    },
  };
}

function buildCommentBody(text: string): CommentBody {
  const paragraphs = text.split(/\n\n/).filter((p) => p.length > 0);
  return {
    version: 1,
    content: paragraphs.map((p) => ({
      type: "paragraph" as const,
      children: [{ text: p }],
    })),
  };
}

const AI_PRESENCE_TTL_SEC = 240;

type TrackAiPresenceInput =
  | string
  | {
      aiStatus: string;
      focusedRowIndex?: number | null;
      /** Inclusive; omit when only one row (use focusedRowIndex). */
      focusedRowIndexEnd?: number | null;
    };

type AgentContext = {
  roomId?: string;
  slackChannelName?: string;
  /** User text to mirror as the first comment when a new document is created via @mention. */
  seedPromptText?: string;
  /** When true, that first comment is labeled as Slack and thread metadata is set. In-app comments use plain text only. */
  seedFromSlack?: boolean;
  /** Rooms where `setPresence` was used; cleared after the agent run. */
  presenceRooms?: Set<string>;
  /** Batches rapid tool presence into one merged update per room per turn. */
  queuePresenceUpdate?: (roomId: string, input: TrackAiPresenceInput) => void;
  flushPresenceUpdates?: () => Promise<void>;
};

async function trackAiPresence(
  ctx: AgentContext,
  roomId: string,
  input: TrackAiPresenceInput
) {
  ctx.presenceRooms ??= new Set();
  ctx.presenceRooms.add(roomId);
  const normalized =
    typeof input === "string"
      ? {
          aiStatus: input,
          focusedRowIndex: undefined as number | undefined,
          focusedRowIndexEnd: undefined as number | undefined,
        }
      : input;
  const data: JsonObject = { aiStatus: normalized.aiStatus };
  if (
    normalized.focusedRowIndex != null &&
    Number.isFinite(normalized.focusedRowIndex)
  ) {
    data.aiFocusedRowIndex = normalized.focusedRowIndex;
  }
  if (
    normalized.focusedRowIndexEnd != null &&
    Number.isFinite(normalized.focusedRowIndexEnd)
  ) {
    data.aiFocusedRowIndexEnd = normalized.focusedRowIndexEnd;
  }
  try {
    await liveblocks.setPresence(roomId, {
      userId: BOT_USER_ID,
      data,
      userInfo: botUserInfo(),
      ttl: AI_PRESENCE_TTL_SEC,
    });
  } catch (err) {
    console.warn("trackAiPresence failed", { roomId, err });
  }
}

type NormalizedPresence = {
  aiStatus: string;
  focusedRowIndex?: number;
  focusedRowIndexEnd?: number;
};

function normalizePresenceInput(
  input: TrackAiPresenceInput
): NormalizedPresence {
  if (typeof input === "string") {
    return { aiStatus: input };
  }
  const i = input.focusedRowIndex;
  const j = input.focusedRowIndexEnd ?? input.focusedRowIndex;
  if (i != null && Number.isFinite(i) && j != null && Number.isFinite(j)) {
    const lo = Math.min(i, j);
    const hi = Math.max(i, j);
    return {
      aiStatus: input.aiStatus,
      focusedRowIndex: lo,
      ...(hi > lo ? { focusedRowIndexEnd: hi } : {}),
    };
  }
  return { aiStatus: input.aiStatus };
}

function mergeNormalizedPresence(
  prev: NormalizedPresence | undefined,
  next: NormalizedPresence
): NormalizedPresence {
  const status = next.aiStatus || prev?.aiStatus || "Updating table…";
  const segments: { lo: number; hi: number }[] = [];
  for (const slice of [prev, next]) {
    if (
      slice?.focusedRowIndex == null ||
      !Number.isFinite(slice.focusedRowIndex)
    ) {
      continue;
    }
    const lo = slice.focusedRowIndex;
    const hi = slice.focusedRowIndexEnd ?? slice.focusedRowIndex;
    segments.push({
      lo: Math.min(lo, hi),
      hi: Math.max(lo, hi),
    });
  }
  if (segments.length === 0) {
    return { aiStatus: status };
  }
  const lo = Math.min(...segments.map((s) => s.lo));
  const hi = Math.max(...segments.map((s) => s.hi));
  return {
    aiStatus: status,
    focusedRowIndex: lo,
    ...(hi > lo ? { focusedRowIndexEnd: hi } : {}),
  };
}

function normalizedToTrackInput(
  norm: NormalizedPresence
): TrackAiPresenceInput {
  if (norm.focusedRowIndex == null || !Number.isFinite(norm.focusedRowIndex)) {
    return norm.aiStatus;
  }
  const end = norm.focusedRowIndexEnd;
  return {
    aiStatus: norm.aiStatus,
    focusedRowIndex: norm.focusedRowIndex,
    ...(end != null && Number.isFinite(end) && end > norm.focusedRowIndex
      ? { focusedRowIndexEnd: end }
      : {}),
  };
}

const PRESENCE_DEBOUNCE_MS = 85;

function attachPresenceBatcher(ctx: AgentContext) {
  const mergedByRoom = new Map<string, NormalizedPresence>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function sendAll() {
    if (mergedByRoom.size === 0) return;
    const entries = [...mergedByRoom.entries()];
    mergedByRoom.clear();
    for (const [roomId, norm] of entries) {
      await trackAiPresence(ctx, roomId, normalizedToTrackInput(norm));
    }
  }

  ctx.queuePresenceUpdate = (roomId, input) => {
    ctx.presenceRooms ??= new Set();
    ctx.presenceRooms.add(roomId);
    const next = normalizePresenceInput(input);
    const prev = mergedByRoom.get(roomId);
    mergedByRoom.set(roomId, mergeNormalizedPresence(prev, next));
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void sendAll();
    }, PRESENCE_DEBOUNCE_MS);
  };

  ctx.flushPresenceUpdates = async () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    await sendAll();
  };
}

async function getTableRowCountFromStorage(roomId: string): Promise<number> {
  const doc = (await liveblocks.getStorageDocument(
    roomId,
    "json"
  )) as unknown as { rows?: readonly unknown[] };
  return Array.isArray(doc.rows) ? doc.rows.length : 0;
}

async function resolveRemoveRowsFocusRange(
  roomId: string,
  indices?: number[],
  where?: Record<string, string>
): Promise<{ min: number; max: number } | undefined> {
  if (indices && indices.length > 0) {
    return { min: Math.min(...indices), max: Math.max(...indices) };
  }
  if (where && Object.keys(where).length > 0) {
    const doc = (await liveblocks.getStorageDocument(
      roomId,
      "json"
    )) as unknown as { rows?: readonly Readonly<Record<string, string>>[] };
    const rows = [...(doc.rows ?? [])];
    const matching: number[] = [];
    rows.forEach((row, i) => {
      if (Object.entries(where).every(([k, v]) => row[k] === v)) {
        matching.push(i);
      }
    });
    if (matching.length === 0) return undefined;
    return { min: Math.min(...matching), max: Math.max(...matching) };
  }
  return undefined;
}

async function clearAiPresenceRooms(ctx: AgentContext) {
  const rooms = ctx.presenceRooms;
  if (!rooms?.size) return;
  const userInfo = botUserInfo();
  /** Replace visible agent state so clients drop row chrome; `{}` alone may merge and leave stale keys. */
  const cleared: JsonObject = {
    aiStatus: "",
    aiFocusedRowIndex: null,
    aiFocusedRowIndexEnd: null,
  };
  await Promise.all(
    [...rooms].map(async (roomId) => {
      try {
        await liveblocks.setPresence(roomId, {
          userId: BOT_USER_ID,
          data: cleared,
          userInfo,
          ttl: 2,
        });
      } catch {
        /* ignore */
      }
    })
  );
  rooms.clear();
}

function createTools(ctx: AgentContext) {
  return {
    createDocument: tool({
      description:
        "Create a collaborative table document. Use when the user wants a spreadsheet/table/list. Infer title and columns from their message. If they specify columns but no rows, add plausible example rows (clearly realistic placeholders). Prefer calling this tool over asking clarifying questions.",
      inputSchema: z.object({
        title: z.string().describe("The title of the document"),
        columns: z.array(z.string()).describe("Column headers for the table"),
        rows: z
          .array(z.record(z.string(), z.string()))
          .describe(
            "Rows: keys must match column names. Include sample data when needed."
          ),
        initialComment: z
          .string()
          .optional()
          .describe(
            "Only when there is no @mention seed text to mirror into the first thread"
          ),
      }),
      execute: async ({ title, columns, rows, initialComment }) => {
        const roomId = generateRoomId(title);

        const createdFromSlack = ctx.seedFromSlack === true;

        await liveblocks.createRoom(roomId, {
          defaultAccesses: ["room:write"],
          metadata: {
            title,
            createdBy: createdFromSlack ? "slack" : "liveblocks",
          },
        });

        const storageDocument = buildStorageDocument(title, columns, rows);
        await liveblocks.initializeStorageDocument(roomId, storageDocument);

        if (rows.length > 0) {
          const last = rows.length - 1;
          ctx.queuePresenceUpdate?.(roomId, {
            aiStatus: "Setting up table…",
            focusedRowIndex: 0,
            ...(last > 0 ? { focusedRowIndexEnd: last } : {}),
          });
        }

        let commentText: string;
        const slackThreadMetadata =
          ctx.seedFromSlack === true
            ? {
                source: "slack" as const,
                ...(ctx.slackChannelName
                  ? { channelName: ctx.slackChannelName }
                  : {}),
              }
            : undefined;

        if (ctx.seedPromptText) {
          if (ctx.seedFromSlack) {
            const where = ctx.slackChannelName
              ? `From Slack (#${ctx.slackChannelName})`
              : "From Slack";
            commentText = `${where}\n\n${ctx.seedPromptText}`;
          } else {
            commentText = ctx.seedPromptText;
          }
        } else {
          commentText =
            initialComment ?? `Document "${title}" was created in this room.`;
        }

        await liveblocks.createThread({
          roomId,
          data: {
            comment: {
              userId: BOT_USER_ID,
              body: buildCommentBody(commentText),
            },
            ...(slackThreadMetadata ? { metadata: slackThreadMetadata } : {}),
          },
        });

        ctx.roomId = roomId;

        const documentUrl = `${APP_URL}/${roomId}`;
        return {
          success: true,
          roomId,
          documentUrl,
          title,
          rowCount: rows.length,
          columnCount: columns.length,
        };
      },
    }),

    addRows: tool({
      description:
        "Add new rows to an existing document. Use this when the user wants to add more data to a document that was already created.",
      inputSchema: z.object({
        roomId: z
          .string()
          .optional()
          .describe(
            "Document room id. Omit when helping from Liveblocks comments on a table—the tool uses that room automatically."
          ),
        rows: z
          .array(z.record(z.string(), z.string()))
          .describe("Array of row objects to add to the table"),
      }),
      execute: async ({ roomId: inputRoomId, rows }) => {
        const roomId = inputRoomId || ctx.roomId;
        if (!roomId) {
          return {
            success: false,
            error: "No document found. Please create a document first.",
          };
        }

        if (rows.length > 0) {
          const startLen = await getTableRowCountFromStorage(roomId);
          const firstNew = startLen;
          const lastNew = startLen + rows.length - 1;
          ctx.queuePresenceUpdate?.(roomId, {
            aiStatus: "Updating table…",
            focusedRowIndex: firstNew,
            ...(lastNew > firstNew ? { focusedRowIndexEnd: lastNew } : {}),
          });
        } else {
          ctx.queuePresenceUpdate?.(roomId, "Updating table…");
        }

        await liveblocks.mutateStorage(roomId, ({ root }) => {
          const rowsList = root.get("rows") as unknown as LiveList<RowData>;
          if (!rowsList) {
            throw new Error("Document storage is missing rows list");
          }

          const currentLength = rowsList.length;
          rows.forEach((row, index) => {
            const rowWithId = {
              id: `row-${currentLength + index + 1}`,
              ...row,
            };
            rowsList.push(rowWithId);
          });
        });

        return {
          success: true,
          roomId,
          addedRows: rows.length,
        };
      },
    }),

    removeRows: tool({
      description:
        "Remove rows from an existing document by index or by matching field values.",
      inputSchema: z.object({
        roomId: z
          .string()
          .optional()
          .describe(
            "Document room id. Omit when helping from Liveblocks comments on a table."
          ),
        indices: z
          .array(z.number())
          .optional()
          .describe("Array of row indices (0-based) to remove"),
        where: z
          .record(z.string(), z.string())
          .optional()
          .describe(
            "Remove rows where all specified field values match (e.g., { Company: 'Adidas' })"
          ),
      }),
      execute: async ({ roomId: inputRoomId, indices, where }) => {
        const roomId = inputRoomId || ctx.roomId;
        if (!roomId) {
          return {
            success: false,
            error: "No document found. Please create a document first.",
          };
        }

        const removeRange = await resolveRemoveRowsFocusRange(
          roomId,
          indices,
          where
        );
        ctx.queuePresenceUpdate?.(roomId, {
          aiStatus: "Updating table…",
          ...(removeRange != null
            ? {
                focusedRowIndex: removeRange.min,
                ...(removeRange.max > removeRange.min
                  ? { focusedRowIndexEnd: removeRange.max }
                  : {}),
              }
            : {}),
        });

        let removedCount = 0;

        await liveblocks.mutateStorage(roomId, ({ root }) => {
          const rowsList = root.get("rows") as unknown as LiveList<RowData>;
          if (!rowsList) {
            throw new Error("Document storage is missing rows list");
          }

          const indicesToRemove = new Set<number>();

          if (indices && indices.length > 0) {
            indices.forEach((i) => indicesToRemove.add(i));
          }

          if (where && Object.keys(where).length > 0) {
            for (let i = 0; i < rowsList.length; i++) {
              const row = rowsList.get(i) as RowData | undefined;
              if (row) {
                const matches = Object.entries(where).every(
                  ([key, value]) => row[key] === value
                );
                if (matches) {
                  indicesToRemove.add(i);
                }
              }
            }
          }

          const sortedIndices = Array.from(indicesToRemove).sort(
            (a, b) => b - a
          );
          sortedIndices.forEach((index) => {
            if (index >= 0 && index < rowsList.length) {
              rowsList.delete(index);
              removedCount++;
            }
          });
        });

        return {
          success: true,
          roomId,
          removedRows: removedCount,
        };
      },
    }),

    editRows: tool({
      description:
        "Edit existing rows in a document by updating specific field values.",
      inputSchema: z.object({
        roomId: z
          .string()
          .optional()
          .describe(
            "Document room id. Omit when helping from Liveblocks comments on a table."
          ),
        updates: z
          .array(
            z.object({
              index: z.number().describe("The row index (0-based) to edit"),
              data: z
                .record(z.string(), z.string())
                .describe("The fields to update with their new values"),
            })
          )
          .describe("Array of updates to apply"),
      }),
      execute: async ({ roomId: inputRoomId, updates }) => {
        const roomId = inputRoomId || ctx.roomId;
        if (!roomId) {
          return {
            success: false,
            error: "No document found. Please create a document first.",
          };
        }

        const editIndices =
          updates.length > 0 ? updates.map((u) => u.index) : [];
        const editMin =
          editIndices.length > 0 ? Math.min(...editIndices) : undefined;
        const editMax =
          editIndices.length > 0 ? Math.max(...editIndices) : undefined;
        ctx.queuePresenceUpdate?.(roomId, {
          aiStatus: "Updating table…",
          ...(editMin != null &&
          editMax != null &&
          Number.isFinite(editMin) &&
          Number.isFinite(editMax)
            ? {
                focusedRowIndex: editMin,
                ...(editMax > editMin ? { focusedRowIndexEnd: editMax } : {}),
              }
            : {}),
        });

        let updatedCount = 0;

        await liveblocks.mutateStorage(roomId, ({ root }) => {
          const rowsList = root.get("rows") as unknown as LiveList<RowData>;
          if (!rowsList) {
            throw new Error("Document storage is missing rows list");
          }

          updates.forEach(({ index, data }) => {
            if (index >= 0 && index < rowsList.length) {
              const current = rowsList.get(index) as RowData | undefined;
              if (current) {
                rowsList.set(index, { ...current, ...data });
                updatedCount++;
              }
            }
          });
        });

        return {
          success: true,
          roomId,
          updatedRows: updatedCount,
        };
      },
    }),
  };
}

const SYSTEM_INSTRUCTIONS = `You are Acme AI, a helpful assistant that creates and edits Liveblocks table documents.

Document creation: If someone asks for leads, a list, a tracker, or columns like name/company/email, call createDocument immediately. Infer a short title from their message (e.g. "Q3 Leads"). Use the columns they asked for; if they gave no rows, add several plausible placeholder rows so the table is useful. Do not send long questionnaires—act first, then offer tweaks.

Edits: Use addRows, removeRows, or editRows when they ask to add/remove/change rows. Do not call createDocument for "add a row" or similar edits to an existing table.

Replies: Stay brief. For Slack, use *single-asterisk bold* (mrkdwn), not **double asterisks**. Use lines starting with "• " for short bullet lists.

When you call createDocument, *always* end your message with the document URL on its own line (the tool returns documentUrl) so users can open the table.`;

function liveblocksResolveUsers(args: { userIds: string[] }) {
  return Promise.resolve(
    args.userIds.map((id) =>
      id === BOT_USER_ID
        ? {
            name: "Acme AI",
            color: "#4f46e5",
            avatar: undefined as string | undefined,
          }
        : {
            name: `User ${id.slice(0, 8)}`,
            color: "#78716c",
            avatar: undefined as string | undefined,
          }
    )
  );
}

function createChatState() {
  const mode = (process.env.CHAT_STATE_ADAPTER ?? "memory").toLowerCase();
  if (mode === "redis") {
    if (!process.env.REDIS_URL) {
      throw new Error(
        "CHAT_STATE_ADAPTER=redis requires REDIS_URL to be set."
      );
    }
    return createRedisState();
  }
  if (mode !== "memory") {
    throw new Error(
      `Invalid CHAT_STATE_ADAPTER="${process.env.CHAT_STATE_ADAPTER}". Use "memory" or "redis".`
    );
  }
  return createMemoryState();
}

export const bot = new Chat({
  userName: "Acme AI",
  adapters: {
    slack: createSlackAdapter(),
    liveblocks: createLiveblocksAdapter({
      apiKey: process.env.LIVEBLOCKS_SECRET_KEY!,
      webhookSecret: process.env.LIVEBLOCKS_WEBHOOK_SECRET_KEY!,
      botUserId: BOT_USER_ID,
      botUserName: "Acme AI",
      resolveUsers: liveblocksResolveUsers,
    }),
  },
  state: createChatState(),
});

/**
 * Converts markdown-style assistant output to the right surface.
 * Slack: Chat adapter maps markdown → mrkdwn. Liveblocks comments: same.
 */
async function postAssistantReply(thread: Thread, text: string) {
  await thread.post({ markdown: text });
}

function collectCreateDocumentUrls(result: {
  steps: ReadonlyArray<{
    toolResults?: ReadonlyArray<{
      type?: string;
      toolName?: string;
      output?: unknown;
    }>;
  }>;
}): string[] {
  const urls: string[] = [];
  for (const step of result.steps) {
    for (const tr of step.toolResults ?? []) {
      if (tr.type !== "tool-result" || tr.toolName !== "createDocument") {
        continue;
      }
      const out = tr.output as { documentUrl?: string } | null;
      if (out?.documentUrl) {
        urls.push(out.documentUrl);
      }
    }
  }
  return urls;
}

function mergeReplyWithDocLinks(
  reply: string,
  result: Parameters<typeof collectCreateDocumentUrls>[0]
): string {
  let text = reply.trimEnd();
  for (const url of collectCreateDocumentUrls(result)) {
    if (!text.includes(url)) {
      text = `${text}\n\n${url}`;
    }
  }
  return text;
}

async function processWithAgent(
  thread: Thread,
  recentMessages: unknown[],
  extra: Partial<AgentContext> = {}
) {
  const ctx: AgentContext = { ...extra, presenceRooms: new Set() };
  attachPresenceBatcher(ctx);

  const existingState = await thread.state;

  if (thread.adapter.name === "liveblocks") {
    // Comment threads are always scoped to the Liveblocks room where they live.
    // Persisted state may still hold the room from a prior createDocument (new doc),
    // which would make addRows/removeRows/editRows target the wrong document.
    try {
      const lb = thread.adapter as LiveblocksAdapter;
      ctx.roomId = lb.decodeThreadId(thread.id).roomId;
    } catch {
      if (
        existingState &&
        typeof existingState === "object" &&
        "roomId" in existingState
      ) {
        ctx.roomId = (existingState as { roomId: string }).roomId;
      }
    }
  } else if (
    existingState &&
    typeof existingState === "object" &&
    "roomId" in existingState
  ) {
    ctx.roomId = (existingState as { roomId: string }).roomId;
  }

  if (thread.adapter.name === "slack") {
    try {
      const info = await thread.adapter.fetchThread(thread.id);
      if (info.channelName) {
        ctx.slackChannelName = info.channelName;
      }
    } catch {
      /* optional */
    }
  }

  const liveblocksSessionNote =
    thread.adapter.name === "liveblocks" && ctx.roomId
      ? `\n\n[LIVEBLOCKS—mandatory context]\nThe user is commenting from inside document room "${ctx.roomId}"; their table is this room. addRows/removeRows/editRows already target this room—omit optional roomId. Never say you lack a document, never ask for a URL or which table, and do not refuse—call the tool first, then answer briefly.`
      : thread.adapter.name === "liveblocks"
        ? `\n\n[LIVEBLOCKS]\nNo document room id could be resolved for this comment thread. If the user wants table edits, use createDocument or ask what they need only as a last resort.`
        : "";

  try {
    const agent = new ToolLoopAgent({
      model: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })(
        "claude-sonnet-4-20250514"
      ),
      instructions: SYSTEM_INSTRUCTIONS + liveblocksSessionNote,
      tools: createTools(ctx),
    });

    const aiMessages = await toAiMessages(
      recentMessages as Parameters<typeof toAiMessages>[0]
    );

    const result = await agent.generate({
      messages: aiMessages,
    });

    if (ctx.roomId) {
      if (thread.adapter.name === "liveblocks") {
        try {
          const lb = thread.adapter as LiveblocksAdapter;
          await thread.setState({
            roomId: lb.decodeThreadId(thread.id).roomId,
          });
        } catch {
          await thread.setState({ roomId: ctx.roomId });
        }
      } else {
        await thread.setState({ roomId: ctx.roomId });
      }
    }

    return mergeReplyWithDocLinks(result.text, result);
  } finally {
    await ctx.flushPresenceUpdates?.();
    await clearAiPresenceRooms(ctx);
  }
}

bot.onNewMention(async (thread, message) => {
  await thread.startTyping("Thinking…");

  try {
    await thread.refresh();
    const mentionContext: Partial<AgentContext> =
      thread.adapter.name === "slack"
        ? { seedPromptText: message.text, seedFromSlack: true }
        : thread.adapter.name === "liveblocks"
          ? { seedPromptText: message.text, seedFromSlack: false }
          : {};

    const response = await processWithAgent(
      thread,
      thread.recentMessages,
      mentionContext
    );
    await postAssistantReply(thread, response);
    await thread.subscribe();
  } catch (error) {
    console.error("Error processing mention:", error);
    await postAssistantReply(
      thread,
      "Sorry — something went wrong. Please try again in a moment."
    );
  }
});

bot.onSubscribedMessage(async (thread, message) => {
  if (message.author.isMe) {
    return;
  }

  if (thread.adapter.name === "liveblocks" && !message.isMention) {
    return;
  }

  await thread.startTyping("Thinking…");

  try {
    await thread.refresh();
    const response = await processWithAgent(thread, thread.recentMessages, {});
    await postAssistantReply(thread, response);
  } catch (error) {
    console.error("Error processing subscribed message:", error);
    await postAssistantReply(
      thread,
      "Sorry — something went wrong. Please try again in a moment."
    );
  }
});
