import { nanoid } from "nanoid";
import { LiveObject, type Room, type User } from "@liveblocks/client";
import interpreter from "./interpreter";
import tokenizer, {
  SyntaxKind,
  tokenToString,
  type CellToken,
  type RefToken,
} from "./interpreter/tokenizer";
import {
  convertLetterToNumber,
  convertNumberToLetter,
  formatExpressionResult,
} from "./interpreter/utils";
import { extractCellId, getCellId, removeFromArray } from "./utils";
import type { Presence, Storage, UserMeta, Row, Column } from "../types";

export type Spreadsheet = {
  insertColumn(index: number, width: number): void;
  insertRow(index: number, width: number): void;
  resizeColumn(index: number, width: number): void;
  resizeRow(index: number, height: number): void;
  moveRow(from: number, to: number): void;
  moveColumn(from: number, to: number): void;
  deleteColumn(index: number): void;
  deleteRow(index: number): void;

  selectedCell(coordinates: { columnId: string; rowId: string } | null): void;
  updateCellValue(columnId: string, rowId: string, value: string): void;
  getCellDisplay(columnId: string, rowId: string): string;
  getCellExpressionDisplay(columnId: string, rowId: string): string;

  onOthersChange(
    callback: (others: User<Presence, UserMeta>[]) => void
  ): () => void;
  onRowsChange(callback: (rows: Row[]) => void): () => void;
  onColumnsChange(callback: (columns: Column[]) => void): () => void;
  onCellsChange(callback: (cells: Record<string, string>) => void): () => void;
};

