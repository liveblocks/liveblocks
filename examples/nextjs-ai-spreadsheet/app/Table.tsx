"use client";

import { useCallback, useMemo, useRef } from "react";
import { HotTable, type HotTableRef } from "@handsontable/react-wrapper";
import { registerAllModules } from "handsontable/registry";
import type { CellChange, ChangeSource } from "handsontable/common";
import { shallow } from "@liveblocks/client";
import { useStorage, useUpdateMyPresence } from "@liveblocks/react/suspense";
import {
  cellKey,
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
} from "@/liveblocks.config";
import { colIndexToLetters } from "@/lib/a1";
import { useSpreadsheetActions } from "./useSpreadsheetActions";
import { useSelection } from "./SelectionContext";
import { OrderProvider } from "./OrderContext";
import { Cell } from "./Cell";

registerAllModules();

// Removes `moved` (array of indices) from `ids`, then re-inserts them at
// `finalIndex` — mirrors Handsontable's manual move so we can apply it to the
// shared id order ourselves and cancel Handsontable's own (visual) move.
function reorder(ids: string[], moved: number[], finalIndex: number): string[] {
  const movedIds = moved.map((index) => ids[index]);
  const next = [...ids];
  for (const index of [...moved].sort((a, b) => b - a)) {
    next.splice(index, 1);
  }
  next.splice(finalIndex, 0, ...movedIds);
  return next;
}

// Sort comparator: numeric when both look like numbers, otherwise locale text.
// Empty cells sort to the bottom.
function compareValues(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  if (a === "") {
    return 1;
  }
  if (b === "") {
    return -1;
  }
  const na = Number(a.replace(/[$,%\s]/g, ""));
  const nb = Number(b.replace(/[$,%\s]/g, ""));
  if (!Number.isNaN(na) && !Number.isNaN(nb)) {
    return na - nb;
  }
  return a.localeCompare(b);
}

