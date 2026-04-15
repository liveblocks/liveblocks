"use client";

import { shallow } from "@liveblocks/client";
import { HotTable, type HotTableRef } from "@handsontable/react-wrapper";
import { registerAllModules } from "handsontable/registry";
import { textRenderer } from "handsontable/renderers";
import type { CellChange, ChangeSource } from "handsontable/common";
import {
  useMutation,
  useOthersListener,
  useStorage,
} from "@liveblocks/react/suspense";
import { useCallback, useRef } from "react";
import { GRID_COLS, GRID_ROWS } from "../liveblocks.config";

const MIN_COL_WIDTH = 24;
const MIN_ROW_HEIGHT = 22;

registerAllModules();

export function Table() {
  const hotRef = useRef<HotTableRef>(null);

  // Create column and row headers
  const colHeaders = useCallback((index: number) => columnLetters(index), []);
  const rowHeaders = useCallback((index: number) => String(index + 1), []);

  // Get the realtime grid contents from Liveblocks Storage
  const data = useStorage(
    (root) =>
      root.grid.map((row) =>
        Array.from({ length: GRID_COLS }, (_, c) => String(row[c] ?? ""))
      ),
    shallow
  );

  // Get the realtime column and row widths from Liveblocks Storage
  const { colWidths, rowHeights } = useStorage(
    (root) => ({
      colWidths: Array.from(
        { length: GRID_COLS },
        (_, i) => root.columnWidths[i]
      ),
      rowHeights: Array.from(
        { length: GRID_ROWS },
        (_, i) => root.rowHeights[i]
      ),
    }),
    shallow
  );

  // Update a cell's value
  const updateCell = useMutation(
    ({ storage }, rowIndex: number, colIndex: number, value: string) => {
      const grid = storage.get("grid");
      const row = grid.get(rowIndex);
      if (row) {
        row.set(colIndex, value);
      }
    },
    []
  );

  // Update the grid when a cell is changed
  const afterChange = useCallback(
    (changes: CellChange[] | null, source: ChangeSource) => {
      if (!changes || source === "loadData") {
        return;
      }

      for (const [row, prop, , newVal] of changes) {
        if (typeof prop !== "number") {
          continue;
        }

        updateCell(
          row,
          prop,
          newVal === null || newVal === undefined ? "" : String(newVal)
        );
      }
    },
    [updateCell]
  );

  // Sync the selected cell to the presence
  const syncSelectedCellToPresence = useMutation(
    (
      { setMyPresence },
      row: number,
      col: number,
      third?: unknown,
      fourth?: unknown
    ) => {
      let anchorRow = row;
      let anchorCol = col;

      if (typeof third === "number" && typeof fourth === "number") {
        anchorRow = Math.min(row, third);
        anchorCol = Math.min(col, fourth);
      }

      // Full column/row selections can use negative indices, set to 0 in these cases
      setMyPresence({
        selectedCell: {
          row: anchorRow < 0 ? 0 : anchorRow,
          col: anchorCol < 0 ? 0 : anchorCol,
        },
      });
    },
    []
  );

  // Clear presence only when the selection is cleared
  const clearSelectedCellPresence = useMutation(({ setMyPresence }) => {
    setMyPresence({ selectedCell: null });
  }, []);

  // Update columns width and heights on changes
  const afterColumnResize = useMutation(
    ({ storage }, newSize: number, column: number) => {
      storage
        .get("columnWidths")
        .set(column, Math.max(MIN_COL_WIDTH, Math.round(newSize)));
    },
    []
  );

  const afterRowResize = useMutation(
    ({ storage }, newSize: number, row: number) => {
      storage
        .get("rowHeights")
        .set(row, Math.max(MIN_ROW_HEIGHT, Math.round(newSize)));
    },
    []
  );

  // Render presence inside cells
  const renderDataCell = useMutation(
    ({ others }, ...props: Parameters<typeof textRenderer>) => {
      // Handle rendering the cell
      textRenderer(...props);
      const [, td, row, col] = props;

      // Find users who have selected this cell
      const selectedOthers = others.filter(
        (o) =>
          o.presence.selectedCell?.row === row &&
          o.presence.selectedCell?.col === col
      );

      // Remove presence if no users selecting
      if (!selectedOthers.length) {
        td.style.boxShadow = "";
        td.removeAttribute("title");
        return;
      }

      // Add inner borders for selected users
      td.style.boxShadow = selectedOthers
        .map((p, i) => `inset 0 0 0 ${2 + i * 2}px ${p.info.color}`)
        .join(", ");
      td.title = selectedOthers.map((p) => p.info.name).join(", ");
    },
    []
  );

  // Re-render the table when others update their presence
  useOthersListener(({ type }) => {
    if (type === "update") {
      hotRef.current?.hotInstance?.render();
    }
  });

  return (
    <HotTable
      ref={hotRef}
      data={data}
      hotRenderer={renderDataCell}
      afterChange={afterChange}
      afterSelection={syncSelectedCellToPresence}
      afterSelectionEnd={syncSelectedCellToPresence}
      afterSelectionFocusSet={syncSelectedCellToPresence}
      afterDeselect={clearSelectedCellPresence}
      afterColumnResize={afterColumnResize}
      afterRowResize={afterRowResize}
      colHeaders={colHeaders}
      rowHeaders={rowHeaders}
      colWidths={colWidths}
      rowHeights={rowHeights}
      manualColumnResize={true}
      manualRowResize={true}
      height={279}
      width={720}
      licenseKey="non-commercial-and-evaluation"
      autoWrapRow={true}
      autoWrapCol={true}
      autoRowSize={false}
      autoColumnSize={false}
      stretchH="none"
      rowHeaderWidth={44}
      minRowHeights={MIN_ROW_HEIGHT}
    />
  );
}

// Excel-style column label: 0 → A, 25 → Z, 26 → AA, …
function columnLetters(index: number): string {
  let n = index + 1;
  let label = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}
