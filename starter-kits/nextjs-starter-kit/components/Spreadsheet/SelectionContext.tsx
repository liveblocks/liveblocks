"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type Selection = {
  rowIds: string[];
  colIds: string[];
  anchor: { rowId: string; colId: string };
};

type SetSelection = (selection: Selection | null) => void;

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

export function useSelectionValue(): Selection | null {
  return useContext(SelectionStateContext);
}

export function useSetSelection(): SetSelection {
  const setSelection = useContext(SelectionSetContext);
  if (!setSelection) {
    throw new Error("useSetSelection must be used within a SelectionProvider");
  }

  return setSelection;
}
