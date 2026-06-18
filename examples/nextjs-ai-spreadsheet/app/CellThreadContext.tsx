"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useThreads } from "@liveblocks/react/suspense";
import type { ThreadData } from "@liveblocks/client";
import { cellKey } from "@/liveblocks.config";
import { useSelectionValue } from "./SelectionContext";

export type OpenCell = { rowId: string; colId: string } | null;

type CellThreadContextValue = {
  getThread: (rowId: string, colId: string) => ThreadData | undefined;
  // The cell whose thread/composer should be open (e.g. after submitting a new
  // comment, or when the toolbar "+ Comment" button is pressed).
  openCell: OpenCell;
  setOpenCell: (openCell: OpenCell) => void;
};

const CellThreadContext = createContext<CellThreadContextValue | null>(null);

export function CellThreadProvider({ children }: { children: ReactNode }) {
  const { threads } = useThreads();
  const [openCell, setOpenCell] = useState<OpenCell>(null);
  const selection = useSelectionValue();

  // Index the most recent thread per cell for O(1) lookups in each renderer.
  // Resolved threads are hidden, so they drop out of the marker, the open logic,
  // and the overlay.
  const byCell = useMemo(() => {
    const map = new Map<string, ThreadData>();
    for (const thread of threads) {
      if (thread.resolved) {
        continue;
      }
      const { rowId, colId } = thread.metadata;
      if (rowId && colId) {
        map.set(cellKey(rowId, colId), thread);
      }
    }
    return map;
  }, [threads]);

  // Single-click to open: when the selected (anchor) cell already has a thread,
  // open it. Keyed on the live selection value only, so it fires once per
  // selection change — it won't reopen after the user closes the thread, and
  // doesn't fight the grid's selection dedupe. `byCell` is read via a ref to
  // avoid re-running on unrelated thread updates.
  const byCellRef = useRef(byCell);
  byCellRef.current = byCell;
  useEffect(() => {
    if (!selection) {
      return;
    }
    const { anchor } = selection;
    if (byCellRef.current.has(cellKey(anchor.rowId, anchor.colId))) {
      setOpenCell(anchor);
    }
  }, [selection]);

  const value = useMemo<CellThreadContextValue>(
    () => ({
      getThread: (rowId, colId) => byCell.get(cellKey(rowId, colId)),
      openCell,
      setOpenCell,
    }),
    [byCell, openCell]
  );

  return (
    <CellThreadContext.Provider value={value}>
      {children}
    </CellThreadContext.Provider>
  );
}

export function useCellThread(): CellThreadContextValue {
  const context = useContext(CellThreadContext);
  if (!context) {
    throw new Error("useCellThread must be used within a CellThreadProvider");
  }
  return context;
}
