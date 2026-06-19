"use client";

import { createContext, useContext, useState } from "react";
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

type SetSelection = (selection: Selection | null) => void;

// Split into two contexts: the current selection *value* (changes on every
// click) and the *setter* (referentially stable for the lifetime of the
// provider). This lets the grid subscribe to only the setter, so moving the
// selection never re-renders the <HotTable> subtree — only consumers that
// actually read the value (the toolbar) re-render.
const SelectionStateContext = createContext<Selection | null>(null);
const SelectionSetContext = createContext<SetSelection | null>(null);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<Selection | null>(null);
  return (
    <SelectionSetContext.Provider value={setSelection}>
      <SelectionStateContext.Provider value={selection}>
        {children}
      </SelectionStateContext.Provider>
    </SelectionSetContext.Provider>
  );
}

// Read the current selection. Re-renders when the selection changes.
export function useSelectionValue(): Selection | null {
  return useContext(SelectionStateContext);
}

// Get the (stable) selection setter without subscribing to selection changes.
export function useSetSelection(): SetSelection {
  const setSelection = useContext(SelectionSetContext);
  if (!setSelection) {
    throw new Error("useSetSelection must be used within a SelectionProvider");
  }
  return setSelection;
}
