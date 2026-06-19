import {
  getMentionsFromCommentBody,
  LiveMap,
  LiveObject,
  Liveblocks as LiveblocksClient,
  markdownToCommentBody,
  stringifyCommentBody,
  type CommentBody,
} from "@liveblocks/node";
import {
  AI_USER_AVATAR,
  AI_USER_COLOR,
  AI_USER_ID,
  AI_USER_NAME,
} from "@/database";
import {
  cellKey,
  type CellData,
  type CellFormat,
  type SelectedCell,
} from "@/liveblocks.config";
import { isFormatEmpty, mergeFormat } from "@/lib/format";
import {
  colIndexToLetters,
  lettersToColIndex,
  parseA1,
  parseA1Range,
  toA1,
} from "@/lib/a1";

// JSON projection of Storage, as returned by `getStorageDocument(roomId, "json")`.
export type StorageJson = {
  rowIds: string[];
  colIds: string[];
  cells: Record<string, { value: string; format?: CellFormat }>;
  colWidths: Record<string, number>;
  rowHeights: Record<string, number>;
};

type Cells = LiveMap<string, LiveObject<CellData>>;

const AI_USER_INFO = {
  name: AI_USER_NAME,
  color: AI_USER_COLOR,
  avatar: AI_USER_AVATAR,
};

// --- Reading -----------------------------------------------------------------

export async function readStorage(
  liveblocks: LiveblocksClient,
  roomId: string
): Promise<StorageJson> {
  // The "json" format is a lossy-but-simple JSON tree (LiveMap → object,
  // LiveList → array). It matches our StorageJson shape exactly.
  const doc = await liveblocks.getStorageDocument(roomId, "json");
  return doc as unknown as StorageJson;
}

// A compact, A1-addressed snapshot of the non-empty cells, for the AI's context.
export function snapshotText(storage: StorageJson): string {
  const { rowIds, colIds, cells } = storage;
  const lines: string[] = [];

  for (const [key, cell] of Object.entries(cells)) {
    if (!cell?.value) {
      continue;
    }
    const [rowId, colId] = key.split(":");
    const row = rowIds.indexOf(rowId);
    const col = colIds.indexOf(colId);
    if (row === -1 || col === -1) {
      continue;
    }
    lines.push(`${toA1(row, col)}=${cell.value}`);
  }

  lines.sort();
  const dimensions = `Grid is ${rowIds.length} rows × ${colIds.length} columns (A–${colIndexToLetters(
    colIds.length - 1
  )}).`;

  if (lines.length === 0) {
    return `${dimensions}\nThe spreadsheet is currently empty.`;
  }
  return `${dimensions}\nCurrent non-empty cells:\n${lines.join("\n")}`;
}

// A1-addressed list of the comment threads on the sheet, so the AI knows what
// has been commented on and where. Resolved threads are omitted (they're hidden
// in the UI). Returns "" when there are no comments.
export async function commentsText(
  liveblocks: LiveblocksClient,
  roomId: string,
  storage: StorageJson
): Promise<string> {
  const { data: threads } = await liveblocks.getThreads({ roomId });
  const lines: string[] = [];

  for (const thread of threads) {
    if (thread.resolved) {
      continue;
    }
    const { rowId, colId } = thread.metadata;
    const row = storage.rowIds.indexOf(rowId);
    const col = storage.colIds.indexOf(colId);
    if (row === -1 || col === -1) {
      continue;
    }
    const a1 = toA1(row, col);
    for (const comment of thread.comments) {
      if (!comment.body) {
        continue; // deleted comment
      }
      const text = (await stringifyCommentBody(comment.body)).trim();
      if (text) {
        lines.push(`${a1}: ${text.replace(/\s+/g, " ")}`);
      }
    }
  }

  if (lines.length === 0) {
    return "";
  }
  lines.sort();
  return `Comments on cells:\n${lines.join("\n")}`;
}

// --- Id lookups (within a mutation) ------------------------------------------

