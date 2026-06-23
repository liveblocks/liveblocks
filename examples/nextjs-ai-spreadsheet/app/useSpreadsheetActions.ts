"use client";

import { LiveMap, LiveObject } from "@liveblocks/client";
import { useMutation } from "@liveblocks/react/suspense";
import { nanoid } from "nanoid";
import {
  cellKey,
  MIN_COL_WIDTH,
  MIN_ROW_HEIGHT,
  type CellData,
  type CellFormat,
} from "@/liveblocks.config";
import { isFormatEmpty, mergeFormat } from "@/lib/format";

type Cells = LiveMap<string, LiveObject<CellData>>;

export type CellTarget = { rowId: string; colId: string };

// --- Pure helpers operating on the mutable `cells` map -----------------------

function writeValue(
  cells: Cells,
  rowId: string,
  colId: string,
  value: string
): void {
  const key = cellKey(rowId, colId);
  const cell = cells.get(key);

  // Keep Storage sparse: an empty cell with no formatting is removed entirely.
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

function clearFormatCell(cells: Cells, rowId: string, colId: string): void {
  const key = cellKey(rowId, colId);
  const cell = cells.get(key);
  if (!cell) {
    return;
  }
  if ((cell.get("value") ?? "") === "") {
    cells.delete(key);
  } else {
    cell.set("format", undefined);
  }
}

// --- Hook --------------------------------------------------------------------

export function useSpreadsheetActions() {
  const setCellValue = useMutation(
    ({ storage }, rowId: string, colId: string, value: string) => {
      writeValue(storage.get("cells"), rowId, colId, value);
    },
    []
  );

  const applyFormat = useMutation(
    ({ storage }, targets: CellTarget[], patch: Partial<CellFormat>) => {
      const cells = storage.get("cells");
      for (const { rowId, colId } of targets) {
        writeFormat(cells, rowId, colId, patch);
      }
    },
    []
  );

  const clearFormatting = useMutation(({ storage }, targets: CellTarget[]) => {
    const cells = storage.get("cells");
    for (const { rowId, colId } of targets) {
      clearFormatCell(cells, rowId, colId);
    }
  }, []);

  const clearValues = useMutation(({ storage }, targets: CellTarget[]) => {
    const cells = storage.get("cells");
    for (const { rowId, colId } of targets) {
      writeValue(cells, rowId, colId, "");
    }
  }, []);

  const setColWidth = useMutation(({ storage }, colId: string, width: number) => {
    storage
      .get("colWidths")
      .set(colId, Math.max(MIN_COL_WIDTH, Math.round(width)));
  }, []);

  const setRowHeight = useMutation(
    ({ storage }, rowId: string, height: number) => {
      storage
        .get("rowHeights")
        .set(rowId, Math.max(MIN_ROW_HEIGHT, Math.round(height)));
    },
    []
  );

  // Replaces the visual order with a permutation of the existing ids. Setting
  // each index in place avoids clearing the list (no flicker, no migration).
  const setRowOrder = useMutation(({ storage }, newRowIds: string[]) => {
    const list = storage.get("rowIds");
    newRowIds.forEach((id, index) => {
      if (list.get(index) !== id) {
        list.set(index, id);
      }
    });
  }, []);

  const setColOrder = useMutation(({ storage }, newColIds: string[]) => {
    const list = storage.get("colIds");
    newColIds.forEach((id, index) => {
      if (list.get(index) !== id) {
        list.set(index, id);
      }
    });
  }, []);

  const insertRow = useMutation(
    ({ storage }, atIndex: number, newId: string) => {
      storage.get("rowIds").insert(newId, atIndex);
    },
    []
  );

  const insertColumn = useMutation(
    ({ storage }, atIndex: number, newId: string) => {
      storage.get("colIds").insert(newId, atIndex);
    },
    []
  );

  const deleteRows = useMutation(({ storage }, rowIds: string[]) => {
    const list = storage.get("rowIds");
    if (list.length <= rowIds.length) {
      return; // never delete every row
    }
    const cells = storage.get("cells");
    const heights = storage.get("rowHeights");
    const colIds = [...storage.get("colIds")];

    for (const rowId of rowIds) {
      const index = [...list].indexOf(rowId);
      if (index !== -1) {
        list.delete(index);
      }
      for (const colId of colIds) {
        cells.delete(cellKey(rowId, colId));
      }
      heights.delete(rowId);
    }
  }, []);

  const deleteColumns = useMutation(({ storage }, colIds: string[]) => {
    const list = storage.get("colIds");
    if (list.length <= colIds.length) {
      return; // never delete every column
    }
    const cells = storage.get("cells");
    const widths = storage.get("colWidths");
    const rowIds = [...storage.get("rowIds")];

    for (const colId of colIds) {
      const index = [...list].indexOf(colId);
      if (index !== -1) {
        list.delete(index);
      }
      for (const rowId of rowIds) {
        cells.delete(cellKey(rowId, colId));
      }
      widths.delete(colId);
    }
  }, []);

  return {
    nanoid,
    setCellValue,
    applyFormat,
    clearFormatting,
    clearValues,
    setColWidth,
    setRowHeight,
    setRowOrder,
    setColOrder,
    insertRow,
    insertColumn,
    deleteRows,
    deleteColumns,
  };
}
