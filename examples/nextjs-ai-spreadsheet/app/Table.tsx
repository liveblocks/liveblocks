"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { HotTable, type HotTableRef } from "@handsontable/react-wrapper";
import { registerAllModules } from "handsontable/registry";
import type { CellChange, ChangeSource } from "handsontable/common";
import { HyperFormula } from "hyperformula";
import { shallow } from "@liveblocks/client";
import {
  useOthers,
  useStorage,
  useThreads,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import {
  cellKey,
  DEFAULT_COL_WIDTH,
  DEFAULT_ROW_HEIGHT,
  type CellFormat,
} from "@/liveblocks.config";
import { colIndexToLetters } from "@/lib/a1";
import { formatDisplayValue } from "@/lib/format";
import { useSpreadsheetActions } from "./useSpreadsheetActions";
import { useSetSelection } from "./SelectionContext";
import { OrderProvider } from "./OrderContext";
import { CommentOverlay } from "./CommentOverlay";

registerAllModules();

// A presence highlight on a single cell. `top`/`right`/`bottom`/`left` mark
// which of the cell's edges sit on the *boundary* of that user's selected
// region, so the renderer can draw one box around the whole region (a single
// cell has all four edges, a range only has the outer ones).
type CellSelector = {
  name: string;
  color: string;
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
};
type HotInstance = NonNullable<HotTableRef["hotInstance"]>;

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
  const setSelection = useSetSelection();
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

  // Per-cell formatting, presence selections, and which cells have a thread —
  // these are NOT part of the Handsontable `data` array, so the function
  // renderer reads them from refs and we trigger a repaint when they change.
  const cellsFormat = useStorage((root) => {
    const out: Record<string, CellFormat> = {};
    for (const [key, cell] of Object.entries(root.cells)) {
      if (cell.format) {
        out[key] = cell.format;
      }
    }
    return out;
  }, shallow);

  // Each other user's selected region, as the set of cell keys they're editing.
  // (Humans publish a single cell; the AI publishes every cell of a multi-cell
  // edit.) We compute the per-cell box edges separately, below, where the row
  // and column order is available.
  const othersSelections = useOthers((others) => {
    const out: { name: string; color: string; keys: string[] }[] = [];
    for (const other of others) {
      const cells = other.presence.selectedCells;
      if (!cells || cells.length === 0) {
        continue;
      }
      const keys: string[] = [];
      for (const cell of cells) {
        if (cell?.rowId && cell?.colId) {
          keys.push(cellKey(cell.rowId, cell.colId));
        }
      }
      if (keys.length) {
        out.push({
          name: other.info?.name ?? "Someone",
          color: other.info?.color ?? "#888888",
          keys,
        });
      }
    }
    return out;
  }, shallow);

  // Turn each user's set of cells into per-cell box edges: a cell's edge is part
  // of the outline only when the neighbouring cell (in the current row/column
  // order) isn't also in that same user's selection. A single cell keeps all
  // four edges; a rectangular range only outlines its perimeter.
  const presenceByCell = useMemo(() => {
    const out: Record<string, CellSelector[]> = {};
    const rowIndex = new Map(rowIds.map((id, i) => [id, i]));
    const colIndex = new Map(colIds.map((id, i) => [id, i]));
    for (const sel of othersSelections) {
      const keySet = new Set(sel.keys);
      const inSet = (r: number, c: number) => {
        const rowId = rowIds[r];
        const colId = colIds[c];
        return (
          rowId !== undefined &&
          colId !== undefined &&
          keySet.has(cellKey(rowId, colId))
        );
      };
      for (const key of sel.keys) {
        const [rowId, colId] = key.split(":");
        const r = rowIndex.get(rowId);
        const c = colIndex.get(colId);
        if (r === undefined || c === undefined) {
          continue;
        }
        (out[key] ??= []).push({
          name: sel.name,
          color: sel.color,
          top: !inSet(r - 1, c),
          bottom: !inSet(r + 1, c),
          left: !inSet(r, c - 1),
          right: !inSet(r, c + 1),
        });
      }
    }
    return out;
  }, [othersSelections, rowIds, colIds]);

  const { threads } = useThreads();
  const threadKeys = useMemo(() => {
    const set = new Set<string>();
    for (const thread of threads) {
      if (thread.resolved) {
        continue;
      }
      const { rowId, colId } = thread.metadata;
      if (rowId && colId) {
        set.add(cellKey(rowId, colId));
      }
    }
    return set;
  }, [threads]);

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

  // Refs so the (stable) Handsontable callbacks and function renderer always
  // read the latest order / data without being re-created.
  const rowIdsRef = useRef(rowIds);
  rowIdsRef.current = rowIds;
  const colIdsRef = useRef(colIds);
  colIdsRef.current = colIds;
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const cellsFormatRef = useRef(cellsFormat);
  cellsFormatRef.current = cellsFormat;
  const presenceByCellRef = useRef(presenceByCell);
  presenceByCellRef.current = presenceByCell;
  const threadKeysRef = useRef(threadKeys);
  threadKeysRef.current = threadKeys;
  const lastSelKey = useRef<string>("");

  // We cancel Handsontable's own sort (see `beforeColumnSort`), so the
  // columnSorting plugin's per-column state never advances and the `sortOrder`
  // it hands us is always "asc". Track the direction ourselves to toggle
  // asc → desc on repeated clicks of the same column header.
  const sortRef = useRef<{ colId: string; sortOrder: "asc" | "desc" } | null>(
    null
  );

  const order = useMemo(() => ({ rowIds, colIds }), [rowIds, colIds]);

  // Plain Handsontable function renderer: paints value + formatting + presence
  // borders + comment marker directly onto the (recycled) <td>, synchronously
  // on every Handsontable render. Every style is set or reset on every call, so
  // a recycled/repainted cell never keeps a previous cell's content or styles.
  const renderCell = useCallback(
    (
      _instance: HotInstance,
      td: HTMLTableCellElement,
      row: number,
      col: number,
      _prop: string | number,
      value: unknown
    ) => {
      // Reset everything this renderer may set (idempotent on recycled tds).
      td.style.background = "";
      td.style.boxShadow = "";
      td.style.fontWeight = "";
      td.style.fontStyle = "";
      td.style.textDecoration = "";
      td.style.color = "";
      td.style.textAlign = "";
      td.classList.remove("has-comment");
      td.removeAttribute("title");

      const rowId = rowIdsRef.current[row];
      const colId = colIdsRef.current[col];
      const raw = value == null ? "" : String(value);

      // Transient frame (order not resolved yet): still show the raw value.
      if (!rowId || !colId) {
        td.textContent = raw;
        return;
      }

      const key = cellKey(rowId, colId);
      const format = cellsFormatRef.current[key];

      td.textContent = formatDisplayValue(raw, format?.numberFormat);

      if (format) {
        if (format.bold) {
          td.style.fontWeight = "600";
        }
        if (format.italic) {
          td.style.fontStyle = "italic";
        }
        const decorations: string[] = [];
        if (format.underline) {
          decorations.push("underline");
        }
        if (format.strike) {
          decorations.push("line-through");
        }
        if (decorations.length) {
          td.style.textDecoration = decorations.join(" ");
        }
        if (format.color) {
          td.style.color = format.color;
        }
        if (format.align) {
          td.style.textAlign = format.align;
        }
        if (format.background) {
          td.style.background = format.background;
        }
      }

      const selectors = presenceByCellRef.current[key];
      if (selectors && selectors.length) {
        // Draw only the boundary edges of each user's region, so a multi-cell
        // selection reads as one box rather than a border around every cell.
        // Stack multiple users concentrically (first listed sits on top).
        const shadows: string[] = [];
        for (let i = 0; i < selectors.length; i++) {
          const s = selectors[i];
          const w = 2 + i * 2;
          if (s.top) {
            shadows.push(`inset 0 ${w}px 0 0 ${s.color}`);
          }
          if (s.bottom) {
            shadows.push(`inset 0 -${w}px 0 0 ${s.color}`);
          }
          if (s.left) {
            shadows.push(`inset ${w}px 0 0 0 ${s.color}`);
          }
          if (s.right) {
            shadows.push(`inset -${w}px 0 0 0 ${s.color}`);
          }
        }
        if (shadows.length) {
          td.style.boxShadow = shadows.join(", ");
        }
        td.title = selectors.map((s) => s.name).join(", ");
      }

      if (threadKeysRef.current.has(key)) {
        td.classList.add("has-comment");
      }
    },
    []
  );

  // Repaint the grid whenever formatting, presence, or the set of comment
  // threads change. (Value/order changes flow through the `data` prop, which
  // already triggers a Handsontable re-render.)
  useEffect(() => {
    hotRef.current?.hotInstance?.render();
  }, [cellsFormat, presenceByCell, threadKeys]);

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
      const instance = hotRef.current?.hotInstance;
      for (const [visualRow, prop, , newVal] of changes) {
        if (typeof prop !== "number") {
          continue;
        }
        const rowId = rowIdsRef.current[visualRow];
        const colId = colIdsRef.current[prop];
        if (!rowId || !colId) {
          continue;
        }
        // With the Formulas plugin, `newVal` is the *computed* result. Persist
        // the underlying source instead
        const source = instance?.getSourceDataAtCell(visualRow, prop) ?? newVal;
        actions.setCellValue(
          rowId,
          colId,
          source === null || source === undefined ? "" : String(source)
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
      const key = `${r1},${c1},${r2},${c2}`;
      if (key === lastSelKey.current) {
        return;
      }
      lastSelKey.current = key;
      setSelection({
        rowIds: selectedRowIds,
        colIds: selectedColIds,
        anchor,
      });
      // Humans only broadcast their single active cell, even when a range is
      // selected — the multi-cell box is reserved for the AI's live edits.
      updateMyPresence({ selectedCells: [anchor] });
    },
    [setSelection, updateMyPresence]
  );

  const onDeselect = useCallback(() => {
    lastSelKey.current = "";
    setSelection(null);
    updateMyPresence({ selectedCells: null });
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
        hotRenderer={renderCell}
        formulas={{ engine: HyperFormula }}
        colHeaders={colHeaders}
        rowHeaders={rowHeaders}
        colWidths={colWidths}
        rowHeights={rowHeights}
        afterChange={afterChange}
        afterSelection={onSelection}
        afterSelectionEnd={onSelection}
        afterDeselect={onDeselect}
        // Keep the grid's selection when focus leaves the table (e.g. clicking a
        // toolbar button), so the toolbar still acts on the selected cells. The
        // exception is the Liveblocks comment popovers (`.lb-portal`): there we
        // let the grid deselect so Handsontable releases focus — otherwise it
        // steals focus back from the composer/thread and Radix closes it.
        outsideClickDeselects={(target) =>
          target instanceof HTMLElement && target.closest(".lb-portal") !== null
        }
        afterColumnResize={afterColumnResize}
        afterRowResize={afterRowResize}
        beforeRowMove={beforeRowMove}
        beforeColumnMove={beforeColumnMove}
        beforeColumnSort={beforeColumnSort}
        manualColumnResize={true}
        manualRowResize={true}
        manualRowMove={true}
        manualColumnMove={true}
        columnSorting={{ headerAction: false, indicator: false }}
        width="100%"
        height="100%"
        licenseKey="non-commercial-and-evaluation"
        autoWrapRow={true}
        autoWrapCol={true}
        autoRowSize={false}
        autoColumnSize={false}
        // renderAllRows={true}
        // renderAllColumns={true}
        stretchH="none"
        rowHeaderWidth={48}
      />
      <CommentOverlay hotRef={hotRef} />
    </OrderProvider>
  );
}