function rowColIds(
  root: LiveObject<Liveblocks["Storage"]>,
  row: number,
  col: number
): { rowId: string; colId: string } | null {
  const rowId = root.get("rowIds").get(row);
  const colId = root.get("colIds").get(col);
  if (!rowId || !colId) {
    return null;
  }
  return { rowId, colId };
}

// --- Mutating helpers (operate on the live cells map) ------------------------

function writeValue(
  cells: Cells,
  rowId: string,
  colId: string,
  value: string
): void {
  const key = cellKey(rowId, colId);
  const cell = cells.get(key);
  if (value === "") {
    if (cell) {
      if (isFormatEmpty(cell.get("format"))) {
        cells.delete(key);
      } else {
        cell.set("value", "");
      }
    }
    return;
  }
  if (cell) {
    cell.set("value", value);
  } else {
    cells.set(key, new LiveObject<CellData>({ value }));
  }
}

function writeFormat(
  cells: Cells,
  rowId: string,
  colId: string,
  patch: Partial<CellFormat>
): void {
  const key = cellKey(rowId, colId);
  const cell = cells.get(key);
  const merged = mergeFormat(cell?.get("format"), patch);
  if (!cell) {
    if (merged) {
      cells.set(key, new LiveObject<CellData>({ value: "", format: merged }));
    }
    return;
  }
  cell.set("format", merged);
  if ((cell.get("value") ?? "") === "" && isFormatEmpty(merged)) {
    cells.delete(key);
  }
}

// --- Presence ----------------------------------------------------------------

export function showAiEditing(
  liveblocks: LiveblocksClient,
  roomId: string,
  cells: SelectedCell[] | null
): void {
  void liveblocks
    .setPresence(roomId, {
      userId: AI_USER_ID,
      userInfo: AI_USER_INFO,
      data: { selectedCells: cells, promptingFeedId: null },
      ttl: 3,
    })
    .catch(() => {});
}

// Resolve the stable ids of an A1 cell from a fresh storage read, for presence.
async function idsForA1(
  liveblocks: LiveblocksClient,
  roomId: string,
  a1: string
): Promise<SelectedCell | null> {
  const pos = parseA1(a1);
  if (!pos) {
    return null;
  }
  const storage = await readStorage(liveblocks, roomId);
  const rowId = storage.rowIds[pos.row];
  const colId = storage.colIds[pos.col];
  if (!rowId || !colId) {
    return null;
  }
  return { rowId, colId };
}

// --- Edit operations (used by the AI tools) ----------------------------------

export async function setCellValue(
  liveblocks: LiveblocksClient,
  roomId: string,
  a1: string,
  value: string
): Promise<string> {
  const pos = parseA1(a1);
  if (!pos) {
    return `Invalid cell reference "${a1}".`;
  }
  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const target = rowColIds(root, pos.row, pos.col);
    if (target) {
      writeValue(root.get("cells"), target.rowId, target.colId, value);
      showAiEditing(liveblocks, roomId, [target]);
    }
  });
  return `Set ${a1.toUpperCase()} to "${value}".`;
}

export async function setRangeValues(
  liveblocks: LiveblocksClient,
  roomId: string,
  startA1: string,
  rows: string[][]
): Promise<string> {
  const start = parseA1(startA1);
  if (!start) {
    return `Invalid start cell "${startA1}".`;
  }
  // Write the whole range in a single mutation and highlight exactly the cells
  // we wrote as one box, fired alongside the write. The box reads as one region
  // being worked on (rather than a border hopping cell-to-cell) and lingers
  // briefly after, via the presence TTL.
  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const map = root.get("cells");
    const cells: SelectedCell[] = [];
    for (let r = 0; r < rows.length; r++) {
      const cols = rows[r];
      for (let c = 0; c < cols.length; c++) {
        const target = rowColIds(root, start.row + r, start.col + c);
        if (target) {
          writeValue(map, target.rowId, target.colId, cols[c]);
          cells.push(target);
        }
      }
    }
    showAiEditing(liveblocks, roomId, cells);
  });
  const rowCount = rows.length;
  const colCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  return `Filled ${rowCount}×${colCount} cells starting at ${startA1.toUpperCase()}.`;
}