export async function createSpreadsheet(
  room: Room<Presence, Storage, UserMeta, never>
): Promise<Spreadsheet> {
  const { root } = await room.getStorage();

  const spreadsheet = root.get("spreadsheet");

  function insertColumn(index: number, width: number) {
    spreadsheet
      .get("columns")
      .insert(new LiveObject({ id: nanoid(), width }), index);
  }

  function insertRow(index: number, height: number) {
    spreadsheet
      .get("rows")
      .insert(new LiveObject({ id: nanoid(), height }), index);
  }

  function resizeColumn(index: number, width: number) {
    spreadsheet.get("columns").get(index)?.set("width", width);
  }

  function resizeRow(index: number, height: number) {
    spreadsheet.get("rows").get(index)?.set("height", height);
  }

  function moveRow(from: number, to: number) {
    spreadsheet.get("rows").move(from, to);
  }

  function moveColumn(from: number, to: number) {
    spreadsheet.get("columns").move(from, to);
  }

  function deleteColumn(index: number) {
    const column = spreadsheet.get("columns").get(index);

    // TODO: BATCHING
    spreadsheet.get("columns").delete(index);

    for (const row of spreadsheet.get("rows").toArray()) {
      spreadsheet
        .get("cells")
        .delete(getCellId(column!.get("id"), row.get("id")));
    }
  }

  function deleteRow(index: number) {
    const row = spreadsheet.get("rows").get(index);

    // TODO: BATCHING
    spreadsheet.get("rows").delete(index);

    for (const column of spreadsheet.get("columns").toArray()) {
      spreadsheet
        .get("cells")
        .delete(getCellId(column.get("id"), row!.get("id")));
    }
  }

  function cellToRef(token: CellToken): RefToken {
    const [letter, number] = token.cell;

    const columnIndex = convertLetterToNumber(letter);
    const rowIndex = Number.parseInt(number) - 1;

    const column = spreadsheet.get("columns").get(columnIndex)?.get("id")!;
    const row = spreadsheet.get("rows").get(rowIndex)?.get("id")!;

    return { kind: SyntaxKind.RefToken, ref: getCellId(column, row) };
  }

  function refToCell(token: RefToken): CellToken {
    const [columnId, rowId] = extractCellId(token.ref);

    const columnIndex = spreadsheet
      .get("columns")
      .findIndex((column) => column.get("id") === columnId);
    const rowIndex = spreadsheet
      .get("rows")
      .findIndex((row) => row.get("id") === rowId);

    if (columnIndex === -1) {
      throw new Error(`Unknown row id: ${columnId}`);
    }

    if (rowIndex === -1) {
      throw new Error(`Unknown row id: ${rowId}`);
    }

    return {
      kind: SyntaxKind.CellToken,
      cell: `${convertNumberToLetter(columnIndex)}${rowIndex + 1}`,
    };
  }

  function updateCellValue(columnId: string, rowId: string, value: string) {
    const tokens = tokenizer(value);
    const tokensWithRefs = tokens.map((token) =>
      token.kind === SyntaxKind.CellToken
        ? cellToRef(token as CellToken)
        : token
    );
    const newExp = tokensWithRefs.map(tokenToString).join("");

    const cells = spreadsheet.get("cells");

    const cellId = getCellId(columnId, rowId);
    const cell = cells.get(cellId);

    if (cell == null) {
      cells.set(cellId, new LiveObject({ value: newExp }));
    } else {
      cell.set("value", newExp);
    }
  }

  function selectedCell(
    coordinates: { columnId: string; rowId: string } | null
  ) {
    room.updatePresence({
      selectedCell: coordinates
        ? getCellId(coordinates.columnId, coordinates.rowId)
        : null,
    });
  }

  function evaluateCellRef(ref: string): number {
    const [columnId, rowId] = extractCellId(ref);
    const result = evaluateCell(columnId, rowId);
    if (result.type !== "number") {
      throw new Error(
        `expected an expression result of type number but got ${JSON.stringify(
          result
        )}`
      );
    }
    return result.value;
  }

  function evaluateCell(columnId: string, rowId: string) {
    const cell = spreadsheet.get("cells").get(getCellId(columnId, rowId));
    return interpreter(cell?.get("value") || "", evaluateCellRef);
  }

  function getCellDisplay(columnId: string, rowId: string) {
    const result = evaluateCell(columnId, rowId);
    return formatExpressionResult(result);
  }

  function getCellExpressionDisplay(columnId: string, rowId: string) {
    const cell = spreadsheet.get("cells").get(getCellId(columnId, rowId));
    if (cell == null) {
      return "";
    }

    const tokens = tokenizer(cell.get("value"));
    const tokensWithRefs = tokens.map((token) =>
      token.kind === SyntaxKind.RefToken ? refToCell(token as RefToken) : token
    );

    return tokensWithRefs.map(tokenToString).join("");
  }

  const othersCallbacks: Array<(others: User<Presence, UserMeta>[]) => void> =
    [];
  function onOthersChange(
    callback: (others: User<Presence, UserMeta>[]) => void
  ) {
    othersCallbacks.push(callback);
    callback(room.getOthers().toArray());
    return () => removeFromArray(othersCallbacks, callback);
  }
  room.subscribe("others", (others) => {
    const users = others.toArray();
    for (const callback of othersCallbacks) {
      callback(users);
    }
  });

  const columnsCallback: Array<(columns: Column[]) => void> = [];
  function onColumnsChange(callback: (columns: Column[]) => void) {
    columnsCallback.push(callback);
    callback(spreadsheet.get("columns").map((col) => col.toObject()));
    return () => removeFromArray(columnsCallback, callback);
  }
  room.subscribe(
    spreadsheet.get("columns"),
    () => {
      const columns = spreadsheet.get("columns").map((col) => col.toObject());
      for (const callback of columnsCallback) {
        callback(columns);
      }
    },
    { isDeep: true }
  );

  const rowsCallback: Array<(rows: Row[]) => void> = [];
  function onRowsChange(callback: (rows: Row[]) => void) {
    rowsCallback.push(callback);
    callback(spreadsheet.get("rows").map((row) => row.toObject()));
    return () => removeFromArray(rowsCallback, callback);
  }
  room.subscribe(
    spreadsheet.get("rows"),
    () => {
      const rows = spreadsheet.get("rows").map((row) => row.toObject());
      for (const callback of rowsCallback) {
        callback(rows);
      }
    },
    { isDeep: true }
  );

  const cellCallbacks: Array<(cells: Record<string, string>) => void> = [];
  function onCellsChange(callback: (cells: Record<string, string>) => void) {
    cellCallbacks.push(callback);
    const cells = Object.fromEntries(
      Array.from(spreadsheet.get("cells").entries()).map(([key]) => [
        key,
        getCellDisplay(...extractCellId(key)),
      ])
    );
    callback(cells);
    return () => removeFromArray(cellCallbacks, callback);
  }
  room.subscribe(
    spreadsheet.get("cells"),
    () => {
      const cells = Object.fromEntries(
        Array.from(spreadsheet.get("cells").entries()).map(([key]) => [
          key,
          getCellDisplay(...extractCellId(key)),
        ])
      );
      for (const callback of cellCallbacks) {
        callback(cells);
      }
    },
    { isDeep: true }
  );

  return {
    insertColumn,
    insertRow,
    resizeColumn,
    resizeRow,
    moveRow,
    moveColumn,
    deleteRow,
    deleteColumn,
    updateCellValue,
    selectedCell,
    getCellDisplay,
    getCellExpressionDisplay,

    onOthersChange,
    onColumnsChange,
    onRowsChange,
    onCellsChange,
  };
}
