"use client";

import { HotTable, type HotTableRef } from "@handsontable/react-wrapper";
import { registerAllModules } from "handsontable/registry";
import { textRenderer } from "handsontable/renderers";
import type { CellChange, ChangeSource } from "handsontable/common";
import {
  useMutation,
  useOthersListener,
  useStorage,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { useCallback, useRef } from "react";
import { GRID_COLS } from "../liveblocks.config";

registerAllModules();

export function Table() {
  const hotRef = useRef<HotTableRef>(null);
  const updateMyPresence = useUpdateMyPresence();

  // Create column and row headers
  const colHeaders = useCallback((index: number) => columnLetters(index), []);
  const rowHeaders = useCallback((index: number) => String(index + 1), []);

  // Get the realtime grid contents from Liveblocks Storage
  const data = useStorage((root) =>
    root.grid.map((row) =>
      Array.from({ length: GRID_COLS }, (_, c) => String(row[c] ?? ""))
    )
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
    ({ setMyPresence }, row: number, col: number) => {
      setMyPresence({ selectedCell: { row, col } });
    },
    []
  );

  // End presence on cell
  const afterSelectionEnd = useMutation(({ setMyPresence }) => {
    setMyPresence({ selectedCell: null });
  }, []);

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
      afterUnlisten={afterSelectionEnd}
      colHeaders={colHeaders}
      rowHeaders={rowHeaders}
      height={279}
      width={720}
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