export async function clearRange(
  liveblocks: LiveblocksClient,
  roomId: string,
  rangeA1: string
): Promise<string> {
  const range = parseA1Range(rangeA1);
  if (!range) {
    return `Invalid range "${rangeA1}".`;
  }
  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const map = root.get("cells");
    const cells: SelectedCell[] = [];
    for (let r = range.start.row; r <= range.end.row; r++) {
      for (let c = range.start.col; c <= range.end.col; c++) {
        const target = rowColIds(root, r, c);
        if (target) {
          writeValue(map, target.rowId, target.colId, "");
          cells.push(target);
        }
      }
    }
    showAiEditing(liveblocks, roomId, cells);
  });
  return `Cleared ${rangeA1.toUpperCase()}.`;
}

export async function formatCells(
  liveblocks: LiveblocksClient,
  roomId: string,
  rangeA1: string,
  patch: Partial<CellFormat>
): Promise<string> {
  const range = parseA1Range(rangeA1);
  if (!range) {
    return `Invalid range "${rangeA1}".`;
  }
  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const map = root.get("cells");
    const cells: SelectedCell[] = [];
    for (let r = range.start.row; r <= range.end.row; r++) {
      for (let c = range.start.col; c <= range.end.col; c++) {
        const target = rowColIds(root, r, c);
        if (target) {
          writeFormat(map, target.rowId, target.colId, patch);
          cells.push(target);
        }
      }
    }
    showAiEditing(liveblocks, roomId, cells);
  });
  return `Formatted ${rangeA1.toUpperCase()}.`;
}

export async function sortByColumn(
  liveblocks: LiveblocksClient,
  roomId: string,
  column: string,
  direction: "asc" | "desc"
): Promise<string> {
  const col = lettersToColIndex(column);
  if (col < 0) {
    return `Invalid column "${column}".`;
  }
  const storage = await readStorage(liveblocks, roomId);
  const colId = storage.colIds[col];
  if (!colId) {
    return `Column "${column}" is out of range.`;
  }

  const compare = (a: string, b: string): number => {
    if (a === b) return 0;
    if (a === "") return 1;
    if (b === "") return -1;
    const na = Number(a.replace(/[$,%\s]/g, ""));
    const nb = Number(b.replace(/[$,%\s]/g, ""));
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  };

  const sorted = [...storage.rowIds].sort((a, b) =>
    compare(
      storage.cells[cellKey(a, colId)]?.value ?? "",
      storage.cells[cellKey(b, colId)]?.value ?? ""
    )
  );
  if (direction === "desc") {
    sorted.reverse();
  }

  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const list = root.get("rowIds");
    sorted.forEach((id, index) => {
      if (list.get(index) !== id) {
        list.set(index, id);
      }
    });
  });
  return `Sorted rows by column ${column.toUpperCase()} (${direction}).`;
}

export async function insertRow(
  liveblocks: LiveblocksClient,
  roomId: string,
  atRow: number
): Promise<string> {
  const newId = crypto.randomUUID();
  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const list = root.get("rowIds");
    const index = Math.max(0, Math.min(atRow, list.length));
    list.insert(newId, index);
  });
  return `Inserted a row at position ${atRow + 1}.`;
}

export async function insertColumn(
  liveblocks: LiveblocksClient,
  roomId: string,
  atCol: number
): Promise<string> {
  const newId = crypto.randomUUID();
  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const list = root.get("colIds");
    const index = Math.max(0, Math.min(atCol, list.length));
    list.insert(newId, index);
  });
  return `Inserted a column at ${colIndexToLetters(atCol)}.`;
}

