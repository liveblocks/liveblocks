"use client";

import { HotTable, type HotTableRef } from "@handsontable/react-wrapper";
import { shallow } from "@liveblocks/client";
import "handsontable/styles/handsontable.min.css";
import "handsontable/styles/ht-theme-main.min.css";
import {
  useMutation,
  useOthersListener,
  useStorage,
} from "@liveblocks/react/suspense";
import type { CellChange, ChangeSource } from "handsontable/common";
import { registerAllModules } from "handsontable/registry";
import { textRenderer } from "handsontable/renderers";
import { useCallback, useRef, useState } from "react";
import { GRID_COLS, GRID_ROWS } from "@/liveblocks.config";
import { CellThreadProvider } from "./CellThreadContext";
import { SpreadsheetComments } from "./SpreadsheetComments";
import styles from "./Spreadsheet.module.css";

const MIN_COL_WIDTH = 24;
const MIN_ROW_HEIGHT = 22;

registerAllModules();

export function SpreadsheetTable() {
  const hotRef = useRef<HotTableRef>(null);
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);

  const colHeaders = useCallback((index: number) => columnLetters(index), []);
  const rowHeaders = useCallback((index: number) => String(index + 1), []);

  const data = useStorage(
    (root) =>
      root.grid.map((row) =>
        Array.from({ length: GRID_COLS }, (_, c) => String(row[c] ?? ""))
      ),
    shallow
  );

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

      const cellRow = anchorRow < 0 ? 0 : anchorRow;
      const cellCol = anchorCol < 0 ? 0 : anchorCol;

      setMyPresence({
        selectedCell: { row: cellRow, col: cellCol },
      });

      setSelectedCell({ row: cellRow, col: cellCol });
    },
    []
  );

  const clearSelectedCellPresence = useMutation(({ setMyPresence }) => {
    setMyPresence({ selectedCell: null });
    setSelectedCell(null);
  }, []);

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

  const renderDataCell = useMutation(
    ({ others }, ...props: Parameters<typeof textRenderer>) => {
      textRenderer(...props);
      const [, td, row, col] = props;

      const selectedOthers = others.filter(
        (o) =>
          o.presence.selectedCell?.row === row &&
          o.presence.selectedCell?.col === col
      );

      if (!selectedOthers.length) {
        td.style.boxShadow = "";
        td.removeAttribute("title");
        return;
      }

      td.style.boxShadow = selectedOthers
        .map((p, i) => `inset 0 0 0 ${2 + i * 2}px ${p.info.color}`)
        .join(", ");
      td.title = selectedOthers.map((p) => p.info.name).join(", ");
    },
    []
  );

  useOthersListener(({ type }) => {
    if (type === "update") {
      hotRef.current?.hotInstance?.render();
    }
  });

  return (
    <CellThreadProvider>
      <div className={styles.spreadsheet}>
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
          height="100%"
          width="100%"
          licenseKey="non-commercial-and-evaluation"
          autoWrapRow={true}
          autoWrapCol={true}
          autoRowSize={false}
          autoColumnSize={false}
          stretchH="all"
          rowHeaderWidth={44}
          minRowHeights={MIN_ROW_HEIGHT}
        />
        <SpreadsheetComments selectedCell={selectedCell} />
      </div>
    </CellThreadProvider>
  );
}

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
