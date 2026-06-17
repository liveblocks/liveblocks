"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

// The cells currently selected in the grid, expressed with stable ids so the
// toolbar can apply formatting/comments to exactly the right logical cells even
// after rows/columns have been reordered.
export type Selection = {
  rowIds: string[];
  colIds: string[];
  // The single "active" cell (top-left of the selection), used for comments.
  anchor: { rowId: string; colId: string };
};

type SelectionContextValue = {
  selection: Selection | null;
  setSelection: (selection: Selection | null) => void;
};

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const value = useMemo(() => ({ selection, setSelection }), [selection]);
  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection(): SelectionContextValue {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return context;
}