export async function deleteRow(
  liveblocks: LiveblocksClient,
  roomId: string,
  atRow: number
): Promise<string> {
  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const list = root.get("rowIds");
    if (list.length <= 1 || atRow < 0 || atRow >= list.length) {
      return;
    }
    const rowId = list.get(atRow);
    list.delete(atRow);
    if (rowId) {
      const cells = root.get("cells");
      for (const colId of root.get("colIds")) {
        cells.delete(cellKey(rowId, colId));
      }
      root.get("rowHeights").delete(rowId);
    }
  });
  return `Deleted row ${atRow + 1}.`;
}

export async function deleteColumn(
  liveblocks: LiveblocksClient,
  roomId: string,
  atCol: number
): Promise<string> {
  await liveblocks.mutateStorage(roomId, ({ root }) => {
    const list = root.get("colIds");
    if (list.length <= 1 || atCol < 0 || atCol >= list.length) {
      return;
    }
    const colId = list.get(atCol);
    list.delete(atCol);
    if (colId) {
      const cells = root.get("cells");
      for (const rowId of root.get("rowIds")) {
        cells.delete(cellKey(rowId, colId));
      }
      root.get("colWidths").delete(colId);
    }
  });
  return `Deleted column ${colIndexToLetters(atCol)}.`;
}

export async function addComment(
  liveblocks: LiveblocksClient,
  roomId: string,
  a1: string,
  text: string
): Promise<string> {
  const ids = await idsForA1(liveblocks, roomId, a1);
  if (!ids) {
    return `Invalid cell reference "${a1}".`;
  }

  const body: CommentBody = {
    version: 1,
    content: [{ type: "paragraph", children: [{ text }] }],
  };

  showAiEditing(liveblocks, roomId, [ids]);
  await liveblocks.createThread({
    roomId,
    data: {
      comment: { userId: AI_USER_ID, body },
      metadata: { rowId: ids.rowId, colId: ids.colId },
    },
  });
  return `Added a comment on ${a1.toUpperCase()}.`;
}

export async function deleteComment(
  liveblocks: LiveblocksClient,
  roomId: string,
  refs: string[]
): Promise<string> {
  if (!refs || refs.length === 0) {
    return "No cells provided.";
  }

  // Expand every cell/range into its stable cell ids (deduped).
  const storage = await readStorage(liveblocks, roomId);
  const targetKeys = new Set<string>();
  const cells: SelectedCell[] = [];
  for (const ref of refs) {
    const range = parseA1Range(ref);
    if (!range) {
      return `Invalid cell or range "${ref}".`;
    }
    for (let r = range.start.row; r <= range.end.row; r++) {
      for (let c = range.start.col; c <= range.end.col; c++) {
        const rowId = storage.rowIds[r];
        const colId = storage.colIds[c];
        if (rowId && colId) {
          const key = cellKey(rowId, colId);
          if (!targetKeys.has(key)) {
            targetKeys.add(key);
            cells.push({ rowId, colId });
          }
        }
      }
    }
  }
  if (targetKeys.size === 0) {
    return "No valid cells provided.";
  }

  // Comment threads are anchored to a logical cell via their metadata. Fetch the
  // room's threads once and delete every one anchored to a targeted cell.
  const { data: threads } = await liveblocks.getThreads({ roomId });
  const targetThreads = threads.filter((thread) => {
    const { rowId, colId } = thread.metadata;
    return rowId && colId && targetKeys.has(cellKey(rowId, colId));
  });
  if (targetThreads.length === 0) {
    return "There are no comments on the given cells.";
  }

  showAiEditing(liveblocks, roomId, cells);
  for (const thread of targetThreads) {
    await liveblocks.deleteThread({ roomId, threadId: thread.id });
  }

  const count = targetThreads.length;
  return `Deleted ${count} comment${count === 1 ? "" : "s"}.`;
}

// --- AI tools ----------------------------------------------------------------

