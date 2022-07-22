import { nanoid } from "nanoid";
import {
  LiveObject,
  type Room,
  type BaseUserMeta,
  type User,
} from "@liveblocks/client";
import type { Presence, Storage, Column, Row } from "../../liveblocks.config";
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
import { removeFromArray } from "./utils";

export type LiveSpreadsheet = {
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
    callback: (others: User<Presence, BaseUserMeta>[]) => void
  ): () => void;
  onRowsChange(callback: (rows: Row[]) => void): () => void;
  onColumnsChange(callback: (columns: Column[]) => void): () => void;
  onCellsChange(callback: (cells: Record<string, string>) => void): () => void;
};

export async function createSpreadsheet(
  room: Room<Presence, Storage, BaseUserMeta, never>
): Promise<LiveSpreadsheet> {
  const { root } = await room.getStorage();

  const liveSpreadsheet = root.get("spreadsheet");

  function insertColumn(index: number, width: number) {
    liveSpreadsheet
      .get("columns")
      .insert(new LiveObject({ id: nanoid(), width }), index);
  }

  function insertRow(index: number, height: number) {
    liveSpreadsheet
      .get("rows")
      .insert(new LiveObject({ id: nanoid(), height }), index);
  }

  function resizeColumn(index: number, width: number) {
    liveSpreadsheet.get("columns").get(index)?.set("width", width);
  }

  function resizeRow(index: number, height: number) {
    liveSpreadsheet.get("rows").get(index)?.set("height", height);
  }

  function moveRow(from: number, to: number) {
    liveSpreadsheet.get("rows").move(from, to);
  }

  function moveColumn(from: number, to: number) {
    liveSpreadsheet.get("columns").move(from, to);
  }

  function deleteColumn(index: number) {
    const column = liveSpreadsheet.get("columns").get(index);

    // TODO: BATCHING
    liveSpreadsheet.get("columns").delete(index);

    for (const row of liveSpreadsheet.get("rows").toArray()) {
      liveSpreadsheet.get("cells").delete(column!.get("id") + row.get("id"));
    }
  }

  function deleteRow(index: number) {
    const row = liveSpreadsheet.get("rows").get(index);

    // TODO: BATCHING
    liveSpreadsheet.get("rows").delete(index);

    for (const column of liveSpreadsheet.get("columns").toArray()) {
      liveSpreadsheet.get("cells").delete(column.get("id") + row!.get("id"));
    }
  }

  function cellToRef(token: CellToken): RefToken {
    const [letter, number] = token.cell;

    const columnIndex = convertLetterToNumber(letter);
    const rowIndex = Number.parseInt(number) - 1;

    const column = liveSpreadsheet.get("columns").get(columnIndex)?.get("id")!;
    const row = liveSpreadsheet.get("rows").get(rowIndex)?.get("id")!;

    return { kind: SyntaxKind.RefToken, ref: column + row };
  }

  function refToCell(token: RefToken): CellToken {
    const columnId = token.ref.substring(0, token.ref.length / 2);
    const rowId = token.ref.substring(token.ref.length / 2);

    const columnIndex = liveSpreadsheet
      .get("columns")
      .findIndex((column) => column.get("id") === columnId);
    const rowIndex = liveSpreadsheet
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

    const cells = liveSpreadsheet.get("cells");

    const cell = cells.get(columnId + rowId);

    if (cell == null) {
      cells.set(columnId + rowId, new LiveObject({ value: newExp }));
    } else {
      cell.set("value", newExp);
    }
  }

  function selectedCell(
    coordinates: { columnId: string; rowId: string } | null
  ) {
    room.updatePresence({
      selectedCell: coordinates
        ? coordinates.columnId + coordinates.rowId
        : null,
    });
  }

  function evaluateCellRef(ref: string): number {
    const result = evaluateCell(
      ref.substring(0, ref.length / 2),
      ref.substring(ref.length / 2)
    );
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
    const cell = liveSpreadsheet.get("cells").get(columnId + rowId);
    return interpreter(cell?.get("value") || "", evaluateCellRef);
  }

  function getCellDisplay(columnId: string, rowId: string) {
    const result = evaluateCell(columnId, rowId);
    return formatExpressionResult(result);
  }

  function getCellExpressionDisplay(columnId: string, rowId: string) {
    const cell = liveSpreadsheet.get("cells").get(columnId + rowId);
    if (cell == null) {
      return "";
    }

    const tokens = tokenizer(cell.get("value"));
    const tokensWithRefs = tokens.map((token) =>
      token.kind === SyntaxKind.RefToken ? refToCell(token as RefToken) : token
    );

    return tokensWithRefs.map(tokenToString).join("");
  }

  const othersCallbacks: Array<
    (others: User<Presence, BaseUserMeta>[]) => void
  > = [];
  function onOthersChange(
    callback: (others: User<Presence, BaseUserMeta>[]) => void
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
    callback(liveSpreadsheet.get("columns").map((col) => col.toObject()));
    return () => removeFromArray(columnsCallback, callback);
  }
  room.subscribe(
    liveSpreadsheet.get("columns"),
    () => {
      const columns = liveSpreadsheet
        .get("columns")
        .map((col) => col.toObject());
      for (const callback of columnsCallback) {
        callback(columns);
      }
    },
    { isDeep: true }
  );

  const rowsCallback: Array<(rows: Row[]) => void> = [];
  function onRowsChange(callback: (rows: Row[]) => void) {
    rowsCallback.push(callback);
    callback(liveSpreadsheet.get("rows").map((row) => row.toObject()));
    return () => removeFromArray(rowsCallback, callback);
  }
  room.subscribe(
    liveSpreadsheet.get("rows"),
    () => {
      const rows = liveSpreadsheet.get("rows").map((row) => row.toObject());
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
      Array.from(liveSpreadsheet.get("cells").entries()).map(([key, cell]) => [
        key,
        getCellDisplay(
          key.substring(0, key.length / 2),
          key.substring(key.length / 2)
        ),
      ])
    );
    callback(cells);
    return () => removeFromArray(cellCallbacks, callback);
  }
  room.subscribe(
    liveSpreadsheet.get("cells"),
    () => {
      const cells = Object.fromEntries(
        Array.from(liveSpreadsheet.get("cells").entries()).map(
          ([key, cell]) => [
            key,
            getCellDisplay(
              key.substring(0, key.length / 2),
              key.substring(key.length / 2)
            ),
          ]
        )
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
