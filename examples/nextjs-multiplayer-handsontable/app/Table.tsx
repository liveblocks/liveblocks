"use client";

import { HotTable, type HotTableRef } from "@handsontable/react-wrapper";
import { registerAllModules } from "handsontable/registry";
import type { CellChange, ChangeSource } from "handsontable/common";
import { useMutation, useStorage } from "@liveblocks/react/suspense";
import { useCallback, useMemo, useRef } from "react";
import { GRID_COLS, GRID_ROWS } from "../liveblocks.config";

registerAllModules();

/** Excel-style column label: 0 → A, 25 → Z, 26 → AA, … */
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

export function Table() {
  const hotRef = useRef<HotTableRef>(null);

  const gridData = useStorage((root) =>
    root.grid.map((row) =>
      Array.from({ length: GRID_COLS }, (_, c) => String(row[c] ?? ""))
    )
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

  const data = useMemo(() => {
    if (!gridData) {
      return Array.from({ length: GRID_ROWS }, () =>
        Array.from({ length: GRID_COLS }, () => "")
      );
    }
    return gridData;
  }, [gridData]);

  const colHeaders = useCallback(
    (index: number) => columnLetters(index),
    []
  );

  const rowHeaders = useCallback((index: number) => String(index + 1), []);

  return (
    <HotTable
      ref={hotRef}
      data={data}
      afterChange={afterChange}
      colHeaders={colHeaders}
      rowHeaders={rowHeaders}
      height={480}
      width={960}
      licenseKey="non-commercial-and-evaluation"
      autoWrapRow={true}
      autoWrapCol={true}
      autoRowSize={false}
      autoColumnSize={false}
      stretchH="all"
      rowHeaderWidth={44}
      minRowHeights={24}
    />
  );
}
