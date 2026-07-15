"use client";

import type { ThreadData } from "@liveblocks/client";
import { useThreads } from "@liveblocks/react/suspense";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cellKey } from "@/liveblocks.config";
import { useSelectionValue } from "./SelectionContext";

export type OpenCell = { rowId: string; colId: string } | null;

type CellThreadContextValue = {
  getThread: (rowId: string, colId: string) => ThreadData | undefined;
  openCell: OpenCell;
  setOpenCell: (openCell: OpenCell) => void;
};

const CellThreadContext = createContext<CellThreadContextValue | null>(null);

export function CellThreadProvider({ children }: { children: ReactNode }) {
  const { threads } = useThreads();
  const [openCell, setOpenCell] = useState<OpenCell>(null);
  const selection = useSelectionValue();

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
