"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useThreads } from "@liveblocks/react/suspense";
import type { ThreadData } from "@liveblocks/client";
import { cellKey } from "@/liveblocks.config";

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

  const value = useMemo<CellThreadContextValue>(() => {
    // Index the most recent thread per cell for O(1) lookups in each renderer.
    const byCell = new Map<string, ThreadData>();
    for (const thread of threads) {
      const { rowId, colId } = thread.metadata;
      if (rowId && colId) {
        byCell.set(cellKey(rowId, colId), thread);
      }
    }

    return {
      getThread: (rowId, colId) => byCell.get(cellKey(rowId, colId)),
      openCell,
      setOpenCell,
    };
  }, [threads, openCell]);

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
