import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import { nanoid } from "nanoid";
import { ID_LENGTH } from "../constants";
import { Cell, Column, FixedArray, Row, Storage } from "../types";
import tokenizer, {
  CellToken,
  RefToken,
  SyntaxKind,
  tokenToString,
} from "./interpreter/tokenizer";
import { convertLetterToNumber } from "./interpreter/utils";

export function removeFromArray<T>(array: T[], item: T): void {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === item) {
      array.splice(i, 1);
      break;
    }
  }
}

export function getCellId(columnId: string, rowId: string) {
  return `${columnId}${rowId}`;
}

export function extractCellId(cellId: string) {
  const columnId = cellId.slice(0, Math.max(0, cellId.length / 2));
  const rowId = cellId.slice(Math.max(0, cellId.length / 2));

  return [columnId, rowId] as [string, string];
}

function cellToRef(
  token: CellToken,
  columns: LiveObject<Column>[],
  rows: LiveObject<Row>[]
): RefToken {
  const [letter, number] = token.cell;

  const columnIndex = convertLetterToNumber(letter);
  const rowIndex = Number.parseInt(number) - 1;

  const column = columns[columnIndex]?.get("id")!;
  const row = rows[rowIndex]?.get("id")!;

  return { kind: SyntaxKind.RefToken, ref: getCellId(column, row) };
}

export function createInitialStorage<X extends number, Y extends number>(
  columns: { length: X; width: number },
  rows: { height: number; length: Y },
  cells: FixedArray<FixedArray<string, X>, Y>
): Storage {
  const initialColumns = Array.from(
    { length: columns.length },
    () =>
      new LiveObject({ id: nanoid(ID_LENGTH), width: columns.width } as Column)
  );
  const initialRows = Array.from(
    { length: rows.length },
    () => new LiveObject({ id: nanoid(ID_LENGTH), height: rows.height } as Row)
  );
  const initialCells = cells
    .flatMap((row, y) => {
      return row.map((cell, x) => {
        if (cell) {
          const columnId = initialColumns[x].get("id") as string;
          const rowId = initialRows[y].get("id") as string;

          let expression;

          try {
            const tokens = tokenizer(cell);
            const tokensWithRefs = tokens.map((token) =>
              token.kind === SyntaxKind.CellToken
                ? cellToRef(token as CellToken, initialColumns, initialRows)
                : token
            );

            expression = tokensWithRefs.map(tokenToString).join("");
          } catch {
            expression = cell;
          }

          return [
            getCellId(columnId, rowId),
            new LiveObject({ value: expression }),
          ] as readonly [string, LiveObject<Cell>];
        }
      });
    })
    .filter(Boolean) as [string, LiveObject<Cell>][];

  return {
    spreadsheet: new LiveObject({
      cells: new LiveMap<string, LiveObject<Cell>>(initialCells),
      rows: new LiveList<LiveObject<Row>>(initialRows),
      columns: new LiveList<LiveObject<Column>>(initialColumns),
    }),
  };
}