// The full set of spreadsheet-editing tools, shared by the chat (`/api/ai-chat`)
// and the AI comment replies, so both can do exactly the same things.
export async function createSpreadsheetTools(
  liveblocks: LiveblocksClient,
  roomId: string
) {
  const { tool } = await import("ai");
  const { z } = await import("zod");

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

  return {
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
        insertColumn(liveblocks, roomId, Math.max(0, lettersToColIndex(column))),
    }),
    deleteColumn: tool({
      description: "Delete the column at a column letter.",
      inputSchema: z.object({ column: z.string() }),
      execute: ({ column }) =>
        deleteColumn(liveblocks, roomId, Math.max(0, lettersToColIndex(column))),
    }),
    addComment: tool({
      description: "Leave a comment thread anchored to a cell.",
      inputSchema: z.object({ cell: z.string(), text: z.string() }),
      execute: ({ cell, text }) => addComment(liveblocks, roomId, cell, text),
    }),
    deleteComment: tool({
      description:
        "Delete the comment thread(s) anchored to one or more cells or ranges.",
      inputSchema: z.object({
        cells: z
          .array(z.string())
          .describe('A1 cells or ranges, e.g. ["B2", "A1:C5"].'),
      }),
      execute: ({ cells }) => deleteComment(liveblocks, roomId, cells),
    }),
  };
}

// --- AI comment replies ------------------------------------------------------

// When someone @mentions the AI in a cell's comment thread, generate a reply and
// post it back into the same thread as the AI user. Kept deliberately simple: no
// workflow, no streaming — just read the thread, generate one reply, and create
// a comment. Triggered by the `commentCreated` webhook.
export async function replyToComment(
  liveblocks: LiveblocksClient,
  roomId: string,
  threadId: string,
  commentId: string
): Promise<void> {
  const thread = await liveblocks.getThread({ roomId, threadId });
  const trigger = thread.comments.find((c) => c.id === commentId);

  // Ignore deleted comments and the AI's own comments (avoids reply loops).
  if (!trigger?.body || trigger.userId === AI_USER_ID) {
    return;
  }

  // Only reply when the AI is actually @mentioned in the new comment.
  const mentioned = getMentionsFromCommentBody(trigger.body).some(
    (mention) => mention.id === AI_USER_ID
  );
  if (!mentioned) {
    return;
  }

  // Figure out which cell this thread is on, for context.
  const storage = await readStorage(liveblocks, roomId);
  const { rowId, colId } = thread.metadata;
  const row = storage.rowIds.indexOf(rowId);
  const col = storage.colIds.indexOf(colId);
  const onCell = row !== -1 && col !== -1;
  const a1 = onCell ? toA1(row, col) : "a cell";
  const cellValue = storage.cells[cellKey(rowId, colId)]?.value || "(empty)";

  // Turn the thread into a chat transcript.
  const messages: { role: "user" | "assistant"; content: string }[] = [];
  for (const comment of thread.comments) {
    if (!comment.body) {
      continue;
    }
    messages.push({
      role: comment.userId === AI_USER_ID ? "assistant" : "user",
      content: await stringifyCommentBody(comment.body),
    });
  }

  // Show the AI working on the cell while it drafts the reply.
  if (onCell) {
    showAiEditing(liveblocks, roomId, [{ rowId, colId }]);
  }

  const { generateText, stepCountIs } = await import("ai");
  const tools = await createSpreadsheetTools(liveblocks, roomId);
  const { text } = await generateText({
    model: "openai/gpt-5.4-mini",
    system:
      `You are ${AI_USER_NAME}, replying inside a comment thread on cell ${a1} ` +
      `(current value: ${cellValue}) of a shared spreadsheet. Reply concisely ` +
      `and helpfully. You may use light Markdown (bold, italics, links) but no ` +
      `headings, lists, or tables. Do not prefix your reply with your name. ` +
      `If the comment asks you to change the sheet, use your tools to make the ` +
      `edits, then briefly confirm what you did in your reply.\n\n` +
      snapshotText(storage),
    messages,
    tools,
    stopWhen: stepCountIs(16),
  });

  const reply = text.trim();
  if (!reply) {
    return;
  }

  await liveblocks.createComment({
    roomId,
    threadId,
    data: {
      userId: AI_USER_ID,
      body: markdownToCommentBody(reply),
    },
  });
}
