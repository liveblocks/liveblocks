import {
  LiveMap,
  LiveObject,
  Liveblocks as LiveblocksClient,
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
  a1: string
): Promise<string> {
  const ids = await idsForA1(liveblocks, roomId, a1);
  if (!ids) {
    return `Invalid cell reference "${a1}".`;
  }

  // Comment threads are anchored to a logical cell via their metadata, so we can
  // find the thread(s) on this cell by querying that metadata, then delete them.
  const { data: threads } = await liveblocks.getThreads({
    roomId,
    query: { metadata: { rowId: ids.rowId, colId: ids.colId } },
  });
  if (threads.length === 0) {
    return `There is no comment on ${a1.toUpperCase()}.`;
  }

  showAiEditing(liveblocks, roomId, [ids]);
  for (const thread of threads) {
    await liveblocks.deleteThread({ roomId, threadId: thread.id });
  }

  const count = threads.length;
  return `Deleted ${count} comment${
    count === 1 ? "" : "s"
  } on ${a1.toUpperCase()}.`;
}