export function Table() {
  const hotRef = useRef<HotTableRef>(null);
  const actions = useSpreadsheetActions();
  const { setSelection } = useSelection();
  const updateMyPresence = useUpdateMyPresence();

  // Stable id order (re-used by the cell renderer and every grid handler).
  const rowIds = useStorage((root) => [...root.rowIds], shallow);
  const colIds = useStorage((root) => [...root.colIds], shallow);

  // Sparse value map → only changes when a value (not formatting) changes, so
  // the Handsontable data array isn't rebuilt on formatting/size edits.
  // (In immutable form, the `cells` LiveMap reads as a plain object.)
  const values = useStorage((root) => {
    const out: Record<string, string> = {};
    for (const [key, cell] of Object.entries(root.cells)) {
      if (cell.value) {
        out[key] = cell.value;
      }
    }
    return out;
  }, shallow);

  const colWidths = useStorage(
    (root) =>
      [...root.colIds].map((id) => root.colWidths[id] ?? DEFAULT_COL_WIDTH),
    shallow
  );
  const rowHeights = useStorage(
    (root) =>
      [...root.rowIds].map((id) => root.rowHeights[id] ?? DEFAULT_ROW_HEIGHT),
    shallow
  );

  const data = useMemo(
    () => rowIds.map((r) => colIds.map((c) => values[cellKey(r, c)] ?? "")),
    [rowIds, colIds, values]
  );

  // Refs so the (stable) Handsontable callbacks always read the latest order.
  const rowIdsRef = useRef(rowIds);
  rowIdsRef.current = rowIds;
  const colIdsRef = useRef(colIds);
  colIdsRef.current = colIds;
  const valuesRef = useRef(values);
  valuesRef.current = values;

  // We cancel Handsontable's own sort (see `beforeColumnSort`), so the
  // columnSorting plugin's per-column state never advances and the `sortOrder`
  // it hands us is always "asc". Track the direction ourselves to toggle
  // asc → desc on repeated clicks of the same column header.
  const sortRef = useRef<{ colId: string; sortOrder: "asc" | "desc" } | null>(
    null
  );

  const order = useMemo(() => ({ rowIds, colIds }), [rowIds, colIds]);

  const colHeaders = useCallback(
    (index: number) => colIndexToLetters(index),
    []
  );
  const rowHeaders = useCallback((index: number) => String(index + 1), []);

  const afterChange = useCallback(
    (changes: CellChange[] | null, source: ChangeSource) => {
      if (!changes || source === "loadData") {
        return;
      }
      for (const [visualRow, prop, , newVal] of changes) {
        if (typeof prop !== "number") {
          continue;
        }
        const rowId = rowIdsRef.current[visualRow];
        const colId = colIdsRef.current[prop];
        if (!rowId || !colId) {
          continue;
        }
        actions.setCellValue(
          rowId,
          colId,
          newVal === null || newVal === undefined ? "" : String(newVal)
        );
      }
    },
    [actions]
  );

  const onSelection = useCallback(
    (row: number, col: number, row2: number, col2: number) => {
      const r1 = Math.max(0, Math.min(row, row2));
      const r2 = Math.max(row, row2);
      const c1 = Math.max(0, Math.min(col, col2));
      const c2 = Math.max(col, col2);
      const selectedRowIds = rowIdsRef.current.slice(r1, r2 + 1);
      const selectedColIds = colIdsRef.current.slice(c1, c2 + 1);
      if (!selectedRowIds.length || !selectedColIds.length) {
        return;
      }
      const anchor = {
        rowId: rowIdsRef.current[Math.max(0, row)] ?? selectedRowIds[0],
        colId: colIdsRef.current[Math.max(0, col)] ?? selectedColIds[0],
      };
      setSelection({
        rowIds: selectedRowIds,
        colIds: selectedColIds,
        anchor,
      });
      updateMyPresence({ selectedCell: anchor });
    },
    [setSelection, updateMyPresence]
  );

  const onDeselect = useCallback(() => {
    setSelection(null);
    updateMyPresence({ selectedCell: null });
  }, [setSelection, updateMyPresence]);

  const afterColumnResize = useCallback(
    (newSize: number, column: number) => {
      const colId = colIdsRef.current[column];
      if (colId) {
        actions.setColWidth(colId, newSize);
      }
    },
    [actions]
  );

  const afterRowResize = useCallback(
    (newSize: number, row: number) => {
      const rowId = rowIdsRef.current[row];
      if (rowId) {
        actions.setRowHeight(rowId, newSize);
      }
    },
    [actions]
  );

  // Cancel Handsontable's own visual move and reorder the shared id list
  // instead. The grid stays a pure identity projection of Storage.
  const beforeRowMove = useCallback(
    (
      movedRows: number[],
      finalIndex: number,
      _drop: number | undefined,
      movePossible: boolean
    ) => {
      if (!movePossible) {
        return;
      }
      const next = reorder(rowIdsRef.current, movedRows, finalIndex);
      actions.setRowOrder(next);
      return false;
    },
    [actions]
  );

  const beforeColumnMove = useCallback(
    (
      movedColumns: number[],
      finalIndex: number,
      _drop: number | undefined,
      movePossible: boolean
    ) => {
      if (!movePossible) {
        return;
      }
      const next = reorder(colIdsRef.current, movedColumns, finalIndex);
      actions.setColOrder(next);
      return false;
    },
    [actions]
  );

  const beforeColumnSort = useCallback(
    (
      _current: unknown,
      destination: { column: number; sortOrder?: "asc" | "desc" }[]
    ) => {
      const config = destination?.[0];
      if (!config) {
        return false;
      }
      const colId = colIdsRef.current[config.column];
      if (!colId) {
        return false;
      }
      const prev = sortRef.current;
      const sortOrder: "asc" | "desc" =
        prev && prev.colId === colId && prev.sortOrder === "asc"
          ? "desc"
          : "asc";
      sortRef.current = { colId, sortOrder };
      const sorted = [...rowIdsRef.current].sort((a, b) =>
        compareValues(
          valuesRef.current[cellKey(a, colId)] ?? "",
          valuesRef.current[cellKey(b, colId)] ?? ""
        )
      );
      if (sortOrder === "desc") {
        sorted.reverse();
      }
      actions.setRowOrder(sorted);
      return false;
    },
    [actions]
  );

  return (
    <OrderProvider order={order}>
      <HotTable
        ref={hotRef}
        className="ht-theme-main w-full h-full"
        data={data}
        renderer={Cell}
        colHeaders={colHeaders}
        rowHeaders={rowHeaders}
        colWidths={colWidths}
        rowHeights={rowHeights}
        afterChange={afterChange}
        afterSelection={onSelection}
        afterSelectionEnd={onSelection}
        afterDeselect={onDeselect}
        afterColumnResize={afterColumnResize}
        afterRowResize={afterRowResize}
        beforeRowMove={beforeRowMove}
        beforeColumnMove={beforeColumnMove}
        beforeColumnSort={beforeColumnSort}
        manualColumnResize={true}
        manualRowResize={true}
        manualRowMove={true}
        manualColumnMove={true}
        columnSorting={true}
        width="100%"
        height="100%"
        licenseKey="non-commercial-and-evaluation"
        autoWrapRow={true}
        autoWrapCol={true}
        autoRowSize={false}
        autoColumnSize={false}
        stretchH="none"
        rowHeaderWidth={48}
      />
    </OrderProvider>
  );
}
